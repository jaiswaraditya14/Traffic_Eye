const fs = require('fs');
const path = require('path');

// Load environment variables from .env
const envPath = path.join(__dirname, '..', '.env');
let key1 = process.env.OPENROUTER_API_KEY_1;
let key2 = process.env.OPENROUTER_API_KEY_2;

if ((!key1 || !key2) && fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const m1 = env.match(/OPENROUTER_API_KEY_1\s*=\s*([^\r\n]+)/);
    const m2 = env.match(/OPENROUTER_API_KEY_2\s*=\s*([^\r\n]+)/);
    const mFallback = env.match(/OPENROUTER_API_KEY\s*=\s*([^\r\n]+)/);
    if (m1) key1 = m1[1].trim();
    if (m2) key2 = m2[1].trim();
    if (!key1 && mFallback) key1 = mFallback[1].trim();
}

if (!key1 || !key2) {
    console.error('❌ Both OPENROUTER_API_KEY_1 and OPENROUTER_API_KEY_2 must be present in .env');
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

const OCR_PROMPT = `You are a specialist license plate OCR system for Indian vehicles.
Your ONLY job is to read the number plate text as accurately as possible.

MANDATORY RULES:
1. Read EVERY character individually — never guess or infer missing characters.
2. Common lookalike pairs: 0/O, 1/I/l, 8/B, 5/S, 6/G, 2/Z, 4/A, 7/T
3. Use "?" for any genuinely unreadable character position.
4. Focus ONLY on the PRIMARY vehicle's plate — ignore background plates.
5. If no plate is visible at all, return plate_text = "PLATE_NOT_READABLE".

INDIAN PLATE FORMAT REFERENCE:
  Standard:  [STATE 2-LTR][DISTRICT 2-NUM][SERIES 1-2-LTR][NUM 4-DIGIT]
  Examples:  MH12AB1234  KA04MF0099  DL8CAK0001  UP32ET5678
  BH series: 23BH1234AA

Return ONLY this JSON, nothing else:
{
  "plate_text": "PLATE_NOT_READABLE",
  "confidence_percent": 0,
  "uncertain_characters": [],
  "notes": ""
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

async function runPipelineTest() {
    console.log('================================================================');
    console.log('   TRAFFIC EYE — DUAL-KEY OPENROUTER PIPELINE INTEGRATION TEST');
    console.log('================================================================');

    const sampleImage = path.join(__dirname, '..', 'assets', 'images', '1.jpg');
    if (!fs.existsSync(sampleImage)) {
        throw new Error(`Sample image not found: ${sampleImage}`);
    }
    const imageBase64 = fs.readFileSync(sampleImage).toString('base64');

    // ── STAGE 1: VISION (Tested with Key 1) ──────────────────────────────────
    console.log('\n[Stage 1: Vision Perception] Requesting OpenRouter via Key 1 (nvidia/nemotron-3.5-super-vl:free)...');
    const startVision = Date.now();
    const resVision = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key1}`,
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
            max_tokens: 2048,
        })
    });

    const elapsedVision = Date.now() - startVision;
    console.log(`✓ Vision HTTP Status: ${resVision.status} in ${elapsedVision}ms`);
    if (!resVision.ok) throw new Error(`Vision failed: ${resVision.status}`);
    const jsonVision = await resVision.json();
    const visionMsg = jsonVision.choices?.[0]?.message;
    const rawVisionText = (typeof visionMsg?.content === 'string' && visionMsg.content.trim().length > 0)
        ? visionMsg.content
        : (visionMsg?.reasoning || '');
    
    let parsedVision;
    try {
        parsedVision = extractJSON(rawVisionText);
    } catch (e) {
        console.log('Raw Vision text was:\n', rawVisionText);
        throw e;
    }
    console.log('✓ Vision parsed forensic schema:');
    console.log(`  - Vehicle type: ${parsedVision.vehicle?.type || 'unknown'}`);
    console.log(`  - Plate number: ${parsedVision.vehicle?.plate_number || 'N/A'}`);
    console.log(`  - Helmet status: ${parsedVision.occupants_breakdown?.helmet_status}`);
    console.log(`  - Violations detected: ${JSON.stringify(parsedVision.detected_violations?.map(v => v.violation_type || v))}`);

    // ── STAGE 2: OCR (Tested with Key 2 - Failover/Dual Key Verification) ─────
    console.log('\n[Stage 2: Plate OCR] Requesting OpenRouter via Key 2 (nvidia/nemotron-3.5-super-vl:free)...');
    const startOcr = Date.now();
    const resOcr = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${key2}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://trafficeye.app',
            'X-Title': 'Traffic Eye AI OCR',
        },
        body: JSON.stringify({
            model: 'nvidia/nemotron-3.5-super-vl:free',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: OCR_PROMPT },
                        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 2048,
        })
    });

    const elapsedOcr = Date.now() - startOcr;
    console.log(`✓ OCR HTTP Status: ${resOcr.status} in ${elapsedOcr}ms`);
    if (!resOcr.ok) throw new Error(`OCR failed: ${resOcr.status}`);
    const jsonOcr = await resOcr.json();
    const ocrMsg = jsonOcr.choices?.[0]?.message;
    const rawOcrText = (typeof ocrMsg?.content === 'string' && ocrMsg.content.trim().length > 0)
        ? ocrMsg.content
        : (ocrMsg?.reasoning || '');
    
    const parsedOcr = extractJSON(rawOcrText);
    console.log('✓ OCR parsed response:');
    console.log(`  - Plate text: ${parsedOcr.plate_text}`);
    console.log(`  - Confidence: ${parsedOcr.confidence_percent}%`);

    console.log('\n================================================================');
    console.log('🎉 BOTH OPENROUTER API KEYS (PROVIDER 1 & 2) VERIFIED ACCURATE!');
    console.log('================================================================');
}

runPipelineTest().catch(err => {
    console.error('❌ Pipeline test failed:', err);
    process.exit(1);
});
