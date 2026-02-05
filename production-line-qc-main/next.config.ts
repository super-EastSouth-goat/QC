import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Ensure environment variables are available
  env: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },
  
  // External packages for server components
  serverExternalPackages: ['@supabase/supabase-js'],
};

export default nextConfig;
