import path from "node:path";

import type { NextConfig } from "next";

const GOOGLE_ANALYTICS =
  "https://*.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: https://tile.openstreetmap.org ${GOOGLE_ANALYTICS}`,
  `connect-src 'self' ${GOOGLE_ANALYTICS}`,
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://accounts.google.com",
  "frame-ancestors 'none'",
].join("; ");

const DATABASE_FILE = process.env.DATABASE_URL?.startsWith("file:")
  ? path
      .relative(
        process.cwd(),
        path.resolve(process.env.DATABASE_URL.slice("file:".length)),
      )
      .split(path.sep)
      .join("/")
  : undefined;

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE ? "standalone" : undefined,
  outputFileTracingIncludes:
    process.env.VERCEL && DATABASE_FILE
      ? { "/**": [DATABASE_FILE] }
      : undefined,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
