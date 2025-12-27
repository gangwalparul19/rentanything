RentAnything.shop 🛒
Hyper-Local Rental Marketplace for Hinjewadi Phase 3 > Don't Buy. Just Rent.

📖 Overview
RentAnything.shop is a Progressive Web App (PWA) designed to facilitate peer-to-peer rentals within trusted communities. The pilot launch targets Hinjewadi, connecting IT professionals and families to rent items like kids' gear, party essentials, home decoration items, etc.

The platform focuses on trust, using a "Verified Seller" model (Aadhaar/Identity check) and a hyper-local approach to minimize logistics.

🛠 Tech Stack (Free Tier Optimized)
We are sticking strictly to the Free Tier limits of these services to launch without initial cost.

Frontend: HTML, CSS, JS, AJAX

Styling: CSS

Backend as a Service (BaaS): Firebase (Google)

Auth: Firebase Authentication (Google)

Database: Cloud Firestore (NoSQL)

Storage: Firebase Storage (Image uploads)

Hosting: Vercel (Fast & Secure)

Serverless: Firebase Cloud Functions (For complex logic like notifications - Note: Functions require Blaze plan eventually, but we can do most MVP logic client-side or use limited free quota if available)

PWA: Native-like installability via manifest.json and Service Workers.

📂 Project Structure
We will use a modular structure. While Tailwind handles responsiveness via classes, we will separate complex page logic into mobile and desktop components where the UI diverges significantly.

Hyper-Local Filters:

Default view: "Hinjewadi"

Distance calculation using simple geolocation.

PWA Integration:

"Add to Home Screen" prompt.

Offline fallback page.

User Roles:

Guest: Browse items.

User: Chat & Request booking.

Verified Seller: Can list items (Checked via simplistic admin approval initially).

Booking Flow:

Calendar date picker.

Rent vs. Deposit calculation.

"Request to Book" button (No payment gateway integration in MVP Phase 1; cash/UPI on delivery).

Create a new project: rent-anything-shop.

Enable Authentication (Google & Email/Password).

Enable Firestore Database (Start in Test Mode).

Enable Storage.

Copy the config keys and create a .env file in the root:


🎨 Design System
Responsive web application supporting all sort of screen size.
