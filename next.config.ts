import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {protocol: 'https', hostname: 'covers.openlibrary.org'},
      {protocol: 'https', hostname: 'd83mbhobygyxucra.public.blob.vercel-storage.com'}
    ]
  }
};

export default nextConfig;
