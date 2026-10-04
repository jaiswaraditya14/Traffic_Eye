// Isolated local QA entry, NEVER selected by normal release/EAS builds.
// Uses the real NewReport UI, picker, resolver, geocoder, map and preprocessing.
// No authentication bypass in the production app and no backend submissions.
import React, { useMemo, useState, useEffect } from 'react';
import { registerRootComponent } from 'expo';
import { View, Text, Button } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContext } from '@react-navigation/native';
import { AppProvider, useAppContext } from '../../src/context/AppContext';
import { useDMSansFonts } from '../../src/utils/fonts';
import NewReport from '../../src/screens/citizen/NewReport';
import { prepareVisionImage, prepareOcrImage } from '../../src/services/ai/preprocessing';
import { extractExifFromImage } from '../../src/utils/exifParser';
function SubmissionSnapshot({ back }) {
    const { currentReport } = useAppContext();
    const [result, setResult] = useState('Processing local evidence...');
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const selected = { uri: currentReport.image, sourceUri: currentReport.locationProvenance?.uri, selectionKind: 'gallery' };
                const before = await extractExifFromImage(selected);
                const vision = await prepareVisionImage(currentReport.image);
                const ocr = await prepareOcrImage(currentReport.image);
                const after = await extractExifFromImage(selected);
                if (active) setResult(JSON.stringify({
                    location: currentReport.location, source: currentReport.locationSource,
                    status: before.status, metadataStatus: currentReport.locationMetadataStatus,
                    provenance: currentReport.locationProvenance?.source,
                    visionReady: Boolean(vision), ocrReady: Boolean(ocr),
                    unchangedEvidence: Boolean(before.sha256 && before.sha256 === after.sha256),
                    liveBackend: 'NOT TESTED — isolated local QA',
                }, null, 2));
            } catch (_) { if (active) setResult('FAIL: local processing failed'); }
        })();
        return () => { active = false; };
    }, [currentReport]);
    return <View style={{ flex: 1, padding: 20, paddingTop: 60 }}><Text selectable>{result}</Text><Button title="Back to gallery test" onPress={back} /></View>;
}
function Harness() {
    const [snapshot, setSnapshot] = useState(false);
    const { fontsLoaded } = useDMSansFonts();
    const navigation = useMemo(() => ({
        isFocused: () => true, addListener: () => () => {}, getParent: () => null,
        navigate: () => setSnapshot(true), goBack: () => setSnapshot(false),
    }), []);
    return <SafeAreaProvider><NavigationContext.Provider value={navigation}>
        <View style={{ flex: 1 }}><Text style={{ backgroundColor: '#ffcc66', paddingTop: 25 }}>ISOLATED EXIF QA — no live submissions</Text>
            {fontsLoaded && (snapshot ? <SubmissionSnapshot back={() => setSnapshot(false)} /> : <NewReport navigation={navigation} />)}
        </View>
    </NavigationContext.Provider></SafeAreaProvider>;
}
registerRootComponent(() => <AppProvider><Harness /></AppProvider>);
