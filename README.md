# TaskAlert ⏰

> A smart task reminder, daily productivity tracking, and notification management mobile application with an integrated admin dashboard and PostgreSQL backend.

---

## 📱 Overview

**TaskAlert** is a full-stack mobile productivity application built to help users organize their daily routine, stay on schedule with precision reminders, and review morning & evening task progress. 

The project consists of three core components:
1. **Frontend (`frontend/`)**: Cross-platform mobile app built with React Native & Expo.
2. **Backend (`backend/`)**: RESTful API powered by Node.js, Express, and PostgreSQL.
3. **Admin Dashboard (`admin/`)**: Web-based administration console for monitoring users, task activity, and subscriptions.

---

## ✨ Features

- 🔔 **Precision Reminders**: Push notifications and alarm-level alerts via Notifee and Firebase Cloud Messaging (FCM).
- 🌅 **Morning & Evening Reflections**: Guided morning task planning and evening productivity review workflows.
- 📊 **Task History & KPIs**: Interactive timeline, status filters, and historical completion metrics.
- 💳 **Pro Subscriptions**: Built-in Razorpay integration supporting UPI QR codes, intent deep links (`TaskAlert://`), and payment callback verification.
- 🛡️ **Admin Panel**: Real-time management interface to monitor registered users, subscription statuses, and system metrics.
- ⚡ **Ultra-Optimized Build**: Native R8 minification and ABI compression yielding a lightweight **~12.5 MB** release APK.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Mobile App** | React Native 0.86, Expo 57, TypeScript, React Navigation, Zustand, TanStack React Query, Notifee |
| **Backend API** | Node.js (v18+), Express 4, PostgreSQL, Firebase Admin SDK, Razorpay SDK, node-cron |
| **Admin Web** | Vanilla JS, Modern CSS (Glassmorphism & Dark Mode), HTML5 |
| **Database** | PostgreSQL (with `pgcrypto` for UUID support) |

---

## 📂 Project Structure

```text
reminderApp/
├── frontend/           # React Native / Expo mobile application
│   ├── src/            # Screens, navigation, store, hooks & components
│   ├── android/        # Native Android project files & Gradle scripts
│   ├── app.json        # Expo app configuration
│   └── package.json
│
├── backend/            # Express REST API
│   ├── routes/         # Auth, tasks, subscriptions, and admin endpoints
│   ├── scheduler.js    # Cron job scheduler for automated notifications
│   ├── server.js       # Main server entry point
│   └── package.json
│
├── admin/              # Standalone web admin dashboard
│   ├── index.html      # Responsive dashboard UI
│   └── env.js          # Admin environment configurations
│
├── database/
│   └── schema.sql      # PostgreSQL database table schemas & initial seeds
│
└── TaskAlert-v1.0.4-release.apk # Production optimized Android release APK
```

---

## 🚀 Quick Start Guide

### 1. Database Setup
Ensure PostgreSQL is running, then create the database and run the schema:
```bash
createdb TaskAlert
psql -U postgres -d TaskAlert -f database/schema.sql
```

### 2. Backend Setup
```bash
cd backend
npm install

# Configure environment variables (.env)
cp .env.example .env

# Start development server (Port 4000)
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Start Expo dev server
npm start

# Or build release APK locally
npm run build:apk
```

### 4. Admin Dashboard
Serve the `admin/` folder using any static server or start via:
```bash
node admin-server.js
```
Visit `http://localhost:3000` to access the dashboard.

---

## 📦 Building Android Release APK

The project includes an optimized release pipeline configuring R8 code shrinking and native library compression:

```bash
cd frontend/android
./gradlew assembleRelease
```
The output APK is generated at:
`frontend/android/app/build/outputs/apk/release/app-release.apk` (~12.5 MB)

---

## 📄 License
Private & Proprietary. All rights reserved.
