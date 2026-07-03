/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Static export: disable image optimization (not supported without a server)
  images: {
    unoptimized: true,
  },
  // Trailing slash for clean Firebase Hosting URLs
  trailingSlash: true,
};

export default nextConfig;
