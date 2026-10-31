# Petzadore Insurance — frontend

React 19 + TypeScript + Vite + Ant Design 6. Runs inside the WordPress page that has the
`[petzadore_insurance]` shortcode; the plugin prints the mount point and
`window.PetzadoreInsurance` (API base, session token, refresh URL, user).

## Setup (Windows PowerShell)

```powershell
cd frontend
nvm use 22
npm install
Copy-Item .env.example .env.local
```

## Run it

**Mock mode** (UI only, no backend, no token). Set `VITE_MOCK_API=true` in `.env.local`, then
`npm run dev` and open http://localhost:5173. Every screen runs on sample data from `src/mock/`:
4 pets (one cat, and Rocky, who is too old), the 3 plans from the backend catalogue, and a fake
Razorpay window where you choose to pay, fail or cancel. The profile button (top right) shows a
sample account menu with "Reset demo data" and "Log out". Other cases (no pets, all 5 slots used,
can't load pets, session ended, payment stuck on "confirming") open with `?mock=<scenario>`; the
keys are in `src/mock/scenario.ts`. Mock code is a separate chunk, only loaded in this mode.

**Standalone with the backend.** Set `VITE_MOCK_API=false` (or remove it). The app runs at http://localhost:5173 against your local backend.

1. Start the backend: `cd ..\backend; npm run dev`
2. Get a token: `npm run token:dev -- 31 "Anjana Sri" you@example.com`
3. Paste it into `frontend\.env.local` as `VITE_DEV_TOKEN=...`
4. Start the frontend: `cd ..\frontend; npm run dev`
5. Open http://localhost:5173. The token lasts 15 minutes; after that, get a new one.

The backend's `CORS_ORIGINS` must include `http://localhost:5173`, and its `WP_*` settings
must point at staging so `/v1/pets` returns real pets.

**Inside WordPress** (real login, real token refresh).

1. Run `npm run dev`.
2. In WP Admin → Settings → Petzadore Insurance, set **React dev server** = `http://localhost:5173`.
3. Open the `/get-insurance` page. Changes hot-reload.
4. The backend must allow the site's origin in `CORS_ORIGINS` (e.g. `https://staging.petzadore.com`),
   and `VITE_WP_ORIGINS` in `.env.local` must list the site.

## Build for the plugin

```powershell
npm run build
```

Writes the app into `../wp-plugin/petzadore-insurance/app/` (with `.vite/manifest.json`).
Then clear **React dev server** in the plugin settings and zip the plugin as usual.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on port 5173 |
| `npm run build` | Type-check, then build into the plugin's `app/` folder |
| `npm run lint` | `tsc` type check + ESLint |
| `npm run format` | Prettier |

## Structure

```
src/
├── main.tsx              mounts into #petzadore-insurance-root (real or mock services)
├── App.tsx               providers (WordPress-safe Ant Design), session-ended screen, step switch
├── config.ts             window.PetzadoreInsurance type + dev fallback from .env.local
├── services.ts           what screens use from outside: api, checkout, session-ended events
├── theme.ts              brand colours / font as Ant Design tokens
├── api/
│   ├── types.ts          backend response types (keep in step with backend/src/routes)
│   ├── client.ts         fetch + Bearer token, auto-renew via WordPress, ApiError
│   └── endpoints.ts      one typed function per backend route
├── state/
│   ├── wizard.ts         steps, reducer, sessionStorage persistence
│   └── AppContext.tsx    config + api + wizard state for every component
├── hooks/                useAsync, usePets, useQuote
├── lib/                  razorpay.ts (Checkout loader), format.ts (₹, phone, pet summary)
├── components/           AppShell (progress bar/stepper, heading, aside, sticky actions), OrderSummary,
│                         PetAvatar, StatusScreens (loading, error, session ended, logged out), Redirect
├── steps/                PetSelect, AddPet, Plan, Details, ReviewPay, Success (+ .module.css)
├── mock/                 sample data, fake endpoints + Razorpay window, scenario panel (VITE_MOCK_API)
└── styles/app.css        CSS variables + reset scoped to .pzi-app
```

## WordPress-safe styling

- `StyleProvider hashPriority="high"`: Ant's styles beat the theme's `button`/`input` rules.
- Popups (Select, DatePicker) render inside the app root via `getPopupContainer`.
- Everything is scoped under `.pzi-app`. There's no global reset, so the WordPress
  header and footer are untouched.
- Prefer Ant components or classed `div`/`span` over bare `h1`/`p`, since theme rules like
  `.entry-content h1` can still reach bare elements.
- Phone vs desktop layouts switch at 640px. `pzi-mobile-only` / `pzi-desktop-only` (app.css)
  show an element on one side only.

## Not built yet

Mock mode covers all of these, so the screens can be reviewed now.

- **Add pet:** saving needs `POST /v1/pets` (backend) and a plugin write route. Until then
  the form shows "Saving new pets isn't available yet". The photo is sent as a data URL for now.
- **Breed:** searchable list from `GET /v1/breeds`; falls back to free text while that returns an error.
- **Plugin config:** `profileUrl` ("Open my profile") and `contactUrl` ("Talk to us") are optional
  fields the shortcode doesn't print yet; the links are hidden without them.
- **Contact edits (Step 3):** kept in the wizard state only; not yet sent with the order or saved to the profile.
- **Step 3 (Details):** the insurer field list is still to be confirmed. `POST /v1/orders`
  needs to accept the answers.
- **Links:** the policy terms and exclusions links, the "My policies" page, and the insurer's turnaround time.
