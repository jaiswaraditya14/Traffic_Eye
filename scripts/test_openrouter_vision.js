const fs = require('fs');
const path = require('path');

// Load environment variables from .env if present
try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split(/\r?\n/).forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match && !process.env[match[1]]) {
                process.env[match[1]] = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
            }
        });
    }
} catch {}

const API_KEY = process.env.OPENROUTER_API_KEY || process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;

// Best Overall & Fastest Free Vision Model:
const DEFAULT_MODEL = 'nvidia/nemotron-3.5-super-vl:free';

async function analyzeViolationImage(imagePath, modelName = DEFAULT_MODEL) {
    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image not found at path: ${imagePath}`);
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    const mime = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

    console.log(`\nAnalyzing ${path.basename(imagePath)} with model: [${modelName}] ...`);
    const startTime = Date.now();

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://trafficeye.local',
            'X-Title': 'Traffic Eye AI Vision',
        },
        body: JSON.stringify({
            model: modelName,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: 'You are Traffic Eye AI, an Indian traffic police automated enforcement system. Analyze this image. Return strictly a JSON object with: { "violation_detected": boolean, "violation_type": string or null, "severity": "low"|"medium"|"high"|"critical", "vehicle_number": string or null, "description": string }.'
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${mime};base64,${base64}`
                            }
                        }
                    ]
                }
            ],
            // Keep max_tokens >= 2048 for reasoning models
            max_tokens: 2048,
        })
    });

    const latencyMs = Date.now() - startTime;
    const data = await response.json();

    if (!response.ok) {
        throw new Error(`OpenRouter Error (${response.status}): ${data.error?.message || JSON.stringify(data)}`);
    }

    const message = data.choices?.[0]?.message || {};
    const content = message.content || message.reasoning || '';
    if (!content) {
        console.log('DEBUG message object:', JSON.stringify(message));
    }
    
    // Parse JSON from output
    let parsedJson = null;
    try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            parsedJson = JSON.parse(jsonMatch[0]);
        }
    } catch (err) {
        console.warn('Could not parse strict JSON, raw response returned');
    }

    return {
        latencyMs,
        model: modelName,
        reasoningTokens: data.usage?.completion_tokens_details?.reasoning_tokens || 0,
        result: parsedJson || content,
    };
}

async function run() {
    const sampleImage = path.join(__dirname, '..', 'assets', 'images', '1.jpg');
    
    console.log('================================================================');
    console.log('   TRAFFIC EYE — OPENROUTER FREE VISION AI TEST');
    console.log('================================================================');

    // Test 1: Nemotron 3.5 Super VL (Fastest)
    try {
        const resFast = await analyzeViolationImage(sampleImage, 'nvidia/nemotron-3.5-super-vl:free');
        console.log(`\n⚡ [NVIDIA Nemotron 3.5 Super VL - FASTEST] (${resFast.latencyMs}ms):`);
        console.log(JSON.stringify(resFast.result, null, 2));
    } catch (e) {
        console.log('\n⚡ [NVIDIA Nemotron 3.5 Super VL]:', e.message);
    }

    // Small pause
    await new Promise(r => setTimeout(r, 1500));

    // Test 2: Nemotron 3 Nano Omni (Best Accuracy & Reasoning)
    try {
        const resBest = await analyzeViolationImage(sampleImage, 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free');
        console.log(`\n🎯 [NVIDIA Nemotron 3 Nano Omni - BEST ACCURACY] (${resBest.latencyMs}ms):`);
        console.log(JSON.stringify(resBest.result, null, 2));
    } catch (e) {
        console.log('\n🎯 [NVIDIA Nemotron 3 Nano Omni]:', e.message);
    }
}

run();
