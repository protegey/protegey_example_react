import { useEffect, useState } from 'react';
import { Protegey } from '@protegey/sdk';

// In a real app, read these from your own env config — never hardcode a production API key.
const protegey = new Protegey({
  apiKey: import.meta.env.VITE_PROTEGEY_API_KEY as string,
  baseUrl: import.meta.env.VITE_PROTEGEY_BASE_URL as string,
});

// A fresh id per demo run — real integrations pass the end user's own stable id instead.
const CUSTOMER_ID = `customer-${Math.random().toString(36).slice(2, 8)}`;
const SESSION_ID = `react-example-session-${Date.now()}`;

function App() {
  const [visitorId, setVisitorId] = useState<string | null>(null);
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
      append(`transactions.report() -> decision=${result.decision}, riskScore=${result.riskScore}`);
    } catch (err) {
      append(`transactions.report() failed: ${(err as Error).message}`);
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
      // "learning" for the first few sessions of any given customer — expected, not an error.
      append(`behavioral.report() -> status=${result.status}, stepUpRecommended=${result.stepUpRecommended}`);
    } catch (err) {
      append(`behavioral.report() failed: ${(err as Error).message}`);
    }
  }

  async function startKyc() {
    try {
      const { url } = await protegey.kyc.startSession({ externalUserId: CUSTOMER_ID });
      // Web stays link-based — open it however fits your UI (a new tab here). There is no in-app
      // webview for the web SDK; that's a mobile-only concept. See @protegey/react-native-sdk or
      // protegey_sdk (Flutter) for the in-app equivalent.
      window.open(url, '_blank', 'noopener,noreferrer');
      append(`kyc.startSession() -> opened ${url} in a new tab`);
    } catch (err) {
      append(`kyc.startSession() failed: ${(err as Error).message}`);
    }
  }

  return (
    <main style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Protegey — React example</h1>
      <p>Demonstrates every <code>@protegey/sdk</code> module from a plain web app: device intelligence, transaction reporting, behavioral biometrics, and identity verification opened in a new tab.</p>

      <div style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0', flexWrap: 'wrap' }}>
        <button onClick={identifyDevice}>Identify device again</button>
        <button onClick={reportTransaction}>Report a test transaction</button>
        <button onClick={reportBehavioral}>Report a behavioral event</button>
        <button onClick={startKyc}>Verify my identity</button>
      </div>

      <pre style={{ background: '#f4f4f4', padding: '1rem', borderRadius: 4, whiteSpace: 'pre-wrap' }}>
        {log.length === 0 ? 'Waiting for device.identify()…' : log.join('\n')}
      </pre>
    </main>
  );
}

export default App;
