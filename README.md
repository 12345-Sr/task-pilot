# ✈️ Task Pilot
> *"Kal ka kaam, aaj set karein — Smart deadline reminders & evening confirmations"*

**Task Pilot** is a modern task-reminder and productivity mobile application that alerts users about upcoming tasks, sends proactive advance reminders before deadlines, and tracks daily consistency streaks.

The app supports **8 Regional Languages** (Hindi, English, Marathi, Bengali, Tamil, Telugu, Gujarati, Punjabi), email verification OTPs, support ticketing, and an administrator dashboard.

---

## 📦 4 Core Components

### 1. `database/` — PostgreSQL Schema
- **File**: `database/schema.sql`
- Production PostgreSQL schema featuring:
  - `users`: accounts, language preference (8 languages), push tokens, trial start/end timestamps.
  - `subscriptions`: ₹399/month subscription records, status (`active`, `expired`, `cancelled`).
  - `tasks`: tasks with deadline times, priority (`ZAROORI` / `MEDIUM`), alert dispatch flags (`morning_alert_sent`, `two_hour_alert_sent`, `one_hour_alert_sent`), and evening confirmation status (`COMPLETED` ✓ / `MISSED` ✗).
  - `notification_logs`: audit trail for dispatched reminders.
  - `daily_progress`: streak tracking, completion percentage.
  - `user_settings`: notification timing and preferences.

### 2. `backend/` — Node.js + Express REST API & Alert Scheduler
- **Directory**: `backend/`
- **Features**:
  - **Auth**: Register, login, JWT session, language change, push-token registration.
  - **Tasks**: Create, list, update, delete, complete.
  - **402 Payment Required**: If the user's 3-day trial has ended without an active subscription, the API responds with `402 Payment Required`, automatically triggering the mobile paywall screen.
  - **Notification Scheduler** (`src/services/scheduler.service.ts`):
    - 🌅 **08:00 AM**: Subah ki briefing dispatch.
    - ⏰ **2 Hours Before**: Proactive reminder when deadline is ~120 minutes away.
    - ⚡ **1 Hour Before**: Urgent reminder when deadline is ~60 minutes away.
    - 🌙 **08:00 PM**: Shaam ka confirmation prompt.
  - **Subscriptions**: Status check, subscribe (₹399/month), cancel.

### 3. `admin-panel/` — Website-Based Dashboard (Single HTML File)
- **File**: `admin-panel/index.html`
- **Features**:
  - Live API status indicator (Port 5001).
  - Real-time KPI Cards: Total Users, Active Subscribers, Monthly Revenue (MRR in ₹), Reminders Sent Today.
  - User Registry table with plan status tags (Trial, Pro, Expired).
  - Push notification broadcast tool to dispatch announcements to all users.

### 4. `mobile-app/` (or `frontend/`) — React Native Expo App (Android & iOS)
- **Directory**: `mobile-app/` (symlinked to `frontend/`)
- **Features**:
  - **8 Regional Languages**: Switch instantly from the login screen or settings between Hindi, English, Marathi, Bengali, Tamil, Telugu, Gujarati, and Punjabi.
  - **Naya Kaam Add Karna**: Set task name, date, deadline time, and priority (**🔴 Zaroori** / **🟡 Medium**).
  - **Alert Timeline Card**: Each task displays its 3-point alert path: `🌅 Subah Briefing` → `⏰ 2 Ghante Pehle` → `⚡ 1 Ghanta Pehle`.
  - **Shaam Ka Confirmation**: Dedicated screen where users confirm accomplishments in one tap with **✓ (Hua)** or **✗ (Nahi Hua)** buttons.
  - **Progress & Streak**: 7-day visual performance bar chart, daily flame streak indicator, and completion stats.
  - **₹399/Month Paywall Screen**: Triggered on free-tier limit or 402 API response with 3-day trial highlight and UPI payment badges.

---

## 🏃 Quickstart Instructions

### 1. Mobile App
```bash
cd /Users/sratanshushukla/Downloads/kal-ka-kaam-mobile/mobile-app
npx expo start -c
```
Press **`r`** to reload or scan the QR code in **Expo Go**.

### 2. Backend Server
```bash
cd /Users/sratanshushukla/Downloads/kal-ka-kaam-mobile/backend
npm start
```
Runs at `http://localhost:5001`. Health check: `http://localhost:5001/api/health`.

### 3. Admin Panel
Open `admin-panel/index.html` directly in any web browser (e.g., Google Chrome or Safari).
