/**
 * ruleEngine.js — Local Deterministic Traffic Violation Rule Engine
 *
 * THE DECISION AUTHORITY. Code decides — not an LLM.
 *
 * The vision model produces structured *observable evidence*. This module
 * applies Indian MVA rules deterministically to that evidence to determine
 * whether a supported violation is sufficiently established.
 *
 * Core principle: Evidence must be CONFIRMED and meet confidence thresholds.
 *   NOT_VISIBLE  ≠ ABSENT
 *   UNCERTAIN    → MANUAL_REVIEW_REQUIRED (never → violation)
 *   Missing field → treat as UNCERTAIN (fail-closed)
 *
 * Each exported function is independently unit-testable (no imports beyond constants).
 *
 * @module ruleEngine
 */

// ─── Confidence thresholds ────────────────────────────────────────────────────
// Applied to evidence from the vision model.
const CONF_HIGH   = 0.75;  // Required for most violation assertions
const CONF_MEDIUM = 0.65;  // Used only for supplementary evidence
const INDIAN_PLATE_PATTERN = /^(?:[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}|\d{2}BH\d{4}[A-Z]{2})$/;

// ─── Visibility states from vision model ─────────────────────────────────────
const VS = {
    CONFIRMED_VISIBLE:  'CONFIRMED_VISIBLE',
    CONFIRMED_ABSENT:   'CONFIRMED_ABSENT',
    NOT_VISIBLE:        'NOT_VISIBLE',
    UNCERTAIN:          'UNCERTAIN',
    NOT_APPLICABLE:     'NOT_APPLICABLE',
};

// ─── Two-wheeler vehicle types ────────────────────────────────────────────────
const TWO_WHEELERS = new Set([
    'motorcycle', 'scooter', 'two_wheeler', 'moped', 'bike',
    'motorbike', 'two-wheeler',
]);

// ─── Violation severity (shared with result formatter) ───────────────────────
export const VIOLATION_SEVERITY = {
    'Drunk Driving':                       10,
    'Dangerous Driving':                    9,
    'Rash Driving':                         9,
    'Driving on Footpath':                  8.5,
    'Footpath Driving':                     8.5,
    'Footpath Riding':                      8.5,
    'Red Light Violation':                  8,
    'Red Light':                            8,
    'Signal Jump':                          8,
    'Wrong Side Driving':                   7,
    'Wrong Way':                            7,
    'Footboard Travelling':                 7,
    'Roof Travelling':                      7,
    'Speeding':                             6,
    'Over Speeding':                        6,
    'Triple Riding':                        5,
    'Overloading':                          5,
    'Overloading Goods':                    5,
    'Protruding Cargo':                     5,
    'Passenger Overcrowding':               4.5,
    'Auto Overcrowding':                    4.5,
    'Dangerous Passenger Posture':          4.5,
    'No Seat Belt':                         4,
    'No Seatbelt':                          4,
    'Tinted Glass':                         3.5,
    'Mobile Phone Use':                     3,
    'Phone Use':                            3,
    'No Registration Plate':                3,
    'Defective Number Plate':               3,
    'No Helmet':                            2,
    'Without Helmet':                       2,
    'Lane Cutting':                         2,
    'Illegal U-Turn':                       2,
    'Wrong Parking':                        1,
    'Illegal Parking':                      1,
    'No Parking':                           1,
    'Footpath Parking':                     1,
    'Parking Violation':                    1,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const conf = (v) => {
    // Normalise 0-100 scale to 0.0-1.0 if needed
    const n = Number(v);
    if (isNaN(n)) return 0;
    return n > 1 ? n / 100 : n;
};

const isConfirmedAbsent = (field) =>
    field === VS.CONFIRMED_ABSENT || field === 'absent' || field === 'no' || field === false;

const isNotUsable = (field) =>
    !field ||
    field === VS.NOT_VISIBLE ||
    field === VS.UNCERTAIN ||
    field === VS.NOT_APPLICABLE;

const normalizePlate = (value) => typeof value === 'string'
    ? value.replace(/\s+/g, '').toUpperCase()
    : '';

// ─── Individual rule evaluators ───────────────────────────────────────────────

/**
 * TRIPLE RIDING
 *
 * Requires: two-wheeler + rider_count >= 3 + confidence >= 0.75
 * Returns 'No evidence' | 'Uncertain' | 'Confirmed'
 *
 * @param {object} evidence - structured evidence from vision model
 * @returns {{ result: 'no_evidence'|'uncertain'|'confirmed', reason: string }}
 */
export function evaluateTripleRiding(evidence) {
    const vehicleType = (evidence.vehicle_type || evidence.vehicleType || '').toLowerCase();
    if (!TWO_WHEELERS.has(vehicleType)) {
        return { result: 'no_evidence', reason: 'Vehicle is not a two-wheeler.' };
    }

    const riderCount    = Number(evidence.rider_count ?? null);
    const riderConfRaw  = 'rider_count_confidence' in evidence
        ? evidence.rider_count_confidence
        : undefined;
    const riderConf     = (riderConfRaw === null || riderConfRaw === undefined) ? null : conf(riderConfRaw);

    if (evidence.rider_count === undefined || isNaN(riderCount) || !isFinite(riderCount)) {
        return { result: 'uncertain', reason: 'Rider count not reported by vision model.' };
    }
    if (riderConf === null) {
        return { result: 'uncertain', reason: 'Rider count confidence not reported.' };
    }

    if (riderConf < CONF_HIGH) {
        return {
            result: 'uncertain',
            reason: `Rider count (${riderCount}) confidence too low (${Math.round(riderConf * 100)}% < ${CONF_HIGH * 100}% threshold).`,
        };
    }
    if (riderCount < 3) {
        return { result: 'no_evidence', reason: `Only ${riderCount} rider(s) visible — Triple Riding requires 3+.` };
    }

    return {
        result:   'confirmed',
        reason:   `${riderCount} riders on two-wheeler, confidence ${Math.round(riderConf * 100)}%.`,
        violation: 'Triple Riding',
    };
}

/**
 * NO HELMET
 *
 * Only fires when: rider visible + head region visible + helmet CONFIRMED_ABSENT.
 * NOT_VISIBLE head → returns 'no_evidence' (do NOT flag as violation).
 *
 * @param {object} evidence
 * @returns {{ result: string, reason: string, violation?: string }}
 */
export function evaluateNoHelmet(evidence) {
    const vehicleType = (evidence.vehicle_type || evidence.vehicleType || '').toLowerCase();
    if (!TWO_WHEELERS.has(vehicleType)) {
        return { result: 'no_evidence', reason: 'Helmet rule applies only to two-wheelers.' };
    }

    const helmetStatus = evidence.helmet_status ?? evidence.helmetStatus;
    const helmetConf   = conf(evidence.helmet_confidence ?? evidence.helmetConfidence ?? 0);

    // Head NOT visible → cannot establish absence of helmet
    if (isNotUsable(helmetStatus)) {
        return {
            result: 'no_evidence',
            reason: `Helmet status is "${helmetStatus || 'unknown'}" — cannot confirm absence. Head may be blocked, cropped, or blurry.`,
        };
    }

    if (!isConfirmedAbsent(helmetStatus)) {
        return { result: 'no_evidence', reason: `Helmet status is "${helmetStatus}" — not confirmed absent.` };
    }

    if (helmetConf < CONF_HIGH) {
        return {
            result: 'uncertain',
            reason: `Helmet absence confidence too low (${Math.round(helmetConf * 100)}% < ${CONF_HIGH * 100}% threshold).`,
        };
    }

    return {
        result:    'confirmed',
        reason:    `Rider's head visible without helmet, confidence ${Math.round(helmetConf * 100)}%.`,
        violation: 'No Helmet',
    };
}

/**
 * NO SEATBELT
 *
 * Only fires when: occupant visible + torso/shoulder region visible + seatbelt CONFIRMED_ABSENT.
 *
 * @param {object} evidence
 * @returns {{ result: string, reason: string, violation?: string }}
 */
export function evaluateNoSeatbelt(evidence) {
    const vehicleType = (evidence.vehicle_type || evidence.vehicleType || '').toLowerCase();
    if (TWO_WHEELERS.has(vehicleType)) {
        return { result: 'no_evidence', reason: 'Seatbelt rule does not apply to two-wheelers.' };
    }

    const seatbeltStatus = evidence.seatbelt_status ?? evidence.seatbeltStatus;
    const seatbeltConf   = conf(evidence.seatbelt_confidence ?? evidence.seatbeltConfidence ?? 0);

    if (isNotUsable(seatbeltStatus)) {
        return {
            result: 'no_evidence',
            reason: `Seatbelt status is "${seatbeltStatus || 'unknown'}" — occupant torso may be occluded or out of frame.`,
        };
    }

    if (!isConfirmedAbsent(seatbeltStatus)) {
        return { result: 'no_evidence', reason: `Seatbelt status is "${seatbeltStatus}" — not confirmed absent.` };
    }

    if (seatbeltConf < CONF_HIGH) {
        return {
            result: 'uncertain',
            reason: `Seatbelt absence confidence too low (${Math.round(seatbeltConf * 100)}% < ${CONF_HIGH * 100}% threshold).`,
        };
    }

    return {
        result:    'confirmed',
        reason:    `Seatbelt not worn, torso region visible, confidence ${Math.round(seatbeltConf * 100)}%.`,
        violation: 'No Seat Belt',
    };
}

/**
 * MOBILE PHONE USE
 *
 * Requires explicit evidence of a phone in hand at ear/face, not merely a raised hand.
 *
 * @param {object} evidence
 * @returns {{ result: string, reason: string, violation?: string }}
 */
export function evaluateMobilePhoneUse(evidence) {
    const phoneStatus   = evidence.phone_status ?? evidence.phoneStatus;
    const phoneConf     = conf(evidence.phone_confidence ?? evidence.phoneConfidence ?? 0);
    const phoneEvidence = evidence.phone_evidence ?? evidence.phoneEvidence ?? '';

    if (isNotUsable(phoneStatus) || phoneStatus !== 'CONFIRMED_IN_USE') {
        return {
            result: 'no_evidence',
            reason: `Phone status is "${phoneStatus || 'unknown'}" — not confirmed in use.`,
        };
    }

    // Must have explicit description of a phone, not just a raised hand
    const desc = (typeof phoneEvidence === 'string' ? phoneEvidence : '').toLowerCase();
    const hasPhoneWord = desc.includes('phone') || desc.includes('mobile') ||
                         desc.includes('handset') || desc.includes('device');
    if (!hasPhoneWord) {
        return {
            result: 'uncertain',
            reason: 'Phone-use evidence does not explicitly describe a phone/mobile device.',
        };
    }

    if (phoneConf < CONF_HIGH) {
        return {
            result: 'uncertain',
            reason: `Phone-use confidence too low (${Math.round(phoneConf * 100)}% < ${CONF_HIGH * 100}% threshold).`,
        };
    }

    return {
        result:    'confirmed',
        reason:    `Phone use confirmed: "${phoneEvidence}", confidence ${Math.round(phoneConf * 100)}%.`,
        violation: 'Mobile Phone Use',
    };
}

/**
 * WRONG SIDE DRIVING / WRONG WAY
 *
 * Requires: road direction established + vehicle travel opposing + confidence >= 0.75.
 * Ambiguous road direction → UNCERTAIN.
 *
 * @param {object} evidence
 * @returns {{ result: string, reason: string, violation?: string }}
 */
export function evaluateWrongWay(evidence) {
    const roadDirEstablished = evidence.road_direction_established ?? evidence.roadDirectionEstablished;
    const vehicleOpposing    = evidence.vehicle_travel_opposing   ?? evidence.vehicleTravelOpposing;
    const wrongWayConf       = conf(evidence.wrong_way_confidence ?? evidence.wrongWayConfidence ?? 0);

    if (!roadDirEstablished || roadDirEstablished === VS.UNCERTAIN || roadDirEstablished === false) {
        return { result: 'no_evidence', reason: 'Road direction not clearly established from image context.' };
    }

    if (!vehicleOpposing || vehicleOpposing === VS.UNCERTAIN || vehicleOpposing === false) {
        return { result: 'no_evidence', reason: 'Vehicle opposing travel direction not confirmed.' };
    }

    if (wrongWayConf < CONF_HIGH) {
        return {
            result: 'uncertain',
            reason: `Wrong-way confidence too low (${Math.round(wrongWayConf * 100)}% < ${CONF_HIGH * 100}% threshold).`,
        };
    }

    return {
        result:    'confirmed',
        reason:    `Road direction established; vehicle confirmed opposing, confidence ${Math.round(wrongWayConf * 100)}%.`,
        violation: 'Wrong Side Driving',
    };
}

/**
 * RED LIGHT VIOLATION
 *
 * Requires: signal state = RED + vehicle position past stop line/intersection.
 * A red light in frame alone is NOT sufficient.
 *
 * @param {object} evidence
 * @returns {{ result: string, reason: string, violation?: string }}
 */
export function evaluateRedLight(evidence) {
    const signalState    = evidence.traffic_light_state ?? evidence.trafficLightState;
    const vehiclePosition = evidence.vehicle_position   ?? evidence.vehiclePosition;
    const redLightConf   = conf(evidence.red_light_confidence ?? evidence.redLightConfidence ?? 0);

    if (!signalState || signalState === VS.UNCERTAIN || signalState === VS.NOT_VISIBLE) {
        return { result: 'no_evidence', reason: 'Traffic signal state not clearly visible.' };
    }

    if ((signalState || '').toUpperCase() !== 'RED') {
        return { result: 'no_evidence', reason: `Signal state is "${signalState}" — not red.` };
    }

    const posStr = (vehiclePosition || '').toUpperCase();
    // Vehicle must have crossed the stop line or be in the intersection
    const vehicleCrossed =
        posStr.includes('PAST_STOP') ||
        posStr.includes('INTERSECTION') ||
        posStr.includes('CROSSING') ||
        posStr === 'IN_INTERSECTION';

    if (!vehicleCrossed) {
        return {
            result: 'no_evidence',
            reason: `Red light visible but vehicle position ("${vehiclePosition}") does not confirm crossing stop line.`,
        };
    }

    if (redLightConf < CONF_HIGH) {
        return {
            result: 'uncertain',
            reason: `Red light violation confidence too low (${Math.round(redLightConf * 100)}% < ${CONF_HIGH * 100}% threshold).`,
        };
    }

    return {
        result:    'confirmed',
        reason:    `Traffic signal RED; vehicle past stop line (${vehiclePosition}), confidence ${Math.round(redLightConf * 100)}%.`,
        violation: 'Red Light Violation',
    };
}

/**
 * NO REGISTRATION PLATE
 *
 * Requires: plate area visible + plate CONFIRMED_MISSING.
 * Blurry or unreadable plate → PLATE_NOT_READABLE (not a "No Plate" violation).
 *
 * @param {object} evidence
 * @returns {{ result: string, reason: string, violation?: string }}
 */
export function evaluateNoRegistrationPlate(evidence) {
    const plateStatus = evidence.plate_status ?? evidence.plateStatus;
    const plateConf   = conf(evidence.plate_confidence ?? evidence.plateConfidence ?? 0);

    if (isNotUsable(plateStatus)) {
        return { result: 'no_evidence', reason: `Plate area status is "${plateStatus || 'unknown'}" — cannot confirm absence.` };
    }

    if (!isConfirmedAbsent(plateStatus)) {
        return { result: 'no_evidence', reason: `Plate status is "${plateStatus}" — not confirmed absent.` };
    }

    if (plateConf < CONF_HIGH) {
        return {
            result: 'uncertain',
            reason: `No-plate confidence too low (${Math.round(plateConf * 100)}% < ${CONF_HIGH * 100}% threshold).`,
        };
    }

    return {
        result:    'confirmed',
        reason:    `Plate area clearly visible with no registration plate present, confidence ${Math.round(plateConf * 100)}%.`,
        violation: 'No Registration Plate',
    };
}

/**
 * OVERLOADING (goods vehicles)
 *
 * Requires: cargo visibly extending beyond vehicle body.
 *
 * @param {object} evidence
 * @returns {{ result: string, reason: string, violation?: string }}
 */
export function evaluateOverloading(evidence) {
    const overloadStatus = evidence.overload_status ?? evidence.overloadStatus;
    const overloadConf   = conf(evidence.overload_confidence ?? evidence.overloadConfidence ?? 0);
    const cargoEvidence  = evidence.cargo_evidence ?? evidence.cargoEvidence ?? '';

    if (isNotUsable(overloadStatus) || !isConfirmedAbsent(overloadStatus) && overloadStatus !== 'CONFIRMED_OVERLOADED') {
        // Check direct flag
        if (overloadStatus !== 'CONFIRMED_OVERLOADED') {
            return { result: 'no_evidence', reason: `Overload status is "${overloadStatus || 'unknown'}" — not confirmed.` };
        }
    }

    if (overloadConf < CONF_HIGH) {
        return {
            result: 'uncertain',
            reason: `Overloading confidence too low (${Math.round(overloadConf * 100)}% < ${CONF_HIGH * 100}% threshold).`,
        };
    }

    const violationType = (evidence.cargo_protrudes || evidence.cargoProtrudes)
        ? 'Protruding Cargo'
        : 'Overloading Goods';

    return {
        result:    'confirmed',
        reason:    cargoEvidence || `Cargo visibly overloaded, confidence ${Math.round(overloadConf * 100)}%.`,
        violation: violationType,
    };
}

/**
 * PASSENGER OVERCROWDING (buses, autos, taxis)
 *
 * Requires: passenger count confirmed to exceed vehicle rated capacity.
 *
 * @param {object} evidence
 * @returns {{ result: string, reason: string, violation?: string }}
 */
export function evaluatePassengerOvercrowding(evidence) {
    const vehicleType      = (evidence.vehicle_type || evidence.vehicleType || '').toLowerCase();
    const overcrowdStatus  = evidence.overcrowding_status ?? evidence.overcrowdingStatus;
    const overcrowdConf    = conf(evidence.overcrowding_confidence ?? evidence.overcrowdingConfidence ?? 0);

    // Only applicable to multi-passenger vehicles
    const isMultiPassenger = vehicleType.includes('auto') || vehicleType.includes('bus') ||
                             vehicleType.includes('taxi') || vehicleType.includes('van') ||
                             vehicleType.includes('tempo') || vehicleType.includes('rickshaw');
    if (!isMultiPassenger) {
        return { result: 'no_evidence', reason: `Overcrowding rule checked for autos/buses/taxis — type is "${vehicleType}".` };
    }

    if (isNotUsable(overcrowdStatus) || overcrowdStatus !== 'CONFIRMED_OVERCROWDED') {
        return { result: 'no_evidence', reason: `Overcrowding status is "${overcrowdStatus || 'unknown'}" — not confirmed.` };
    }

    if (overcrowdConf < CONF_HIGH) {
        return {
            result: 'uncertain',
            reason: `Overcrowding confidence too low (${Math.round(overcrowdConf * 100)}% < ${CONF_HIGH * 100}% threshold).`,
        };
    }

    const violationType = vehicleType.includes('auto') ? 'Auto Overcrowding' : 'Passenger Overcrowding';
    return {
        result:    'confirmed',
        reason:    `Overcrowded vehicle confirmed, confidence ${Math.round(overcrowdConf * 100)}%.`,
        violation: violationType,
    };
}

/**
 * FOOTPATH DRIVING
 *
 * Requires: vehicle clearly on footpath/pavement (not road).
 *
 * @param {object} evidence
 * @returns {{ result: string, reason: string, violation?: string }}
 */
export function evaluateFootpathDriving(evidence) {
    const footpathStatus = evidence.footpath_status ?? evidence.footpathStatus;
    const footpathConf   = conf(evidence.footpath_confidence ?? evidence.footpathConfidence ?? 0);

    if (isNotUsable(footpathStatus) || footpathStatus !== 'CONFIRMED_ON_FOOTPATH') {
        return { result: 'no_evidence', reason: `Footpath status is "${footpathStatus || 'unknown'}" — not confirmed.` };
    }

    if (footpathConf < CONF_HIGH) {
        return {
            result: 'uncertain',
            reason: `Footpath driving confidence too low (${Math.round(footpathConf * 100)}% < ${CONF_HIGH * 100}% threshold).`,
        };
    }

    return {
        result:    'confirmed',
        reason:    `Vehicle confirmed on footpath, confidence ${Math.round(footpathConf * 100)}%.`,
        violation: 'Footpath Driving',
    };
}

// ─── Main rule engine entry point ─────────────────────────────────────────────
/**
 * Apply all applicable traffic violation rules to structured vision evidence.
 *
 * @param {object} evidence   - Structured evidence object from vision model
 * @param {boolean} [verbose] - If true, include per-rule diagnostic output
 * @returns {{
 *   confirmedViolations:  string[],
 *   uncertainViolations:  string[],
 *   requiresManualReview: boolean,
 *   ruleReasons:          object,
 *   plateInfo:            object,
 *   primaryViolation:     string|null,
 *   severity:             string,
 * }}
 */
export function applyRules(evidence, verbose = false) {
    if (!evidence || typeof evidence !== 'object') {
        return {
            confirmedViolations:  [],
            uncertainViolations:  [],
            requiresManualReview: false,
            ruleReasons:          {},
            plateInfo:            { text: 'PLATE_NOT_READABLE', confidence: 0 },
            primaryViolation:     null,
            severity:             'None',
        };
    }

    const evaluators = [
        ['triple_riding',           evaluateTripleRiding],
        ['no_helmet',               evaluateNoHelmet],
        ['no_seatbelt',             evaluateNoSeatbelt],
        ['mobile_phone',            evaluateMobilePhoneUse],
        ['wrong_way',               evaluateWrongWay],
        ['red_light',               evaluateRedLight],
        ['no_registration_plate',   evaluateNoRegistrationPlate],
        ['overloading',             evaluateOverloading],
        ['passenger_overcrowding',  evaluatePassengerOvercrowding],
        ['footpath_driving',        evaluateFootpathDriving],
    ];

    const confirmedViolations = [];
    const uncertainViolations = [];
    const ruleReasons = {};

    for (const [ruleKey, evaluatorFn] of evaluators) {
        try {
            const evalResult = evaluatorFn(evidence);
            ruleReasons[ruleKey] = evalResult;

            if (verbose) {
                console.log(`[RuleEngine] ${ruleKey}: ${evalResult.result} — ${evalResult.reason}`);
            }

            if (evalResult.result === 'confirmed' && evalResult.violation) {
                confirmedViolations.push(evalResult.violation);
            } else if (evalResult.result === 'uncertain') {
                uncertainViolations.push(ruleKey);
            }
        } catch (err) {
            console.warn(`[RuleEngine] Rule "${ruleKey}" threw unexpectedly:`, err.message);
            // A rule crash never becomes a violation — fail-closed
        }
    }

    // ── Plate info ─────────────────────────────────────────────────────────────
    const plateText = evidence.plate_text ?? evidence.plateText ??
                      evidence.vehicle_number ?? evidence.vehicleNumber ?? 'PLATE_NOT_READABLE';
    const plateConf = conf(evidence.plate_confidence ?? evidence.plateConfidence ?? 0);
    const normalizedPlate = normalizePlate(plateText);
    const plateReadable =
        normalizedPlate !== 'NOTDETECTED' &&
        normalizedPlate !== 'NOTAPPLICABLE' &&
        normalizedPlate !== 'PLATE_NOT_READABLE' &&
        plateConf >= CONF_HIGH &&
        !normalizedPlate.includes('?') &&
        INDIAN_PLATE_PATTERN.test(normalizedPlate);

    const plateInfo = {
        text:       plateReadable ? normalizedPlate : 'PLATE_NOT_READABLE',
        confidence: plateConf,
        readable:   plateReadable,
        needsOcr:   !plateReadable && evidence.plate_visible !== false,
    };

    // ── Primary violation and severity ────────────────────────────────────────
    const sortedViolations = [...confirmedViolations].sort(
        (a, b) => (VIOLATION_SEVERITY[b] ?? 0) - (VIOLATION_SEVERITY[a] ?? 0)
    );
    const primaryViolation = sortedViolations[0] || null;

    const severityScore = VIOLATION_SEVERITY[primaryViolation] ?? 0;
    const severity =
        severityScore >= 8 ? 'Critical' :
        severityScore >= 5 ? 'High'     :
        severityScore >= 3 ? 'Medium'   :
        severityScore >= 1 ? 'Low'      : 'None';

    // ── Manual review conditions ──────────────────────────────────────────────
    // Require manual review if there are uncertain violations and no confirmed ones,
    // or if image quality is reported as insufficient.
    const imageUsable = evidence.image_quality?.usable !== false;
    const requiresManualReview =
        !imageUsable ||
        (uncertainViolations.length > 0 && confirmedViolations.length === 0);

    if (verbose) {
        console.log(`[RuleEngine] Confirmed: [${confirmedViolations.join(', ')}]`);
        console.log(`[RuleEngine] Uncertain: [${uncertainViolations.join(', ')}]`);
        console.log(`[RuleEngine] ManualReview: ${requiresManualReview}`);
    }

    return {
        confirmedViolations,
        uncertainViolations,
        requiresManualReview,
        ruleReasons,
        plateInfo,
        primaryViolation,
        severity,
    };
}
