/**
 * ai/index.js — Traffic Eye AI Vision & Violation Detection Service
 *
 * Pipeline:
 *   Stage 1    — Vision scene + violation detection (1280px JPEG, 512 tokens, 45s)
 *   Stage 1.5  — Reasoning validation (text-only, 384 tokens, 30s)
 *   Stage 2    — High-res plate OCR fallback (1600px, 256 tokens, 30s)
 *
 * Shared utilities (callAI, buildAttemptQueue, runWithRotation, stripThinkTags)
 * live in ./utils to avoid circular imports with authenticity.js.
 */

import { AI_CONFIG } from '../../config';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { stripThinkTags, buildAttemptQueue, runWithRotation, callAI } from './utils';

// ─── Violation severity ranking ───────────────────────────────────────────────
const VIOLATION_SEVERITY = {
    'Drunk Driving':                        10,
    'Dangerous Driving':                     9,
    'Rash Driving':                          9,
    'Driving on Footpath':                   8.5,
    'Footpath Driving':                      8.5,
    'Footpath Riding':                       8.5,
    'Red Light Violation':                   8,
    'Red Light':                             8,
    'Signal Jump':                           8,
    'Wrong Side Driving':                    7,
    'Wrong Way':                             7,
    'Footboard Travelling':                  7,
    'Roof Travelling':                       7,
    'Speeding':                              6,
    'Over Speeding':                         6,
    'Triple Riding':                         5,
    'Overloading':                           5,
    'Overloading Goods':                     5,
    'Protruding Cargo':                      5,
    'Passenger Overcrowding':                4.5,
    'Auto Overcrowding':                     4.5,
    'No Seat Belt':                          4,
    'No Seatbelt':                           4,
    'Tinted Glass':                          3.5,
    'Mobile Phone Use':                      3,
    'Phone Use':                             3,
    'No Registration Plate':                 3,
    'Defective Number Plate':                3,
    'No Helmet':                             2,
    'Without Helmet':                        2,
    'Lane Cutting':                          2,
    'Illegal U-Turn':                        2,
    'Wrong Parking':                         1,
    'Illegal Parking':                       1,
    'No Parking':                            1,
    'Footpath Parking':                      1,
    'Parking Violation':                     1,
    'Other':                                 0,
};

// Re-export shared utilities for callers that import from this module
export { stripThinkTags, buildAttemptQueue, runWithRotation, callAI } from './utils';

// ─── Diagnostics ─────────────────────────────────────────────────────────────
const logDiagnostics = () => {
    const g = AI_CONFIG.geminiApiKeys?.length || 0;
    const q = AI_CONFIG.groqApiKeys?.length || 0;
    const n = AI_CONFIG.nvidiaApiKeys?.length || 0;
    console.log(`[AI] Keys: NVIDIA(${n}), Gemini(${g}), Groq(${q})`);
    console.log(`[AI] Vision Models:       ${AI_CONFIG.visionModels?.join(', ')      || 'None'}`);
    console.log(`[AI] Authenticity Models: ${AI_CONFIG.authenticityModels?.join(', ') || 'None'}`);
    console.log(`[AI] OCR Models:          ${AI_CONFIG.ocrModels?.join(', ')          || 'None'}`);
    console.log(`[AI] Reasoning Models:    ${AI_CONFIG.reasoningModels?.join(', ')    || 'None'}`);
    if (g === 0 && q === 0 && n === 0) console.error('[AI] ⚠️ No API keys! Check .env and restart.');
};

// ─── Stage 1 prompt: Violation detection (All Indian MVA Rules) ─────────────────
const VIOLATION_PROMPT = `
You are a Forensic Traffic Enforcement AI and Indian Motor Vehicles Act (MVA) expert.
Your SOLE job is to identify traffic violations. Do NOT comment on registration, legality, or road safety in general.
Detect violations ONLY — report what is wrong, not what is acceptable.

━━ PRIMARY VEHICLE RULE ━━
Focus exclusively on the MAIN vehicle in frame (motorcycle, scooter, car, auto-rickshaw, truck, bus, tempo, e-rickshaw).
DO NOT attribute violations from background or adjacent vehicles to the primary vehicle.

━━ ABSENCE-IS-EVIDENCE RULE (CRITICAL) ━━
For safety-gear violations, ABSENCE of the gear IS the evidence:
• No Helmet: If the rider's or pillion's head has NO helmet visible → VIOLATION. Do NOT say "cannot determine". The head is visible; the helmet is not. That IS a violation.
• No Seat Belt: If no seatbelt strap is visible across the driver/passenger's chest → VIOLATION.
• Do NOT hedge with phrases like "we cannot determine" or "unable to assess". If a person's bare head is visible on a two-wheeler → flag No Helmet.

━━ EVIDENCE GATE ━━
• Confidence ≥ 0.75: Flag the violation confidently.
• Confidence 0.50–0.74: Flag the violation with that confidence value — do NOT drop it.
• Confidence < 0.50: Exclude entirely (face not visible, image fully obscured, etc.).
• Keep evidence descriptions to exactly 1 concise sentence stating what you see (or do NOT see).

━━ MULTI-VIOLATION MANDATE ━━
If MULTIPLE violations are simultaneously visible (e.g. Triple Riding + No Helmet, or Red Light Jump + Wrong Side Driving), you MUST list ALL verified violations in the violations[] array. Never silently drop a secondary violation.

━━ VIOLATION TAXONOMY (Indian MVA) ━━
TWO-WHEELERS (Motorcycles, Scooters, Mopeds):
  "No Helmet" — rider or pillion's head visible WITHOUT a helmet on it
  "Triple Riding" — 3+ people physically seated on one two-wheeler
  "Footpath Driving" — riding on pedestrian pavement/sidewalk

FOUR-WHEELERS (Cars, SUVs, Taxis):
  "No Seat Belt" — no seatbelt strap visible across driver or front-passenger
  "Tinted Glass" — illegal dark sunfilm blocking visibility into vehicle
  "Passenger Overcrowding" — passengers visibly beyond seating capacity

AUTO-RICKSHAWS:
  "Auto Overcrowding" — excess passengers or passenger seated beside driver
  "Dangerous Passenger Posture" — passengers visibly hanging outside the body

HEAVY/GOODS VEHICLES (Trucks, Buses, Tempos):
  "Overloading Goods" — cargo overflowing or stacked visibly beyond the body
  "Protruding Cargo" — unsecured rods/pipes/timber protruding without markers
  "Carrying Passengers in Goods Vehicle" — people visible in open goods carriage
  "Footboard Travelling" — passengers hanging or standing on bus footboard/door
  "Roof Travelling" — people visible on vehicle roof

MOVING VIOLATIONS (ALL):
  "Red Light Violation" — vehicle crossing stop line while signal is red
  "Wrong Side Driving" — driving against one-way or opposing traffic direction
  "Speeding" — excessive speed evidenced by strong motion blur
  "Rash Driving" — reckless zigzag, stunts, or erratic behavior
  "Mobile Phone Use" — driver/rider visibly holding a phone while moving
  "Lane Cutting" — abrupt unsafe lane change across a solid dividing line
  "Illegal U-Turn" — U-turn at a clearly prohibited location
  "Drunk Driving" — clearly out-of-control vehicle behavior

PARKING/REGULATORY (ALL):
  "Wrong Parking" — in No-Parking zone, zebra crossing, bus stop, or yellow line
  "Footpath Parking" — vehicle parked on pedestrian footpath
  "No Registration Plate" — plate missing, covered, removed, or tampered

━━ OUTPUT ━━
Return ONLY raw valid JSON. No markdown, no preamble, no backticks, no commentary, no explanation.

If violation(s) detected:
{
  "violation_detected": true,
  "vehicle_type": "motorcycle",
  "vehicle_number": "MH12MJ0208",
  "person_count": 3,
  "violations": [
    {
      "type": "Triple Riding",
      "confidence": 0.98,
      "evidence": "Three people are clearly seated on one motorcycle."
    },
    {
      "type": "No Helmet",
      "confidence": 0.96,
      "evidence": "All three riders have no protective headgear visible."
    }
  ],
  "severity": "high",
  "description": "Three people riding one motorcycle without helmets."
}

If NO violation detected:
{
  "violation_detected": false,
  "vehicle_type": "car",
  "vehicle_number": "MH02CR7036",
  "person_count": 1,
  "violations": [],
  "severity": "none",
  "description": "No clear traffic violation."
}
`;

// ─── Stage 1.5 prompt: Reasoning validation ───────────────────────────────────
const REASONING_PROMPT = `
You are a senior traffic police officer validating a vision AI's traffic violation report.
Your job is to CONFIRM real violations, not to dismiss them. Apply Indian MVA rules.

Initial Report:
__RAW_JSON__

VALIDATION RULES:
1. "Triple Riding" is valid ONLY if person_count >= 3 on a two-wheeler. With 1–2 people, remove it.
2. "Overloading Goods" is valid ONLY if cargo is visibly spilling beyond the truck/tempo body. Bags/luggage don't count.
3. "No Helmet" is valid if the rider/pillion's head is visible WITHOUT a helmet. A registered vehicle does NOT exempt from helmet rules. KEEP this violation if the vision AI flagged it.
4. "No Seat Belt" is valid if no seatbelt strap is visible on the driver/front-passenger. KEEP it if flagged.
5. Only remove a violation if it is factually impossible based on the description (e.g. Triple Riding with person_count=2). DO NOT remove violations simply because they seem uncertain — the vision AI already applied a confidence threshold.
6. Preserve the exact JSON schema of the input. Do not add or remove fields.

Output ONLY the final validated JSON. No markdown, no explanations.
`;

// ─── Stage 2 prompt: High-accuracy plate OCR ─────────────────────────────────
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

// ─── JSON extractor ───────────────────────────────────────────────────────────
// Strips thinking tags + markdown fences, then finds the outermost JSON object.
const extractJSON = (text) => {
    if (!text) throw new Error('Empty text passed to extractJSON');
    let clean = stripThinkTags(text);
    clean = clean.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const first = clean.indexOf('{');
    const last  = clean.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first)
        throw new Error('No JSON object found in response');
    return JSON.parse(clean.substring(first, last + 1));
};

// ─── Post-parse violation validator ──────────────────────────────────────────
// Ensures violations list is consistent with model output and description
const validateViolations = (allViolations, parsed) => {
    let violations = [...allViolations];
    const desc = (parsed.description || '').toLowerCase();

    // Auto-detect violations mentioned in description if missing from array
    if (/no\s*helmet|without\s*helmet|no\s*helmets/i.test(desc) && !violations.includes('No Helmet')) {
        violations.push('No Helmet');
    }
    if (/triple|3\s*riders|three\s*people|3\s*people/i.test(desc) && !violations.includes('Triple Riding')) {
        violations.push('Triple Riding');
    }
    if (/footpath|sidewalk|pavement/i.test(desc) && !violations.includes('Driving on Footpath') && !violations.includes('Footpath Driving')) {
        violations.push('Footpath Driving');
    }
    if (/seat\s*belt|seatbelt|without\s*seatbelt/i.test(desc) && !violations.includes('No Seat Belt') && !violations.includes('No Seatbelt')) {
        violations.push('No Seat Belt');
    }
    if (/tinted|dark\s*film|black\s*film/i.test(desc) && !violations.includes('Tinted Glass')) {
        violations.push('Tinted Glass');
    }
    if (/footboard|hanging\s*out/i.test(desc) && !violations.includes('Footboard Travelling')) {
        violations.push('Footboard Travelling');
    }
    if (/roof\s*travelling|on\s*the\s*roof/i.test(desc) && !violations.includes('Roof Travelling')) {
        violations.push('Roof Travelling');
    }
    if (/rash|dangerous\s*driving|reckless|stunt/i.test(desc) && !violations.includes('Rash Driving') && !violations.includes('Dangerous Driving')) {
        violations.push('Rash Driving');
    }
    if (/speeding|fast|excessive\s*speed/i.test(desc) && !violations.includes('Speeding')) {
        violations.push('Speeding');
    }
    if (/wrong\s*side|wrong\s*way|against\s*traffic/i.test(desc) && !violations.includes('Wrong Side Driving') && !violations.includes('Wrong Way')) {
        violations.push('Wrong Side Driving');
    }
    if (/red\s*light|signal\s*jump/i.test(desc) && !violations.includes('Red Light Violation') && !violations.includes('Red Light')) {
        violations.push('Red Light Violation');
    }
    if (/phone|mobile/i.test(desc) && !violations.includes('Mobile Phone Use') && !violations.includes('Phone Use')) {
        violations.push('Mobile Phone Use');
    }
    if (/overload|protruding/i.test(desc) && !violations.includes('Overloading Goods') && !violations.includes('Overloading')) {
        violations.push('Overloading Goods');
    }
    if (/no\s*parking|wrong\s*parking|parked/i.test(desc) && !violations.includes('Wrong Parking') && !violations.some(v => v.includes('Riding') || v.includes('Helmet') || v.includes('Footpath'))) {
        violations.push('Wrong Parking');
    }

    return violations;
};


// ─── Parse violation response ─────────────────────────────────────────────────
// Handles BOTH the new schema (violation_detected / violations[]) and old schema (violationDetected / allViolations).
const parseViolationResult = (raw) => {
    const parsed = extractJSON(raw);
    const desc = (parsed.description || '').toLowerCase();

    // ── Normalise field names: new snake_case schema → camelCase ─────────────
    // violation_detected, vehicle_type, vehicle_number, person_count, violations[]
    const isNewSchema = 'violation_detected' in parsed || Array.isArray(parsed.violations);

    let violationDetected, vehicleType, vehicleNumber, personCount, rawViolations, confidence, severity;

    if (isNewSchema) {
        violationDetected = Boolean(parsed.violation_detected);
        vehicleType       = parsed.vehicle_type  || parsed.vehicleType  || 'other';
        vehicleNumber     = parsed.vehicle_number || parsed.vehicleNumber || 'Not detected';
        personCount       = parsed.person_count  ?? parsed.primaryVehiclePersonCount ?? null;

        // violations[] is an array of objects { type, confidence, evidence }
        rawViolations = Array.isArray(parsed.violations)
            ? parsed.violations.map(v => (typeof v === 'string' ? v : v?.type)).filter(Boolean)
            : [];

        // Confidence: take average of per-violation confidences (0-1 scale → scale to 0-100)
        if (Array.isArray(parsed.violations) && parsed.violations.length > 0) {
            const avgConf = parsed.violations.reduce((s, v) => s + (v?.confidence ?? 0.8), 0) / parsed.violations.length;
            confidence = Math.round(avgConf * 100);
        } else {
            confidence = Math.round((parsed.confidence ?? 0.8) * 100);
            if (confidence <= 1) confidence = Math.round(confidence * 100); // already 0-100
        }

        const severityRaw = (parsed.severity || 'none').toLowerCase();
        severity = severityRaw === 'high'   ? 'High'   :
                   severityRaw === 'medium' ? 'Medium' :
                   severityRaw === 'low'    ? 'Low'    :
                   severityRaw === 'critical' ? 'Critical' : 'None';
    } else {
        // Old camelCase schema
        violationDetected = Boolean(parsed.violationDetected);
        vehicleType       = parsed.vehicleType  || 'other';
        vehicleNumber     = parsed.vehicleNumber || 'Not detected';
        personCount       = parsed.primaryVehiclePersonCount ?? null;
        rawViolations     = parsed.allViolations?.length ? parsed.allViolations : [parsed.violationType || 'Other'];
        confidence        = parsed.confidence ?? 60;
        severity          = null; // computed below
    }

    // ── hasViolationInText safety net (catches boolean mis-set to false) ─────
    const hasViolationInText =
        /triple|no\s*helmet|without\s*helmet|seat\s*belt|seatbelt|footpath|sidewalk|rash|reckless|speeding|red\s*light|wrong\s*side|wrong\s*parking|no\s*parking|overload|phone/i.test(desc) ||
        (rawViolations.length > 0 && rawViolations[0] !== 'None') ||
        (parsed.violationType && parsed.violationType !== 'None');

    const isViolation = violationDetected || hasViolationInText;

    if (!isViolation) {
        return {
            violationDetected: false,
            vehicleNumber:     'Not applicable',
            violationType:     'None',
            allViolations:     [],
            severity:          'None',
            confidence:        confidence ?? 90,
            description:       parsed.description || 'No traffic violation detected.',
        };
    }

    const allViolations = validateViolations(rawViolations, parsed);

    if (allViolations.length === 0) {
        console.log('[AI] Validator produced empty violations — no violation detected');
        return {
            violationDetected: false,
            vehicleNumber:     'Not applicable',
            violationType:     'None',
            allViolations:     [],
            severity:          'None',
            confidence:        confidence ?? 50,
            description:       parsed.description || 'No confirmed violation after validation.',
        };
    }

    const primaryViolation = [...allViolations].sort(
        (a, b) => (VIOLATION_SEVERITY[b] ?? 0) - (VIOLATION_SEVERITY[a] ?? 0)
    )[0];

    if (!severity) {
        const score = VIOLATION_SEVERITY[primaryViolation] ?? 0;
        severity =
            score >= 8 ? 'Critical' :
            score >= 5 ? 'High'     :
            score >= 3 ? 'Medium'   : 'Low';
    }

    const normalizedPlate = (vehicleNumber || 'Not detected').replace(/\s+/g, '').toUpperCase();
    const finalPlate = (normalizedPlate === 'NOTDETECTED' || normalizedPlate === 'NOTAPPLICABLE' || normalizedPlate.length < 4)
        ? 'Not detected'
        : normalizedPlate;

    return {
        violationDetected: true,
        vehicleNumber:     finalPlate,
        violationType:     primaryViolation,
        allViolations,
        severity,
        confidence:        confidence ?? 60,
        description:       parsed.description || 'Violation detected.',
    };

};

// ─── Image preparation ────────────────────────────────────────────────────────


const prepareViolationImage = async (imageUri) => {
    let tempUri = null;
    try {
        const img = await ImageManipulator.manipulateAsync(
            imageUri.split('?')[0],
            [{ resize: { width: 960 } }],      // 960px: sufficient for violation detection, 33% less data vs 1280
            { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG }
        );
        tempUri = img.uri;
        return await FileSystem.readAsStringAsync(tempUri, { encoding: 'base64' });
    } finally {
        if (tempUri) FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
    }
};

const prepareOCRImage = async (imageUri) => {
    let tempUri = null;
    try {
        const img = await ImageManipulator.manipulateAsync(
            imageUri.split('?')[0],
            [{ resize: { width: 1024 } }],     // 1024px: sharp enough for plate OCR, 36% less data vs 1600
            { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
        );
        tempUri = img.uri;
        return await FileSystem.readAsStringAsync(tempUri, { encoding: 'base64' });
    } finally {
        if (tempUri) FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
    }
};

// ─── Main AI service ──────────────────────────────────────────────────────────
export const aiService = {
    /**
     * Analyse a traffic violation image through a 3-stage pipeline:
     *
     *   Stage 1    — Vision scene + violation detection (1280px JPEG, 512 tokens, 45s)
     *   Stage 1.5  — Reasoning validation (text-only, 384 tokens, 30s) — skipped on fast path
     *   Stage 2    — High-res plate OCR fallback (1600px, 256 tokens, 30s) — lazy, only if plate missing
     *
     * Fast path: if Stage 1 returns a valid violation + plate @ ≥ 60% confidence,
     * returns immediately without calling Stage 1.5 or Stage 2.
     *
     * @param {string} imageUri - local file URI from camera/gallery
     * @returns {Promise<object>} violation result object
     */
    analyzeViolationImage: async (imageUri) => {
        try {
            logDiagnostics();

            const visionAttempts    = buildAttemptQueue(AI_CONFIG.visionModels    || []);
            const reasoningAttempts = buildAttemptQueue(AI_CONFIG.reasoningModels || []);
            const ocrAttempts       = buildAttemptQueue(AI_CONFIG.ocrModels       || AI_CONFIG.visionModels || []);

            // ── Stage 1: Vision Detection (1280px) ───────────────────────────
            if (__DEV__) console.log('[AI] Stage 1 — Preparing vision image...');
            const violationB64 = await prepareViolationImage(imageUri);

            if (__DEV__) console.log('[AI] Stage 1 — Vision detection executing...');
            const { text: rawVision, winningAttempt: visionWinner } = await runWithRotation(
                VIOLATION_PROMPT, violationB64, visionAttempts, 'S1-VISION',
                { maxTokens: 512, timeoutMs: 30000 }  // 512 tokens covers full JSON; 30s safe for all providers
            );
            if (__DEV__) console.log('[AI] Stage 1 — Raw output:', rawVision);

            const s1Result = parseViolationResult(rawVision);
            if (__DEV__) console.log('[AI] Stage 1 — Parsed result:', JSON.stringify(s1Result));

            // No violation → return immediately
            if (!s1Result.violationDetected) {
                if (__DEV__) console.log('[AI] ⚡ Fast path: No violation — returning immediately');
                return s1Result;
            }

            const hasValidPlate = s1Result.vehicleNumber &&
                s1Result.vehicleNumber !== 'Not detected' &&
                s1Result.vehicleNumber !== 'Not applicable' &&
                s1Result.vehicleNumber.trim().length >= 4;

            // Violation + readable plate + confidence ≥50% → fast path (skip Stage 1.5 + 2)
            if (hasValidPlate && (s1Result.confidence ?? 0) >= 50) {
                if (__DEV__) console.log(`[AI] ⚡ Fast path: Violation="${s1Result.violationType}", Plate="${s1Result.vehicleNumber}" (${s1Result.confidence}%)`);
                return s1Result;
            }

            // ── Stage 1.5: Reasoning Validation (low confidence / ambiguous) ─
            if (__DEV__) console.log('[AI] Stage 1.5 — Reasoning validation...');
            let finalRaw = rawVision;
            if (reasoningAttempts.length > 0) {
                try {
                    const { text: reasonedText } = await runWithRotation(
                        REASONING_PROMPT.replace('__RAW_JSON__', rawVision),
                        null,
                        reasoningAttempts,
                        'S1.5-REASONING',
                        { maxTokens: 384, timeoutMs: 20000 }  // text-only — Groq responds in < 3s
                    );
                    finalRaw = reasonedText;
                } catch (err) {
                    if (__DEV__) console.warn('[AI] Stage 1.5 failed (non-fatal) — using Stage 1 result:', err.message);
                }
            }

            const violationResult = parseViolationResult(finalRaw);

            // ── Stage 2: Plate OCR (lazy — only if plate still missing) ──────
            const plateMissing =
                !violationResult.vehicleNumber ||
                violationResult.vehicleNumber === 'Not detected' ||
                violationResult.vehicleNumber === 'Not applicable';

            if (violationResult.violationDetected && plateMissing) {
                if (__DEV__) console.log('[AI] Stage 2 — Lazy-loading OCR image...');
                try {
                    const ocrB64 = await prepareOCRImage(imageUri);
                    // OCR uses its own dedicated queue: NVIDIA → Gemini #1 → Gemini #2
                    const { text: rawOCR } = await runWithRotation(
                        PLATE_OCR_PROMPT, ocrB64, ocrAttempts, 'S2-OCR',
                        { maxTokens: 256, timeoutMs: 20000 }  // OCR JSON is tiny; 20s covers all providers
                    );
                    const ocr = extractJSON(rawOCR);
                    if (__DEV__) console.log(`[AI] S2 OCR: "${ocr.plate_text}" @ ${ocr.confidence_percent}%`);

                    const plateValid =
                        ocr.plate_text &&
                        ocr.plate_text !== 'Not detected' &&
                        ocr.plate_text.trim().length >= 4;

                    if (plateValid && (ocr.confidence_percent ?? 0) >= 45) {
                        const normalized = ocr.plate_text.replace(/\s+/g, '').toUpperCase();
                        console.log(`[AI] Plate upgraded: "${violationResult.vehicleNumber}" → "${normalized}"`);
                        violationResult.vehicleNumber = normalized;
                        violationResult.plateOCR = {
                            raw:               ocr.plate_text,
                            confidence:        ocr.confidence_percent,
                            uncertainChars:    ocr.uncertain_characters ?? [],
                            notes:             ocr.notes ?? '',
                        };
                    }
                } catch (err) {
                    console.warn('[AI] Stage 2 OCR failed (non-fatal):', err.message);
                }
            }

            return violationResult;

        } catch (error) {
            console.warn('[AI] Analysis warning/error:', error?.message || error);

            // Development safety fallback — keeps the UI unblocked during failures
            if (__DEV__) {
                console.warn('[AI] 🛡️ SAFETY FALLBACK: Simulated result due to API outage/quota.');
                return {
                    violationDetected: false,
                    vehicleNumber:     'Not detected',
                    violationType:     'None',
                    allViolations:     [],
                    severity:          'None',
                    confidence:        0,
                    description:       'Image could not be analyzed. Please enter the violation details manually.',
                    isMock:            true,
                };
            }

            return {
                violationDetected: false,
                vehicleNumber:     'Not detected',
                violationType:     'None',
                allViolations:     [],
                severity:          'None',
                confidence:        0,
                description:       'Image could not be analyzed. Please enter the violation details manually.',
            };
        }
    },
};

export default aiService;

// Re-export authenticity checker so callers can import from one place
export { checkImageAuthenticity } from './authenticity';
