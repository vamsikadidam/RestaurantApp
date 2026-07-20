/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@restaurant-platform/shared-types', '@restaurant-platform/api-client'],
};

module.exports = nextConfig;
