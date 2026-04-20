import { AI_CONFIG } from '../../config';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

// ─── Violation severity ranking ───────────────────────────────────────────────
const VIOLATION_SEVERITY = {
    'Drunk Driving':        10,
    'Dangerous Driving':     9,
    'Red Light Violation':   8,
    'Wrong Side Driving':    7,
    'Speeding':              6,
    'Triple Riding':         5,
    'Overloading':           5,
    'No Helmet':             4,
    'No Seat Belt':          4,
    'Mobile Phone Use':      3,
    'No Registration Plate': 3,
    'Lane Cutting':          2,
    'Wrong Parking':         1,
    'Other':                 0,
};

// ─── Attempt queue builder ─────────────────────────────────────────────────────
// Strategy: exhaust ALL keys for Model A before trying Model B.
const buildAttemptQueue = () => {
    const queue = [];
    for (const model of AI_CONFIG.models) {
        for (const apiKey of AI_CONFIG.geminiApiKeys) {
            queue.push({ model, apiKey });
        }
    }
    return queue;
};

const logDiagnostics = () => {
    const keyCount = AI_CONFIG.geminiApiKeys.length;
    const masked = AI_CONFIG.geminiApiKeys.map(k =>
        k ? `${k.slice(0, 8)}…${k.slice(-4)}` : 'UNDEFINED'
    );
    console.log(`[AI] Keys: ${keyCount} — ${masked.join(', ')}`);
    console.log(`[AI] Models: ${AI_CONFIG.models.join(', ')}`);
    if (keyCount === 0)
        console.error('[AI] ⚠️  No API keys! Check .env and restart the bundler.');
};

// ─── Stage 1 prompt: Violation detection ─────────────────────────────────────
// Kept deliberately wide-angle — give full scene context, don't over-zoom.
const VIOLATION_PROMPT = `
You are an Indian traffic enforcement AI system analysing a dashcam or phone photograph.

STEP 1 — SCENE UNDERSTANDING (think step-by-step, internally):
  • Count every visible vehicle (cars, bikes, autos, trucks, buses, cycles).
  • For each vehicle, note its type, position, and any rider/passenger details.

STEP 2 — VIOLATION DETECTION:
  Check EVERY vehicle for these Indian traffic violations:
  - No Helmet (riders/pillion without helmet)
  - Triple Riding (VERY STRICT: 3 or more people physically and clearly sitting ON the same 2-wheeler simultaneously. You MUST see 3 clearly distinct bodies physically riding together on the SAME vehicle. People walking, standing, parked, or in the background do NOT count. If in any doubt, do NOT flag this.)
  - Red Light Violation (vehicle clearly past stop line at red signal)
  - Wrong Side Driving / Wrong Way (driving against traffic flow)
  - No Registration Plate (plate missing or completely obscured)
  - Speeding (blurred motion, context clues)
  - Mobile Phone Use (driver visibly on phone)
  - No Seat Belt (driver/front passenger without seat belt)
  - Wrong Parking (on footpath, no-parking zone, obstruction)
  - Overloading (goods or passengers beyond legal capacity)
  - Lane Cutting (abrupt unsafe lane change)
  - Dangerous Driving / Drunk Driving (visually evident erratic behaviour)

  CRITICAL RULE AGAINST FALSE POSITIVES (HALLUCINATIONS):
  - Do NOT guess, assume, or hallucinate violations!
  - If you are not 100% physically seeing the violation, you MUST assume the driver is following the rules.
  - "No violation detected" is an extremely common, valid, and expected answer. Do NOT accuse a vehicle without undeniable visual proof.

STEP 3 — PRIMARY VIOLATOR SELECTION:
  • Focus primarily on the clear FOREGROUND vehicle.
  • Do NOT penalise a vehicle for having pedestrians walking behind it (depth perspective trick).
  • If multiple violations, pick the vehicle with the MOST SEVERE violation.
  • If a tie, pick the one whose plate is most readable.

STEP 4 — PLATE READING (rough pass — OCR will verify in the next step):
  • Read the number plate of the PRIMARY violator ONLY.
  • Indian plate format examples: MH12AB1234, KA01MF7890, DL8CAK0001, UP32ET5678
  • If completely unreadable, write "Not detected".
  • DO NOT read a bystander vehicle's plate.

STEP 5 — CONFIDENCE:
  • 90-100: Plate clearly visible, violation obvious.
  • 70-89: Good confidence but minor ambiguity.
  • 50-69: Partial evidence of violation.
  • 0-49: Low quality or ambiguous.

Return ONLY this exact JSON (no markdown, no explanation):
{
  "violationDetected": true,
  "vehicleNumber": "MH12AB1234",
  "violationType": "No Helmet",
  "allViolations": ["No Helmet", "Triple Riding"],
  "severity": "High",
  "confidence": 85,
  "description": "A red Honda Activa with 3 riders, none wearing helmets. Plate partially visible."
}

If NO violation at all:
{
  "violationDetected": false,
  "vehicleNumber": "Not applicable",
  "violationType": "None",
  "allViolations": [],
  "severity": "None",
  "confidence": 90,
  "description": "No traffic violation detected in this image."
}
`;

// ─── Stage 2 prompt: High-accuracy plate OCR ─────────────────────────────────
// Use the higher-resolution image. This pass ONLY reads the plate — nothing else.
const PLATE_OCR_PROMPT = `
You are a specialist license plate OCR system for Indian vehicles.
Your ONLY job is to read the number plate text as accurately as possible.

MANDATORY RULES:
1. Read EVERY character individually — do not guess or infer.
2. Common lookalike pairs to distinguish carefully:
     0 vs O  (zero has slightly different shape)
     1 vs I vs l  (one, capital-i, lowercase-L)
     8 vs B  (eight vs capital-B) 
     5 vs S  (five vs S — very common mistake!)
     6 vs G  (six vs capital-G)
     2 vs Z  (two vs capital-Z)
     4 vs A  (four vs capital-A in stylized fonts)
     7 vs T  (seven vs capital-T)
3. If a character is genuinely unreadable, use "?" for that position.
4. Focus ONLY on the PRIMARY vehicle's plate — the one with a violation.
   Ignore plates from background vehicles.

INDIAN PLATE FORMAT REFERENCE:
  Standard:     [STATE 2-LTR][DISTRICT 2-NUM][SERIES 1-2-LTR][NUM 4-DIGIT]
  Examples:     MH12AB1234   KA04MF0099   DL8CAK0001   UP32ET5678
                TN09BE4567   GJ01AB2345   RJ14CD7890   HR26AK3456
  BH series:    23BH1234AA
  Temporary:    TEMP plates may have full words

OUTPUT — Return ONLY this JSON, nothing else:
{
  "plate_text": "MH12AB1234",
  "confidence_percent": 92,
  "uncertain_characters": ["position 5: could be B or 8", "position 8: could be 0 or O"],
  "notes": "Plate clearly lit, minor blur on last two digits"
}

If no plate is visible at all:
{
  "plate_text": "Not detected",
  "confidence_percent": 0,
  "uncertain_characters": [],
  "notes": "Plate not visible or completely obscured"
}
`;

// ─── Low-level Gemini API caller ───────────────────────────────────────────────
const callGemini = async ({ model, apiKey, prompt, base64Image, timeoutMs = 60000 }) => {
    if (!apiKey) throw new Error('API key undefined — restart bundler after .env change');

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
        contents: [{
            parts: [
                { text: prompt },
                { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
            ],
        }],
        generationConfig: {
            temperature: 0.1,          // Low = deterministic; better for structured extraction
            responseMimeType: 'text/plain',
        },
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: controller.signal,
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`HTTP ${res.status}: ${txt.slice(0, 200)}`);
        }
        const json = await res.json();
        if (!json.candidates?.length) throw new Error('No candidates in Gemini response');
        return json.candidates[0].content.parts[0].text;
    } finally {
        clearTimeout(timer);
    }
};

// ─── JSON extractor ────────────────────────────────────────────────────────────
const extractJSON = (text) => {
    // Strip markdown fences if present
    const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in response');
    return JSON.parse(match[0]);
};

// ─── Parse violation response ───────────────────────────────────────────────
const parseViolationResult = (raw) => {
    const parsed = extractJSON(raw);

    if (!parsed.violationDetected) {
        return {
            violationDetected: false,
            vehicleNumber: 'Not applicable',
            violationType: 'None',
            allViolations: [],
            severity: 'None',
            confidence: parsed.confidence ?? 90,
            description: parsed.description || 'No traffic violation detected.',
        };
    }

    // Pick the highest-severity violation across allViolations
    const allViolations = parsed.allViolations?.length
        ? parsed.allViolations
        : [parsed.violationType || 'Other'];

    const primaryViolation = [...allViolations].sort(
        (a, b) => (VIOLATION_SEVERITY[b] ?? 0) - (VIOLATION_SEVERITY[a] ?? 0)
    )[0];

    const score = VIOLATION_SEVERITY[primaryViolation] ?? 0;
    const severityLabel =
        score >= 8 ? 'Critical' :
        score >= 5 ? 'High'     :
        score >= 3 ? 'Medium'   : 'Low';

    return {
        violationDetected: true,
        vehicleNumber: parsed.vehicleNumber || 'Not detected',
        violationType: primaryViolation,
        allViolations,
        severity: severityLabel,
        confidence: parsed.confidence ?? 60,
        description: parsed.description || 'Violation detected.',
    };
};

// ─── Run one stage with key/model rotation ────────────────────────────────────
const runWithRotation = async (prompt, base64Image, attempts, label) => {
    let lastError = null;
    for (const { model, apiKey } of attempts) {
        const keyIdx = AI_CONFIG.geminiApiKeys.indexOf(apiKey) + 1;
        const tag = `[${label}] model=${model} key${keyIdx}`;
        console.log(`${tag} → trying`);
        try {
            const text = await callGemini({ model, apiKey, prompt, base64Image });
            console.log(`${tag} → ✅ success`);
            return text;
        } catch (err) {
            lastError = err;
            const isQuota   = err.message.includes('429') || err.message.toLowerCase().includes('quota');
            const isNetwork = err.name === 'AbortError' || err.message.toLowerCase().includes('network');
            console.warn(`${tag} → ✗ ${isQuota ? 'QUOTA' : isNetwork ? 'TIMEOUT' : 'ERROR'}: ${err.message}`);
        }
    }
    throw lastError ?? new Error(`${label}: all attempts failed`);
};

// ─── Image preparation ────────────────────────────────────────────────────────
const prepareImages = async (imageUri) => {
    // Violation image: high resolution for complex scene understanding
    const violationImg = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 1600 } }], // Increased from 1024 to 1600
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
    );

    // OCR image: ULTRA HIGH resolution — needs crisp plate text pixels for Pro models
    const ocrImg = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 2400 } }], // Increased from 1600 to 2400
        { compress: 1.0, format: ImageManipulator.SaveFormat.JPEG } // 1.0 = Max quality
    );

    const [violationB64, ocrB64] = await Promise.all([
        FileSystem.readAsStringAsync(violationImg.uri, { encoding: 'base64' }),
        FileSystem.readAsStringAsync(ocrImg.uri,       { encoding: 'base64' }),
    ]);

    return { violationB64, ocrB64 };
};

// ─── Main service ─────────────────────────────────────────────────────────────
export const aiService = {
    /**
     * Two-stage analysis:
     *   Stage 1 — Violation detection  (scene-context image, 1024px)
     *   Stage 2 — Plate OCR            (high-res image, 1600px, ALWAYS runs when violation found)
     *
     * Stage 2 plate text ALWAYS overrides Stage 1 plate when OCR confidence ≥ 45%.
     */
    analyzeViolationImage: async (imageUri) => {
        try {
            logDiagnostics();

            // ── Prepare two resolution variants in parallel ─────────────────
            console.log('[AI] Preparing images…');
            const { violationB64, ocrB64 } = await prepareImages(imageUri);

            const attempts = buildAttemptQueue();

            // ── Stage 1: Violation detection ────────────────────────────────
            console.log('[AI] Stage 1 — violation detection');
            const rawViolation = await runWithRotation(
                VIOLATION_PROMPT, violationB64, attempts, 'S1-VIOLATION'
            );
            const violationResult = parseViolationResult(rawViolation);
            console.log('[AI] S1 result:', JSON.stringify({
                detected: violationResult.violationDetected,
                type: violationResult.violationType,
                plate: violationResult.vehicleNumber,
                confidence: violationResult.confidence,
            }));

            // ── Stage 2: Plate OCR (runs whenever violation was detected) ───
            if (violationResult.violationDetected) {
                console.log('[AI] Stage 2 — plate OCR');
                try {
                    const rawOCR = await runWithRotation(
                        PLATE_OCR_PROMPT, ocrB64, attempts, 'S2-OCR'
                    );
                    const ocr = extractJSON(rawOCR);
                    console.log(`[AI] S2 OCR result: "${ocr.plate_text}" @ ${ocr.confidence_percent}%`);

                    const ocrConf = ocr.confidence_percent ?? 0;
                    const plateValid =
                        ocr.plate_text &&
                        ocr.plate_text !== 'Not detected' &&
                        ocr.plate_text.trim().length >= 4;

                    if (plateValid && ocrConf >= 45) {
                        // Normalize: strip spaces → "MH12AB1234"
                        const normalized = ocr.plate_text.replace(/\s+/g, '').toUpperCase();
                        console.log(`[AI] Plate upgraded: "${violationResult.vehicleNumber}" → "${normalized}"`);
                        violationResult.vehicleNumber = normalized;
                        violationResult.plateOCR = {
                            raw: ocr.plate_text,
                            confidence: ocrConf,
                            uncertainCharacters: ocr.uncertain_characters ?? [],
                            notes: ocr.notes ?? '',
                        };
                    } else {
                        console.log(`[AI] OCR plate rejected (conf=${ocrConf}, text="${ocr.plate_text}") — keeping S1 plate`);
                    }
                } catch (ocrErr) {
                    // OCR failure is non-fatal — Stage 1 plate is kept
                    console.warn('[AI] Stage 2 OCR failed (non-fatal):', ocrErr.message);
                }
            }

            return violationResult;
        } catch (error) {
            console.error('[AI] Fatal failure:', error);
            
            // EMERGENCY SAFETY FALLBACK (for development/demos)
            // If every key and model returns 429 (Quota) or 404 (Missing),
            // return a smart mock so the user isn't stuck.
            if (__DEV__) {
                console.warn('[AI] 🛡️ SAFETY FALLBACK: Generating simulated result due to API outage/quota.');
                return {
                    violationDetected: true,
                    vehicleNumber: "MH02CZ7784", 
                    violationType: "No Helmet",
                    allViolations: ["No Helmet"],
                    severity: "High",
                    confidence: 80,
                    description: "AI analysis simulated: Rider detected without helmet. (Fallback active due to API Outage)",
                    isMock: true
                };
            }
            
            // Production fallback
            return {
                violationDetected: false,
                vehicleNumber: 'Not detected',
                violationType: 'None',
                allViolations: [],
                severity: 'None',
                confidence: 0,
                description: 'AI analysis encountered an error. Please fill details manually.'
            };
        }
    },
};

export default aiService;
