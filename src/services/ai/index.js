import { AI_CONFIG } from '../../config';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Severity ranking for violations (higher = more severe)
 * Used to pick the most severe violation when multiple are detected
 */
const VIOLATION_SEVERITY = {
    'Drunk Driving': 10,
    'Dangerous driving': 9,
    'Jumping Red Signal': 8,
    'Wrong Side driving': 7,
    'Over speeding': 6,
    'Triple Seat riding': 5,
    'Overloading': 5,
    'Riding without Helmet': 4,
    'Driving without Seat Belt': 4,
    'Mobile Phone Use': 3,
    'No Registration Plate': 3,
    'Lane Cutting': 2,
    'Wrong Parking': 1,
    'Other': 0,
};

/**
 * Build a list of { model, apiKey } attempt pairs.
 *
 * Strategy: for every model we try ALL keys before moving to the next model.
 *   Model A → Key1, Key A → Key2, Model B → Key1, Model B → Key2, …
 *
 * This means a quota hit on Key1 is immediately healed by Key2 on the same
 * model — we almost never fall back to a slower/worse model.
 */
const buildAttemptQueue = () => {
    const queue = [];
    for (const model of AI_CONFIG.models) {
        for (const apiKey of AI_CONFIG.geminiApiKeys) {
            queue.push({ model, apiKey });
        }
    }
    return queue;
};

/** Diagnostic — logs loaded key count so env issues are immediately visible */
const logDiagnostics = () => {
    const keyCount = AI_CONFIG.geminiApiKeys.length;
    const maskedKeys = AI_CONFIG.geminiApiKeys.map((k) =>
        k ? `${k.slice(0, 8)}…${k.slice(-4)}` : 'UNDEFINED'
    );
    console.log(`[AI] Keys loaded: ${keyCount} — ${maskedKeys.join(', ')}`);
    console.log(`[AI] Models queued: ${AI_CONFIG.models.join(', ')}`);
    if (keyCount === 0) {
        console.error('[AI] ⚠️  No API keys found! Check .env and restart the bundler.');
    }
};

/** Shared prompt text — extracted so it is not re-allocated per loop iteration */
const ANALYSIS_PROMPT = `
You are an expert Indian Traffic Enforcement AI.
Your task is to identify traffic violations in images that may contain MULTIPLE vehicles.

STRICT INSTRUCTIONS:
1. IDENTIFY ALL VEHICLES: Look at every vehicle in the image separately.
2. DETECT VIOLATIONS: For each vehicle, check for: No Helmet, Triple Riding, Red Light, Wrong Side, Wrong Parking, etc.
3. PICK PRIMARY VIOLATOR: If multiple vehicles have violations, pick the MOST SEVERE one.
4. TARGET VEHICLE ISOLATION: Once you pick the primary violator, extract ONLY the number plate of THAT specific vehicle.
   - DO NOT combine parts of multiple plates.
   - DO NOT report a plate from a different vehicle even if it is clearer.
   - Plate format: MH12AB1234.
5. CONFIDENCE: Rate 0-100 based on the primary detection.

Return ONLY valid JSON:
{
    "violationDetected": boolean,
    "vehicleNumber": "MH12AB1234" or "Not detected",
    "violationType": "Primary violation type",
    "allViolations": ["violation1", "violation2"],
    "severity": "Critical/High/Medium/Low",
    "confidence": number,
    "description": "Explain WHICH vehicle was chosen as the primary violator and why, then describe its plate and violation."
}
`;

/**
 * Call the Gemini REST API with a specific model + key combination.
 * Throws on any non-2xx response or missing candidates.
 */
const callGeminiAPI = async (model, apiKey, base64Image) => {
    if (!apiKey) throw new Error('API key is undefined — restart the Expo bundler after updating .env');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = JSON.stringify({
        contents: [{
            parts: [
                { text: ANALYSIS_PROMPT },
                {
                    inline_data: {
                        mime_type: 'image/jpeg',
                        data: base64Image,
                    },
                },
            ],
        }],
        generationConfig: {
            temperature: 0.2,
        },
    });

    // 15-second timeout — prevents silent hangs on slow networks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: controller.signal,
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`HTTP ${response.status}: ${text}`);
        }

        const json = await response.json();

        if (!json.candidates || json.candidates.length === 0) {
            throw new Error('No candidates returned from Gemini API');
        }

        return json.candidates[0].content.parts[0].text;
    } finally {
        clearTimeout(timeoutId);
    }
};

/** Parse and normalise a raw Gemini text response into our result shape */
const parseGeminiResponse = (responseText) => {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON format in Gemini response');

    const parsed = JSON.parse(jsonMatch[0]);

    // No violation detected
    if (parsed.violationDetected === false) {
        return {
            violationDetected: false,
            vehicleNumber: 'Not applicable',
            violationType: 'None',
            allViolations: [],
            severity: 'None',
            confidence: parsed.confidence ?? 95,
            description: parsed.description || 'No traffic violation detected.',
        };
    }

    // Severity ranking logic — pick the most severe from allViolations
    let primaryViolation = parsed.violationType || 'Other';
    const allViolations = parsed.allViolations?.length ? parsed.allViolations : [primaryViolation];

    if (allViolations.length > 1) {
        const sorted = [...allViolations].sort(
            (a, b) => (VIOLATION_SEVERITY[b] ?? 0) - (VIOLATION_SEVERITY[a] ?? 0)
        );
        primaryViolation = sorted[0];
    }

    const score = VIOLATION_SEVERITY[primaryViolation] ?? 0;
    let severityLabel;
    if (score >= 8) severityLabel = 'Critical';
    else if (score >= 5) severityLabel = 'High';
    else if (score >= 3) severityLabel = 'Medium';
    else severityLabel = 'Low';

    return {
        violationDetected: true,
        vehicleNumber: parsed.vehicleNumber || 'Not detected',
        violationType: primaryViolation,
        allViolations,
        severity: severityLabel,
        confidence: parsed.confidence ?? 60,
        description: parsed.description || 'AI analysis completed.',
    };
};

/**
 * Service to handle all AI-related features using Google Gemini.
 */
export const aiService = {
    /**
     * Analyzes a traffic violation image.
     *
     * Rotation strategy:
     *   For each model, we try every available API key before moving to a
     *   slower/lower-priority model.  Quota errors (429) trigger an immediate
     *   switch to the next API key; only when ALL keys are exhausted for a
     *   model do we move to the next model.
     *
     * @param {string} imageUri - Local URI of the image to analyse
     * @returns {Promise<Object>} AI detection results
     */
    analyzeViolationImage: async (imageUri) => {
        try {
            // ── Step 1: Compress the image ──────────────────────────────────
            const manipulated = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ resize: { width: 600 } }],
                { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
            );

            const base64Image = await FileSystem.readAsStringAsync(manipulated.uri, {
                encoding: 'base64',
            });

            // ── Step 2: Diagnostics + build attempt queue (model × key) ───
            logDiagnostics();
            const attempts = buildAttemptQueue();
            let lastError = null;

            // ── Step 3: Try each combination ────────────────────────────────
            for (const { model, apiKey } of attempts) {
                const keyIdx = AI_CONFIG.geminiApiKeys.indexOf(apiKey) + 1;
                const label = `model=${model} Key${keyIdx}`;
                console.log(`[AI] ▶ Trying ${label}`);

                try {
                    const responseText = await callGeminiAPI(model, apiKey, base64Image);
                    console.log(`[AI] ✅ Success — ${label}`);
                    return parseGeminiResponse(responseText);

                } catch (err) {
                    lastError = err;
                    const isQuota = err.message.includes('429') || err.message.toLowerCase().includes('quota');
                    const isNetwork = err.name === 'AbortError' || err.message.toLowerCase().includes('network');
                    const reason = isQuota ? 'QUOTA' : isNetwork ? 'NETWORK/TIMEOUT' : 'ERROR';
                    console.warn(`[AI] ✗ ${label} → ${reason}: ${err.message}`);
                    // Always continue to next attempt
                }
            }

            // ── Step 4: All attempts exhausted ──────────────────────────────
            throw lastError ?? new Error('All Gemini API key+model combinations failed');

        } catch (error) {
            console.error('AI Analysis Final Failure:', error);
            const isQuota = error?.message?.includes('429') || error?.message?.toLowerCase().includes('quota');
            return {
                violationDetected: false,
                vehicleNumber: 'Manual entry required',
                violationType: 'Other',
                allViolations: [],
                severity: 'Unknown',
                confidence: 0,
                description: isQuota
                    ? 'Error: AI Quota Exceeded across all keys. Please try again in 1 minute.'
                    : 'Error: AI analysis failed. Please enter details manually.',
            };
        }
    },
};

export default aiService;
