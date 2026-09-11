# Task Pilot — Mobile App (React Native / Expo)

Frontend-only build. Every screen works right now on **mock data** (`src/api/client.js`,
`MOCK_MODE = true`) — no backend required to click through it.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android/iOS), or press `w` to open it in a browser.

## What's built (matches the feature doc)

- **Auth screen** — signup / login, 8-language picker, 3-day trial note
- **+ Naya Kaam** — add task (title, date, time, priority), Free Zone quota note
- **Aaj Ke Kaam** — task list with 🌅 / 2h / 1h alert-timeline chips
- **Shaam Check** — evening ✓ / ✗ confirmation per task
- **Progress** — completion bar, streak (Premium-locked), feature list, plan management
- **Paywall modal** — triggers automatically when the free daily limit (3/day) is hit
- **8 languages** fully translated: Hindi, English, Marathi, Bengali, Tamil, Telugu, Gujarati, Punjabi

## Connecting the real backend

Everything talks to the backend through **one file**: `src/api/client.js`.

1. Open `src/api/client.js`
2. Set `MOCK_MODE = false`
3. Set `BASE_URL` to your backend (e.g. `http://192.168.1.5:4000/api` for local testing, matching Step 5 of the original setup guide)
4. Done — no screen or component needs to change, since they only ever call the exported functions (`login`, `register`, `createTask`, `subscribe`, etc.)

Full endpoint contracts (request/response shapes, status codes, auth headers) are in **`API_SPEC.md`** — hand that file to whoever builds the backend, or use it yourself when you get to Step 3 of the setup guide.

## Not included in this pass (by design)

- **Admin panel** — stays a separate web dashboard per the product spec (single HTML file), not part of the mobile app
- **Real push notifications** — `savePushToken()` is wired up but the backend's `sendPush()` is a stub until Expo Push API / FCM is added
- **Date/time pickers** — currently plain text inputs (`YYYY-MM-DD`, `HH:MM`) for zero-dependency setup; swap in `@react-native-community/datetimepicker` when you're ready
- Font files (Manrope / Noto Sans Devanagari / Inter) — `src/theme/theme.js` has placeholders; load them with `expo-font` for pixel-parity with the original web demo
