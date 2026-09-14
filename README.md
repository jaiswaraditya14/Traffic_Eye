# 🚦 Traffic Eye

A comprehensive **React Native** mobile application for reporting and managing traffic violations. Built with **Expo**, this app enables citizens to report traffic violations with photo/video evidence and GPS location, while traffic officers can verify and manage submitted reports.

![React Native](https://img.shields.io/badge/React%20Native-0.81.5-blue?logo=react)
![Expo](https://img.shields.io/badge/Expo-54.0-black?logo=expo)
![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Web-green)

---

## 📱 Features

### For Citizens
- 📸 **Capture Violations** - Take photos/videos of traffic violations
- 📍 **GPS Auto-Detection** - Automatic location detection for accurate reporting
- 🤖 **AI Verification** - AI-powered violation detection and analysis
- 📊 **Track Reports** - Monitor the status of submitted reports
- 🎁 **Rewards System** - Earn rewards for verified reports
- 🔔 **Notifications** - Stay updated on report progress

### For Traffic Officers
- 📋 **Dashboard** - Overview of pending and verified reports
- ✅ **Report Verification** - Review and verify citizen reports
- 📈 **Analytics** - View violation statistics and trends
- 👤 **Profile Management** - Manage officer profile and settings

---

## 🛠️ Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: React Navigation (Native Stack + Bottom Tabs)
- **Camera**: Expo Camera & Image Picker
- **Location**: Expo Location
- **Storage**: AsyncStorage
- **UI**: Expo Vector Icons, Linear Gradient

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download Node.js](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Expo Go App** on your mobile device:
  - [Android - Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
  - [iOS - App Store](https://apps.apple.com/app/expo-go/id982107779)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/jaiswaraditya14/Traffic_Eye.git
cd Traffic_Eye
```

### 2. Install Dependencies

```bash
npm install
```

This will download all required packages (may take a few minutes on first run).

Copy `.env.example` to `.env` and fill in the public Supabase URL and anon key for
the project used by Google sign-in. AI credentials belong only in Supabase Edge
Function secrets; see [Phase 1 setup](docs/AI_PHASE1_SETUP.md) for owner setup and
key-rotation steps. This project uses its committed native Android directory;
do not run `expo prebuild --clean`.

### 3. Start the Development Server

```bash
npm start
```

or

```bash
npx expo start
```

### 4. Run the App

Once the development server starts, you'll see a QR code in your terminal.

#### 📱 On Physical Device (Recommended)
1. Open the **Expo Go** app on your phone
2. Scan the QR code displayed in the terminal
3. The app will load on your device

#### 💻 On Emulator/Simulator
- **Android**: Press `a` in the terminal (requires Android Studio)
- **iOS**: Press `i` in the terminal (macOS only, requires Xcode)
- **Web**: Press `w` in the terminal

---

## 📁 Project Structure

```
Traffic_Eye/
├── docs/                      # 📚 All documentation
├── database/                  # 🗄️ Database schemas and scripts
├── assets/                    # 🎨 Images, icons, and static files
├── src/                       # 💻 Source code
│   ├── components/           # Reusable UI components
│   │   ├── common/          # Shared components
│   │   ├── citizen/         # Citizen-specific components
│   │   └── officer/         # Officer-specific components
│   ├── screens/             # Screen components
│   │   ├── auth/           # Authentication screens
│   │   ├── citizen/        # Citizen screens
│   │   ├── officer/        # Officer screens
│   │   └── shared/         # Shared screens
│   ├── navigation/          # Navigation configuration
│   ├── context/             # React Context providers
│   ├── services/            # External services (Supabase, APIs)
│   ├── utils/               # Utility functions and constants
│   └── hooks/               # Custom React hooks
├── App.js                    # App entry point
├── app.json                  # Expo configuration
└── package.json              # Dependencies
```

> 📖 For detailed structure documentation, see [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)



---

## 📱 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start the Expo development server |
| `npm run android` | Run on Android device/emulator |
| `npm run ios` | Run on iOS simulator (macOS only) |
| `npm run web` | Run in web browser |

---

## 🔧 Troubleshooting

### Common Issues

**1. "Unable to resolve module" error**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo start --clear
```

**2. Expo Go not connecting**
- Ensure your phone and computer are on the same WiFi network
- Try using tunnel mode: `npx expo start --tunnel`

**3. Location/Camera not working**
- Grant permissions when prompted
- For iOS, permissions are configured in `app.json`
- For Android, permissions are automatically requested

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is for educational purposes.

---

## 👨‍💻 Author

**Aditya Jaiswar**

- GitHub: [@jaiswaraditya14](https://github.com/jaiswaraditya14)

---

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev/)
- Icons by [Expo Vector Icons](https://icons.expo.fyi/)
- Navigation by [React Navigation](https://reactnavigation.org/)
