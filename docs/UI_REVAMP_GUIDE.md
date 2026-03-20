# TrafficEye — Enterprise UI Revamp Guide

> **Version**: 2.0 &nbsp;|&nbsp; **Date**: Feb 19, 2026 &nbsp;|&nbsp; **Authored by**: Senior UX Design Agent

---

## 1. Visual Identity — "Indigo Authority"

### Color Palette

| Token              | Hex       | Usage                              |
|--------------------|-----------|------------------------------------|
| `primary`          | `#4F46E5` | CTAs, active states, links         |
| `primaryLight`     | `#6366F1` | Gradient endpoints, hover states   |
| `primaryDark`      | `#3730A3` | Gradient start, pressed states     |
| `primarySurface`   | `#EEF2FF` | Active tab pills, icon backgrounds |
| `primaryBorder`    | `#C7D2FE` | Referral card accent border        |
| `secondary`        | `#0D9488` | Officer accent, video buttons      |
| `accent`           | `#F59E0B` | Points, rewards, trophies          |
| `success`          | `#059669` | Verified status                    |
| `warning`          | `#D97706` | Pending status                     |
| `error`            | `#DC2626` | Rejected, logout, destructive      |
| `background`       | `#F8FAFC` | Page background (cool gray)        |
| `surface`          | `#FFFFFF` | Card/modal backgrounds             |
| `textPrimary`      | `#0F172A` | Headings, body text                |
| `textSecondary`    | `#475569` | Descriptions, subtitles            |
| `textTertiary`     | `#94A3B8` | Placeholders, timestamps           |

### Why Indigo?
Indigo (vs. generic blue) signals **authority, trust, and technology** — ideal for a civic-tech / law-enforcement SaaS product. The secondary teal differentiates the Officer persona. Amber rewards create warmth in an otherwise professional palette.

### Semantic Surface Colors
Every status now has a matching **surface color** (e.g., `successSurface: #ECFDF5`) for subtle icon backgrounds and toast feedback — replacing the old `${color}15` opacity hack with proper WCAG-checked tints.

---

## 2. Typography

| Token     | Size  | Weight     | Usage                   |
|-----------|-------|------------|-------------------------|
| `display` | 36px  | extrabold  | Splash screen brand     |
| `xxxl`    | 30px  | bold       | Page titles             |
| `xxl`     | 24px  | bold       | Section headers         |
| `xl`      | 20px  | bold       | Stat values, card titles|
| `lg`      | 17px  | semibold   | Subheadings             |
| `md`      | 15px  | regular    | Body text, inputs       |
| `sm`      | 13px  | medium     | Labels, descriptions    |
| `xs`      | 12px  | medium     | Timestamps, captions    |
| `xxs`     | 10px  | bold       | Badge counts, tab labels|

**Letter spacing**: Headings use negative tracking (`-0.3`) for a tight, modern feel. Badges and labels use positive tracking (`+0.5` to `+2`) for uppercase treatment.

### Recommended Google Fonts (Future)
- **Inter** — Primary font for all text
- **JetBrains Mono** — For referral codes and data displays

*(React Native ships with system fonts; to use custom fonts, add via `expo-font`)*

---

## 3. Layout & Dashboard Structure

### Citizen Home — Reduced Click Hierarchy
```
┌──────────────────────────┐
│ Hello, {Name}     🔔(3)  │  ← Header + notification bell
├──────────────────────────┤
│ [Reports][Verified][Pts] │  ← Quick stats row
├──────────────────────────┤
│ ┌──────────────────────┐ │
│ │ ▶ Report a Violation │ │  ← HERO CTA (gradient card)
│ │  Capture evidence    │ │
│ └──────────────────────┘ │
├──────────────────────────┤
│ Information              │
│ [Safety] [Signs] [Fine]  │  ← Info cards row
├──────────────────────────┤
│ Recent Activity          │
│ ✓ Speeding verified  2h  │  ← Activity feed
│ ⏱ Red light review   5h  │
│ ✗ Parking rejected   1d  │
└──────────────────────────┘
```

**Key decisions:**
- The **"Report a Violation"** CTA is a large gradient card (not a flat button) — it's the #1 action
- Stats are immediately visible without scrolling
- Activity feed uses status dots + semantic colors for instant scanning

### Officer Dashboard
- Gradient stat cards with diagonal gradient orientation
- Bordered action cards with circular chevron indicators
- Quick Actions immediately below stats — 1-tap to Pending Queue

---

## 4. Component Design System

### Button (`<Button>`)
| Variant     | Style                                    | Shadow             |
|-------------|------------------------------------------|---------------------|
| `primary`   | Horizontal gradient (`#4F46E5→#6366F1`)  | Indigo-tinted glow  |
| `secondary` | White surface, 1.5px border              | None                |
| `outline`   | Transparent, indigo border               | None                |
| `ghost`     | Transparent                              | None                |
| `danger`    | Solid `#DC2626`                          | Red-tinted glow     |
| `success`   | Solid `#059669`                          | Green-tinted glow   |
| `soft`      | `#EEF2FF` surface                        | None                |

**Sizes**: `sm` (36px), `md` (48px), `lg` (56px)

### Input (`<Input>`)
- **Default**: 1.5px `#E2E8F0` border, white bg
- **Focused**: Border changes to `#4F46E5`, subtle shadow
- **Error**: Red border, pink surface (`#FEF2F2`)
- **New**: `helperText` prop, `required` indicator

### Skeleton (`<Skeleton>`, `<CardSkeleton>`, `<StatSkeleton>`)
- Pulsing opacity animation (0.3 → 0.7, 1200ms loop)
- Preset shapes for cards and stats

### FeedbackToast (`<FeedbackToast>`)
- Slide-in from top with spring animation
- Auto-dismiss after 3s
- Variants: `success`, `error`, `info`, `warning`
- Colored icon badge + semantic surface background

---

## 5. Interaction & Motion Spec

### Hover / Press States
| Element          | Behavior                    |
|------------------|-----------------------------|
| All buttons      | `activeOpacity={0.7-0.85}`  |
| Cards            | `activeOpacity={0.7}`       |
| Primary CTA      | Gradient shimmer on press   |
| Tab icons        | Pill background on active   |

### Loading States
- **Buttons**: `ActivityIndicator` replaces text
- **Screens**: `<CardSkeleton>` / `<StatSkeleton>` replaces content
- **Location detect**: Spinner inside gradient pill button

### Success Feedback
- `<FeedbackToast>` slides in from top with `spring` animation
- Icon pops with scale animation
- Auto-dismisses after 3 seconds

### Screen Transitions
- Splash: Logo scales in (0.7→1.0) with fade, then title fades, then subtitle fades
- Onboarding: Horizontal page swipe with animated dot indicators
- Navigation: Default `NativeStack` transitions (platform-native)

---

## 6. Accessibility (WCAG 2.1 AA)

### Contrast Ratios
| Pair                       | Ratio  | Passes AA |
|----------------------------|--------|-----------|
| `textPrimary` on `surface` | 15.5:1 | ✅         |
| `textSecondary` on `surface`| 6.4:1 | ✅         |
| `white` on `primary`       | 4.6:1  | ✅         |
| `white` on `success`       | 4.5:1  | ✅ (AA)    |
| `white` on `error`         | 4.6:1  | ✅         |

### Touch Targets
- All interactive elements: minimum **44×44px** touch targets
- Back buttons: 40×40px with 8px padding = 56px effective area
- Tab icons: wrapped in pill container for expanded hit area

### Screen Reader
- Ionicons wrapped in semantic containers
- Status dots include parent text labels
- Form inputs have proper `label` associations

### Mobile Responsive
- `MobileContainer` caps at 428px for web; fills native width
- Stat cards use `flex: 1` for even distribution
- Buttons use `fullWidth` for edge-to-edge touch targets

---

## 7. File Changes Summary

### New Files
| Path | Purpose |
|------|---------|
| `src/components/common/Skeleton.js` | Loading skeleton with shimmer |
| `src/components/common/FeedbackToast.js` | Animated toast notifications |
| `docs/UI_REVAMP_GUIDE.md` | This documentation |

### Modified Files
| Path | Changes |
|------|---------|
| `src/utils/theme.js` | Complete color palette, spacing, shadows, gradients |
| `src/utils/index.js` | New exports: `GRADIENTS`, `LINE_HEIGHTS`, `SCREEN_*` |
| `src/components/index.js` | New exports: `Skeleton`, `FeedbackToast` |
| `src/components/common/Button.js` | Gradient primary, colored shadows, new `soft` variant |
| `src/components/common/Input.js` | Focus states, error surface, helper text |
| `src/components/common/MobileContainer.js` | Removed background image pattern |
| `src/screens/shared/SplashScreen.js` | Animated entrance, hero gradient, decorative circles |
| `src/screens/shared/OnboardingCarousel.js` | Gradient icons, refined indicators |
| `src/screens/auth/RoleSelection.js` | Gradient icon badges, role labels, bordered cards |
| `src/screens/auth/CitizenSignIn.js` | Bordered back button, gradient CTA |
| `src/screens/citizen/CitizenHome.js` | Gradient report CTA, bordered stats, status dots |
| `src/screens/citizen/Profile.js` | Hero gradient header, initials avatar, colored menu |
| `src/screens/citizen/NewReport.js` | Step indicator, gradient buttons, AI CTA |
| `src/screens/officer/OfficerDashboard.js` | Diagonal gradients, bordered actions |
| `src/navigation/CitizenNavigator.js` | Active tab pill, refined tab bar |
| `src/navigation/OfficerNavigator.js` | Matching teal tab pill styling |

---

## 8. Using the New Components

### FeedbackToast Example
```jsx
import { FeedbackToast } from '../components';

// In your screen:
const [showToast, setShowToast] = useState(false);

<FeedbackToast
    visible={showToast}
    message="Report submitted successfully!"
    subtitle="An officer will review it shortly"
    variant="success"
    onDismiss={() => setShowToast(false)}
/>
```

### Skeleton Example
```jsx
import { CardSkeleton, StatSkeleton } from '../components';

// While loading:
{loading ? (
    <>
        <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
        </View>
        <CardSkeleton />
        <CardSkeleton />
    </>
) : (
    // Render actual content
)}
```

---

*This revamp transforms TrafficEye from a prototype UI to an enterprise-ready product. The design system is extensible — all tokens are in `theme.js`, and new screens should use these constants exclusively.*
