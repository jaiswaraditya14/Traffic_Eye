import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Start conservatively while the system preference is loading. */
export default function useReducedMotion() {
    const [reduced, setReduced] = useState(true);
    useEffect(() => {
        let active = true;
        AccessibilityInfo.isReduceMotionEnabled().then(value => {
            if (active) setReduced(Boolean(value));
        }).catch(() => {});
        const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
        return () => { active = false; listener.remove(); };
    }, []);
    return reduced;
}
