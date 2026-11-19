import { useEffect, useState } from 'react';
import { Protegey, ProtegeyApiError } from '@protegey/sdk';
import type { KycSessionImages } from '@protegey/sdk';

// In a real app, read these from your own env config — never hardcode a production API key.
const protegey = new Protegey({
  apiKey: import.meta.env.VITE_PROTEGEY_API_KEY as string,
  baseUrl: import.meta.env.VITE_PROTEGEY_BASE_URL as string,
});

function describe(err: unknown): string {
  // ProtegeyApiError carries the HTTP status and, for account-gating 403s, an errorCode
  // (PARTNER_SUSPENDED / PARTNER_CONTRACT_REQUIRED).
  if (err instanceof ProtegeyApiError) return `${err.status}${err.errorCode ? ` ${err.errorCode}` : ''}: ${err.message}`;
  return (err as Error).message;
}

// A fresh id per demo run — real integrations pass the end user's own stable id instead.
const CUSTOMER_ID = `customer-${Math.random().toString(36).slice(2, 8)}`;
const SESSION_ID = `react-example-session-${Date.now()}`;

function App() {
  const [visitorId, setVisitorId] = useState<string | null>(null);
  const [kycSessionId, setKycSessionId] = useState<string | null>(null);
  const [kycImages, setKycImages] = useState<KycSessionImages | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const append = (line: string) => setLog((prev) => [...prev, line]);

  async function identifyDevice() {
    try {
      const result = await protegey.device.identify({ externalCustomerId: CUSTOMER_ID });
      setVisitorId(result.visitorId);
      append(`device.identify() -> visitorId=${result.visitorId}, action=${result.action}`);
    } catch (err) {
      append(`device.identify() failed: ${(err as Error).message}`);
    }
  }

  // Typically called once on login/session start — done automatically here so the rest of the
  // demo already has a visitorId to fold in; the button below lets you trigger it again on demand.
  useEffect(() => {
    identifyDevice();
  }, []);

  async function reportTransaction() {
    try {
      const result = await protegey.transactions.report({
        externalTransactionId: `react-example-${Date.now()}`,
        externalCustomerId: CUSTOMER_ID,
        direction: 'DEBIT',
        amount: 5000,
        currency: 'XAF',
        transactionType: 'test',
        visitorId: visitorId ?? undefined,
      });
      append(
        `transactions.report() -> transactionId=${result.transactionId}, decision=${result.decision}, riskScore=${result.riskScore}, deviceAction=${result.deviceAction}, alerts=${result.alerts.length}`,
      );
    } catch (err) {
      append(`transactions.report() failed: ${(err as Error).message}`);
    }
  }

  async function recordCashDeposit() {
    try {
      // Send your own externalTransactionId so a retry is safe — re-sending it is a 409.
      const externalTransactionId = `react-example-dep-${Date.now()}`;
      const result = await protegey.cashDeposits.record({
        externalTransactionId,
        externalCustomerId: CUSTOMER_ID,
        amount: 2_500_000,
        currency: 'XAF',
        channel: 'BRANCH',
        branchId: 'DLA-AKWA',
        depositorName: 'Demo Depositor',
      });
      append(`cashDeposits.record() -> cashDepositId=${result.cashDepositId}, decision=${result.decision}, riskScore=${result.riskScore}, alerts=${result.alerts.length}`);

      // Look it up again by your own reference — amount comes back as a decimal string.
      const deposit = await protegey.cashDeposits.get(externalTransactionId);
      append(`cashDeposits.get() -> amount=${deposit.amount} ${deposit.currency}, channel=${deposit.channel}, branchId=${deposit.branchId}`);

      const page = await protegey.cashDeposits.list({ externalCustomerId: CUSTOMER_ID, limit: 10 });
      append(`cashDeposits.list({ externalCustomerId }) -> total=${page.total}`);
    } catch (err) {
      append(`cashDeposits failed: ${describe(err)}`);
    }
  }

  async function reportBehavioral() {
    try {
      const result = await protegey.behavioral.report({
        externalCustomerId: CUSTOMER_ID,
        sessionId: SESSION_ID,
        keystroke: { avgInterKeyLatencyMs: 145, typingSpeedCharsPerSec: 4.2, errorRate: 0.02 },
        touch: { avgSwipeVelocity: 22, scrollBehaviorScore: 0.8 },
        navigation: { screenSequence: ['login', 'dashboard', 'transfer', 'confirm'] },
      });
      // "LEARNING" for the first few sessions of any given customer — expected, not an error.
      append(`behavioral.report() -> status=${result.status}, stepUpRecommended=${result.stepUpRecommended}`);
    } catch (err) {
      append(`behavioral.report() failed: ${(err as Error).message}`);
    }
  }

  async function listOpenAlerts() {
    try {
      // Pass UPPERCASE filter values (the same casing responses use) — the SDK sends what the API expects.
      const page = await protegey.alerts.list({ status: 'OPEN', limit: 5 });
      append(`alerts.list({ status: 'OPEN' }) -> total=${page.total}`);
      for (const alert of page.data) {
        append(`  #${alert.alertNumber} ${alert.ruleCode} (${alert.ruleSeverity}) customer=${alert.externalCustomerId} verdict=${alert.decisionVerdict}`);
      }
    } catch (err) {
      append(`alerts.list() failed: ${describe(err)}`);
    }
  }

  async function inviteBusiness() {
    try {
      // KYB invite: contactEmail and/or contactPhone (at least one). With a phone only, Protegey
      // sends no email — deliver applicationUrl yourself (SMS, WhatsApp, ...).
      const invited = await protegey.kyb.inviteApplicant({
        contactName: 'Demo Business Owner',
        contactPhone: `+2376${Math.floor(10_000_000 + Math.random() * 89_999_999)}`,
      });
      append(`kyb.inviteApplicant() -> id=${invited.id}, status=${invited.status}, applicationUrl=${invited.applicationUrl}`);
    } catch (err) {
      append(`kyb.inviteApplicant() failed: ${describe(err)}`);
    }
  }

  async function screenName() {
    try {
      const result = await protegey.sanctions.screen({ name: 'John Doe', type: 'person' });
      append(`sanctions.screen() -> decision=${result.decision}, pepMatch=${result.pepMatch}, matches=${result.matches.length}`);
    } catch (err) {
      append(`sanctions.screen() failed: ${describe(err)}`);
    }
  }

  async function checkSharedSignal() {
    try {
      const result = await protegey.sharedSignals.check({ deviceFingerprint: visitorId ?? undefined, externalCustomerId: CUSTOMER_ID });
      append(
        `sharedSignals.check() -> flagged=${result.flagged}, category=${result.category}, flagConfidence=${result.flagConfidence}, matchCount=${result.matchCount}`,
      );
    } catch (err) {
      // 400 until the shared fraud signal network has been enabled on your account for 7 days.
      append(`sharedSignals.check() failed: ${describe(err)}`);
    }
  }

  async function startKyc() {
    try {
      const { sessionId, url } = await protegey.kyc.startSession({ externalUserId: CUSTOMER_ID });
      setKycSessionId(sessionId);
      // Web stays link-based — open it however fits your UI (a new tab here). There is no in-app
      // webview for the web SDK; that's a mobile-only concept. See @protegey/react-native-sdk or
      // protegey_sdk (Flutter) for the in-app equivalent.
      window.open(url, '_blank', 'noopener,noreferrer');
      append(`kyc.startSession() -> sessionId=${sessionId}, opened ${url} in a new tab`);
    } catch (err) {
      append(`kyc.startSession() failed: ${(err as Error).message}`);
    }
  }

  async function checkKyc() {
    if (!kycSessionId) return append('Start a KYC session first.');
    try {
      // Polling fallback for the kyc.status_changed webhook.
      const session = await protegey.kyc.getSession(kycSessionId);
      // status = the final decision; recommendation = Protegey's own verdict (unchanged by a manual override).
      append(`kyc.getSession() -> status=${session.status}, outcome=${session.outcome}, recommendation=${session.recommendation}`);
      // Pre-signed links valid 1 hour, re-issued on every GET — display/download them now, never store them.
      setKycImages(session.images);
    } catch (err) {
      append(`kyc.getSession() failed: ${describe(err)}`);
    }
  }

  async function lookupKycByCustomer() {
    try {
      // Exact match on your own customer id (unlike `search`, never partial).
      const page = await protegey.kyc.listSessions({ externalUserId: CUSTOMER_ID });
      append(`kyc.listSessions({ externalUserId }) -> total=${page.total}`);
      for (const row of page.data) {
        append(`  ${row.sessionId} status=${row.status} recommendation=${row.recommendation} selfie=${row.images.selfie ? 'yes' : 'no'}`);
      }
    } catch (err) {
      append(`kyc.getSession() failed: ${describe(err)}`);
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Protegey — React example</h1>
      <p>Demonstrates every <code>@protegey/sdk</code> module from a plain web app: device intelligence, transaction and cash-deposit reporting, alerts, behavioral biometrics, identity verification (KYC) opened in a new tab, business onboarding (KYB), sanctions screening and the shared fraud signal network.</p>

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0', flexWrap: 'wrap' }}>
        <button onClick={identifyDevice}>Identify device again</button>
        <button onClick={reportTransaction}>Report a test transaction</button>
        <button onClick={reportBehavioral}>Report a behavioral event</button>
        <button onClick={startKyc}>Verify my identity</button>
        <button onClick={checkKyc}>Check KYC status</button>
        <button onClick={lookupKycByCustomer}>Find my KYC sessions</button>
        <button onClick={recordCashDeposit}>Record a cash deposit</button>
        <button onClick={listOpenAlerts}>List open alerts</button>
        <button onClick={inviteBusiness}>Invite a business (KYB, by phone)</button>
        <button onClick={screenName}>Screen a name (sanctions/PEP)</button>
        <button onClick={checkSharedSignal}>Check shared fraud signals</button>
      </div>

      {kycImages && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {(['documentFront', 'documentBack', 'selfie', 'documentFaceCrop'] as const).map((key) => {
            const image = kycImages[key];
            if (!image) return null;
            return (
              <figure key={key} style={{ margin: 0 }}>
                <img src={image.url} alt={key} style={{ height: 96, borderRadius: 4 }} />
                <figcaption style={{ fontSize: 11 }}>{key} (expires {new Date(image.expiresAt).toLocaleTimeString()})</figcaption>
              </figure>
            );
          })}
        </div>
      )}

      <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
        {log.length === 0 ? 'Waiting for device.identify()…' : log.join('\n')}
      </pre>
    </main>
  );
}

export default App;
