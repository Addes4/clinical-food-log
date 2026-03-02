/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // This repo can run in restricted/offline environments where eslint cannot be installed.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
