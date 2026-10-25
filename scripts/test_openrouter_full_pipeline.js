const fs = require('fs');
const path = require('path');

// Load environment variables from .env
const envPath = path.join(__dirname, '..', '.env');
let key = process.env.OPENROUTER_API_KEY;
if (!key && fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(/OPENROUTER_API_KEY\s*=\s*([^\r\n]+)/);
    if (match) key = match[1].trim();
}

if (!key) {
    console.error('❌ No OPENROUTER_API_KEY found in .env');
    process.exit(1);
}

const VISION_PROMPT = `You are an expert forensic traffic violation AI.
Inspect this photo objectively and evaluate all traffic rules with precision:

1. VEHICLE & OCCUPANTS:
   - Identify vehicle type (motorcycle, scooter, car, auto, bus, truck, etc.).
   - TWO-WHEELERS: Count all riders by inspecting heads along the seat line (driver, middle, pillion) and legs along the sides. Check helmets (caps/hats/bare heads = helmet_status "CONFIRMED_ABSENT").
   - FOUR-WHEELERS: Set helmet_status "NOT_APPLICABLE". Check driver/passenger seatbelts (bare torso without belt = seatbelt_status "CONFIRMED_ABSENT").
   - Read exact license plate characters if legible.

2. VIOLATIONS (0, 1, or Multiple):
   - If NO violations observed -> detected_violations = [].
   - If 1 violation observed (e.g. only NO_HELMET, or only NO_SEATBELT, or only RED_LIGHT) -> return that single violation.
   - If 2 or more simultaneous violations observed (e.g. NO_HELMET and TRIPLE_RIDING) -> return ALL observed violations.

Return ONLY valid JSON matching this schema:
{
  "image_quality": {
    "usable": true,
    "confidence": 0.95
  },
  "vehicle": {
    "type": "motorcycle|scooter|car|auto|bus|truck|tempo|other",
    "make_model_color": "visual description",
    "plate_number": "EXACT_PLATE_OR_PLATE_NOT_READABLE",
    "plate_confidence": 0.95
  },
  "occupants_breakdown": {
    "heads_observed_count": 1,
    "heads_description": "description of heads/caps visible",
    "legs_and_bodies_observed": "description of bodies and legs visible",
    "total_rider_count": 1,
    "helmet_status": "CONFIRMED_ABSENT|CONFIRMED_VISIBLE|NOT_APPLICABLE",
    "helmet_confidence": 0.95,
    "seatbelt_status": "CONFIRMED_ABSENT|CONFIRMED_VISIBLE|NOT_APPLICABLE",
    "seatbelt_confidence": 0.95,
    "phone_in_hand": false
  },
  "detected_violations": [
    {
      "violation_type": "NO_HELMET|TRIPLE_RIDING|PHONE_USAGE|WRONG_SIDE|RED_LIGHT|NO_SEATBELT|OTHER",
      "severity": "HIGH|MEDIUM|LOW",
      "confidence": 0.95,
      "violator": "Rider|Pillion|Both|Driver|All",
      "visual_proof": "Brief description of visual proof from image"
    }
  ],
  "forensic_summary": "Concise summary of vehicle, occupants, and any infractions observed."
}`;

function stripThinkTags(text) {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    const openThinkIdx = cleaned.search(/<think>/i);
    if (openThinkIdx !== -1) {
        const braceIdx = cleaned.indexOf('{', openThinkIdx);
        cleaned = braceIdx !== -1 ? cleaned.substring(braceIdx) : cleaned.substring(0, openThinkIdx);
    }
    return cleaned.replace(/<\/think>/gi, '').trim();
}

function extractJSON(text) {
    if (!text) throw new Error('Empty AI response');
    let clean = stripThinkTags(text)
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();
    const first = clean.indexOf('{');
    const last  = clean.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) {
        throw new Error('No JSON object found in AI response: ' + text.substring(0, 200));
    }
    return JSON.parse(clean.substring(first, last + 1));
}

async function testOpenRouter() {
    console.log('================================================================');
    console.log('   TRAFFIC EYE — OPENROUTER PIPELINE INTEGRATION TEST');
    console.log('================================================================');

    const sampleImage = path.join(__dirname, '..', 'assets', 'images', '1.jpg');
    if (!fs.existsSync(sampleImage)) {
        throw new Error(`Sample image not found: ${sampleImage}`);
    }
    const imageBase64 = fs.readFileSync(sampleImage).toString('base64');

    // ── STAGE 1: VISION ────────────────────────────────────────────────────────
    console.log('\n[Stage 1: Vision Perception] Requesting OpenRouter (nvidia/nemotron-3.5-super-vl:free)...');
    const startVision = Date.now();
    const resVision = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://trafficeye.app',
            'X-Title': 'Traffic Eye AI Vision',
        },
        body: JSON.stringify({
            model: 'nvidia/nemotron-3.5-super-vl:free',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: VISION_PROMPT },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 4096,
        })
    });

    const elapsedVision = Date.now() - startVision;
    console.log(`✓ Vision HTTP Status: ${resVision.status} in ${elapsedVision}ms`);
    if (!resVision.ok) {
        throw new Error(`Vision request failed with HTTP ${resVision.status}`);
    }

    const jsonVision = await resVision.json();
    const visionMsg = jsonVision.choices?.[0]?.message;
    const rawVisionText = (typeof visionMsg?.content === 'string' && visionMsg.content.trim().length > 0)
        ? visionMsg.content
        : (visionMsg?.reasoning || '');
    
    let parsedVision;
    try {
        parsedVision = extractJSON(rawVisionText);
    } catch (e) {
        console.log('Raw Vision text was:', rawVisionText);
        throw e;
    }
    console.log('✓ Vision parsed forensic schema:');
    console.log(`  - Vehicle type: ${parsedVision.vehicle?.type || 'unknown'}`);
    console.log(`  - Plate number: ${parsedVision.vehicle?.plate_number || 'N/A'}`);
    console.log(`  - Helmet status: ${parsedVision.occupants_breakdown?.helmet_status}`);
    console.log(`  - Violations detected: ${JSON.stringify(parsedVision.detected_violations?.map(v => v.violation_type || v))}`);
    console.log(`  - Summary: "${parsedVision.forensic_summary || ''}"`);

    // ── STAGE 2: AUDIT ─────────────────────────────────────────────────────────
    console.log('\n[Stage 3: Consistency Audit] Requesting OpenRouter (nvidia/nemotron-3.5-super-vl:free)...');
    const auditEvidence = `vehicle_type: scooter
vehicle_number: PLATE_NOT_READABLE
plate_status: NOT_VISIBLE
plate_confidence: 0.2
rider_count: 2 (confidence: 0.95)
helmet_status: CONFIRMED_ABSENT (confidence: 0.98)
seatbelt_status: NOT_APPLICABLE (confidence: 0.95)
phone_status: NOT_VISIBLE (confidence: 0)
traffic_light_state: NOT_VISIBLE
vehicle_position: UNKNOWN
road_direction_established: false
vehicle_travel_opposing: false
overall_confidence: 0.95
description: "Two scooter riders without helmet"
uncertain_rule_violations: []`;

    const auditCandidates = ['NO_HELMET'];
    const AUDIT_PROMPT = `You are a senior traffic evidence auditor.
You have received structured evidence from a visual perception system and a list of candidate violations proposed by a deterministic rule engine.

YOUR ROLE: Audit the logical consistency. Accept well-supported violations. Reject unsupported ones. Flag contradictions.
You do not issue penalties and you do not make legal determinations.

MANDATORY RULES — FAIL-CLOSED:
1. If evidence says "UNCERTAIN" or "NOT_VISIBLE", you MUST NOT assert that violation.
2. If rider_count is uncertain, you MUST NOT accept "Triple Riding".
3. If helmet_status is NOT_VISIBLE or UNCERTAIN, you MUST reject "No Helmet".
4. If seatbelt is NOT_VISIBLE or UNCERTAIN, you MUST reject "No Seatbelt".
5. If road_direction_established is false, you MUST reject "Wrong Side Driving".
6. If vehicle_position does not confirm crossing stop line, you MUST reject "Red Light Violation".
7. Never invent a plate number. If plate_text is "PLATE_NOT_READABLE", keep it that way.
8. Never change UNCERTAIN to CONFIRMED_ABSENT.
9. If evidence is contradictory, set requires_manual_review = true.

EVIDENCE SUMMARY:
${auditEvidence}

CANDIDATE VIOLATIONS PROPOSED BY RULE ENGINE:
${auditCandidates.join(', ')}

Return ONLY this JSON:
{
  "accepted_violations": [],
  "rejected_violations": [],
  "rejection_reasons": {},
  "contradictions": [],
  "requires_manual_review": false,
  "final_plate_text": "PLATE_NOT_READABLE",
  "audit_confidence": 0.0,
  "audit_notes": ""
}`;

    const startAudit = Date.now();
    const resAudit = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://trafficeye.app',
            'X-Title': 'Traffic Eye AI Vision',
        },
        body: JSON.stringify({
            model: 'nvidia/nemotron-3.5-super-vl:free',
            messages: [
                { role: 'user', content: AUDIT_PROMPT }
            ],
            temperature: 0.1,
            max_tokens: 3072
        })
    });

    const elapsedAudit = Date.now() - startAudit;
    console.log(`✓ Audit HTTP Status: ${resAudit.status} in ${elapsedAudit}ms`);
    if (!resAudit.ok) {
        throw new Error(`Audit request failed with HTTP ${resAudit.status}`);
    }

    const jsonAudit = await resAudit.json();
    const auditMsg = jsonAudit.choices?.[0]?.message;
    const rawAuditText = (typeof auditMsg?.content === 'string' && auditMsg.content.trim().length > 0)
        ? auditMsg.content
        : (auditMsg?.reasoning || '');
    console.log('AUDIT RAW:', rawAuditText);
    const parsedAudit = extractJSON(rawAuditText);
    console.log('✓ Audit parsed response:');
    console.log(`  - Accepted violations: ${JSON.stringify(parsedAudit.accepted_violations)}`);
    console.log(`  - Rejected violations: ${JSON.stringify(parsedAudit.rejected_violations)}`);
    console.log(`  - Requires manual review: ${parsedAudit.requires_manual_review}`);
    console.log(`  - Audit confidence: ${parsedAudit.audit_confidence}`);
    console.log(`  - Audit notes: "${parsedAudit.audit_notes}"`);

    console.log('\n================================================================');
    console.log('🎉 ALL OPENROUTER PIPELINE STAGES VERIFIED SUCCESSFULLY!');
    console.log('================================================================');
}

testOpenRouter().catch(err => {
    console.error('❌ Pipeline test failed:', err);
    process.exit(1);
});
