import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['192.168.1.2', 'localhost:3000', 'localhost:3001', '192.168.1.2:3000', '192.168.1.2:3001'],
};

export default nextConfig;
