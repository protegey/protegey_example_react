# Protegey — React example

Minimal Vite + React + TypeScript app demonstrating every `@protegey/sdk` module in the browser:
device intelligence, transaction reporting, alerts, behavioral biometrics, identity verification
(KYC), business onboarding (KYB), sanctions screening and the shared fraud signal network.

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
  metrics — `status: "LEARNING"` is expected for a brand-new customer, not an error.
- "Verify my identity": `protegey.kyc.startSession()`, then opens the returned hosted URL in a new
  tab — the dev decides how (`window.open` here; an iframe or redirect works just as well).
- "Check KYC status": `protegey.kyc.getSession()` — the polling fallback for the `kyc.status_changed` webhook.
- "List open alerts": `protegey.alerts.list({ status: "OPEN" })`.
- "Invite a business (KYB, by phone)": `protegey.kyb.inviteApplicant()` with only a `contactPhone`
  — Protegey sends no email in that case, so the returned `applicationUrl` is what you deliver yourself.
- "Screen a name": `protegey.sanctions.screen()` (sanctions + PEP).
- "Check shared fraud signals": `protegey.sharedSignals.check()` with this device's fingerprint
  (returns 400 until the network has been enabled on your account for 7 days).

Webhook verification (`constructWebhookEvent()`) belongs on your server, never in a browser app —
see the SDK README.

> Requires `@protegey/sdk` ≥ 0.7.0. If your `package-lock.json` still pins an older commit, run
> `npm update @protegey/sdk`.

See `src/App.tsx` — every call annotated.
