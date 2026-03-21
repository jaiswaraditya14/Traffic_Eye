import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI_CONFIG } from '../../config';
import * as FileSystem from 'expo-file-system/legacy';

const genAI = new GoogleGenerativeAI(AI_CONFIG.geminiApiKey);

/**
 * Service to handle all AI-related features using Google Gemini
 */
export const aiService = {
    /**
     * Analyzes a traffic violation image to extract vehicle details and violation type.
     * @param {string} imageUri - The local URI of the image to analyze
     * @returns {Promise<Object>} - The AI detection results
     */
    analyzeViolationImage: async (imageUri) => {
        try {
            // 1. Convert image to base64
            // Using 'base64' string directly to avoid potential EncodingType undefined issues
            const base64Image = await FileSystem.readAsStringAsync(imageUri, {
                encoding: 'base64',
            });

            // 2. Initialize Model
            const model = genAI.getGenerativeModel({ model: AI_CONFIG.modelName });

            // 3. Enhanced Prompt for Indian Traffic Violations
            const prompt = `
                You are an expert AI system specialized in detecting Indian traffic violations and extracting vehicle registration numbers.
                
                Analyze this image carefully and provide the following information in JSON format:
                
                1. **vehicleNumber**: Extract the vehicle registration/license plate number.
                   - Indian format examples: MH12AB1234, DL01CA1234, KA05MH1234
                   - Look for alphanumeric text on the vehicle's number plate
                   - If clearly visible, extract the exact number
                   - If partially visible or unclear, make your best estimate
                   - If completely not visible, return "Not detected"
                
                2. **violationType**: Identify the specific traffic violation from this list:
                   - "No Helmet" - Rider without helmet
                   - "Triple Riding" - More than 2 people on a two-wheeler
                   - "Wrong Side Driving" - Vehicle on wrong side of road
                   - "Red Light Violation" - Crossing red signal
                   - "Speeding" - Excessive speed
                   - "No Seat Belt" - Driver/passenger without seat belt
                   - "Wrong Parking" - Parking in no-parking zone
                   - "Mobile Phone Use" - Using phone while driving
                   - "Overloading" - Vehicle carrying excess load/passengers
                   - "No Registration Plate" - Missing or obscured number plate
                   - "Other" - Any other violation (specify in description)
                
                3. **confidence**: Your confidence level (0-100) based on:
                   - Image clarity and quality
                   - Visibility of number plate
                   - Clear evidence of violation
                   - 90-100: Very clear, high certainty
                   - 70-89: Good visibility, confident
                   - 50-69: Moderate visibility, reasonable guess
                   - Below 50: Poor visibility, low confidence
                
                4. **description**: Brief explanation of what you detected (1-2 sentences)
                
                Return ONLY a valid JSON object, no markdown formatting.
                
                Example response:
                {
                    "vehicleNumber": "MH12AB1234",
                    "violationType": "No Helmet",
                    "confidence": 85,
                    "description": "Two-wheeler rider without helmet clearly visible. Number plate partially visible but readable."
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
            console.log('AI Response:', responseText);

            // 5. Parse and clean response
            // Sometimes Gemini wraps JSON in markdown code blocks
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    vehicleNumber: parsed.vehicleNumber || 'Not detected',
                    violationType: parsed.violationType || 'Other',
                    confidence: parsed.confidence || 60,
                    description: parsed.description || 'AI analysis completed'
                };
            }

            throw new Error('Invalid AI response format');
        } catch (error) {
            console.error('AI Analysis Error:', error);
            // Fallback for demo or failure
            return {
                vehicleNumber: 'Manual entry required',
                violationType: 'Other',
                confidence: 0,
                description: 'AI analysis failed. Please enter details manually.',
                error: error.message
            };
        }
    }
};

export default aiService;
