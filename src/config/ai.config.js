export const AI_CONFIG = {
    // API keys — rotated to maximise quota headroom.
    // Add more keys as EXPO_PUBLIC_GEMINI_API_KEY_3, _4, … in .env
    geminiApiKeys: [
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_1,
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_2,
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_3,
    ].filter(Boolean),

    groqApiKeys: [
        process.env.EXPO_PUBLIC_GROQ_API_KEY_1,
        process.env.EXPO_PUBLIC_GROQ_API_KEY_2,
        process.env.EXPO_PUBLIC_GROQ_API_KEY,
    ].filter(Boolean),

    visionModels: [
        'meta-llama/llama-4-scout-17b-16e-instruct', 
        'llama-3.2-90b-vision',         // Groq Production High-Res Vision (Fallback)
        'gemini-1.5-flash',             // Gemini Stable
        'gemini-1.5-pro-latest',        // Gemini Stable Pro
    ],
    reasoningModels: [
        'openai/gpt-oss-120b',          // Final decision maker
    ],
};
