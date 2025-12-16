# RentAnything.shop 🛒
**Hyper-Local Rental Marketplace for Hinjewadi Phase 3**

> Don't Buy. Just Rent.

---

## 📖 Overview

RentAnything.shop is a **Progressive Web App (PWA)** designed to facilitate peer-to-peer rentals within trusted communities. The pilot launch targets **Megapolis, Hinjewadi Phase 3**, connecting IT professionals and families to rent items like kids' gear, party essentials, home decoration items, camping equipment, tools, and more.

The platform emphasizes **trust** and **safety** using:
- ✅ **Verified Seller Model** (Aadhaar/ID verification)
- 🏘️ **Hyper-Local Approach** (minimizes logistics)
- 📝 **Digital Legal Agreements** (for high-value rentals)
- 💬 **In-App Messaging** (secure communication)
- ⭐ **Review System** (builds community trust)

---

## 🛠 Tech Stack

### Frontend
- **HTML5, CSS3, JavaScript (ES6+)**
- **Font Awesome** for icons
- **Google Fonts (Outfit)** for typography
- **Flatpickr** for date selection
- **Chart.js** for admin dashboard visualizations

### Backend as a Service (BaaS)
- **Firebase Authentication** - Google Sign-In & Email/Password
- **Cloud Firestore** - NoSQL real-time database
- **Firebase Storage** - Image and document storage
- **Firebase Cloud Functions** - Serverless backend logic
- **Firebase Hosting** - Fast & secure deployment

### PWA Features
- ✅ Service Worker for offline functionality
- ✅ Web App Manifest for installability
- ✅ Background sync capabilities
- ✅ Push notifications (ready for implementation)

---

## 📂 Project Structure

```
rentanything-website/
├── css/
│   └── style.css                 # Main stylesheet
├── js/
│   ├── app.js                    # Homepage logic & listings
│   ├── auth.js                   # Authentication & notifications
│   ├── create-listing.js         # Create/edit listings with AI features
│   ├── product-details.js        # Product page & booking
│   ├── chat.js                   # Messaging system
│   ├── profile.js                # User profile & verification
│   ├── my-listings.js            # Manage user listings
│   ├── my-bookings.js            # Booking management & reviews
│   ├── search.js                 # Advanced search & filters
│   ├── requests.js               # Community requests board
│   ├── agreement.js              # Digital signature for agreements
│   ├── admin.js                  # Admin dashboard
│   ├── firebase-config.js        # Firebase initialization
│   ├── navigation.js             # Mobile menu logic
│   ├── theme.js                  # Dark/light mode
│   ├── toast.js                  # Toast notifications
│   └── image-compressor.js       # Image optimization
├── index.html                    # Homepage
├── search.html                   # Search & filtering
├── product.html                  # Product details page
├── create-listing.html           # Create/edit listing form
├── my-listings.html              # User's listings dashboard
├── my-bookings.html              # User's bookings dashboard
├── profile.html                  # User profile & verification
├── chat.html                     # Messaging interface
├── requests.html                 # Community requests board
├── agreement.html                # Legal agreement signing
├── admin.html                    # Admin panel
├── how-it-works.html             # Information page
├── report.html                   # Report issues
├── manifest.json                 # PWA manifest
├── sw.js                         # Service worker
├── firestore.rules               # Firestore security rules
├── storage.rules                 # Storage security rules
├── firebase.json                 # Firebase configuration
└── package.json                  # NPM dependencies
```

---

## 🎯 Core Features

### ✅ Implemented
1. **User Authentication**
   - Google Sign-In
   - Session management
   - Profile creation

2. **Listing Management**
   - Create, edit, delete listings
   - Multi-image upload with compression
   - AI-powered description generation
   - AI-based pricing suggestions
   - Category-based organization

3. **Advanced Search & Discovery**
   - Text search
   - Category filters
   - Price range filters
   - Date availability filters
   - Map view with tower-based filtering
   - Verified user badges

4. **Booking System**
   - Date selection with calendar
   - Blocked dates (unavailable periods)
   - Security deposit calculation
   - Rental duration calculation
   - Request/confirm/reject workflow

5. **In-App Messaging**
   - Real-time chat
   - Chat notifications
   - Unread message counters
   - Conversation history

6. **Reviews & Ratings**
   - Post-rental reviews
   - Star ratings
   - Review display on listings

7. **Community Requests Board**
   - Post item requests
   - Reply via chat
   - Real-time updates

8. **ID Verification System**
   - Government ID upload
   - Admin approval workflow
   - Verification badge display

9. **Digital Legal Agreements**
   - Auto-generated rental agreements
   - Digital signature capture
   - Agreement PDF generation (ready)
   - Required for deposits >₹10,000

10. **Favorites System**
    - Save favorite listings
    - Quick access to saved items

11. **Notifications System**
    - In-app notification center
    - Booking notifications
    - Chat notifications
    - Mark as read functionality

12. **Admin Dashboard**
    - User management
    - Listing oversight
    - Booking tracking
    - ID verification approval
    - Report management
    - Revenue analytics
    - Category distribution charts

13. **Progressive Web App**
    - Installable on mobile/desktop
    - Offline capability
    - Service worker caching

---

## 🔐 Security Features

### Firebase Security Rules
- **Firestore Rules** - Row-level security for all collections
- **Storage Rules** - File access control based on user ownership
- **Admin-only operations** - ID verification, report management

### Data Protection
- XSS prevention (input sanitization)
- CSRF protection (Firebase handles)
- Secure file uploads (size limits, type validation)
- Private document storage (ID documents)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v14+)
- Firebase account
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd rentanything-website
```

2. **Install dependencies**
```bash
npm install
```

3. **Firebase Setup**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable services:
     - Authentication (Google & Email/Password)
     - Firestore Database (start in test mode)
     - Storage (start in test mode)
   - Copy your Firebase config

4. **Update Firebase Configuration**
   - Edit `js/firebase-config.js`
   - Replace with your Firebase project credentials

5. **Deploy Firestore Rules**
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

6. **Run Locally**
```bash
npm run dev
```

7. **Deploy to Firebase Hosting**
```bash
firebase deploy --only hosting
```

---

## 📊 Database Collections

### Firestore Collections
- `users` - User profiles and verification status
- `listings` - Rental item listings
- `bookings` - Rental bookings
- `chats` - Chat conversations
- `chats/{chatId}/messages` - Chat messages (subcollection)
- `reviews` - User and item reviews
- `notifications` - User notifications
- `favorites` - Saved listings
- `requests` - Community item requests
- `reports` - Issue reports
- `admins` - Admin user IDs
- `societies` - Society/tower information
- `society_requests` - New society requests

### Storage Structure
- `listings/{userId}/{fileName}` - Listing images
- `id_docs/{userId}/{fileName}` - ID verification documents
- `profiles/{userId}/{fileName}` - Profile pictures
- `signatures/{fileName}` - Agreement signatures

---

## 🎨 Design System

### Color Palette
- **Primary**: Indigo (#4F46E5)
- **Success**: Green (#22c55e)
- **Warning**: Amber (#f59e0b)
- **Error**: Red (#ef4444)
- **Background**: Light gray (#f8fafc)
- **Dark mode**: Supported via theme toggle

### Typography
- **Font Family**: Outfit (Google Fonts)
- **Responsive**: Fluid typography scale

### Components
- Cards with hover effects
- Skeleton loaders
- Toast notifications
- Modal dialogs
- Dropdown menus
- Badge indicators
- Animation states

---

## 👥 User Roles

1. **Guest** - Browse items (limited access)
2. **User** - Chat, request bookings, create listings
3. **Verified User** - All user features + verified badge
4. **Admin** - Full access to admin panel, can verify users

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration & login
- [ ] Create listing with images
- [ ] Search and filter functionality
- [ ] Booking request flow
- [ ] Chat messaging
- [ ] Review submission
- [ ] ID verification upload
- [ ] Agreement signing
- [ ] Admin panel access

---

## 📱 PWA Installation

### Mobile (Android/iOS)
1. Visit the site in Chrome/Safari
2. Tap the "Add to Home Screen" prompt
3. App will install like a native app

### Desktop
1. Visit the site in Chrome
2. Click the install icon in the address bar
3. Click "Install"

---

## 🤝 Contributing

Designed and developed by **Parul Gangwal**

---

## 📄 License

ISC License

---

## 🔗 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [PWA Best Practices](https://web.dev/progressive-web-apps/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
