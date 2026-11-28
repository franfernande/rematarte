import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // The in-editor browser preview loads the dev server from 127.0.0.1; without this, dev scripts are blocked and nothing hydrates.
  allowedDevOrigins: ["127.0.0.1", "192.168.0.18"],
  partialPrefetching: true,
  // lib/data.ts reads these JSON files with fs, so the serverless trace has to ship them.
  outputFileTracingIncludes: {
    "/**": ["data/**/*.json"],
  },
  // The admin pages moved under /admin (protected by proxy.ts).
  async redirects() {
    return [
      { source: "/cargar", destination: "/admin/cargar", permanent: false },
      { source: "/ventas", destination: "/admin/ventas", permanent: false },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
