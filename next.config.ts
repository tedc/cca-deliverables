import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Better Auth uses Node APIs; keep it server-only.
  serverExternalPackages: ["better-auth"],
};

export default nextConfig;
