import React from 'react';
import { View, Text } from 'react-native';
// MapLibre is native-only. This honest placeholder verifies surrounding layout,
// never claims to verify native map rendering or interaction.
export function Map({ children, style }) { return <View style={[style, { backgroundColor: '#E2E8F0' }]}><Text style={{ marginTop: 20, textAlign: 'center' }}>Native MapLibre map — device check required</Text>{children}</View>; }
export const Camera = React.forwardRef(function Camera(props, ref) { React.useImperativeHandle(ref, () => ({ flyTo() {}, easeTo() {}, fitBounds() {} })); return null; });
export const Marker = ({ children }) => <View>{children}</View>;
export const UserLocation = () => null;
export const GeoJSONSource = ({ children }) => <>{children}</>;
export const Layer = () => null;
