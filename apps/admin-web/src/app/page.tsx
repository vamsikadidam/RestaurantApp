export default function HomePage() {
  return (
    <main style={{ padding: '3rem', maxWidth: 640 }}>
      <h1>Restaurant Admin Portal</h1>
      <p>
        This portal will host Clover OAuth connection, menu management, the live order
        dashboard, business settings, and sales reports. It is scaffolded in Phase 1 and fully
        implemented in Phase 6 of the build plan.
      </p>
      <p>
        API health check: <code>GET {process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/health</code>
      </p>
    </main>
  );
}
