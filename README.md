# Protegey — React example

Minimal Vite + React + TypeScript app demonstrating every `@protegey/sdk` module in the browser:
device intelligence, transaction reporting, behavioral biometrics, and identity verification.

On the web, there's no in-app webview — the KYC flow is just a URL, opened in a new tab (or an
iframe, or however fits your UI). That's a deliberate SDK design choice: see
`@protegey/react-native-sdk` or `protegey_sdk` (Flutter) for the in-app webview equivalent on
mobile.

## Run it

```bash
npm install
cp .env.example .env.local # fill in your real API key + base URL
npm run dev
```

## What it does

- On load (and again via "Identify device again"): `protegey.device.identify()` computes a real
  browser fingerprint and reports it.
- "Report a test transaction": `protegey.transactions.report()`, folding in the same device signal.
- "Report a behavioral event": `protegey.behavioral.report()` with sample keystroke/touch/navigation
  metrics — `status: "learning"` is expected for a brand-new customer, not an error.
- "Verify my identity": `protegey.kyc.startSession()`, then opens the returned hosted URL in a new
  tab — the dev decides how (`window.open` here; an iframe or redirect works just as well).

See `src/App.tsx` — under 100 lines, every call annotated.
