import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Убираем плавающую кнопку Next.js Dev Tools (id="devtools-indicator")
  devIndicators: false,
};

export default nextConfig;
