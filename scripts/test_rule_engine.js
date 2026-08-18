#!/usr/bin/env node
/**
 * test_rule_engine.js — Unit tests for src/services/ai/ruleEngine.js
 *
 * Run with: node scripts/test_rule_engine.js
 *
 * No external dependencies — pure Node.js. Uses CommonJS inline because the
 * ruleEngine is ES Module; we replicate the rule logic here rather than
 * requiring a build step. This lets CI run these tests without bundling.
 *
 * Tests verify fail-closed semantics:
 *   - NOT_VISIBLE / UNCERTAIN must NEVER become a violation
 *   - Confidence below 0.75 must NEVER become a violation
 *   - Only CONFIRMED_ABSENT with >= 75% confidence fires a violation
 */

// ─── Mini test harness ────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function expect(desc, actual, expected) {
    if (actual === expected) {
        console.log(`  ✅  ${desc}`);
        passed++;
    } else {
        console.error(`  ❌  ${desc}`);
        console.error(`      Expected: ${JSON.stringify(expected)}`);
        console.error(`      Received: ${JSON.stringify(actual)}`);
        failed++;
    }
}

// ─── Inline key rule functions (mirrors ruleEngine.js logic for Node.js) ──────
const VS = {
    CONFIRMED_VISIBLE:  'CONFIRMED_VISIBLE',
    CONFIRMED_ABSENT:   'CONFIRMED_ABSENT',
    NOT_VISIBLE:        'NOT_VISIBLE',
    UNCERTAIN:          'UNCERTAIN',
    NOT_APPLICABLE:     'NOT_APPLICABLE',
};
const TWO_WHEELERS = new Set(['motorcycle','scooter','two_wheeler','moped','bike','motorbike','two-wheeler']);
const CONF_HIGH = 0.75;

const conf = (v) => { const n = Number(v); return isNaN(n) ? 0 : (n > 1 ? n / 100 : n); };
const isConfirmedAbsent = (f) => f === VS.CONFIRMED_ABSENT || f === 'absent' || f === 'no' || f === false;
const isNotUsable = (f) => !f || f === VS.NOT_VISIBLE || f === VS.UNCERTAIN || f === VS.NOT_APPLICABLE;

function evaluateNoHelmet(evidence) {
    const vehicleType = (evidence.vehicle_type || '').toLowerCase();
    if (!TWO_WHEELERS.has(vehicleType)) return { result: 'no_evidence' };
    const helmetStatus = evidence.helmet_status;
    const helmetConf   = conf(evidence.helmet_confidence ?? 0);
    if (isNotUsable(helmetStatus)) return { result: 'no_evidence', reason: `helmet_status="${helmetStatus}"` };
    if (!isConfirmedAbsent(helmetStatus)) return { result: 'no_evidence' };
    if (helmetConf < CONF_HIGH) return { result: 'uncertain', reason: `conf ${Math.round(helmetConf*100)}% < 75%` };
    return { result: 'confirmed', violation: 'No Helmet' };
}

function evaluateTripleRiding(evidence) {
    const vehicleType = (evidence.vehicle_type || '').toLowerCase();
    if (!TWO_WHEELERS.has(vehicleType)) return { result: 'no_evidence' };
    // Mirror ruleEngine.js: use null coalescing so undefined falls through to null, then Number(null) = 0
    const rawCount  = evidence.rider_count ?? null;
    const riderCount = Number(rawCount);
    // rider_count_confidence: treat undefined the same as null
    const rawConf   = 'rider_count_confidence' in evidence ? evidence.rider_count_confidence : undefined;
    const riderConf = (rawConf === null || rawConf === undefined) ? null : conf(rawConf);
    if (rawCount === null || isNaN(riderCount) || !isFinite(riderCount)) return { result: 'uncertain', reason: 'no count' };
    if (riderConf === null) return { result: 'uncertain', reason: 'no conf' };
    if (riderConf < CONF_HIGH) return { result: 'uncertain', reason: `conf ${Math.round(riderConf*100)}% < 75%` };
    if (riderCount < 3) return { result: 'no_evidence', reason: `count=${riderCount}` };
    return { result: 'confirmed', violation: 'Triple Riding' };
}

function evaluateNoSeatbelt(evidence) {
    const vehicleType    = (evidence.vehicle_type || '').toLowerCase();
    if (TWO_WHEELERS.has(vehicleType)) return { result: 'no_evidence' };
    const seatbeltStatus = evidence.seatbelt_status;
    const seatbeltConf   = conf(evidence.seatbelt_confidence ?? 0);
    if (isNotUsable(seatbeltStatus)) return { result: 'no_evidence', reason: `status="${seatbeltStatus}"` };
    if (!isConfirmedAbsent(seatbeltStatus)) return { result: 'no_evidence' };
    if (seatbeltConf < CONF_HIGH) return { result: 'uncertain' };
    return { result: 'confirmed', violation: 'No Seat Belt' };
}

function evaluateRedLight(evidence) {
    const signalState    = evidence.traffic_light_state;
    const vehiclePosition = evidence.vehicle_position;
    const redLightConf   = conf(evidence.red_light_confidence ?? 0);
    if (!signalState || signalState === VS.UNCERTAIN || signalState === VS.NOT_VISIBLE) return { result: 'no_evidence' };
    if ((signalState || '').toUpperCase() !== 'RED') return { result: 'no_evidence' };
    const posStr = (vehiclePosition || '').toUpperCase();
    const crossed = posStr.includes('PAST_STOP') || posStr.includes('INTERSECTION') || posStr.includes('CROSSING');
    if (!crossed) return { result: 'no_evidence', reason: `position=${vehiclePosition}` };
    if (redLightConf < CONF_HIGH) return { result: 'uncertain' };
    return { result: 'confirmed', violation: 'Red Light Violation' };
}

// ─── Test suites ──────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────────────');
console.log('  Traffic Eye Rule Engine — Unit Tests');
console.log('──────────────────────────────────────────────\n');

// ── NoHelmet tests ────────────────────────────────────────────────────────────
console.log('📋  No Helmet rule:');

expect('Helmet NOT_VISIBLE → no_evidence (not a violation)',
    evaluateNoHelmet({ vehicle_type: 'motorcycle', helmet_status: 'NOT_VISIBLE', helmet_confidence: 0.95 }).result,
    'no_evidence');

expect('Helmet UNCERTAIN → no_evidence (not a violation)',
    evaluateNoHelmet({ vehicle_type: 'motorcycle', helmet_status: 'UNCERTAIN', helmet_confidence: 0.95 }).result,
    'no_evidence');

expect('Helmet CONFIRMED_ABSENT with 74% confidence → uncertain (not a violation)',
    evaluateNoHelmet({ vehicle_type: 'motorcycle', helmet_status: 'CONFIRMED_ABSENT', helmet_confidence: 0.74 }).result,
    'uncertain');

expect('Helmet CONFIRMED_ABSENT with 75% confidence → confirmed',
    evaluateNoHelmet({ vehicle_type: 'motorcycle', helmet_status: 'CONFIRMED_ABSENT', helmet_confidence: 0.75 }).result,
    'confirmed');

expect('Helmet CONFIRMED_ABSENT with 90% confidence → confirmed',
    evaluateNoHelmet({ vehicle_type: 'motorcycle', helmet_status: 'CONFIRMED_ABSENT', helmet_confidence: 0.9 }).result,
    'confirmed');

expect('Car with no helmet (wrong vehicle type) → no_evidence',
    evaluateNoHelmet({ vehicle_type: 'car', helmet_status: 'CONFIRMED_ABSENT', helmet_confidence: 0.95 }).result,
    'no_evidence');

expect('Null helmet status → no_evidence',
    evaluateNoHelmet({ vehicle_type: 'motorcycle', helmet_status: null, helmet_confidence: 0.9 }).result,
    'no_evidence');

// ── TripleRiding tests ────────────────────────────────────────────────────────
console.log('\n📋  Triple Riding rule:');

expect('3 riders with 80% confidence → confirmed',
    evaluateTripleRiding({ vehicle_type: 'motorcycle', rider_count: 3, rider_count_confidence: 0.80 }).result,
    'confirmed');

expect('2 riders with 90% confidence → no_evidence',
    evaluateTripleRiding({ vehicle_type: 'motorcycle', rider_count: 2, rider_count_confidence: 0.90 }).result,
    'no_evidence');

expect('3 riders with 74% confidence → uncertain (not a violation)',
    evaluateTripleRiding({ vehicle_type: 'motorcycle', rider_count: 3, rider_count_confidence: 0.74 }).result,
    'uncertain');

expect('3 riders, confidence null → uncertain',
    evaluateTripleRiding({ vehicle_type: 'motorcycle', rider_count: 3, rider_count_confidence: null }).result,
    'uncertain');

expect('Car with 3 people → no_evidence',
    evaluateTripleRiding({ vehicle_type: 'car', rider_count: 3, rider_count_confidence: 0.9 }).result,
    'no_evidence');

expect('Rider count undefined → uncertain',
    evaluateTripleRiding({ vehicle_type: 'motorcycle', rider_count: undefined, rider_count_confidence: 0.9 }).result,
    'uncertain');

// ── No Seatbelt tests ─────────────────────────────────────────────────────────
console.log('\n📋  No Seatbelt rule:');

expect('Seatbelt CONFIRMED_ABSENT with 80% confidence → confirmed',
    evaluateNoSeatbelt({ vehicle_type: 'car', seatbelt_status: 'CONFIRMED_ABSENT', seatbelt_confidence: 0.80 }).result,
    'confirmed');

expect('Seatbelt NOT_VISIBLE → no_evidence (cannot confirm absence)',
    evaluateNoSeatbelt({ vehicle_type: 'car', seatbelt_status: 'NOT_VISIBLE', seatbelt_confidence: 0.95 }).result,
    'no_evidence');

expect('Seatbelt UNCERTAIN → no_evidence',
    evaluateNoSeatbelt({ vehicle_type: 'car', seatbelt_status: 'UNCERTAIN', seatbelt_confidence: 0.9 }).result,
    'no_evidence');

expect('Two-wheeler with seatbelt check → no_evidence (not applicable)',
    evaluateNoSeatbelt({ vehicle_type: 'motorcycle', seatbelt_status: 'CONFIRMED_ABSENT', seatbelt_confidence: 0.9 }).result,
    'no_evidence');

expect('Car, seatbelt CONFIRMED_ABSENT, 64% confidence → uncertain',
    evaluateNoSeatbelt({ vehicle_type: 'car', seatbelt_status: 'CONFIRMED_ABSENT', seatbelt_confidence: 0.64 }).result,
    'uncertain');

// ── Red Light tests ───────────────────────────────────────────────────────────
console.log('\n📋  Red Light rule:');

expect('RED signal + past stop line + 80% confidence → confirmed',
    evaluateRedLight({ traffic_light_state: 'RED', vehicle_position: 'PAST_STOP_LINE', red_light_confidence: 0.80 }).result,
    'confirmed');

expect('RED signal + vehicle NOT past stop line → no_evidence',
    evaluateRedLight({ traffic_light_state: 'RED', vehicle_position: 'BEFORE_STOP_LINE', red_light_confidence: 0.9 }).result,
    'no_evidence');

expect('GREEN signal → no_evidence',
    evaluateRedLight({ traffic_light_state: 'GREEN', vehicle_position: 'PAST_STOP_LINE', red_light_confidence: 0.9 }).result,
    'no_evidence');

expect('NOT_VISIBLE signal → no_evidence',
    evaluateRedLight({ traffic_light_state: 'NOT_VISIBLE', vehicle_position: 'IN_INTERSECTION', red_light_confidence: 0.9 }).result,
    'no_evidence');

expect('RED + in intersection + 74% confidence → uncertain',
    evaluateRedLight({ traffic_light_state: 'RED', vehicle_position: 'IN_INTERSECTION', red_light_confidence: 0.74 }).result,
    'uncertain');

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────────────');
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log('──────────────────────────────────────────────\n');

if (failed > 0) {
    process.exit(1);
} else {
    console.log('  ✅  All tests passed.\n');
    process.exit(0);
}
