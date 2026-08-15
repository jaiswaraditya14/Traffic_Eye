<div style="font-size: 12pt;">

# Code and Implementation Phase

The coding phase of the **Traffic Eye** project focused on translating the system architecture and UI/UX designs into a functional, robust cross-platform mobile application using React Native (Expo) and a Supabase backend. To maintain a clean architecture, the implementation was modularized into four distinct domains: the Citizen Interface, the Officer Dashboard, the AI & Data Pipeline, and Global Configurations.

---

## 1. Citizen Interface Implementation
The Citizen Interface was designed to provide a seamless, intuitive experience for users to capture and submit evidence of traffic violations. The coding involved creating custom React hooks to interface with device hardware (camera and storage), building an accurate image-cropping utility to focus on evidence, and developing a digital wallet to track earned reward points.

### Key Files and Folders
- **`src/screens/citizen/NewReport.js`**: The primary screen where citizens begin the process of submitting a new traffic violation report.
- **`src/screens/citizen/VideoReportSuccess.js`**: Handles the success state and feedback after a citizen submits a video-based report.
- **`src/screens/citizen/Rewards.js`**: A digital wallet interface that calculates and displays the citizen's accumulated reward points based on approved reports.
- **`src/screens/citizen/MyReports.js`**: A historical log allowing citizens to track the status (Pending, Verified, Rejected) of their submitted evidence.
- **`src/components/common/ImageCropModal.js`**: A highly interactive UI component built to let citizens accurately crop and frame their images before submission.
- **`src/hooks/useImagePicker.js`**: A custom React hook that manages hardware permissions and the native OS-level image selection pipeline.

---

## 2. Officer Dashboard Implementation
The Officer Interface was built to provide traffic police with a secure, highly organized review portal. The primary coding challenge here involved implementing geographic routing logic, ensuring that officers only receive and review reports that fall within their specifically assigned pincode jurisdictions.

### Key Files and Folders
- **`src/screens/officer/OfficerDashboard.js`**: The main hub for officers, featuring statistic cards (Pending, Verified, Rejected) that act as clickable filters to sort the evidence queue.
- **`src/screens/officer/ImageReportReview.js`**: The critical review screen where an officer views the citizen's evidence, sees the AI's preliminary analysis, and makes the final decision to Approve or Reject the report (including adding rejection remarks).

---

## 3. AI & Data Pipeline Implementation
The AI implementation serves as the automated core of the application. We integrated the Google Gemini API to pre-process citizen uploads. The coding phase involved writing secure backend services to handle image uploads, constructing detailed AI prompts to extract license plates and assess violation severity, and calculating dynamic reward points.

### Key Files and Folders
- **`src/services/ai/index.js`**: The central service file handling communication with the Gemini API. It formats the image data, sends the analysis prompt, and parses the returned JSON payload (Violation Type, Severity, License Plate).
- **`src/services/rewards/index.js`**: The logic module responsible for calculating dynamic point distributions (e.g., High Severity = 100 points, Low Severity = 50 points) upon officer approval.
- **`src/services/supabase.js`**: Manages the connection to the PostgreSQL database, real-time subscriptions, and secure file uploads to Supabase Storage.

---

## 4. Other Global Configurations & Setup
This section covers the underlying architecture, navigation routing, and environment setup required to tie the separate modules together into a unified application.

### Key Files and Folders
- **`src/navigation/`**: Contains the React Navigation setup (Stack and Tab Navigators) that enforces role-based access control, preventing citizens from accessing officer screens and vice versa.
- **`src/config/`**: Stores global constants and the application's core UI design tokens (Navy/Amber/Surface high-contrast color palette).
- **`src/utils/`**: Contains shared helper functions for string formatting, layout scaling, and date parsing.
- **`app.json`**: The core Expo configuration defining the app's bundle identifiers, splash screens, and required OS permissions.
- **`.env`**: Securely stores the application's environment variables, including the `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `GEMINI_API_KEY`.
- **`package.json`**: Manages all Node.js dependencies, bridging React Native, Expo, and the Supabase SDKs.

</div>
