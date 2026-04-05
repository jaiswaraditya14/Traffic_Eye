export const AI_CONFIG = {
    // Dual API keys — rotated to maximise quota availability
    geminiApiKeys: [
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_1,
        process.env.EXPO_PUBLIC_GEMINI_API_KEY_2,
    ].filter(Boolean), // drop any undefined keys

    // Models tried in priority order (fastest/cheapest first)
    models: [
        'gemini-2.5-flash',
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash',
        'gemini-flash-latest',
        'gemini-pro-latest'
    ],
};
