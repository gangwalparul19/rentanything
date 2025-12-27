# RentAnything Mobile App

React Native mobile application for the RentAnything hyper-local rental marketplace.

## 📱 Features

- **Authentication**: Email/password and Google Sign-In
- **Browse Items**: Search with category filters
- **Browse Properties**: Rent or flatmate listings
- **Create Listings**: List items for rent with photos
- **Chat**: Real-time messaging with owners
- **Wishlist**: Save favorite items
- **My Bookings**: Track rental history
- **Profile Management**: Edit profile details

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app on your phone (for testing)

### Installation

```bash
cd mobile
npm install
```

### Configuration

1. Copy your Firebase config to `src/config/firebase.js`
2. Replace the placeholder values with your actual Firebase credentials

### Running the App

```bash
# Start development server
npx expo start

# Start with clearing cache
npx expo start -c

# Run on Android
npx expo start --android

# Run on iOS (Mac only)
npx expo start --ios
```

### Testing on Physical Device

1. Install "Expo Go" from App Store or Play Store
2. Run `npx expo start`
3. Scan the QR code with your phone

## 📁 Project Structure

```
mobile/
├── App.js                 # Entry point
├── app.json               # Expo config
├── src/
│   ├── config/            # Firebase config
│   ├── context/           # Auth state management
│   ├── navigation/        # React Navigation setup
│   ├── screens/           # All app screens
│   │   ├── auth/          # Login, Register
│   │   ├── home/          # Home screen
│   │   ├── search/        # Browse items
│   │   ├── listings/      # Item details, create
│   │   ├── properties/    # Property browsing
│   │   ├── chat/          # Messaging
│   │   ├── profile/       # User profile
│   │   ├── bookings/      # My bookings
│   │   └── wishlist/      # Saved items
│   └── styles/            # Colors, typography
```

## 🏗️ Building for Production

### Android APK

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
npx eas login

# Build APK
npx eas build --platform android --profile preview
```

### iOS Build

Requires Apple Developer account ($99/year)

```bash
npx eas build --platform ios --profile preview
```

## 📝 Notes

- The app uses the same Firebase backend as the web app
- Push notifications require additional FCM setup
- iOS builds require a Mac or EAS Build service

## 🔧 Tech Stack

- **Framework**: React Native + Expo
- **Navigation**: React Navigation
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Icons**: @expo/vector-icons
