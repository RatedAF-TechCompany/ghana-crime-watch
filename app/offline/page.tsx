import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'You are offline', robots: { index: false } };
export default function Offline() {
  return (
    <main style={{ maxWidth: 560, margin: '40px auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <h1>You are offline</h1>
      <p>Stories you opened before are saved on this device. Go back, or reconnect and <a href="/">reload GhanaCrimes</a>.</p>
      <p>Emergency: call 191 (police), 112, 193 (ambulance) or 192 (fire).</p>
    </main>
  );
}
