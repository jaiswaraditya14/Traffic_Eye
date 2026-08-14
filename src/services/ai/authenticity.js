/**
 * authenticity.js — Stage 0B: Image Authenticity & Manipulation Forensics
 *
 * Priority order (NVIDIA → Gemini #1 → Gemini #2):
 *   1. NVIDIA NIM  meta/llama-3.2-11b-vision-instruct  (primary — generous quota)
 *   2. Gemini #1   gemini-2.0-flash  (key slot 1)
 *   3. Gemini #2   gemini-2.0-flash  (key slot 2)
 *
 * Pipeline:
 *   Step 1 — Local on-device EXIF & metadata forensics (0ms, 0 API calls)
 *             If clearly fake (confidence ≥ 60) → return immediately, no API call.
 *   Step 2 — Vision forensics via NVIDIA → Gemini cascade.
 *             Stops on first success. Never retries a successful provider.
 *
 * If ALL providers fail → returns UNVERIFIED (authentic: false, status: 'unverified').
 * Never auto-marks an image as authentic when all checks fail.
 *
 * Imports shared callAI, buildAttemptQueue, runWithRotation, stripThinkTags
 * from ai/utils.js — avoids circular imports with index.js.
 */

import { AI_CONFIG } from '../../config';
import { callAI, buildAttemptQueue, runWithRotation, stripThinkTags } from './utils';
import { checkLocalAuthenticity } from '../../utils/localAuthenticity';

// ─── Authenticity detection prompt ───────────────────────────────────────────
// Covers: AI-generation, screenshot/re-capture, heavy manipulation, CGI/render.
// NVIDIA llama-3.2-11b does not support JSON mode — prompt must be extremely strict.
const AUTHENTICITY_PROMPT = `You are an image forensics system for an Indian government traffic enforcement platform.
Your task: determine if this image is a GENUINE photograph taken at a real traffic scene,
or whether it is SUSPICIOUS (AI-generated, digitally manipulated, a screenshot, a photo of a screen, or a CGI render).

ANALYSE carefully for these indicators:

━━ SIGNS OF A GENUINE PHOTOGRAPH (authentic: true) ━━
• Natural camera optics: real depth-of-field, lens flare, chromatic aberration, vignetting
• Authentic sensor noise / grain consistent with a phone camera
• Motion blur on moving vehicles that follows physics
• Realistic imperfections: slight tilt, uneven exposure, real shadows
• Real road / street environment: tarmac texture, lane markings, signage
• Number plates that look weathered, dirty, partially obscured, or imperfectly lit
• Compression artefacts consistent with a JPEG photograph
• Consistent perspective and vanishing points

━━ SIGNS OF A SUSPICIOUS / FAKE IMAGE (authentic: false) ━━

AI-Generated (Midjourney / DALL-E / Stable Diffusion / Firefly / Sora):
  • "AI sheen" — unnaturally smooth, plastic-looking metal, rubber, or road surfaces
  • Impossible or physically inconsistent lighting (e.g. shadows pointing in two directions)
  • Background elements with surreal or dreamlike quality
  • Fingers, hands, text, or number plates with melted / distorted characters
  • Overly perfect, symmetrical, scratch-free vehicles
  • Known AI watermarks or style signatures
  • Repeated or mirrored textures that look tiled

Screenshot / Photo-of-a-Screen:
  • Visible screen bezels, phone frame, monitor border, or laptop hinge
  • Screen glare hotspots, Moiré patterns, or display refresh line artefacts
  • Pixel grid pattern visible when zoomed in (display sub-pixels)
  • RGB colour profile with oversaturation typical of an OLED/LCD screen
  • Visible cursor, UI elements, taskbar, browser chrome, or status bar

Heavy Digital Manipulation / Compositing:
  • Hard edges or halos around objects indicating cut-and-paste
  • Clone-stamp artefacts (repeating texture patches)
  • Objects that appear "pasted" onto an otherwise real background
  • Inconsistent grain, noise, or JPEG block size between regions
  • Lighting on a foreground object that does not match background lighting

CGI / 3D Render:
  • Overly perfect geometry with no real-world wear
  • Raytraced reflections and ambient occlusion that look too clean
  • Missing physical imperfections (no dust, scratches, fading)

━━ IMPORTANT RULES ━━
• Low-quality, blurry, dark, or slightly colour-corrected images are NOT suspicious.
• Do NOT flag an image just because the quality is poor.
• Only mark authentic: false when you have CLEAR, SPECIFIC evidence.
• When genuinely uncertain → mark authentic: true with lower confidence.

━━ MANDATORY OUTPUT ━━
Return ONLY this exact JSON object — no markdown, no code fences, no explanation:
{"authentic":true,"confidence":91,"reason":"Genuine photograph with natural camera noise, real depth-of-field, and authentic road texture.","flags":[]}

If suspicious:
{"authentic":false,"confidence":87,"reason":"Image shows AI-generation artefacts: unnaturally smooth vehicle surfaces, inconsistent shadow directions, and perfect plate text with no weathering.","flags":["ai_generated","perfect_plate"]}

Valid flag values (use only these): "ai_generated", "screenshot", "photo_of_screen", "heavy_manipulation", "cgi_render", "watermark_detected", "perfect_plate_only"
Confidence must be an integer 0–100.
`;

// ─── Parse authenticity AI response ──────────────────────────────────────────
export const parseAuthenticityResult = (raw) => {
    console.log('[Authenticity] Raw response:', raw ? (raw.length > 300 ? `${raw.slice(0, 300)}…` : raw) : '(null/empty)');

    if (!raw || typeof raw !== 'string') {
        throw new Error('Raw authenticity response is empty or non-string');
    }

    // 1. Strip <think>...</think> reasoning blocks (Groq Qwen / DeepSeek)
    let cleaned = stripThinkTags(raw);

    // 2. Strip markdown code fences
    cleaned = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // 3. Extract outermost JSON object
    const firstBrace = cleaned.indexOf('{');
    const lastBrace  = cleaned.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error(`No JSON object found in authenticity response. Payload: "${cleaned.slice(0, 120)}"`);
    }

    const jsonStr = cleaned.substring(firstBrace, lastBrace + 1);
    console.log('[Authenticity] Extracted JSON:', jsonStr);

    let parsed;
    try {
        parsed = JSON.parse(jsonStr);
    } catch (e) {
        throw new Error(`Invalid JSON in authenticity response: ${e.message}`);
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Authenticity JSON parsed to non-object');
    }

    // Validate: authentic (boolean, defaults true only if not explicitly false)
    const authentic = typeof parsed.authentic === 'boolean'
        ? parsed.authentic
        : (parsed.authentic !== false);

    // Validate: confidence (number 0–100, required)
    const confidenceNum = Number(parsed.confidence);
    if (typeof parsed.confidence === 'undefined' || parsed.confidence === null || isNaN(confidenceNum) || confidenceNum < 0 || confidenceNum > 100) {
        throw new Error(`Invalid confidence value: ${parsed.confidence}`);
    }

    const flags  = Array.isArray(parsed.flags) ? parsed.flags : [];
    const reason = typeof parsed.reason === 'string' && parsed.reason.trim().length > 0
        ? parsed.reason.trim()
        : 'Image authenticity checked by AI vision forensics.';

    const result = {
        authentic,
        confidence: Math.round(confidenceNum),
        reason,
        flags,
        status: authentic ? 'verified' : 'flagged',
    };

    console.log(`[Authenticity] Parsed: authentic=${result.authentic}, confidence=${result.confidence}%, flags=[${result.flags.join(', ')}]`);
    return result;
};

// ─── UNVERIFIED sentinel ──────────────────────────────────────────────────────
// Returned when ALL providers fail. Never auto-marks as authentic.
const UNVERIFIED = {
    authentic:  false,
    confidence: 0,
    status:     'unverified',
    reason:     'Image authenticity could not be verified — all AI providers failed or timed out.',
    flags:      ['unverified'],
};

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Check whether a submitted image is genuine or suspicious.
 *
 * Priority: NVIDIA → Gemini #1 → Gemini #2
 * Stop immediately on first success. No unnecessary retries.
 *
 * @param {string}  base64Image - base64-encoded JPEG (no data: prefix)
 * @param {string}  [imageUri]  - local file URI for on-device EXIF check
 * @returns {Promise<{ authentic: boolean, confidence: number, reason: string, flags: string[], status: string }>}
 */
export async function checkImageAuthenticity(base64Image, imageUri = null) {
    console.log('[Authenticity] Stage 0B — starting authenticity check...');
    console.log(`[Authenticity] Priority: NVIDIA → Gemini#1 → Gemini#2`);

    // ── Step 1: Local on-device EXIF & metadata forensics (0ms, 0 API calls) ──
    if (imageUri) {
        const local = await checkLocalAuthenticity(imageUri);
        console.log(`[Authenticity] Local check: authentic=${local.authentic}, confidence=${local.confidence}%`);
        if (!local.authentic && local.confidence >= 60) {
            console.log('[Authenticity] ⚡ Local check detected fake — skipping all API calls');
            return { ...local, status: 'flagged' };
        }
    }

    // ── Step 2: Vision forensics cascade (NVIDIA → Gemini #1 → Gemini #2) ────
    // Use authenticityModels queue which is pre-ordered: NVIDIA then Gemini keys.
    const authenticityModels = AI_CONFIG.authenticityModels || AI_CONFIG.visionModels || [];
    const attempts = buildAttemptQueue(authenticityModels);

    if (attempts.length === 0) {
        console.warn('[Authenticity] No API keys configured — returning UNVERIFIED');
        return UNVERIFIED;
    }

    console.log(`[Authenticity] Attempt queue: ${attempts.map(a => `${a.provider}/${a.model.split('/').pop()}`).join(' → ')}`);

    try {
        const { parsed } = await runWithRotation(
            AUTHENTICITY_PROMPT,
            base64Image,
            attempts,
            'S0B-AUTH',
            {
                maxTokens:        512,
                timeoutMs:        30000,
                jsonMode:         true,   // Groq: enforces JSON mode. NVIDIA: prompt-only.
                validateAndParse: parseAuthenticityResult,
            }
        );

        return parsed;

    } catch (err) {
        // All providers exhausted or all timed out → UNVERIFIED, never auto-authentic
        console.warn('[Authenticity] ⚠️ All providers failed — returning UNVERIFIED:', err.message);
        return UNVERIFIED;
    }
}
