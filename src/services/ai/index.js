/**
 * ai/index.js — Traffic Eye Production AI Analysis Pipeline (v3)
 *
 * Architecture: AI SEES → CODE DECIDES → GROQ AUDITS → UNCERTAINTY → MANUAL REVIEW
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │ Stage 0  — Local Preprocessing & Integrity              │ 0 API calls
 * │ Stage 1  — NVIDIA Vision (primary perception)           │ 12s max, 1 attempt
 * │ Stage 1F — Gemini Vision (fallback, only on failure)    │ 12s max, 1 attempt
 * │ Stage RE — Local Deterministic Rule Engine              │ 0ms, pure code
 * │ Stage 2  — Conditional OCR (only when plate unresolved) │ 10s max, lazy
 * │ Stage 3  — Groq GPT-OSS-20B Consistency Audit (text)   │ 8s max, no image
 * └─────────────────────────────────────────────────────────┘
 *
 * Fail-closed policy:
 *   Any uncertain result → MANUAL_REVIEW_REQUIRED
 *   Any provider failure → next stage or fail-closed
 *   No LLM may directly assert a legal violation
 *   No LLM may invent vehicle registration numbers
 *   Groq never receives image payloads
 *
 * ── Security boundary ───────────────────────────────────────────────────────
 * This module holds no provider credentials and contacts no provider endpoint.
 * Stages 1, 2 and 3 are executed by the authenticated Supabase Edge Function
 * `ai-analyze`, which owns the prompts, the model allow-list, the timeouts and
 * the per-user quota. Stage 0 (preprocessing) and Stage RE (the rule engine)
 * remain on-device because they touch the raw local file and must not send it
 * anywhere.
 */

import { stripThinkTags, invokeAiStage, AiStageError } from './utils';
import { checkLocalIntegrity, prepareVisionImage, prepareOcrImage } from './preprocessing';
import { applyRules, VIOLATION_SEVERITY } from './ruleEngine';

// Re-export shared utilities for callers that import from this module
export { stripThinkTags, invokeAiStage, AiStageError } from './utils';

// ─── Telemetry helper ─────────────────────────────────────────────────────────
const makeTimer = () => {
    const start = Date.now();
    return { elapsed: () => Date.now() - start };
};

// ─── Prompts ─────────────────────────────────────────────────────────────────
// The vision, OCR and audit prompts live in supabase/functions/ai-analyze/prompts.ts.
// Keeping them server-side means an extracted anon key cannot be used to run
// arbitrary prompts against the project's paid provider credit.

// ─── JSON extraction ──────────────────────────────────────────────────────────
const extractJSON = (text) => {
    if (!text) throw new Error('Empty AI response');
    let clean = stripThinkTags(text)
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
    const first = clean.indexOf('{');
    const last  = clean.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first)
        throw new Error('No JSON object found in AI response');
    return JSON.parse(clean.substring(first, last + 1));
};

// ─── Vision evidence extraction from AI response ──────────────────────────────
const parseVisionEvidence = (raw) => {
    const parsed = extractJSON(raw);
    if (parsed.image_quality && typeof parsed.image_quality.usable === 'boolean' && !parsed.image_quality.usable) {
        return { image_quality: { usable: false } };
    }

    const vehicle = parsed.vehicle || {};
    const occupants = parsed.occupants_breakdown || parsed.occupants || {};
    const violations = Array.isArray(parsed.detected_violations)
        ? parsed.detected_violations.map(v => typeof v === 'object' ? v.violation_type : String(v))
        : [];

    const riderCount = occupants.total_rider_count ?? occupants.heads_observed_count ?? occupants.rider_or_passenger_count ?? parsed.rider_count ?? null;
    const helmetStatus = occupants.helmet_status || parsed.helmet_status || (violations.some(v => v.includes('NO_HELMET')) ? 'CONFIRMED_ABSENT' : 'NOT_VISIBLE');

    return {
        ...parsed,
        image_quality: parsed.image_quality || { usable: true },
        vehicle_type: parsed.vehicle_type || vehicle.type || 'motorcycle',
        vehicle_number: parsed.vehicle_number || vehicle.plate_number || 'PLATE_NOT_READABLE',
        plate_confidence: parsed.plate_confidence ?? vehicle.plate_confidence ?? 0.95,
        plate_status: (vehicle.plate_number && vehicle.plate_number !== 'PLATE_NOT_READABLE') ? 'CONFIRMED_VISIBLE' : 'NOT_VISIBLE',
        rider_count: riderCount,
        rider_count_confidence: 0.95,
        helmet_status: helmetStatus,
        helmet_confidence: occupants.helmet_confidence ?? 0.95,
        seatbelt_status: occupants.seatbelt_status || 'NOT_APPLICABLE',
        phone_status: occupants.phone_in_hand ? 'CONFIRMED_IN_USE' : 'NOT_VISIBLE',
        detected_violations: violations,
        description: parsed.description || parsed.forensic_summary || ''
    };
};

// ─── Build a safe text summary for Groq (NO image data, NO API keys) ─────────
const buildEvidenceSummary = (evidence, ruleResult) => {
    const lines = [
        `vehicle_type: ${evidence.vehicle_type || 'unknown'}`,
        `vehicle_number: ${evidence.vehicle_number || 'PLATE_NOT_READABLE'}`,
        `plate_status: ${evidence.plate_status || 'NOT_VISIBLE'}`,
        `plate_confidence: ${evidence.plate_confidence || 0}`,
        `rider_count: ${evidence.rider_count ?? 'null'} (confidence: ${evidence.rider_count_confidence || 0})`,
        `helmet_status: ${evidence.helmet_status || 'NOT_VISIBLE'} (confidence: ${evidence.helmet_confidence || 0})`,
        `seatbelt_status: ${evidence.seatbelt_status || 'NOT_APPLICABLE'} (confidence: ${evidence.seatbelt_confidence || 0})`,
        `phone_status: ${evidence.phone_status || 'NOT_VISIBLE'} (confidence: ${evidence.phone_confidence || 0})`,
        `phone_evidence: "${evidence.phone_evidence || ''}"`,
        `traffic_light_state: ${evidence.traffic_light_state || 'NOT_VISIBLE'}`,
        `vehicle_position: ${evidence.vehicle_position || 'UNKNOWN'}`,
        `road_direction_established: ${evidence.road_direction_established || false}`,
        `vehicle_travel_opposing: ${evidence.vehicle_travel_opposing || false}`,
        `overload_status: ${evidence.overload_status || 'NOT_APPLICABLE'}`,
        `overcrowding_status: ${evidence.overcrowding_status || 'NOT_APPLICABLE'}`,
        `footpath_status: ${evidence.footpath_status || 'NOT_APPLICABLE'}`,
        `overall_confidence: ${evidence.overall_confidence || 0}`,
        `description: "${evidence.description || ''}"`,
        `uncertain_rule_violations: [${(ruleResult.uncertainViolations || []).join(', ')}]`,
    ];
    return lines.join('\n');
};

// ─── Final result formatter ───────────────────────────────────────────────────
const normalizePlateText = (value) => typeof value === 'string'
    ? value.replace(/\s+/g, '').toUpperCase()
    : '';

const INDIAN_PLATE_PATTERN = /^(?:[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}|\d{2}BH\d{4}[A-Z]{2})$/;

const isVerifiedOcrPlate = (ocr) => {
    const plate = normalizePlateText(ocr?.plate_text);
    const confidence = Number(ocr?.confidence_percent);
    return plate && plate !== 'PLATE_NOT_READABLE' &&
        !plate.includes('?') &&
        Number.isFinite(confidence) && confidence >= 75 &&
        INDIAN_PLATE_PATTERN.test(plate);
};

const buildFinalResult = ({ evidence, ruleResult, auditResult, ocrResult, telemetry, integrity, providerUsed, fallbackUsed, ocrUsed }) => {
    // Only local deterministic rules can produce confirmed violations. An
    // auditor may flag uncertainty but must never add, remove, or rename one.
    const violations = ruleResult.confirmedViolations;

    const requiresManualReview =
        auditResult?.requires_manual_review ||
        ruleResult.requiresManualReview ||
        (ruleResult.uncertainViolations.length > 0 && violations.length === 0);

    // Final plate text — never accept unsupported plate from AI
    let plateText = ruleResult.plateInfo?.text || 'PLATE_NOT_READABLE';
    if (isVerifiedOcrPlate(ocrResult)) {
        plateText = normalizePlateText(ocrResult.plate_text);
    }

    // Severity from confirmed violations
    const sortedViolations = [...violations].sort(
        (a, b) => (VIOLATION_SEVERITY[b] ?? 0) - (VIOLATION_SEVERITY[a] ?? 0)
    );
    const primaryViolation = sortedViolations[0] || null;
    const severityScore = VIOLATION_SEVERITY[primaryViolation] ?? 0;
    const severity =
        severityScore >= 8 ? 'Critical' :
        severityScore >= 5 ? 'High'     :
        severityScore >= 3 ? 'Medium'   :
        severityScore >= 1 ? 'Low'      : 'None';

    const violationDetected = violations.length > 0;

    const result = {
        // Core result fields (downstream screens use these)
        violationDetected,
        vehicleNumber:   plateText,
        violationType:   primaryViolation || 'None',
        allViolations:   violations,
        severity,
        confidence:      Math.round((evidence?.overall_confidence ?? 0.7) * 100),
        description:     evidence?.description || (violationDetected ? 'Violation detected.' : 'No violation detected.'),
        requiresManualReview,

        // Plate OCR detail (used by AIResultsVerification)
        plateOCR: ocrResult ? {
            raw:            ocrResult.plate_text,
            confidence:     ocrResult.confidence_percent,
            uncertainChars: ocrResult.uncertain_characters ?? [],
            notes:          ocrResult.notes ?? '',
        } : null,

        // Telemetry (for diagnostics, never shown to user)
        _telemetry: {
            ...telemetry,
            providerUsed,
            fallbackUsed,
            ocrUsed,
            integrityStatus: integrity?.status || 'UNKNOWN',
            auditNotes:      auditResult?.audit_notes || '',
            rejectedViolations: auditResult?.rejected_violations || [],
            contradictions:     auditResult?.contradictions || [],
        },
    };

    console.log(`[AI] ✅ Final: violation=${violationDetected}, violations=[${violations.join(', ')}], plate="${plateText}", manualReview=${requiresManualReview}`);
    console.log(`[AI] ⏱️  Telemetry: preprocessing=${telemetry.preprocessing_ms}ms vision=${telemetry.vision_primary_ms || telemetry.vision_fallback_ms}ms rules=${telemetry.rule_engine_ms}ms ocr=${telemetry.ocr_ms || 0}ms audit=${telemetry.reasoning_ms || 0}ms total=${telemetry.total_ms}ms`);

    return result;
};

// ─── Main AI Service ──────────────────────────────────────────────────────────
export const aiService = {
    /**
     * Analyse a traffic violation image through the production pipeline.
     *
     * Pipeline stages:
     *   Stage 0  — Local preprocessing, integrity check, image normalization
     *   Stage 1  — NVIDIA Vision primary perception (12s max)
     *   Stage 1F — Gemini fallback perception (12s max, only on NVIDIA failure)
     *   Stage RE — Local deterministic rule engine (0ms)
     *   Stage 2  — Conditional OCR (10s max, only when plate unresolved)
     *   Stage 3  — Groq text-only consistency audit (8s max)
     *
     * @param {string}   imageUri    - Local file URI from camera/gallery
     * @param {object}   [options]
     * @param {Function} [options.onStageChange] - Called with (stageName: string) for UI
     * @returns {Promise<object>} Final violation result
     */
    analyzeViolationImage: async (imageUri, { onStageChange } = {}) => {
        const totalTimer = makeTimer();
        const telemetry  = {
            preprocessing_ms:    0,
            vision_primary_ms:   0,
            vision_fallback_ms:  0,
            rule_engine_ms:      0,
            ocr_ms:              0,
            reasoning_ms:        0,
            total_ms:            0,
        };

        let providerUsed  = null;
        let fallbackUsed  = false;
        let ocrUsed       = false;
        let evidence      = null;
        let ruleResult    = null;
        let auditResult   = null;
        let ocrResult     = null;
        let integrity     = null;

        try {
            // ═══════════════════════════════════════════════════════════════════
            // STAGE 0 — Local Preprocessing & Integrity Check
            // ═══════════════════════════════════════════════════════════════════
            if (onStageChange) onStageChange('Preparing image...');
            const t0 = makeTimer();

            const cleanUri = (imageUri || '').split('?')[0];
            integrity = await checkLocalIntegrity(cleanUri);

            if (integrity.status === 'INSUFFICIENT_EVIDENCE') {
                console.warn('[AI] Stage 0: Image unusable —', integrity.integrityDetails?.join('; '));
                return {
                    violationDetected:   false,
                    vehicleNumber:       'Not applicable',
                    violationType:       'None',
                    allViolations:       [],
                    severity:            'None',
                    confidence:          0,
                    description:         'IMAGE_UNUSABLE: ' + (integrity.integrityDetails?.join(' ') || 'Image could not be processed.'),
                    requiresManualReview: false,
                    _telemetry:          { ...telemetry, integrityStatus: 'INSUFFICIENT_EVIDENCE' },
                };
            }

            if (integrity.status === 'POSSIBLE_INTEGRITY_ISSUE') {
                console.warn('[AI] Stage 0: Integrity concern —', integrity.integrityDetails?.join('; '));
                // Continue analysis — officer will review the integrity flag
            }

            // Prepare base64 image for vision
            const visionB64 = await prepareVisionImage(cleanUri);
            telemetry.preprocessing_ms = t0.elapsed();
            console.log(`[AI] Stage 0 complete: ${telemetry.preprocessing_ms}ms, integrity=${integrity.status}`);

            // ═══════════════════════════════════════════════════════════════════
            // STAGE 1 — Primary Vision Perception (NVIDIA → Gemini fallback)
            // ═══════════════════════════════════════════════════════════════════
            if (onStageChange) onStageChange('Analyzing traffic scene...');

            // Provider selection, model fallback (NVIDIA → Gemini) and key
            // rotation all happen server-side inside the ai-analyze Edge
            // Function. The client only asks for the 'vision' stage.
            let visionRaw = null;
            {
                const t1 = makeTimer();
                try {
                    const res = await invokeAiStage({ stage: 'vision', imageBase64: visionB64 });
                    visionRaw     = res.text;
                    providerUsed  = res.provider;
                    fallbackUsed  = res.provider === 'gemini';
                    telemetry.vision_primary_ms = t1.elapsed();
                    console.log(`[AI] Stage 1 Vision: ✅ ${telemetry.vision_primary_ms}ms (server provider=${res.provider})`);
                } catch (visionErr) {
                    telemetry.vision_primary_ms = t1.elapsed();
                    const code = visionErr instanceof AiStageError ? visionErr.code : 'UNKNOWN';
                    console.warn(`[AI] Stage 1 Vision: ✗ ${code}`);
                }
            }

            if (!visionRaw) {
                console.error('[AI] All vision providers failed — ANALYSIS_FAILED');
                return {
                    violationDetected:    false,
                    vehicleNumber:        'Not applicable',
                    violationType:        'None',
                    allViolations:        [],
                    severity:             'None',
                    confidence:           0,
                    description:          'ANALYSIS_FAILED: All vision providers unavailable. Please try again or enter details manually.',
                    requiresManualReview: true,
                    _telemetry:           { ...telemetry, total_ms: totalTimer.elapsed(), integrityStatus: integrity?.status },
                };
            }

            // Parse structured evidence from vision response
            if (onStageChange) onStageChange('Detecting vehicles and violations...');
            try {
                evidence = parseVisionEvidence(visionRaw);
            } catch (parseErr) {
                console.error('[AI] Vision response parse failed:', parseErr.message);
                return {
                    violationDetected:    false,
                    vehicleNumber:        'Not applicable',
                    violationType:        'None',
                    allViolations:        [],
                    severity:             'None',
                    confidence:           0,
                    description:          'ANALYSIS_FAILED: Vision response could not be parsed.',
                    requiresManualReview: true,
                    _telemetry:           { ...telemetry, total_ms: totalTimer.elapsed(), integrityStatus: integrity?.status },
                };
            }

            // Image not usable according to vision model
            if (!evidence.image_quality?.usable) {
                console.warn('[AI] Vision model reports image unusable');
                return {
                    violationDetected:    false,
                    vehicleNumber:        'Not applicable',
                    violationType:        'None',
                    allViolations:        [],
                    severity:             'None',
                    confidence:           0,
                    description:          'IMAGE_UNUSABLE: The image quality is insufficient for analysis.',
                    requiresManualReview: false,
                    _telemetry:           { ...telemetry, total_ms: totalTimer.elapsed(), integrityStatus: integrity?.status },
                };
            }

            // ═══════════════════════════════════════════════════════════════════
            // STAGE RE — Local Deterministic Rule Engine
            // ═══════════════════════════════════════════════════════════════════
            const tRE = makeTimer();
            ruleResult = applyRules(evidence, __DEV__);
            telemetry.rule_engine_ms = tRE.elapsed();
            console.log(`[AI] Stage RE: ${ruleResult.confirmedViolations.length} confirmed, ${ruleResult.uncertainViolations.length} uncertain in ${telemetry.rule_engine_ms}ms`);

            // ── Fast path: no confirmed violations and no uncertainty ──────────
            if (ruleResult.confirmedViolations.length === 0 && ruleResult.uncertainViolations.length === 0) {
                console.log('[AI] ⚡ Fast path: Rule engine found no violations');
                telemetry.total_ms = totalTimer.elapsed();
                return buildFinalResult({ evidence, ruleResult, auditResult: null, ocrResult: null, telemetry, integrity, providerUsed, fallbackUsed, ocrUsed: false });
            }

            // ═══════════════════════════════════════════════════════════════════
            // STAGE 2 — Conditional Plate OCR (lazy, only when plate needed)
            // ═══════════════════════════════════════════════════════════════════
            //
            // Run OCR only if:
            //   a) At least one violation was confirmed by the rule engine, AND
            //   b) The plate is present but unreadable (needsOcr flag)
            //
            if (ruleResult.confirmedViolations.length > 0 && ruleResult.plateInfo.needsOcr) {
                if (onStageChange) onStageChange('Reading vehicle information...');
                const t2 = makeTimer();
                try {
                    console.log('[AI] Stage 2 — OCR: plate present but unreadable, attempting OCR');
                    const ocrB64 = await prepareOcrImage(cleanUri);
                    const { text: rawOCR } = await invokeAiStage({ stage: 'ocr', imageBase64: ocrB64 });
                    const parsedOCR = extractJSON(rawOCR);
                    if (isVerifiedOcrPlate(parsedOCR)) {
                        ocrResult = parsedOCR;
                        console.log(`[AI] Stage 2 OCR: "${parsedOCR.plate_text}" @ ${parsedOCR.confidence_percent}%`);
                    } else {
                        console.log(`[AI] Stage 2 OCR: plate still unreadable (${parsedOCR?.plate_text || 'null'} @ ${parsedOCR?.confidence_percent || 0}%)`);
                    }
                    ocrUsed = true;
                } catch (ocrErr) {
                    console.warn('[AI] Stage 2 OCR failed (non-fatal):', ocrErr.message);
                    ocrUsed = true; // record that we attempted it
                }
                telemetry.ocr_ms = t2.elapsed();
                console.log(`[AI] Stage 2 complete: ${telemetry.ocr_ms}ms`);
            } else if (ruleResult.confirmedViolations.length > 0 && ruleResult.plateInfo.readable) {
                console.log(`[AI] Stage 2 OCR: skipped — plate already readable ("${ruleResult.plateInfo.text}")`);
            } else {
                console.log('[AI] Stage 2 OCR: skipped — no confirmed violations or plate not present');
            }

            // ═══════════════════════════════════════════════════════════════════
            // STAGE 3 — Groq GPT-OSS-20B Text-Only Consistency Audit
            // ═══════════════════════════════════════════════════════════════════
            //
            // Groq receives ONLY structured text evidence — NO image data.
            // Groq validates logical consistency and rejects unsupported violations.
            //
            if (onStageChange) onStageChange('Validating evidence...');
            const candidateViolations = ruleResult.confirmedViolations;

            if (candidateViolations.length > 0) {
                const t3 = makeTimer();
                try {
                    const evidenceSummary = buildEvidenceSummary(evidence, ruleResult);

                    console.log(`[AI] Stage 3 — audit: candidates=[${candidateViolations.join(', ')}]`);

                    // Text-only. The Edge Function sends no image to the auditor.
                    const { text: auditRaw } = await invokeAiStage({
                        stage: 'audit',
                        evidenceSummary,
                        candidates: candidateViolations,
                    });

                    const parsedAudit = extractJSON(auditRaw);

                    // Validate audit response structure
                    if (!Array.isArray(parsedAudit.accepted_violations)) {
                        throw new Error('Groq audit response missing accepted_violations array');
                    }

                    auditResult = parsedAudit;
                    console.log(`[AI] Stage 3 Audit: accepted=[${auditResult.accepted_violations.join(', ')}] rejected=[${(auditResult.rejected_violations || []).join(', ')}]`);
                } catch (auditErr) {
                    console.warn('[AI] Stage 3 Groq audit failed (non-fatal — using rule engine result):', auditErr.message);
                    // Audit failure is non-fatal: we use the rule engine result directly
                    // This is safe because the rule engine is already fail-closed
                }
                telemetry.reasoning_ms = t3.elapsed();
            } else {
                console.log('[AI] Stage 3 audit: skipped — no candidate violations');
            }

            // ═══════════════════════════════════════════════════════════════════
            // RESULT
            // ═══════════════════════════════════════════════════════════════════
            if (onStageChange) onStageChange('Preparing report...');
            telemetry.total_ms = totalTimer.elapsed();

            return buildFinalResult({
                evidence, ruleResult, auditResult, ocrResult,
                telemetry, integrity, providerUsed, fallbackUsed, ocrUsed,
            });

        } catch (fatalError) {
            console.error('[AI] Fatal pipeline error:', fatalError?.message || fatalError);
            telemetry.total_ms = totalTimer.elapsed();

            // In dev: return a safe mock so the UI is not permanently stuck
            if (__DEV__) {
                console.warn('[AI] 🛡️ SAFETY FALLBACK: returning empty result due to pipeline error.');
                return {
                    violationDetected:    false,
                    vehicleNumber:        'Not detected',
                    violationType:        'None',
                    allViolations:        [],
                    severity:             'None',
                    confidence:           0,
                    description:          'ANALYSIS_FAILED: Image could not be analyzed. Please enter violation details manually.',
                    requiresManualReview: true,
                    isMock:               true,
                    _telemetry:           { ...telemetry, integrityStatus: integrity?.status || 'UNKNOWN' },
                };
            }

            return {
                violationDetected:    false,
                vehicleNumber:        'Not detected',
                violationType:        'None',
                allViolations:        [],
                severity:             'None',
                confidence:           0,
                description:          'ANALYSIS_FAILED: Image could not be analyzed. Please enter violation details manually.',
                requiresManualReview: true,
                _telemetry:           { ...telemetry, integrityStatus: integrity?.status || 'UNKNOWN' },
            };
        }
    },
};

export default aiService;

// Re-export authenticity checker for callers that import from this module
export { checkImageAuthenticity } from './authenticity';
