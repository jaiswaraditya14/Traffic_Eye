# New Report Screen Updates

## Summary of Changes

I've successfully updated the **New Report** screen to include:

### ✅ 1. Video Upload Feature
- **Record Video Button**: Allows users to record a video directly from the camera (max 30 seconds)
- **Select Video Button**: Allows users to pick a video from their gallery
- **Video Icon**: Uses `videocam` and `film` icons from Ionicons
- **Video Preview**: Shows a video placeholder with a videocam icon when a video is selected

### ✅ 2. Auto Address Detection with GPS
- **Location Button**: A blue circular button with a location icon positioned on the right side of the address input field
- **GPS Detection**: Automatically detects the user's current location using GPS
- **Reverse Geocoding**: Converts GPS coordinates to a readable address
- **Loading State**: Shows a spinner while detecting location
- **Manual Override**: Users can still manually type or edit the address

## Technical Implementation

### New State Variables
```javascript
const [video, setVideo] = useState(null);
const [mediaType, setMediaType] = useState(null); // 'image' or 'video'
const [address, setAddress] = useState('');
const [loadingLocation, setLoadingLocation] = useState(false);
```

### New Functions
1. **`pickVideo()`** - Select video from gallery
2. **`recordVideo()`** - Record video with camera
3. **`detectLocation()`** - Get GPS location and convert to address

### Updated Dependencies
- Added `expo-location` import (already installed in package.json)
- Added `ScrollView` and `ActivityIndicator` from React Native

### Permissions Added (app.json)
**iOS:**
- `NSLocationWhenInUseUsageDescription`
- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`

**Android:**
- `ACCESS_FINE_LOCATION`
- `ACCESS_COARSE_LOCATION`
- `CAMERA`
- `READ_EXTERNAL_STORAGE`
- `WRITE_EXTERNAL_STORAGE`

## UI Layout

The updated screen now includes:

1. **Media Capture Area** - Shows image, video placeholder, or default placeholder
2. **Photo Buttons Row**:
   - 📷 Take Photo (Blue)
   - 🖼️ From Gallery (White/Secondary)
3. **Video Buttons Row** (NEW):
   - 📹 Record Video (Blue)
   - 🎬 Select Video (White/Secondary)
4. **Location Address Field** (NEW):
   - Input field with label "Location Address"
   - 📍 GPS button on the right side
   - Auto-fills when GPS button is pressed
5. **Description Field** - Optional text area
6. **Submit Button** - Enabled when image OR video is selected

## Features

### Video Upload
- Maximum video duration: 30 seconds
- Supports both camera recording and gallery selection
- Mutually exclusive with photo (selecting video clears photo and vice versa)

### GPS Auto-Detection
- Requests location permissions if not granted
- Uses high accuracy GPS
- Converts coordinates to formatted address (street, district, city, region, postal code, country)
- Shows success/error alerts
- Loading indicator while processing

## Data Passed to Next Screen

The `handleSubmit()` function now passes:
```javascript
{
  image: uri or null,
  video: uri or null,
  mediaType: 'image' | 'video',
  description: string,
  address: string,
  timestamp: Date
}
```

## Testing Notes

To test the new features:
1. **Video Upload**: Tap "Record Video" or "Select Video" buttons
2. **GPS Detection**: Tap the location icon button next to the address field
3. **Permissions**: The app will request location permissions on first use

## Next Steps

You may want to:
- Test the video upload functionality on a physical device
- Test GPS detection in different locations
- Update the `AIProcessing` screen to handle video files
- Add video preview/playback functionality
