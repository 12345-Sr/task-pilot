# Task Pilot — API Spec (Backend Contract)

This is the exact contract the mobile app expects. It mirrors the backend module
layout from the feature doc (`backend/routes/*.js`). Build the backend to match
this, or adjust it — either way, `src/api/client.js` is the **only** file in the
mobile app that needs to change once the real backend exists.

- **Base URL (local):** `http://<your-LAN-IP>:4000/api`
- **Auth:** `Authorization: Bearer <token>` header on every route except
  `POST /auth/register` and `POST /auth/login`
- **Content type:** `application/json` for all requests/responses
- **Errors:** `{ "message": "human readable reason" }` with a non-2xx status code

---

## 1. Auth — `routes/auth.js`

### `POST /auth/register`
Creates a user and immediately starts the 3-day free trial.

Request:
```json
{ "name": "Rohan Sharma", "email": "rohan@example.com", "password": "••••••••", "language": "hi" }
```
Response `201`:
```json
{
  "token": "jwt...",
  "user": { "id": "u_123", "name": "Rohan Sharma", "email": "rohan@example.com", "language": "hi", "trialEndsAt": "2026-09-07T00:00:00.000Z" }
}
```

### `POST /auth/login`
Request: `{ "email": "...", "password": "..." }`
Response `200`: `{ "token": "jwt...", "user": { "id", "name", "email", "language" } }`

### `PATCH /auth/language`  *(auth required)*
Request: `{ "language": "ta" }`
Response `200`: `{ "ok": true }`

### `POST /auth/push-token`  *(auth required)*
Request: `{ "pushToken": "ExponentPushToken[xxxx]" }`
Response `200`: `{ "ok": true }`

---

## 2. Tasks — `routes/tasks.js`

### `GET /tasks?date=YYYY-MM-DD`  *(auth required, `date` optional)*
Response `200`:
```json
{
  "tasks": [
    { "id": "t_1", "title": "Client ko report bhejna", "date": "2026-09-05", "time": "18:00", "priority": "important", "status": "pending" }
  ]
}
```
`priority`: `"important" | "medium"` · `status`: `"pending" | "done" | "missed"`

### `POST /tasks`  *(auth required)*
Request:
```json
{ "title": "Client ko report bhejna", "date": "2026-09-05", "time": "18:00", "priority": "important" }
```
Response `201`: `{ "task": { "id", "title", "date", "time", "priority", "status": "pending" } }`

**Paywall trigger** — if the trial has ended and there's no active subscription,
and the user already has 3 tasks for that `date`:
Response `402 Payment Required`:
```json
{ "message": "Free Zone limit reached", "freeUsedToday": 3, "freeLimit": 3 }
```
The app shows the paywall modal automatically on this status code — no extra wiring needed.

### `PATCH /tasks/:id`  *(auth required)*
Request: `{ "status": "done" }`  — used by the evening ✓/✗ confirmation
Response `200`: `{ "task": { ...updated } }`

### `DELETE /tasks/:id`  *(auth required)*
Response `200`: `{ "ok": true }`

---

## 3. Subscriptions — `routes/subscriptions.js`

### `GET /subscriptions/status`  *(auth required)*
Response `200`:
```json
{ "status": "trial", "trialEndsAt": "2026-09-07T00:00:00.000Z" }
```
or
```json
{ "status": "active", "currentPeriodEnd": "2026-10-05T00:00:00.000Z" }
```
`status`: `"trial" | "active" | "cancelled"`

### `POST /subscriptions/subscribe`  *(auth required)*
Request: `{ "paymentRef": "razorpay_payment_id_or_similar" }`

⚠️ **Activate only after the payment gateway confirms payment** — verify
`paymentRef` server-side with Razorpay/Stripe before writing `status: "active"`.

Response `200`: `{ "status": "active", "currentPeriodEnd": "2026-10-05T00:00:00.000Z" }`

### `POST /subscriptions/cancel`  *(auth required)*
Response `200`: `{ "status": "cancelled" }`

---

## 4. Admin — `routes/admin.js`
*(Used by the separate web admin panel, not the mobile app — listed here for completeness.)*

| Route | Purpose |
|---|---|
| `POST /admin/login` | Admin email/password → admin JWT |
| `GET /admin/stats` | Total users, trial/active/cancelled counts, MRR, total & completed tasks |
| `GET /admin/users?search=` | Paginated user list with subscription status |
| `GET /admin/subscriptions?status=` | Filterable subscriptions list |
| `POST /admin/users/:id/grant-premium` | Manually activate premium for a user |

---

## 5. Scheduler — `scheduler.js`
Not an HTTP route — a cron job on the backend. Runs every minute, checks which
tasks are 2h / 1h from their deadline, and sends a push notification via
`sendPush()` (Expo Push API / FCM). Runs once daily at 7 AM for the morning
briefing push. The mobile app just needs to have called
`POST /auth/push-token` so the scheduler knows where to send it.

---

## 6. Database tables (PostgreSQL) — reference only

| Table | Key columns |
|---|---|
| `users` | id, name, email, password_hash, language, push_token, install_date |
| `subscriptions` | user_id, status, price, trial_start, trial_end, current_period_end, payment_provider_ref |
| `tasks` | id, user_id, title, date, time, priority, status |
| `notification_log` | id, task_id, type ('morning'\|'2h'\|'1h'), sent_at |
| `admin_users` | id, email, password_hash |

---

## Quick mapping: mobile function → HTTP route

| `src/api/client.js` function | Route |
|---|---|
| `register()` | `POST /auth/register` |
| `login()` | `POST /auth/login` |
| `updateLanguage()` | `PATCH /auth/language` |
| `savePushToken()` | `POST /auth/push-token` |
| `listTasks()` | `GET /tasks` |
| `createTask()` | `POST /tasks` |
| `updateTaskStatus()` | `PATCH /tasks/:id` |
| `deleteTask()` | `DELETE /tasks/:id` |
| `getSubscriptionStatus()` | `GET /subscriptions/status` |
| `subscribe()` | `POST /subscriptions/subscribe` |
| `cancelSubscription()` | `POST /subscriptions/cancel` |
