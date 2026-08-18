# AI Provider Benchmark Report
*Traffic Eye ? Three-Provider Audit (NVIDIA ? Gemini ? Groq) ? 2026-08-18T13:37:41.284Z*

> ?? **Security**: No API key values are stored in this report.

---

## Key Inventory

| Provider | Keys Available | Slots |
|----------|---------------|-------|
| NVIDIA NIM | 1 | EXPO_PUBLIC_NVIDIA_API_KEY_1 |
| Gemini | 2 | EXPO_PUBLIC_GEMINI_API_KEY_1, _2 |
| Groq | 6 | EXPO_PUBLIC_GROQ_API_KEY_1 ? _6 |

---

## Groq Provider Situation

Groq has **NO vision-capable models** on this account. The 6 configured Groq keys are used for:
- **Stage 1.5 Reasoning**: text-only JSON validation of the vision result (best models: `openai/gpt-oss-20b` at ~300ms, `openai/gpt-oss-120b` at ~561ms)
- **NOT** used for image analysis, OCR, or authenticity detection

---

## Benchmark Results Summary

| Provider / Model | Score | Pass | Avg Latency | Vision Input | Hallucinations | Status |
|------------------|-------|------|-------------|--------------|----------------|--------|
| NVIDIA ? llama-3.2-11b-vision | 72/100 | 3/5 | 4352ms | ? Yes | 0 | ? Recommended |
| NVIDIA ? llama-3.2-90b-vision | 32/100 | 0/5 | 10810ms | ? Yes | 0 | ? Disqualified |
| Gemini ? 3.5-flash | 74/100 | 3/5 | 4722ms | ? Yes | 0 | ? Recommended |
| Gemini ? 3.7-flash | 71/100 | 3/5 | 5790ms | ? Yes | 0 | ? Recommended |
| Gemini ? 2.5-flash | 45/100 | 0/5 | 207ms | ? Yes | 0 | ?? Marginal |
| Groq ? gpt-oss-20b | 56/100 | 2/5 | 490ms | ? No | 0 | ?? Marginal |
| Groq ? gpt-oss-120b | 55/100 | 2/5 | 958ms | ? No | 0 | ?? Marginal |
| Groq ? qwen3.6-27b | 44/100 | 1/5 | 982ms | ? No | 0 | ?? Marginal |

> **Scoring weights:** Reliability 35% ? Accuracy (no hallucination) 25% ? OCR proxy 20% ? Speed 15% ? Efficiency 5% ? Vision penalty ?10 for text-only

---

## Detailed Test Results

### NVIDIA ? llama-3.2-11b-vision (Score: 72/100  Vision: Yes)

| Test | Pass | Latency | JSON | Schema | Hallucination | Tokens (in/out) | Notes |
|------|------|---------|------|--------|---------------|-----------------|-------|
| Vision: no-violation | ? | 5942ms | ? | ? | No | 1739/165 | OK |
| Vision: JSON format | ? | 790ms | ? | ? | No | 1632/10 | OK |
| OCR: blank | ? | 10017ms | ? | ? | N/A | N/A/N/A | TIMEOUT |
| Auth: blank | ? | 4536ms | ? | ? | N/A | 1664/39 | Could not extract JSON from: The image appears to be a  |
| Text: baseline | ? | 476ms | ? | ? | No | 55/10 | OK |

### NVIDIA ? llama-3.2-90b-vision (Score: 32/100  Vision: Yes)

| Test | Pass | Latency | JSON | Schema | Hallucination | Tokens (in/out) | Notes |
|------|------|---------|------|--------|---------------|-----------------|-------|
| Vision: no-violation | ? | 12005ms | ? | ? | N/A | N/A/N/A | TIMEOUT |
| Vision: JSON format | ? | 12003ms | ? | ? | N/A | N/A/N/A | TIMEOUT |
| OCR: blank | ? | 10013ms | ? | ? | N/A | N/A/N/A | TIMEOUT |
| Auth: blank | ? | 10018ms | ? | ? | N/A | N/A/N/A | TIMEOUT |
| Text: baseline | ? | 10013ms | ? | ? | N/A | N/A/N/A | TIMEOUT |

### Gemini ? 3.5-flash (Score: 74/100  Vision: Yes)

| Test | Pass | Latency | JSON | Schema | Hallucination | Tokens (in/out) | Notes |
|------|------|---------|------|--------|---------------|-----------------|-------|
| Vision: no-violation | ? | 12002ms | ? | ? | N/A | N/A/N/A | TIMEOUT |
| Vision: JSON format | ? | 2160ms | ? | ? | No | 1110/10 | OK |
| OCR: blank | ? | 2863ms | ? | ? | No | 1144/25 | OK |
| Auth: blank | ? | 4580ms | ? | ? | N/A | 1142/5 | Could not extract JSON from: {"authentic":false," |
| Text: baseline | ? | 2005ms | ? | ? | No | 21/10 | OK |

### Gemini ? 3.7-flash (Score: 71/100  Vision: Yes)

| Test | Pass | Latency | JSON | Schema | Hallucination | Tokens (in/out) | Notes |
|------|------|---------|------|--------|---------------|-----------------|-------|
| Vision: no-violation | ? | 7286ms | ? | ? | No | 1220/41 | OK |
| Vision: JSON format | ? | 10512ms | ? | ? | N/A | N/A/N/A | HTTP 503 |
| OCR: blank | ? | 1903ms | ? | ? | No | 1144/19 | OK |
| Auth: blank | ? | 5914ms | ? | ? | No | 1142/39 | OK |
| Text: baseline | ? | 3334ms | ? | ? | N/A | N/A/N/A | HTTP 503 |

### Gemini ? 2.5-flash (Score: 45/100  Vision: Yes)

| Test | Pass | Latency | JSON | Schema | Hallucination | Tokens (in/out) | Notes |
|------|------|---------|------|--------|---------------|-----------------|-------|
| Vision: no-violation | ? | 196ms | ? | ? | N/A | N/A/N/A | HTTP 404 |
| Vision: JSON format | ? | 217ms | ? | ? | N/A | N/A/N/A | HTTP 404 |
| OCR: blank | ? | 194ms | ? | ? | N/A | N/A/N/A | HTTP 404 |
| Auth: blank | ? | 216ms | ? | ? | N/A | N/A/N/A | HTTP 404 |
| Text: baseline | ? | 213ms | ? | ? | N/A | N/A/N/A | HTTP 404 |

### Groq ? gpt-oss-20b (Score: 56/100  Vision: No)

| Test | Pass | Latency | JSON | Schema | Hallucination | Tokens (in/out) | Notes |
|------|------|---------|------|--------|---------------|-----------------|-------|
| Vision: no-violation | ? | N/A | ? | ? | N/A | N/A/N/A | N/A (no vision) |
| JSON: format | ? | 448ms | ? | ? | No | 115/61 | OK |
| OCR: blank | ? | N/A | ? | ? | N/A | N/A/N/A | N/A (no vision) |
| Auth: blank | ? | N/A | ? | ? | N/A | N/A/N/A | N/A (no vision) |
| Reasoning: JSON passthrough | ? | 532ms | ? | ? | No | 133/197 | OK |

### Groq ? gpt-oss-120b (Score: 55/100  Vision: No)

| Test | Pass | Latency | JSON | Schema | Hallucination | Tokens (in/out) | Notes |
|------|------|---------|------|--------|---------------|-----------------|-------|
| Vision: no-violation | ? | N/A | ? | ? | N/A | N/A/N/A | N/A (no vision) |
| JSON: format | ? | 565ms | ? | ? | No | 115/110 | OK |
| OCR: blank | ? | N/A | ? | ? | N/A | N/A/N/A | N/A (no vision) |
| Auth: blank | ? | N/A | ? | ? | N/A | N/A/N/A | N/A (no vision) |
| Reasoning: JSON passthrough | ? | 1350ms | ? | ? | No | 133/148 | OK |

### Groq ? qwen3.6-27b (Score: 44/100  Vision: No)

| Test | Pass | Latency | JSON | Schema | Hallucination | Tokens (in/out) | Notes |
|------|------|---------|------|--------|---------------|-----------------|-------|
| Vision: no-violation | ? | N/A | ? | ? | N/A | N/A/N/A | N/A (no vision) |
| JSON: format | ? | 645ms | ? | ? | No | 31/292 | OK |
| OCR: blank | ? | N/A | ? | ? | N/A | N/A/N/A | N/A (no vision) |
| Auth: blank | ? | N/A | ? | ? | N/A | N/A/N/A | N/A (no vision) |
| Reasoning: JSON passthrough | ? | 1319ms | ? | ? | N/A | 47/512 | Could not extract JSON from: 
<think>
Here's a thinking |

---

## Final Production Pipeline

| Stage | Primary | Fallback | Notes |
|-------|---------|----------|-------|
| Vision Analysis | `meta/llama-3.2-11b-vision-instruct` | `gemini-3.5-flash` | Image required |
| Number-Plate OCR | `meta/llama-3.2-11b-vision-instruct` | `gemini-3.5-flash` | Lazy ? only when plate missing |
| Image Authenticity | `meta/llama-3.2-11b-vision-instruct` | `gemini-3.5-flash` | Step 0B |
| Stage 1.5 Reasoning | `openai/gpt-oss-20b` | `openai/gpt-oss-120b` | Groq text-only ? no image |

---

## Recommended Timeout / Retry Settings

| Stage | Timeout | Max Attempts | Retry On | Fail-Fast On |
|-------|---------|--------------|----------|--------------|
| Vision Analysis | 12s | 2 (NVIDIA?Gemini) | 5xx, timeout, network | 4xx (except 429), JSON parse |
| OCR | 10s | 2 (NVIDIA?Gemini) | 5xx, timeout, network | 4xx, JSON parse |
| Authenticity | 10s | 2 (NVIDIA?Gemini) | 5xx, timeout, network | 4xx, JSON parse |
| Stage 1.5 Reasoning | 12s | 1 (Groq text) | none ? skip if fails | any error |

---

## Models Removed / Excluded

| Model | Reason |
|-------|--------|
| meta/llama-3.2-90b-vision-instruct (NVIDIA) | Consistent timeout at 12s on free tier ? too slow for mobile real-time use |
| gemini-2.5-flash | HTTP 404 ? model ID not resolvable via v1beta endpoint for this account |
| gemini-2.0-flash, gemini-1.5-flash | Not returned by Gemini model listing for this account |
| qwen/qwen3.6-27b (Groq) | HTTP 400 on JSON mode ? response_format incompatible |
| gemini-3.6-flash (config) | Consistent timeout ? may be under heavy load or restricted for this account |
| llama-3.2-11b/90b-vision (Groq) | NOT available on this Groq account ? text-only models returned |

---

## Recommended ai.config.js Update

```json
{
    "visionModels": [
        "meta/llama-3.2-11b-vision-instruct",
        "gemini-3.5-flash"
    ],
    "ocrModels": [
        "meta/llama-3.2-11b-vision-instruct",
        "gemini-3.5-flash"
    ],
    "authenticityModels": [
        "meta/llama-3.2-11b-vision-instruct",
        "gemini-3.5-flash"
    ],
    "reasoningModels": [
        "openai/gpt-oss-20b"
    ]
}
```

---

## Test Methodology

All image tests used a **32?32 gray JPEG** generated locally ? no real user traffic evidence.
Test T1 (Vision) and T3 (OCR) check for **hallucination** ? any model that reports a violation or invents a plate number on a blank gray image is disqualified.
Temperature **0** for all calls. Gemini: `responseSchema` enforced. NVIDIA: strict JSON prompt. Groq: `response_format.json_object`.

---

## Known Limitations

1. **Hallucinations cannot be fully eliminated** ? the pipeline is **fail-closed**: uncertain results require manual officer review.
2. Benchmark uses a blank gray image ? real traffic image performance may differ.
3. NVIDIA NIM free tier may throttle. The 90b model consistently times out at 12s.
4. Groq has no vision models on this account. If Groq adds vision support, re-benchmark.
5. Gemini model availability varies by region and API tier.

---

*Generated by `scripts/benchmark_ai_providers.js` v2 ? 2026-08-18T13:37:41.284Z*
