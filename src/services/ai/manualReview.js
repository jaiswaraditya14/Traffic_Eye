/** No fabricated AI evidence: the officer can distinguish an unavailable analysis. */
export const buildManualReviewResult = () => ({
    violationDetected: false,
    vehicleNumber: '',
    violationType: '',
    allViolations: [],
    severity: 'None',
    confidence: 0,
    description: 'AI analysis was unavailable. Submitted for manual officer review.',
    requiresManualReview: true,
    aiUnavailable: true,
});
