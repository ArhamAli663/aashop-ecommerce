# ⚡ LUMINA | Modern Full-Stack E-Commerce Store

A complete, production-ready Full-Stack E-Commerce web application built with a modern frontend, Express.js backend, SQLite database, **Real Email OTP Verification**, and **Persistent Session Login**.

---

## 🛠️ Languages & Technologies Used (Tafseel)

1. **HTML5 (Structure):**
   - Semantic HTML elements (`<header>`, `<main>`, `<section>`, `<footer>`, `<dialog>`, `<form>`).
   - Accessible inputs, modals, sliding drawers, and SVG icons.

2. **CSS3 & Modern Design System (Styling):**
   - **Vanilla CSS3** with custom CSS Variables (`--primary-gradient`, `--bg-card`, etc.).
   - Glassmorphism (`backdrop-filter: blur(16px)`), modern dark mode typography (Plus Jakarta Sans).
   - Micro-animations, responsive layout with CSS Grid and Flexbox for mobile, tablet, and desktop.

3. **JavaScript / ES6+ (Frontend Client Logic):**
   - Modular state management (`cart`, `wishlist`, `currentUser`, `token`, `filters`).
   - Async/Await REST API calls, debounced search, active category filtering.
   - Dynamic Cart calculation (subtotals, taxes, shipping, promo discounts).
   - 6-digit auto-advancing OTP input handlers and clipboard paste support.
   - Persistent session restoration using `localStorage` and token verification.

4. **Node.js (Runtime Environment):**
   - Server-side execution engine (Node v24.15.0+).

5. **Express.js (Backend Framework):**
   - RESTful API routing (`/api/auth`, `/api/products`, `/api/orders`).
   - JSON body parsing, CORS middleware, static asset serving.

6. **SQLite 3 & SQL (Database):**
   - Relational tables with foreign keys and ACID compliance:
     - `users` (id, name, email, password_hash, is_verified, created_at)
     - `otps` (id, email, otp_code, purpose, expires_at, created_at)
     - `products` (id, title, description, price, category, rating, image_url, stock, featured)
     - `orders` (id, user_id, customer_name, customer_email, address, total_amount, payment_method, status)
     - `order_items` (id, order_id, product_id, title, price, quantity, image_url)
   - Auto-seeded realistic product catalog with high-res photography.

7. **Nodemailer (Real Email OTP Service):**
   - Dispatches real 6-digit numeric OTP codes to user email addresses with branded HTML email templates.
   - Supports live **Gmail SMTP (App Passwords)**, custom SMTP, or instant test mailbox preview links.

8. **JWT (JSON Web Tokens) & BcryptJS (Security):**
   - Strong password hashing with `bcryptjs` (salt rounds = 10).
   - Persistent 30-day JWT authentication tokens for seamless auto-login across browser refreshes and restarts.

---

## 🚀 Key Features

- 🛍️ **Product Catalog & Dynamic Filtering:** Instant category pills (Electronics, Audio, Fashion, Accessories, Home), sort by price/rating/newest, live search bar with debounce.
- 🔍 **Interactive Product Details Modal:** High-res gallery preview, specs list, live quantity selector, related items recommendation.
- 🛒 **Sliding Cart Drawer:** Quantity increment/decrement, remove items, order summary breakdown (Subtotal, Shipping, Tax, Promo codes `SAVE10` & `WELCOME20`).
- 💳 **Order Processing & Multi-Step Checkout:** Shipping information, payment selection (Cards, COD, EasyPaisa/JazzCash), simulated payment sandbox, live order confirmation receipt with Order ID (`ORD-00000X`).
- ✉️ **Real 6-Digit Email OTP Verification:** Sends real OTP codes to actual email addresses with 10-minute expiry and 60-second resend cooldown timer.
- ⚡ **One-Click Passwordless OTP Login:** Users can sign in instantly just with their email and a single real OTP code.
- 🔒 **Persistent Login ("Remember Me"):** Login state remains permanently saved in the database and browser across page reloads and browser restarts.
- 📦 **User Profile & Order History:** View past orders, placed dates, order items breakdown, and current delivery status (`Processing`, `Shipped`, `Delivered`).

---

## 🏃 How to Run the Application

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
npm start
```
Server runs at: **`http://localhost:3000`**

### 3. Run Automated Tests
```bash
node test_api.js
node test_otp_and_session.js
```

---

## 📧 How to Setup Real Gmail OTP Delivery (Live Inboxes)

To send real OTP emails directly to actual Gmail/Hotmail/Yahoo inboxes:
1. Go to your **Google Account** > **Security** > enable **2-Step Verification**.
2. Search for **"App passwords"** (or visit `https://myaccount.google.com/apppasswords`).
3. Create an app password named **"Lumina Store"**.
4. Open the [`.env`](file:///e:/links/.env) file and update:
   ```env
   EMAIL_SERVICE=gmail
   SMTP_USER=your-actual-email@gmail.com
   SMTP_PASS=your-16-letter-app-password
   ```
5. Restart the server! Real OTP emails will now arrive in real user inboxes.
