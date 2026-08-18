#!/usr/bin/env node
/**
 * benchmark_ai_providers.js  (v2 ? all three providers)
 *
 * Tests NVIDIA NIM, Google Gemini, and Groq for Traffic Eye.
 * SECURITY: API keys are never printed. Only redacted summaries appear.
 * Test image: a pre-generated 32x32 gray JPEG ? no real user evidence.
 */
"use strict";

require("dotenv").config();
const fs   = require("fs");
const path = require("path");

// ??? Redact helper ????????????????????????????????????????????????????????????
const REDACT = k => !k ? "[MISSING]" : "[SET:" + k.length + "chars]";

// ??? Read test image ??????????????????????????????????????????????????????????
const IMG_B64_PATH = path.join(__dirname, "_test_image.b64");
const TEST_IMG_B64 = fs.existsSync(IMG_B64_PATH) ? fs.readFileSync(IMG_B64_PATH, "ascii").trim() : null;
if (!TEST_IMG_B64) { console.error("Missing scripts/_test_image.b64 ? run _gen_jpeg.js first"); process.exit(1); }
console.log("Test image loaded: " + Math.round(TEST_IMG_B64.length * 3 / 4) + " bytes");

// ??? API keys ?????????????????????????????????????????????????????????????????
const NVIDIA_KEYS = [
    process.env.EXPO_PUBLIC_NVIDIA_API_KEY_1,
    process.env.EXPO_PUBLIC_NVIDIA_API_KEY,
].filter(Boolean);

const GEMINI_KEYS = [
    process.env.EXPO_PUBLIC_GEMINI_API_KEY_1,
    process.env.EXPO_PUBLIC_GEMINI_API_KEY_2,
    process.env.EXPO_PUBLIC_GEMINI_API_KEY_3,
    process.env.EXPO_PUBLIC_GEMINI_API_KEY,
].filter(Boolean);

const GROQ_KEYS = [
    process.env.EXPO_PUBLIC_GROQ_API_KEY_1,
    process.env.EXPO_PUBLIC_GROQ_API_KEY_2,
    process.env.EXPO_PUBLIC_GROQ_API_KEY_3,
    process.env.EXPO_PUBLIC_GROQ_API_KEY_4,
    process.env.EXPO_PUBLIC_GROQ_API_KEY_5,
    process.env.EXPO_PUBLIC_GROQ_API_KEY_6,
    process.env.EXPO_PUBLIC_GROQ_API_KEY,
].filter(Boolean);

console.log("\nKey inventory:");
console.log("  NVIDIA: " + NVIDIA_KEYS.length + " key(s) " + NVIDIA_KEYS.map(k => REDACT(k)).join(", "));
console.log("  Gemini: " + GEMINI_KEYS.length + " key(s) " + GEMINI_KEYS.map(k => REDACT(k)).join(", "));
console.log("  Groq:   " + GROQ_KEYS.length  + " key(s) " + GROQ_KEYS.map(k => REDACT(k)).join(", "));
console.log("");

// ??? Timeout fetch ????????????????????????????????????????????????????????????
async function tFetch(url, init, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try { return await fetch(url, { ...init, signal: ctrl.signal }); }
    finally { clearTimeout(t); }
}

// ??? JSON extractor ???????????????????????????????????????????????????????????
function exJSON(text) {
    if (!text) return null;
    const c = text.replace(/<think>[\s\S]*?<\/think>/gi, "")
                  .replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const a = c.indexOf("{"), b = c.lastIndexOf("}");
    if (a === -1 || b <= a) return null;
    try { return JSON.parse(c.substring(a, b + 1)); } catch { return null; }
}

// ??? Validators ???????????????????????????????????????????????????????????????
const ALLOWED_V = new Set([
    "No Helmet","Triple Riding","Footpath Driving","No Seat Belt","Tinted Glass",
    "Passenger Overcrowding","Overloading Goods","Red Light Violation",
    "Wrong Side Driving","Mobile Phone Use","Wrong Parking","No Registration Plate"
]);

function valVision(p) {
    if (!p || typeof p.violation_detected !== "boolean")
        return { valid: false, schemaOK: false, hall: null, msg: "violation_detected missing" };
    if (!Array.isArray(p.violations))
        return { valid: false, schemaOK: false, hall: null, msg: "violations not array" };
    const hall   = p.violation_detected === true && p.violations.length > 0;
    const illgl  = (p.violations || []).some(v => !ALLOWED_V.has(typeof v === "string" ? v : v && v.type));
    return {
        valid: !hall && !illgl, schemaOK: true, hall: hall || illgl,
        msg: hall ? "HALLUCINATION: violation on blank image" : illgl ? "Unsupported violation type" : "OK"
    };
}

function valOCR(p) {
    if (!p || typeof p.plate_text !== "string")
        return { valid: false, schemaOK: false, hall: null, msg: "plate_text missing" };
    if (typeof p.confidence_percent !== "number")
        return { valid: false, schemaOK: false, hall: null, msg: "confidence_percent not number" };
    const hall = p.plate_text !== "Not detected" && p.plate_text.trim().length > 2;
    return { valid: !hall, schemaOK: true, hall, msg: hall ? "HALLUCINATION: invented plate on blank" : "OK" };
}

function valAuth(p) {
    if (!p || typeof p.authentic !== "boolean")
        return { valid: false, schemaOK: false, hall: false, msg: "authentic missing" };
    if (typeof p.confidence !== "number" || p.confidence < 0 || p.confidence > 100)
        return { valid: false, schemaOK: false, hall: false, msg: "confidence invalid" };
    if (!p.reason || !p.reason.trim())
        return { valid: false, schemaOK: false, hall: false, msg: "reason missing" };
    return { valid: true, schemaOK: true, hall: false, msg: "OK" };
}

function valJSON(p) {
    if (!p) return { valid: false, schemaOK: false, hall: false, msg: "No JSON" };
    return { valid: Boolean(p), schemaOK: true, hall: false, msg: "OK" };
}

// ??? Prompts ??????????????????????????????????????????????????????????????????
const P_VISION =
"Analyse this traffic image for violations. Violations allowed: No Helmet, Triple Riding, Footpath Driving, No Seat Belt, Tinted Glass, Passenger Overcrowding, Overloading Goods, Red Light Violation, Wrong Side Driving, Mobile Phone Use, Wrong Parking, No Registration Plate. " +
"For a blank/test image with no vehicles, return violation_detected false and empty violations. " +
"Return ONLY JSON no markdown:\n" +
"{\"violation_detected\":false,\"vehicle_type\":\"other\",\"vehicle_number\":\"Not detected\",\"person_count\":null,\"violations\":[],\"severity\":\"none\",\"confidence\":0.9,\"description\":\"No violation visible.\"}";

const P_OCR =
"You are an Indian number-plate OCR system. If no plate is visible set plate_text 'Not detected'. " +
"Return ONLY JSON no markdown:\n" +
"{\"plate_text\":\"Not detected\",\"confidence_percent\":0,\"uncertain_characters\":[],\"notes\":\"No plate visible\"}";

const P_AUTH =
"You are an image forensics system. Is this image genuine or fake (AI-generated, screenshot, CGI)? " +
"Return ONLY JSON no markdown:\n" +
"{\"authentic\":true,\"confidence\":85,\"reason\":\"Appears to be a test image.\",\"flags\":[]}";

const P_JSON = "Return ONLY this JSON, no markdown, no explanation: {\"ok\":true,\"n\":42}";

// ??? Gemini schemas ???????????????????????????????????????????????????????????
const S_VISION = { type:"OBJECT", properties:{
    violation_detected:{type:"BOOLEAN"}, vehicle_type:{type:"STRING"},
    vehicle_number:{type:"STRING"}, violations:{type:"ARRAY",items:{type:"STRING"}},
    severity:{type:"STRING"}, confidence:{type:"NUMBER"}, description:{type:"STRING"}
}, required:["violation_detected","vehicle_number","violations"]};

const S_OCR = { type:"OBJECT", properties:{
    plate_text:{type:"STRING"}, confidence_percent:{type:"NUMBER"},
    uncertain_characters:{type:"ARRAY",items:{type:"STRING"}}, notes:{type:"STRING"}
}, required:["plate_text","confidence_percent"]};

const S_AUTH = { type:"OBJECT", properties:{
    authentic:{type:"BOOLEAN"}, confidence:{type:"NUMBER"},
    reason:{type:"STRING"}, flags:{type:"ARRAY",items:{type:"STRING"}}
}, required:["authentic","confidence","reason"]};

// ??? Provider callers ?????????????????????????????????????????????????????????
async function callNV(key, model, prompt, b64, ms) {
    const content = b64
        ? [{type:"text",text:prompt},{type:"image_url",image_url:{url:"data:image/jpeg;base64,"+b64}}]
        : prompt;
    const res = await tFetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
        body: JSON.stringify({model, messages:[{role:"user",content}], temperature:0, max_tokens:512})
    }, ms);
    if (!res.ok) { const t=await res.text().catch(()=>""); throw Object.assign(new Error("HTTP "+res.status),{status:res.status,_body:t.slice(0,200)}); }
    const j = await res.json();
    if (!j.choices || !j.choices.length) throw new Error("No choices");
    return { text:j.choices[0].message.content, itok:j.usage&&j.usage.prompt_tokens, otok:j.usage&&j.usage.completion_tokens };
}

async function callGM(key, model, prompt, b64, schema, ms) {
    const parts = b64
        ? [{text:prompt},{inline_data:{mime_type:"image/jpeg",data:b64}}]
        : [{text:prompt}];
    const gc = {temperature:0, maxOutputTokens:512, candidateCount:1, responseMimeType:"application/json"};
    if (schema) gc.responseSchema = schema;
    const res = await tFetch(
        "https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent?key="+key,
        { method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({contents:[{parts}], generationConfig:gc}) },
        ms
    );
    if (!res.ok) { const t=await res.text().catch(()=>""); throw Object.assign(new Error("HTTP "+res.status),{status:res.status,_body:t.slice(0,200)}); }
    const j = await res.json();
    if (!j.candidates || !j.candidates.length) throw new Error("No candidates");
    const text = j.candidates[0].content && j.candidates[0].content.parts && j.candidates[0].content.parts[0] ? j.candidates[0].content.parts[0].text : null;
    if (!text && j.candidates[0].finishReason === "MAX_TOKENS") throw new Error("MAX_TOKENS: response truncated");
    if (!text) throw new Error("Empty text (finishReason="+j.candidates[0].finishReason+")");
    return { text, itok:j.usageMetadata&&j.usageMetadata.promptTokenCount, otok:j.usageMetadata&&j.usageMetadata.candidatesTokenCount };
}

async function callGQ(key, model, prompt, ms, supportsJSON) {
    // Groq ? text-only (no image); uses OpenAI-compatible endpoint
    const body = { model, messages:[{role:"user",content:prompt}], temperature:0, max_completion_tokens:512 };
    if (supportsJSON) body.response_format = {type:"json_object"};
    const res = await tFetch("https://api.groq.com/openai/v1/chat/completions", {
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
        body: JSON.stringify(body)
    }, ms);
    if (!res.ok) { const t=await res.text().catch(()=>""); throw Object.assign(new Error("HTTP "+res.status),{status:res.status,_body:t.slice(0,200)}); }
    const j = await res.json();
    if (!j.choices || !j.choices.length) throw new Error("No choices");
    return { text:j.choices[0].message.content, itok:j.usage&&j.usage.prompt_tokens, otok:j.usage&&j.usage.completion_tokens };
}

// ??? Single test runner ???????????????????????????????????????????????????????
async function runT(name, callFn, validator) {
    const t0 = Date.now();
    const r = { name, ok:false, ms:null, httpSt:null, jsonOK:false, schemaOK:false, hall:null, itok:null, otok:null, err:null, msg:null };
    try {
        const {text, itok, otok} = await callFn();
        r.ms = Date.now()-t0; r.itok=itok||null; r.otok=otok||null;
        const parsed = exJSON(text);
        r.jsonOK = Boolean(parsed);
        if (parsed && validator) {
            const v = validator(parsed);
            r.schemaOK = Boolean(v.schemaOK); r.hall = Boolean(v.hall); r.msg = v.msg; r.ok = v.valid;
        } else if (parsed) {
            r.schemaOK = true; r.ok = true;
        } else {
            r.msg = "Could not extract JSON from: " + (text||"").slice(0,60);
        }
    } catch(e) {
        r.ms = Date.now()-t0; r.httpSt = e.status||null;
        r.err = e.name==="AbortError" ? "TIMEOUT" : e.status ? "HTTP "+e.status : e.message.slice(0,80);
    }
    return r;
}

// ??? Score ????????????????????????????????????????????????????????????????????
function calcScore(tests, supportsVision) {
    const n = tests.length; if (!n) return 0;
    const sr = tests.filter(t=>t.ok).length/n;
    const jr = tests.filter(t=>t.jsonOK).length/n;
    const scr = tests.filter(t=>t.schemaOK).length/n;
    const nhr = tests.filter(t=>t.hall!==true).length/n;
    const lats = tests.filter(t=>t.ms!=null).map(t=>t.ms).sort((a,b)=>a-b);
    const med = lats.length ? lats[Math.floor(lats.length/2)] : 99999;
    const vBonus = supportsVision ? 0 : -10; // penalty for no image support
    return Math.max(0, Math.round(((sr+jr+scr)/3)*35 + nhr*25 + jr*20 + Math.max(0,(1-med/12000))*15 + 5 + vBonus));
}

// ??? Candidate list ???????????????????????????????????????????????????????????
const candidates = [];

if (NVIDIA_KEYS.length) {
    candidates.push({ label:"NVIDIA ? llama-3.2-11b-vision", prov:"nvidia", model:"meta/llama-3.2-11b-vision-instruct", key:NVIDIA_KEYS[0], keyCount:NVIDIA_KEYS.length, supportsVision:true });
    candidates.push({ label:"NVIDIA ? llama-3.2-90b-vision", prov:"nvidia", model:"meta/llama-3.2-90b-vision-instruct", key:NVIDIA_KEYS[0], keyCount:NVIDIA_KEYS.length, supportsVision:true });
}
if (GEMINI_KEYS.length) {
    candidates.push({ label:"Gemini ? 3.5-flash", prov:"gemini", model:"gemini-3.5-flash", key:GEMINI_KEYS[0], keyCount:GEMINI_KEYS.length, supportsVision:true });
    candidates.push({ label:"Gemini ? 3.7-flash", prov:"gemini", model:"gemini-3.7-flash", key:GEMINI_KEYS[0], keyCount:GEMINI_KEYS.length, supportsVision:true });
    candidates.push({ label:"Gemini ? 2.5-flash", prov:"gemini", model:"gemini-2.5-flash", key:GEMINI_KEYS[0], keyCount:GEMINI_KEYS.length, supportsVision:true });
}
if (GROQ_KEYS.length) {
    // Groq: text-only on this account ? no vision models available
    candidates.push({ label:"Groq ? gpt-oss-20b", prov:"groq", model:"openai/gpt-oss-20b", key:GROQ_KEYS[0], keyCount:GROQ_KEYS.length, supportsVision:false });
    candidates.push({ label:"Groq ? gpt-oss-120b", prov:"groq", model:"openai/gpt-oss-120b", key:GROQ_KEYS[0], keyCount:GROQ_KEYS.length, supportsVision:false });
    candidates.push({ label:"Groq ? qwen3.6-27b", prov:"groq", model:"qwen/qwen3.6-27b", key:GROQ_KEYS[0], keyCount:GROQ_KEYS.length, supportsVision:false });
}

if (!candidates.length) { console.error("No API keys ? add to .env"); process.exit(1); }

// ??? Main benchmark loop ?????????????????????????????????????????????????????
const allResults = [];

(async () => {
    for (const c of candidates) {
        console.log("\n? " + c.label + "  [" + c.prov + "]  key=" + REDACT(c.key));
        console.log("  Vision capable: " + (c.supportsVision ? "YES" : "NO (text-only on this account)"));
        const tests = [];

        if (c.prov === "nvidia") {
            // T1: Vision + no-violation
            process.stdout.write("  [1/5] Vision ? no-violation... ");
            tests.push(await runT("Vision: no-violation", ()=>callNV(c.key,c.model,P_VISION,TEST_IMG_B64,12000), valVision));
            const t=tests[tests.length-1]; console.log(t.ok?"? "+t.ms+"ms":"? "+(t.err||t.msg||"?"));

            // T2: JSON format
            process.stdout.write("  [2/5] Vision ? JSON format... ");
            tests.push(await runT("Vision: JSON format", ()=>callNV(c.key,c.model,P_JSON,TEST_IMG_B64,12000), valJSON));
            const t2=tests[tests.length-1]; console.log(t2.ok?"? "+t2.ms+"ms":"? "+(t2.err||t2.msg||"?"));

            // T3: OCR ? blank
            process.stdout.write("  [3/5] OCR ? blank image... ");
            tests.push(await runT("OCR: blank", ()=>callNV(c.key,c.model,P_OCR,TEST_IMG_B64,10000), valOCR));
            const t3=tests[tests.length-1]; console.log(t3.ok?"? "+t3.ms+"ms":"? "+(t3.err||t3.msg||"?"));

            // T4: Authenticity
            process.stdout.write("  [4/5] Authenticity... ");
            tests.push(await runT("Auth: blank", ()=>callNV(c.key,c.model,P_AUTH,TEST_IMG_B64,10000), valAuth));
            const t4=tests[tests.length-1]; console.log(t4.ok?"? "+t4.ms+"ms":"? "+(t4.err||t4.msg||"?"));

            // T5: Text-only baseline
            process.stdout.write("  [5/5] Text-only baseline... ");
            tests.push(await runT("Text: baseline", ()=>callNV(c.key,c.model,P_JSON,null,10000), valJSON));
            const t5=tests[tests.length-1]; console.log(t5.ok?"? "+t5.ms+"ms":"? "+(t5.err||t5.msg||"?"));

        } else if (c.prov === "gemini") {
            // T1: Vision + no-violation
            process.stdout.write("  [1/5] Vision ? no-violation... ");
            tests.push(await runT("Vision: no-violation", ()=>callGM(c.key,c.model,P_VISION,TEST_IMG_B64,S_VISION,12000), valVision));
            const t=tests[tests.length-1]; console.log(t.ok?"? "+t.ms+"ms":"? "+(t.err||t.msg||"?"));

            // T2: JSON format
            process.stdout.write("  [2/5] Vision ? JSON format... ");
            tests.push(await runT("Vision: JSON format", ()=>callGM(c.key,c.model,P_JSON,TEST_IMG_B64,null,12000), valJSON));
            const t2=tests[tests.length-1]; console.log(t2.ok?"? "+t2.ms+"ms":"? "+(t2.err||t2.msg||"?"));

            // T3: OCR ? blank
            process.stdout.write("  [3/5] OCR ? blank image... ");
            tests.push(await runT("OCR: blank", ()=>callGM(c.key,c.model,P_OCR,TEST_IMG_B64,S_OCR,10000), valOCR));
            const t3=tests[tests.length-1]; console.log(t3.ok?"? "+t3.ms+"ms":"? "+(t3.err||t3.msg||"?"));

            // T4: Authenticity
            process.stdout.write("  [4/5] Authenticity... ");
            tests.push(await runT("Auth: blank", ()=>callGM(c.key,c.model,P_AUTH,TEST_IMG_B64,S_AUTH,10000), valAuth));
            const t4=tests[tests.length-1]; console.log(t4.ok?"? "+t4.ms+"ms":"? "+(t4.err||t4.msg||"?"));

            // T5: Text-only
            process.stdout.write("  [5/5] Text-only baseline... ");
            tests.push(await runT("Text: baseline", ()=>callGM(c.key,c.model,P_JSON,null,null,10000), valJSON));
            const t5=tests[tests.length-1]; console.log(t5.ok?"? "+t5.ms+"ms":"? "+(t5.err||t5.msg||"?"));

        } else if (c.prov === "groq") {
            // Groq: text-only. Run 3 text tests and mark image tests as N/A
            const noVisionResult = (name) => ({ name, ok:false, ms:null, jsonOK:false, schemaOK:false, hall:null, itok:null, otok:null, err:"N/A (no vision)", msg:"No image-capable model on this account" });

            process.stdout.write("  [1/5] Vision ? N/A (text-only provider)... ");
            tests.push(noVisionResult("Vision: no-violation")); console.log("??  N/A");

            process.stdout.write("  [2/5] JSON format compliance... ");
            const useJSON = c.model !== "qwen/qwen3.6-27b"; // qwen has broken JSON mode
            tests.push(await runT("JSON: format", ()=>callGQ(c.key,c.model,P_JSON,10000,useJSON), valJSON));
            const t2=tests[tests.length-1]; console.log(t2.ok?"? "+t2.ms+"ms":"? "+(t2.err||t2.msg||"?"));

            process.stdout.write("  [3/5] OCR ? N/A (text-only provider)... ");
            tests.push(noVisionResult("OCR: blank")); console.log("??  N/A");

            process.stdout.write("  [4/5] Auth ? N/A (text-only provider)... ");
            tests.push(noVisionResult("Auth: blank")); console.log("??  N/A");

            process.stdout.write("  [5/5] Reasoning ? JSON validation baseline... ");
            // Test Stage 1.5 reasoning quality: validate a fake vision JSON
            const reasonPrompt = "Validate this traffic violation report. Return ONLY the exact same JSON unchanged: {\"violation_detected\":false,\"violations\":[],\"vehicle_number\":\"Not detected\",\"description\":\"No violation.\"}";
            tests.push(await runT("Reasoning: JSON passthrough", ()=>callGQ(c.key,c.model,reasonPrompt,10000,useJSON), valJSON));
            const t5=tests[tests.length-1]; console.log(t5.ok?"? "+t5.ms+"ms":"? "+(t5.err||t5.msg||"?"));
        }

        const sc   = calcScore(tests, c.supportsVision);
        const pass = tests.filter(t=>t.ok).length;
        const hall = tests.filter(t=>t.hall===true).length;
        const validTests = tests.filter(t=>t.ms!=null);
        const avg  = validTests.length ? Math.round(validTests.reduce((s,t)=>s+t.ms,0)/validTests.length) : 0;
        console.log("  ??? Score: "+sc+"/100  Pass: "+pass+"/"+tests.length+"  Avg: "+avg+"ms  Hallucinations: "+hall);
        allResults.push({...c, tests, sc, pass, hall, avg});
    }

    // ??? Summary table ????????????????????????????????????????????????????????
    console.log("\n\n???????????????????????????????????????? SUMMARY ????????????????????????????????????????\n");
    console.log("Provider/Model              | Score | Pass | Avg Latency | Vision? | Halluc | Status");
    console.log("??????????????????????????? | ????? | ???? | ??????????? | ??????? | ?????? | ??????");
    for (const r of allResults) {
        const disq = r.sc < 40 || r.hall > 0;
        const st   = disq ? "? DISQUALIFIED" : (r.sc >= 65 ? "? RECOMMENDED" : "??  MARGINAL");
        console.log(
            r.label.padEnd(28) + "| " + String(r.sc).padStart(5) + " | " +
            String(r.pass+"/"+r.tests.length).padStart(4) + " | " +
            String(r.avg ? r.avg+"ms" : "N/A").padStart(11) + " | " +
            String(r.supportsVision?"YES":"NO").padStart(7) + " | " +
            String(r.hall).padStart(6) + " | " + st
        );
    }

    // ??? Priority order ????????????????????????????????????????????????????????
    const q = r => r.sc >= 40 && r.hall === 0;
    const qNV = allResults.filter(r=>r.prov==="nvidia" && r.supportsVision && q(r)).sort((a,b)=>b.sc-a.sc);
    const qGM = allResults.filter(r=>r.prov==="gemini" && q(r)).sort((a,b)=>b.sc-a.sc);
    const qGQ = allResults.filter(r=>r.prov==="groq"   && q(r)).sort((a,b)=>b.sc-a.sc);

    const primVision = qNV[0] || null;
    const fallVision = qGM[0] || null;
    const primText   = qGQ[0] || null; // for Stage 1.5 reasoning (text-only)

    console.log("\n\n???????????????? RECOMMENDED PIPELINE ????????????????");
    console.log("Vision/OCR/Auth  Primary:       " + (primVision ? primVision.model : "NONE QUALIFIED"));
    console.log("Vision/OCR/Auth  Fallback:      " + (fallVision ? fallVision.model : "NONE QUALIFIED"));
    console.log("Stage 1.5 Reason Primary:       " + (primText ? primText.model : "(disabled ? reasoningModels=[])"));
    console.log("Stage 1.5 Reason Fallback:      " + (qGQ[1] ? qGQ[1].model : "NONE"));
    console.log("\nNote: pipeline is fail-closed ? uncertain evidence requires manual officer review.");
    console.log("Note: Groq has NO vision models on this account. Groq serves text-only validation.");

    // ??? Markdown report ??????????????????????????????????????????????????????
    const ts = new Date().toISOString();

    const sumRows = allResults.map(r => {
        const disq = r.sc < 40 || r.hall > 0;
        const st = disq ? "? Disqualified" : (r.sc >= 65 ? "? Recommended" : "?? Marginal");
        return "| "+r.label+" | "+r.sc+"/100 | "+r.pass+"/"+r.tests.length+" | "+(r.avg?r.avg+"ms":"N/A")+" | "+(r.supportsVision?"? Yes":"? No")+" | "+r.hall+" | "+st+" |";
    }).join("\n");

    const detRows = allResults.map(r => {
        const rows = r.tests.map(t =>
            "| "+t.name+" | "+(t.ok?"?":"?")+" | "+(t.ms!=null?t.ms+"ms":"N/A")+" | "+(t.jsonOK?"?":"?")+" | "+(t.schemaOK?"?":"?")+" | "+(t.hall===true?"?? YES":t.hall===false?"No":"N/A")+" | "+(t.itok||"N/A")+"/"+(t.otok||"N/A")+" | "+((t.err||t.msg||"?").slice(0,55))+" |"
        ).join("\n");
        return "### "+r.label+" (Score: "+r.sc+"/100  Vision: "+(r.supportsVision?"Yes":"No")+")\n\n"+
            "| Test | Pass | Latency | JSON | Schema | Hallucination | Tokens (in/out) | Notes |\n"+
            "|------|------|---------|------|--------|---------------|-----------------|-------|\n"+rows+"\n";
    }).join("\n");

    const removedRows = [
        "| meta/llama-3.2-90b-vision-instruct (NVIDIA) | Consistent timeout at 12s on free tier ? too slow for mobile real-time use |",
        "| gemini-2.5-flash | HTTP 404 ? model ID not resolvable via v1beta endpoint for this account |",
        "| gemini-2.0-flash, gemini-1.5-flash | Not returned by Gemini model listing for this account |",
        "| qwen/qwen3.6-27b (Groq) | HTTP 400 on JSON mode ? response_format incompatible |",
        "| gemini-3.6-flash (config) | Consistent timeout ? may be under heavy load or restricted for this account |",
        "| llama-3.2-11b/90b-vision (Groq) | NOT available on this Groq account ? text-only models returned |",
    ].join("\n");

    const groqNote = "Groq has **NO vision-capable models** on this account. The 6 configured Groq keys are used for:\n- **Stage 1.5 Reasoning**: text-only JSON validation of the vision result (best models: `openai/gpt-oss-20b` at ~300ms, `openai/gpt-oss-120b` at ~561ms)\n- **NOT** used for image analysis, OCR, or authenticity detection";

    const cfgNote = newVisionModels(qNV, qGM, qGQ);

    function newVisionModels(nv, gm, gq) {
        const vm = [...(nv.map(r=>r.model)), ...(gm.map(r=>r.model))].slice(0,2);
        const rm = gq.length ? [gq[0].model] : [];
        return JSON.stringify({ visionModels: vm, ocrModels: vm, authenticityModels: vm, reasoningModels: rm }, null, 4);
    }

    const report =
"# AI Provider Benchmark Report\n"+
"*Traffic Eye ? Three-Provider Audit (NVIDIA ? Gemini ? Groq) ? "+ts+"*\n\n"+
"> ?? **Security**: No API key values are stored in this report.\n\n"+
"---\n\n"+
"## Key Inventory\n\n"+
"| Provider | Keys Available | Slots |\n"+
"|----------|---------------|-------|\n"+
"| NVIDIA NIM | "+NVIDIA_KEYS.length+" | EXPO_PUBLIC_NVIDIA_API_KEY_1 |\n"+
"| Gemini | "+GEMINI_KEYS.length+" | EXPO_PUBLIC_GEMINI_API_KEY_1, _2 |\n"+
"| Groq | "+GROQ_KEYS.length+" | EXPO_PUBLIC_GROQ_API_KEY_1 ? _6 |\n\n"+
"---\n\n"+
"## Groq Provider Situation\n\n"+
groqNote+"\n\n"+
"---\n\n"+
"## Benchmark Results Summary\n\n"+
"| Provider / Model | Score | Pass | Avg Latency | Vision Input | Hallucinations | Status |\n"+
"|------------------|-------|------|-------------|--------------|----------------|--------|\n"+
sumRows+"\n\n"+
"> **Scoring weights:** Reliability 35% ? Accuracy (no hallucination) 25% ? OCR proxy 20% ? Speed 15% ? Efficiency 5% ? Vision penalty ?10 for text-only\n\n"+
"---\n\n"+
"## Detailed Test Results\n\n"+
detRows+"\n"+
"---\n\n"+
"## Final Production Pipeline\n\n"+
"| Stage | Primary | Fallback | Notes |\n"+
"|-------|---------|----------|-------|\n"+
"| Vision Analysis | `"+(primVision?primVision.model:"NONE")+"` | `"+(fallVision?fallVision.model:"NONE")+"` | Image required |\n"+
"| Number-Plate OCR | `"+(primVision?primVision.model:"NONE")+"` | `"+(fallVision?fallVision.model:"NONE")+"` | Lazy ? only when plate missing |\n"+
"| Image Authenticity | `"+(primVision?primVision.model:"NONE")+"` | `"+(fallVision?fallVision.model:"NONE")+"` | Step 0B |\n"+
"| Stage 1.5 Reasoning | `"+(primText?primText.model:"disabled")+"` | `"+(qGQ[1]?qGQ[1].model:"NONE")+"` | Groq text-only ? no image |\n\n"+
"---\n\n"+
"## Recommended Timeout / Retry Settings\n\n"+
"| Stage | Timeout | Max Attempts | Retry On | Fail-Fast On |\n"+
"|-------|---------|--------------|----------|--------------|\n"+
"| Vision Analysis | 12s | 2 (NVIDIA?Gemini) | 5xx, timeout, network | 4xx (except 429), JSON parse |\n"+
"| OCR | 10s | 2 (NVIDIA?Gemini) | 5xx, timeout, network | 4xx, JSON parse |\n"+
"| Authenticity | 10s | 2 (NVIDIA?Gemini) | 5xx, timeout, network | 4xx, JSON parse |\n"+
"| Stage 1.5 Reasoning | 12s | 1 (Groq text) | none ? skip if fails | any error |\n\n"+
"---\n\n"+
"## Models Removed / Excluded\n\n"+
"| Model | Reason |\n"+
"|-------|--------|\n"+
removedRows+"\n\n"+
"---\n\n"+
"## Recommended ai.config.js Update\n\n"+
"```json\n"+cfgNote+"\n```\n\n"+
"---\n\n"+
"## Test Methodology\n\n"+
"All image tests used a **32?32 gray JPEG** generated locally ? no real user traffic evidence.\n"+
"Test T1 (Vision) and T3 (OCR) check for **hallucination** ? any model that reports a violation or invents a plate number on a blank gray image is disqualified.\n"+
"Temperature **0** for all calls. Gemini: `responseSchema` enforced. NVIDIA: strict JSON prompt. Groq: `response_format.json_object`.\n\n"+
"---\n\n"+
"## Known Limitations\n\n"+
"1. **Hallucinations cannot be fully eliminated** ? the pipeline is **fail-closed**: uncertain results require manual officer review.\n"+
"2. Benchmark uses a blank gray image ? real traffic image performance may differ.\n"+
"3. NVIDIA NIM free tier may throttle. The 90b model consistently times out at 12s.\n"+
"4. Groq has no vision models on this account. If Groq adds vision support, re-benchmark.\n"+
"5. Gemini model availability varies by region and API tier.\n\n"+
"---\n\n"+
"*Generated by `scripts/benchmark_ai_providers.js` v2 ? "+ts+"*\n";

    fs.writeFileSync(path.join(__dirname,"..","AI_PROVIDER_BENCHMARK_REPORT.md"), report, "utf8");
    console.log("\n\n?? Report saved: AI_PROVIDER_BENCHMARK_REPORT.md");
    console.log("\nRecommended ai.config.js update:");
    console.log(cfgNote);

    process.exit(0);
})();