import type { NextConfig } from "next";

// BACKEND_INTERNAL_URL: used for server-side Next.js rewrites (runs inside Docker, needs container hostname)
// NEXT_PUBLIC_API_URL: used by browser-side code (apiFetch) — must be host-accessible
const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: "/ws/:path*",
        destination: `${BACKEND_URL}/ws/:path*`,
      },
    ];
  },
};

export default nextConfig;
