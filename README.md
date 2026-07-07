# ColorSpend — Expense Tracker

Colorful expense tracker with Firebase Auth (Google SSO) and Firestore, using the Firebase **compat** SDK. Each user only sees their own expenses.

## Files
- `index.html` — app markup
- `styles.css` — colorful UI, light/dark aware
- `firebase-config.js` — Firebase compat init (uses your project config)
- `app.js` — auth, Firestore CRUD, stats, Chart.js charts (day/week/month)
- `firestore.rules` — security rules restricting each user to their own data

## One-time Firebase console setup
1. Go to the [Firebase console](https://console.firebase.google.com/) → project **expenseprivatedb**.
2. **Authentication → Sign-in method** → enable **Google**.
3. **Authentication → Settings → Authorized domains** → add the domain you'll serve this from (e.g. `localhost`, or your hosting domain).
4. **Firestore Database** → create a database (production mode) if not already created.
5. **Firestore → Rules** → paste the contents of `firestore.rules` and publish.

## Data model
```
users/{uid}/expenses/{expenseId}
  amount: number
  category: string
  date: "YYYY-MM-DD"
  note: string
  createdAt: server timestamp
```

## Running locally
Just open `index.html` via a local server (Google sign-in popup requires http/https, not `file://`):

```
# from the project folder
npx serve .
# or
python -m http.server 5500
```

Then visit the printed localhost URL and add `localhost` (with port, if Firebase requires it) to Authorized domains.

## Features
- Google Sign-In (Firebase compat SDK), per-user data isolation via Firestore rules + `users/{uid}` path
- Add expenses with amount, category, date, note
- Live stats: Today / This Week / This Month / All Time
- Line chart: spending trend toggle for Day (7d) / Week (6w) / Month (6mo)
- Doughnut chart: category breakdown
- Filterable, deletable expense list
- Realtime sync via Firestore `onSnapshot`
