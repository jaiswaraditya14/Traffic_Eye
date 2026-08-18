#!/usr/bin/env node
/**
 * benchmark_ai_pipeline.js — Traffic Eye AI Pipeline Dry-Run Benchmark
 *
 * Run with: node scripts/benchmark_ai_pipeline.js
 *
 * What this does:
 *   1. Validates environment variable configuration without making API calls.
 *   2. Runs the rule engine with multiple fixture datasets and measures throughput.
 *   3. Prints a provider priority table and configuration summary.
 *   4. Never prints, logs, or returns any API key values.
 *
 * For actual live API latency benchmarks, uncomment Section 4.
 */

'use strict';

// ─── Safety: never reveal keys ────────────────────────────────────────────────
const maskKey = (key) => {
    if (!key || key.length < 8) return '(not set)';
    return key.slice(0, 4) + '••••' + key.slice(-3);
};

// ─── Load env vars from .env if available ─────────────────────────────────────
try {
    require('dotenv').config();
} catch {
    // dotenv not available — continue with process.env
}

const KEYS = {
    nvidia:  [process.env.EXPO_PUBLIC_NVIDIA_API_KEY_1, process.env.EXPO_PUBLIC_NVIDIA_API_KEY].filter(Boolean),
    gemini:  [process.env.EXPO_PUBLIC_GEMINI_API_KEY_1, process.env.EXPO_PUBLIC_GEMINI_API_KEY_2, process.env.EXPO_PUBLIC_GEMINI_API_KEY_3, process.env.EXPO_PUBLIC_GEMINI_API_KEY].filter(Boolean),
    groq:    [process.env.EXPO_PUBLIC_GROQ_API_KEY_1, process.env.EXPO_PUBLIC_GROQ_API_KEY_2, process.env.EXPO_PUBLIC_GROQ_API_KEY_3, process.env.EXPO_PUBLIC_GROQ_API_KEY_4, process.env.EXPO_PUBLIC_GROQ_API_KEY_5, process.env.EXPO_PUBLIC_GROQ_API_KEY_6, process.env.EXPO_PUBLIC_GROQ_API_KEY].filter(Boolean),
};

// ─── Section 1: Configuration Summary ────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  Traffic Eye — AI Pipeline Benchmark & Configuration Validator');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📡  Provider Configuration:');
console.log(`  NVIDIA  — ${KEYS.nvidia.length} key(s) [${KEYS.nvidia.map(k => maskKey(k)).join(', ')}]`);
console.log(`  Gemini  — ${KEYS.gemini.length} key(s) [${KEYS.gemini.map(k => maskKey(k)).join(', ')}]`);
console.log(`  Groq    — ${KEYS.groq.length} key(s) [${KEYS.groq.map(k => maskKey(k)).join(', ')}]\n`);

console.log('🏗️  Pipeline Architecture:');
console.log('  Stage 0  — Local Preprocessing (0ms, 0 API calls)');
console.log('  Stage 1  — NVIDIA Llama-3.2-11B Vision (primary, 12s max)');
console.log('  Stage 1F — Gemini 3.5-Flash Vision (fallback, 12s max)');
console.log('  Stage RE — Local Rule Engine (< 1ms, 0 API calls)');
console.log('  Stage 2  — Plate OCR: Conditional (10s max, lazy)');
console.log('  Stage 3  — Groq GPT-OSS-20B Audit (text-only, 8s max)\n');

console.log('🔑  Priority Table:');
console.log('  ┌────────────┬────────────────────────────────────┬──────────┬──────────┐');
console.log('  │ Stage      │ Model                              │ Provider │ Priority │');
console.log('  ├────────────┼────────────────────────────────────┼──────────┼──────────┤');
console.log('  │ Vision     │ meta/llama-3.2-11b-vision-instruct │ NVIDIA   │ Primary  │');
console.log('  │ Vision     │ gemini-3.5-flash                   │ Gemini   │ Fallback │');
console.log('  │ OCR        │ meta/llama-3.2-11b-vision-instruct │ NVIDIA   │ Primary  │');
console.log('  │ OCR        │ gemini-3.5-flash                   │ Gemini   │ Fallback │');
console.log('  │ Audit      │ openai/gpt-oss-20b                 │ Groq     │ Only     │');
console.log('  └────────────┴────────────────────────────────────┴──────────┴──────────┘\n');

// ─── Section 2: Key Health Check ─────────────────────────────────────────────
console.log('🔍  Key Health:');

let healthy = true;
if (KEYS.nvidia.length === 0) {
    console.warn('  ⚠️  NVIDIA: No keys configured — all reports will fall back to Gemini.');
    healthy = false;
} else {
    console.log(`  ✅  NVIDIA: ${KEYS.nvidia.length} key(s) ready`);
}

if (KEYS.gemini.length === 0) {
    console.error('  ❌  Gemini: No keys configured — CRITICAL. Vision fallback unavailable.');
    healthy = false;
} else {
    console.log(`  ✅  Gemini: ${KEYS.gemini.length} key(s) ready (fallback)`);
}

if (KEYS.groq.length === 0) {
    console.warn('  ⚠️  Groq: No keys configured — Stage 3 audit will be skipped (non-fatal).');
} else {
    console.log(`  ✅  Groq: ${KEYS.groq.length} key(s) ready (text-only auditor)`);
}

console.log();

// ─── Section 3: Rule Engine Throughput Benchmark ──────────────────────────────
console.log('⚡  Rule Engine Throughput Benchmark:');

const VS = { CONFIRMED_ABSENT: 'CONFIRMED_ABSENT', NOT_VISIBLE: 'NOT_VISIBLE', UNCERTAIN: 'UNCERTAIN', NOT_APPLICABLE: 'NOT_APPLICABLE' };
const TWO_WHEELERS = new Set(['motorcycle','scooter','two_wheeler','moped']);
const CONF_HIGH = 0.75;
const conf = (v) => { const n = Number(v); return isNaN(n) ? 0 : (n > 1 ? n / 100 : n); };
const isConfirmedAbsent = (f) => f === VS.CONFIRMED_ABSENT || f === 'absent' || f === false;
const isNotUsable = (f) => !f || f === VS.NOT_VISIBLE || f === VS.UNCERTAIN || f === VS.NOT_APPLICABLE;

function quickEvaluate(evidence) {
    const vehicleType = (evidence.vehicle_type || '').toLowerCase();
    const isTwoWheeler = TWO_WHEELERS.has(vehicleType);
    const violations = [];
    const uncertain  = [];

    // Triple riding
    if (isTwoWheeler) {
        const rc = Number(evidence.rider_count ?? null);
        const rcConf = evidence.rider_count_confidence !== null ? conf(evidence.rider_count_confidence) : null;
        if (!isNaN(rc) && isFinite(rc) && rcConf !== null) {
            if (rcConf >= CONF_HIGH && rc >= 3) violations.push('Triple Riding');
            else if (rcConf < CONF_HIGH && rc >= 3) uncertain.push('triple_riding');
        }
    }

    // Helmet
    if (isTwoWheeler) {
        const hs = evidence.helmet_status;
        const hc = conf(evidence.helmet_confidence ?? 0);
        if (!isNotUsable(hs) && isConfirmedAbsent(hs)) {
            if (hc >= CONF_HIGH) violations.push('No Helmet'); else uncertain.push('no_helmet');
        }
    }

    // Seatbelt
    if (!isTwoWheeler) {
        const ss = evidence.seatbelt_status;
        const sc = conf(evidence.seatbelt_confidence ?? 0);
        if (!isNotUsable(ss) && isConfirmedAbsent(ss)) {
            if (sc >= CONF_HIGH) violations.push('No Seat Belt'); else uncertain.push('no_seatbelt');
        }
    }

    return { violations, uncertain };
}

const FIXTURES = [
    // True positives
    { name: 'Triple riding (confirmed)',  evidence: { vehicle_type: 'motorcycle', rider_count: 3, rider_count_confidence: 0.82, helmet_status: 'CONFIRMED_ABSENT', helmet_confidence: 0.88 }, expect: ['Triple Riding','No Helmet'] },
    { name: 'No helmet (confirmed)',      evidence: { vehicle_type: 'scooter',    rider_count: 1, rider_count_confidence: 0.90, helmet_status: 'CONFIRMED_ABSENT', helmet_confidence: 0.85 }, expect: ['No Helmet'] },
    { name: 'No seatbelt (confirmed)',    evidence: { vehicle_type: 'car',        seatbelt_status: 'CONFIRMED_ABSENT', seatbelt_confidence: 0.80 }, expect: ['No Seat Belt'] },

    // True negatives / fail-closed
    { name: 'Helmet NOT_VISIBLE (no vio)', evidence: { vehicle_type: 'motorcycle', helmet_status: 'NOT_VISIBLE',      helmet_confidence: 0.95 }, expect: [] },
    { name: 'Helmet UNCERTAIN (no vio)',   evidence: { vehicle_type: 'motorcycle', helmet_status: 'UNCERTAIN',        helmet_confidence: 0.95 }, expect: [] },
    { name: 'Helmet conf 74% (no vio)',    evidence: { vehicle_type: 'motorcycle', helmet_status: 'CONFIRMED_ABSENT', helmet_confidence: 0.74 }, expect: [] },
    { name: 'Rider count 2 (no triple)',   evidence: { vehicle_type: 'motorcycle', rider_count: 2, rider_count_confidence: 0.95 },               expect: [] },
    { name: 'No image → no violations',   evidence: {},                                                                                          expect: [] },
];

const ITERATIONS = 50000;
const startBench = Date.now();
for (let i = 0; i < ITERATIONS; i++) {
    for (const fx of FIXTURES) quickEvaluate(fx.evidence);
}
const benchMs = Date.now() - startBench;
const totalEvals = ITERATIONS * FIXTURES.length;
const opsPerSec = Math.round(totalEvals / (benchMs / 1000));

console.log(`  ${totalEvals.toLocaleString()} evaluations in ${benchMs}ms → ${opsPerSec.toLocaleString()} ops/sec\n`);

console.log('🧪  Fixture Correctness Check:');
let fixturesPassed = 0;
for (const fx of FIXTURES) {
    const { violations } = quickEvaluate(fx.evidence);
    const expected = fx.expect;
    const matches = expected.every(v => violations.includes(v)) && violations.every(v => expected.includes(v));
    if (matches) {
        console.log(`  ✅  ${fx.name}`);
        fixturesPassed++;
    } else {
        console.error(`  ❌  ${fx.name}`);
        console.error(`      Expected: [${expected.join(', ')}]`);
        console.error(`      Got:      [${violations.join(', ')}]`);
    }
}

console.log();

// ─── Section 4: Summary ───────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Rule engine: ${fixturesPassed}/${FIXTURES.length} fixtures correct`);
console.log(`  Throughput:  ${opsPerSec.toLocaleString()} evaluations/second`);
console.log(`  Config:      NVIDIA(${KEYS.nvidia.length}) Gemini(${KEYS.gemini.length}) Groq(${KEYS.groq.length})`);
console.log(`  Keys never printed — ${maskKey('placeholder')} format used`);
console.log('═══════════════════════════════════════════════════════════════\n');

const fixturesFailed = FIXTURES.length - fixturesPassed;
if (!healthy || fixturesFailed > 0) {
    console.error(`  ⚠️  Benchmark completed with ${fixturesFailed} fixture failure(s). Check configuration.\n`);
    process.exit(1);
} else {
    console.log('  ✅  Benchmark completed successfully.\n');
    process.exit(0);
}
