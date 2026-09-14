import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import { COLORS } from '../../utils/theme';

export default function VideoPreview({ uri }) {
    const [failed, setFailed] = useState(false);
    // useVideoPlayer disposes the native player on unmount (including retake).
    const player = useVideoPlayer(uri, instance => { instance.loop = false; });
    useEventListener(player, 'statusChange', ({ status }) => setFailed(status === 'error'));
    return <View>
        <VideoView player={player} style={{ width: '100%', height: 220, backgroundColor: COLORS.black }} nativeControls contentFit="contain" accessibilityLabel="Recorded video preview" />
        {failed && <Text accessibilityRole="alert" style={{ color: COLORS.error }}>Preview unavailable. Retake or choose another video.</Text>}
    </View>;
}
