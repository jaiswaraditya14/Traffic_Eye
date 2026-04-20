export const AI_CONFIG = {
    // API keys — rotated to maximise quota headroom.
    // Add more keys as EXPO_PUBLIC_GEMINI_API_KEY_3, _4, … in .env
    geminiApiKeys: [
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_1,
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_2,
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_3,
    ].filter(Boolean),

    // Models in priority order — best vision capability first.
    // Adjusted for 'Top Tier' Pro intelligence. Note that Pro models use
    // more quota, but provide the absolute deepest OCR and scene analysis.
    models: [
        'gemini-2.5-flash',      // Latest robust model
        'gemini-2.0-flash',      // Confirmed active model
        'gemini-2.5-pro',        // Testing newest pro model
        'gemini-1.5-pro-002',    // Hardcoded model ID
        'gemini-1.5-flash-002',  // Hardcoded model ID
    ],
};
