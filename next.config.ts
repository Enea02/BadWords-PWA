import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server raggiungibile dal telefono in LAN (solo `next dev`, ignorato in produzione).
  allowedDevOrigins: ["172.20.10.3"],
  cacheComponents: true,
  partialPrefetching: true,
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
