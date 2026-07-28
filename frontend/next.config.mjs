/** @type {import('next').NextConfig} */

// The browser only ever talks to the Next.js origin; these requests are
// proxied to the backend server-side. This keeps the session cookie
// same-origin and mirrors a single-domain production deployment.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
