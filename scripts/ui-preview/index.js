import React, { useState } from 'react';
import { registerRootComponent } from 'expo';
import { View, Text } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FixtureProvider, fixtureReport } from './fixtures';
import { useDMSansFonts } from '../../src/utils/fonts';
import CitizenHome from '../../src/screens/citizen/CitizenHome';
import NewReport from '../../src/screens/citizen/NewReport';
import AIProcessing from '../../src/screens/shared/AIProcessing';
import AIResultsVerification from '../../src/screens/shared/AIResultsVerification';
import ReportSuccess from '../../src/screens/citizen/ReportSuccess';
import ImageReportStatus from '../../src/screens/citizen/ImageReportStatus';
import Rewards from '../../src/screens/citizen/Rewards';
import Notifications from '../../src/screens/citizen/Notifications';
import OfficerDashboard from '../../src/screens/officer/OfficerDashboard';
import ImageReportReview from '../../src/screens/officer/ImageReportReview';
import ViolationHeatmap from '../../src/screens/officer/ViolationHeatmap';
import OfficerReportExport from '../../src/screens/officer/OfficerReportExport';
import VideoReport from '../../src/screens/citizen/VideoReport';
import OnboardingCarousel from '../../src/screens/shared/OnboardingCarousel';
import About from '../../src/screens/citizen/About';
import Profile from '../../src/screens/citizen/Profile';
import OfficerProfile from '../../src/screens/officer/OfficerProfile';
const screens = { CitizenHome, NewReport, AIProcessing, AIResultsVerification, ReportSuccess, ImageReportStatus, Rewards, Notifications, OfficerDashboard, ImageReportReview, ViolationHeatmap, OfficerReportExport, VideoReport, OnboardingCarousel, About, Profile, OfficerProfile };
function Preview() {
    const [screen, setScreen] = useState('CitizenHome'), [state, setState] = useState('populated'), [font, setFont] = useState('100');
    const { fontsLoaded } = useDMSansFonts();
    const navigation = React.useMemo(() => ({ isFocused: () => true, addListener: () => () => {}, getParent: () => null, goBack: () => setScreen('CitizenHome'), navigate: name => { if (screens[name]) setScreen(name); }, replace: name => { if (screens[name]) setScreen(name); }, reset: () => setScreen('CitizenHome'), push: name => { if (screens[name]) setScreen(name); } }), []);
    const Screen = screens[screen];
    return <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 375, height: 812 }, insets: { top: 0, bottom: 0, left: 0, right: 0 } }}>
        <View style={{ flex: 1 }}>
            <div style={{ padding: 8, background: '#FFFFFF', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <label>Screen <select aria-label="QA screen" value={screen} onChange={event => setScreen(event.target.value)}>{Object.keys(screens).map(name => <option key={name}>{name}</option>)}</select></label>
                <label>State <select aria-label="QA state" value={state} onChange={event => setState(event.target.value)}>{['populated', 'empty', 'loading', 'error', 'demo', 'reviewed'].map(name => <option key={name}>{name}</option>)}</select></label>
                <label>Text <select aria-label="QA text size" value={font} onChange={event => setFont(event.target.value)}><option value="100">100%</option><option value="200">200% simulation</option></select></label>
            </div>
            <style>{font === '200' ? '[dir="auto"]{font-size:200%!important;line-height:1.3!important}' : ''}</style>
            <Text style={{ fontSize: 10, backgroundColor: '#FEF3C7', padding: 4 }}>ISOLATED UI QA · synthetic data · native map/camera need device verification</Text>
            {fontsLoaded && <NavigationContext.Provider value={navigation}><FixtureProvider key={screen + state} state={state} officer={screen.startsWith('Officer') || screen === 'ImageReportReview'}><Screen navigation={navigation} route={{ params: { reportId: fixtureReport.id, demo: state === 'demo', reward_amount: state === 'reviewed' ? 70 : 0, aiResults: { confidence: 92, violationDetected: true, severity: 'high', vehicleNumber: 'MH01AB1234', allViolations: ['Signal Jump', 'No Helmet'] } } }} /></FixtureProvider></NavigationContext.Provider>}
        </View>
    </SafeAreaProvider>;
}
registerRootComponent(Preview);
