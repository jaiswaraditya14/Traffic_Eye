import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG } from '../../config';
import * as FileSystem from 'expo-file-system/legacy';

const genAI = new GoogleGenerativeAI(AI_CONFIG.geminiApiKey);

/**
 * Severity ranking for violations (higher = more severe)
 * Used to pick the most severe violation when multiple are detected
 */
const VIOLATION_SEVERITY = {
    'Drunk Driving': 10,
    'Dangerous Driving': 9,
    'Red Light Violation': 8,
    'Wrong Side Driving': 7,
    'Speeding': 6,
    'Triple Riding': 5,
    'Overloading': 5,
    'No Helmet': 4,
    'No Seat Belt': 4,
    'Mobile Phone Use': 3,
    'No Registration Plate': 3,
    'Lane Cutting': 2,
    'Wrong Parking': 1,
    'Other': 0,
};

/**
 * Service to handle all AI-related features using Google Gemini
 */
export const aiService = {
    /**
     * Analyzes a traffic violation image with enhanced detection logic:
     * Rotates through available models if quota is exceeded (429)
     *
     * @param {string} imageUri - The local URI of the image to analyze
     * @returns {Promise<Object>} - The AI detection results
     */
    analyzeViolationImage: async (imageUri) => {
        try {
            // List of models to try in order of preference
            const modelsToTry = [
                AI_CONFIG.modelName, // User preferred (gemini-2.0-flash-lite)
                'gemini-2.0-flash',
                'gemini-flash-latest',
                'gemini-pro-latest'
            ];

            let lastError = null;

            for (const modelName of modelsToTry) {
                try {
                    console.log(`AI: Attempting analysis with model: ${modelName}...`);

                    // 1. Convert image to base64
                    const base64Image = await FileSystem.readAsStringAsync(imageUri, {
                        encoding: 'base64',
                    });

                    // 2. Initialize Model
                    const model = genAI.getGenerativeModel({ model: modelName });

                    // 3. Multi-Step Prompt
                    const prompt = `
                    You are an expert Indian Traffic Enforcement AI. 
                    Your task is to identify traffic violations in images that may contain MULTIPLE vehicles.

                    STRICT INSTRUCTIONS:
                    1. IDENTIFY ALL VEHICLES: Look at every vehicle in the image separately.
                    2. DETECT VIOLATIONS: For each vehicle, check for: No Helmet, Triple Riding, Red Light, Wrong Side, Wrong Parking, etc.
                    3. PICK PRIMARY VIOLATOR: If multiple vehicles have violations, pick the MOST SEVERE one.
                    4. TARGET VEHICLE ISOLATION: Once you pick the primary violator, extract ONLY the number plate of THAT specific vehicle. 
                       - DO NOT combine parts of multiple plates. 
                       - DO NOT report a plate from a different vehicle even if it is clearer.
                       - Plate format: MH12AB1234.
                    5. CONFIDENCE: Rate 0-100 based on the primary detection.

                    Return ONLY valid JSON:
                    { 
                        "violationDetected": boolean, 
                        "vehicleNumber": "MH12AB1234" or "Not detected", 
                        "violationType": "Primary violation type", 
                        "allViolations": ["violation1", "violation2"], 
                        "severity": "Critical/High/Medium/Low", 
                        "confidence": number, 
                        "description": "Explain WHICH vehicle was chosen as the primary violator and why, then describe its plate and violation."
                    }
                `;

                    // 4. Send to Gemini
                    const result = await model.generateContent([
                        prompt,
                        {
                            inlineData: {
                                data: base64Image,
                                mimeType: 'image/jpeg',
                            },
                        },
                    ]);

                    const responseText = result.response.text();
                    console.log(`AI Success (${modelName}):`, responseText);

                    // 5. Parse and clean response
                    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const parsed = JSON.parse(jsonMatch[0]);

                        // Normalize violation detection
                        if (parsed.violationDetected === false) {
                            return {
                                violationDetected: false,
                                vehicleNumber: 'Not applicable',
                                violationType: 'None',
                                allViolations: [],
                                severity: 'None',
                                confidence: parsed.confidence || 95,
                                description: parsed.description || 'No traffic violation detected.',
                            };
                        }

                        // Severity ranking logic
                        let primaryViolation = parsed.violationType || 'Other';
                        const allViolations = parsed.allViolations || [primaryViolation];

                        if (allViolations.length > 1) {
                            const sorted = [...allViolations].sort((a, b) => {
                                const severityA = VIOLATION_SEVERITY[a] ?? 0;
                                const severityB = VIOLATION_SEVERITY[b] ?? 0;
                                return severityB - severityA;
                            });
                            primaryViolation = sorted[0];
                        }

                        const severityScore = VIOLATION_SEVERITY[primaryViolation] ?? 0;
                        let severityLabel = parsed.severity || 'Medium';
                        if (severityScore >= 8) severityLabel = 'Critical';
                        else if (severityScore >= 5) severityLabel = 'High';
                        else if (severityScore >= 3) severityLabel = 'Medium';
                        else severityLabel = 'Low';

                        return {
                            violationDetected: true,
                            vehicleNumber: parsed.vehicleNumber || 'Not detected',
                            violationType: primaryViolation,
                            allViolations: allViolations,
                            severity: severityLabel,
                            confidence: parsed.confidence || 60,
                            description: parsed.description || 'AI analysis completed.',
                        };
                    }
                    throw new Error('Invalid JSON format');

                } catch (error) {
                    lastError = error;
                    console.warn(`AI: Model ${modelName} failed:`, error.message);

                    // If it's a quote error (429), try next model immediately
                    if (error.message.includes('429') || error.message.includes('quota')) {
                        console.log(`AI: Quota exceeded for ${modelName}, rotating to next model...`);
                        continue;
                    }

                    // For other errors, we might want to re-try or throw
                    if (modelName === modelsToTry[modelsToTry.length - 1]) {
                        throw error;
                    }
                }
            }

            // If we get here, all models failed
            throw lastError;

        } catch (error) {
            console.error('AI Analysis Final Failure:', error);
            return {
                violationDetected: false,
                vehicleNumber: 'Manual entry required',
                violationType: 'Other',
                allViolations: [],
                severity: 'Unknown',
                confidence: 0,
                description: `Error: ${error?.message?.includes('429') ? 'AI Quota Exceeded. Please try again in 1 minute.' : 'AI analysis failed. Please enter details manually.'}`,
            };
        }
    },
};

export default aiService;

