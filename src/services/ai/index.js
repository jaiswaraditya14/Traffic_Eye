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
    'No Helmet':             2,
    'No Seat Belt':          4,
    'Mobile Phone Use':      3,
    'No Registration Plate': 3,
    'Lane Cutting':          2,
    'Wrong Parking':         1,
    'Other':                 0,
};

// ─── Attempt queue builder ─────────────────────────────────────────────────────
// Strategy: exhaust ALL keys for Model A before trying Model B.
// Strategy: exhaust ALL keys for Model A before trying Model B.
const buildAttemptQueue = (modelsArray) => {
    const queue = [];
    for (const model of modelsArray) {
        if (model.includes('llama') || model.includes('openai') || model.includes('gpt')) {
            // Groq model
            for (const apiKey of (AI_CONFIG.groqApiKeys || [])) {
                queue.push({ model, apiKey, provider: 'groq' });
            }
        } else {
            // Gemini model
            for (const apiKey of AI_CONFIG.geminiApiKeys) {
                queue.push({ model, apiKey, provider: 'gemini' });
            }
        }
    }
    return queue;
};

const logDiagnostics = () => {
    const geminiKeyCount = AI_CONFIG.geminiApiKeys?.length || 0;
    const groqKeyCount = AI_CONFIG.groqApiKeys?.length || 0;
    console.log(`[AI] Keys: Gemini(${geminiKeyCount}), Groq(${groqKeyCount})`);
    console.log(`[AI] Vision Models: ${AI_CONFIG.visionModels?.join(', ') || 'None'}`);
    console.log(`[AI] Reasoning Models: ${AI_CONFIG.reasoningModels?.join(', ') || 'None'}`);
    if (geminiKeyCount === 0 && groqKeyCount === 0)
        console.error('[AI] ⚠️ No API keys! Check .env and restart.');
};

// ─── Stage 1 prompt: Violation detection ─────────────────────────────────────
// Kept deliberately wide-angle — give full scene context, don't over-zoom.
const VIOLATION_PROMPT = `
You are an Indian traffic enforcement AI system analysing a dashcam or phone photograph.
Your responses directly lead to legal action. Accuracy is paramount. False accusations are UNACCEPTABLE.

STEP 1 — SCENE UNDERSTANDING (think step-by-step, internally):
  • Count every visible vehicle (cars, bikes, autos, trucks, buses, cycles).
  • For each vehicle, carefully count the number of people PHYSICALLY SEATED ON IT.
  • Note each rider/passenger's position, helmet status, and any visible goods.

STEP 2 — VIOLATION DETECTION:
  Check EVERY vehicle for these Indian traffic violations:

  ── COUNTING-BASED VIOLATIONS (EXTREME CAUTION REQUIRED) ──
  - Triple Riding: ONLY flag if you can EXPLICITLY COUNT 3 or more DISTINCT human bodies
    ALL physically on the SAME 2-wheeler AT THE SAME TIME in the FOREGROUND.
    ★ Count: 1 body = driver only. 2 bodies = driver + 1 pillion (NORMAL, NOT a violation).
    ★ You need to see 3 SEPARATE bodies. If you see only 1 or 2 people on the bike → DO NOT flag.
    ★ People walking/standing near the bike, on other vehicles, or in the BACKGROUND do NOT count.
    ★ If there is ANY doubt about the exact count → DO NOT FLAG. Doubt = no violation.

  - Overloading: ONLY flag for goods vehicles (trucks/tempos/autos) when cargo is VISIBLY
    spilling over the sides or stacked dangerously beyond the vehicle body.
    ★ DO NOT flag overloading for motorcycles/scooters unless 3+ people are literally on it.
    ★ A rider carrying a backpack or small bag is NOT overloading.
    ★ If you cannot see obvious overflowing goods → DO NOT FLAG.

  ── OTHER VIOLATIONS ──
  - No Helmet: rider or pillion is clearly NOT wearing a helmet
  - Red Light Violation: vehicle clearly past stop line at a red signal
  - Wrong Side Driving / Wrong Way: driving visibly against traffic flow
  - No Registration Plate: plate is fully missing or completely unreadable/obscured
  - Speeding: clear motion blur or strong context clues
  - Mobile Phone Use: driver is visibly holding/using a phone while riding
  - No Seat Belt: car driver/front passenger without seat belt clearly visible
  - Wrong Parking: parked on footpath, no-parking zone, or causing obstruction
  - Lane Cutting: abrupt unsafe lane change captured in the moment
  - Dangerous Driving / Drunk Driving: visually evident erratic behaviour

  ══════════════════════════════════════════════════════════════════
  ZERO-TOLERANCE HALLUCINATION POLICY — READ CAREFULLY:
  • You MUST only report what you can PHYSICALLY and UNAMBIGUOUSLY see.
  • Do NOT infer, assume, or guess any violation.
  • Do NOT report Triple Riding unless you can clearly count THREE bodies on the vehicle.
  • Do NOT report Overloading unless goods are visibly spilling beyond the vehicle frame.
  • A single rider without a helmet → ONLY "No Helmet". Nothing else unless separately verified.
  • "No violation" is always valid and often the correct answer.
  • When in doubt about ANY violation → DO NOT include it. Silence is better than false accusation.
  ══════════════════════════════════════════════════════════════════

STEP 3 — PRIMARY VIOLATOR SELECTION:
  • Focus primarily on the clear FOREGROUND vehicle.
  • Do NOT penalise a vehicle for pedestrians walking behind it (depth perspective illusion).
  • If multiple violations on same vehicle, pick the most severe one as primary.
  • If multiple vehicles violated, pick the one with the most readable plate.

STEP 4 — PLATE READING (rough pass — OCR will verify in next step):
  • Read the number plate of the PRIMARY violator ONLY.
  • Indian plate format examples: MH12AB1234, KA01MF7890, DL8CAK0001, UP32ET5678
  • If completely unreadable, write "Not detected".
  • DO NOT read a bystander vehicle's plate.

STEP 5 — CONFIDENCE:
  • 90-100: Plate clearly visible, violation obvious and unambiguous.
  • 70-89: Good confidence but minor ambiguity exists.
  • 50-69: Partial evidence of violation.
  • 0-49: Low quality or significantly ambiguous image.

MANDATORY OUTPUT FORMAT — Return ONLY this exact JSON (no markdown, no explanation):
{
  "vehicleType": "motorcycle",
  "primaryVehiclePersonCount": 1,
  "violationDetected": true,
  "vehicleNumber": "AP28R8104",
  "violationType": "No Helmet",
  "allViolations": ["No Helmet"],
  "severity": "Medium",
  "confidence": 92,
  "description": "Rider on a black motorcycle is not wearing a helmet. Only this single violation is visible."
}

IMPORTANT: vehicleType must be one of: motorcycle, scooter, car, truck, bus, auto, cycle, other.
primaryVehiclePersonCount = exact number of people you can see ON the primary vehicle (integer).

If NO violation at all:
{
  "vehicleType": "motorcycle",
  "primaryVehiclePersonCount": 1,
  "violationDetected": false,
  "vehicleNumber": "Not applicable",
  "violationType": "None",
  "allViolations": [],
  "severity": "None",
  "confidence": 90,
  "description": "No traffic violation detected in this image."
}
`;

// ─── Stage 1.5 prompt: Reasoning validation ──────────────────────────────────
const REASONING_PROMPT = `
You are a senior traffic police officer evaluating a preliminary traffic violation report generated by a vision AI.
Review the following initial detection data carefully and determine if it constitutes a definitive, legally binding traffic violation.
Apply strict logic based on Indian traffic rules.

Initial Report:
__RAW_JSON__

MANDATORY RULES:
1. Triple Riding requires exactly 3 or more people ON the vehicle. 1 or 2 people is NOT a violation.
2. Overloading only applies to goods clearly spilling out of goods vehicles, not passenger bags.
3. If the violation is doubtful based on the description, mark violationDetected as false and violationType as "None".
4. Ensure the output is strictly valid JSON matching the exact schema of the input.

Output ONLY the final evaluated JSON. No markdown, no explanations.
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
// ─── Universal AI Caller (Gemini & Groq) ──────────────────────────────────────
const callAI = async ({ model, apiKey, provider, prompt, base64Image, timeoutMs = 60000 }) => {
    if (!apiKey) throw new Error(`${provider} API key undefined — check .env`);

    const isGroq = provider === 'groq';
    const isTextOnly = !base64Image;
    const url = isGroq 
        ? 'https://api.groq.com/openai/v1/chat/completions'
        : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const body = isGroq 
        ? JSON.stringify({
            model,
            messages: [{
                role: 'user',
                content: isTextOnly
                    ? prompt
                    : [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                    ]
            }],
            temperature: 0.1,
            max_completion_tokens: 8192,
            ...(model.includes('gpt-oss-120b') ? { reasoning_effort: 'medium' } : {})
        })
        : JSON.stringify({
            contents: [{
                parts: isTextOnly
                    ? [{ text: prompt }]
                    : [
                        { text: prompt },
                        { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
                    ],
            }],
            generationConfig: { temperature: 0.1, responseMimeType: 'text/plain' },
        });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                ...(isGroq ? { 'Authorization': `Bearer ${apiKey}` } : {})
            },
            body,
            signal: controller.signal,
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`${provider} HTTP ${res.status}: ${txt.slice(0, 200)}`);
        }

        const json = await res.json();
        if (isGroq) {
            if (!json.choices?.length) throw new Error('No choices in Groq response');
            return json.choices[0].message.content;
        } else {
            if (!json.candidates?.length) throw new Error('No candidates in Gemini response');
            return json.candidates[0].content.parts[0].text;
        }
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

// ─── Post-parse violation validator (programmatic safety net) ────────────────
// Removes hallucinated counting-based violations by cross-checking the model's
// own reported person count and vehicle type against the violation list.
const validateViolations = (allViolations, parsed) => {
    let violations = [...allViolations];
    const personCount = typeof parsed.primaryVehiclePersonCount === 'number'
        ? parsed.primaryVehiclePersonCount : null;
    const vehicleType = (parsed.vehicleType || '').toLowerCase();

    const isTwoWheeler =
        vehicleType.includes('motor') || vehicleType.includes('bike') ||
        vehicleType.includes('scooter') || vehicleType.includes('cycle') ||
        vehicleType.includes('two') || vehicleType.includes('2-wheel');

    // Triple Riding: model must have reported ≥3 people on the vehicle
    if (violations.includes('Triple Riding')) {
        if (personCount !== null && personCount < 3) {
            console.log(`[AI] ⚡ Validator: Removing 'Triple Riding' — model reported ${personCount} person(s), need ≥ 3`);
            violations = violations.filter(v => v !== 'Triple Riding');
        } else if (personCount === null) {
            // No count provided — conservative: keep it only if description mentions '3' or 'three'
            const desc = (parsed.description || '').toLowerCase();
            const mentionsThree = /\bthree\b|\b3\b|\btriple\b/.test(desc);
            if (!mentionsThree) {
                console.log(`[AI] ⚡ Validator: Removing 'Triple Riding' — no person count & description doesn't confirm 3 riders`);
                violations = violations.filter(v => v !== 'Triple Riding');
            }
        }
    }

    // Overloading: only valid for goods vehicles (truck/tempo/bus/auto)
    // For 2-wheelers, only flag if Triple Riding is also confirmed
    if (violations.includes('Overloading') && isTwoWheeler) {
        if (!violations.includes('Triple Riding')) {
            console.log(`[AI] ⚡ Validator: Removing 'Overloading' — 2-wheeler without confirmed triple riding`);
            violations = violations.filter(v => v !== 'Overloading');
        }
    }

    return violations;
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

    // Pick reported violations, then run programmatic validator
    const rawViolations = parsed.allViolations?.length
        ? parsed.allViolations
        : [parsed.violationType || 'Other'];

    const allViolations = validateViolations(rawViolations, parsed);

    // If validator removed everything, treat as no violation
    if (allViolations.length === 0) {
        console.log('[AI] ⚡ Validator removed all violations — treating as no violation detected');
        return {
            violationDetected: false,
            vehicleNumber: 'Not applicable',
            violationType: 'None',
            allViolations: [],
            severity: 'None',
            confidence: parsed.confidence ?? 50,
            description: parsed.description || 'No confirmed violation after validation.',
        };
    }

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
// Returns { text, winningAttempt } so the caller can reuse the winning model+key.
const runWithRotation = async (prompt, base64Image, attempts, label) => {
    let lastError = null;
    for (const attempt of attempts) {
        const { model, apiKey, provider } = attempt;
        const tag = `[${label}] provider=${provider} model=${model}`;
        console.log(`${tag} → trying`);
        try {
            const text = await callAI({ model, apiKey, provider, prompt, base64Image });
            console.log(`${tag} → ✅ success`);
            return { text, winningAttempt: attempt };
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

            const visionAttempts = buildAttemptQueue(AI_CONFIG.visionModels || []);
            const reasoningAttempts = buildAttemptQueue(AI_CONFIG.reasoningModels || []);

            // ── Stage 1: Vision Detection ───────────────────────────────────
            console.log('[AI] Stage 1 — Vision detection');
            const { text: rawVisionViolation, winningAttempt: visionWinner } = await runWithRotation(
                VIOLATION_PROMPT, violationB64, visionAttempts, 'S1-VISION'
            );

            // ── Stage 1.5: Reasoning & Validation ───────────────────────────
            console.log('[AI] Stage 1.5 — Reasoning validation');
            let finalRawViolation = rawVisionViolation;
            if (reasoningAttempts.length > 0) {
                const reasoningPrompt = REASONING_PROMPT.replace('__RAW_JSON__', rawVisionViolation);
                try {
                    const { text: reasonedText } = await runWithRotation(
                        reasoningPrompt, null, reasoningAttempts, 'S1.5-REASONING'
                    );
                    finalRawViolation = reasonedText;
                } catch (reasonErr) {
                    console.warn('[AI] Stage 1.5 Reasoning failed (non-fatal), falling back to S1 JSON:', reasonErr.message);
                }
            }

            const violationResult = parseViolationResult(finalRawViolation);
            console.log('[AI] S1.5 result:', JSON.stringify({
                detected: violationResult.violationDetected,
                type: violationResult.violationType,
                violations: violationResult.allViolations,
                plate: violationResult.vehicleNumber,
                confidence: violationResult.confidence,
            }));

            // ── Stage 2: Plate OCR (runs whenever violation was detected) ───
            // Reuse the winning model+key from Stage 1 first — only fall back to
            // others if it fails (avoids unnecessary API hops).
            if (violationResult.violationDetected) {
                console.log('[AI] Stage 2 — plate OCR');
                const stage2Attempts = [
                    visionWinner,
                    ...visionAttempts.filter(a => a !== visionWinner),
                ];
                try {
                    const { text: rawOCR } = await runWithRotation(
                        PLATE_OCR_PROMPT, ocrB64, stage2Attempts, 'S2-OCR'
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
