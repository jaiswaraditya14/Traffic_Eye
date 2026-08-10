export const AI_CONFIG = {
    // API keys — rotated to maximise quota headroom.
    geminiApiKeys: [
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_2,
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_1,
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_3,
    ].filter(Boolean),

    groqApiKeys: [
        process.env.EXPO_PUBLIC_GROQ_API_KEY_1,
        process.env.EXPO_PUBLIC_GROQ_API_KEY_2,
        process.env.EXPO_PUBLIC_GROQ_API_KEY,
    ].filter(Boolean),

    visionModels: [
        'qwen/qwen3.6-27b',             // Groq Vision & Tool Use Model (1st Priority)
        'gemini-2.5-flash',             // Gemini Vision Fallback
        'gemini-3.6-flash',             // Gemini Fast Vision
        'gemini-flash-latest',          // Gemini Fallback
    ],
    reasoningModels: [
        'openai/gpt-oss-120b',          // Groq Reasoning & Decision Model (1st Priority)
        'llama-3.3-70b-versatile',      // Groq High Speed Reasoning
        'gemini-2.5-flash',             // Gemini Reasoning Fallback
    ],
};
