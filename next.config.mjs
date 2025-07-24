/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  // Exclude Tauri build artifacts from Next.js compilation
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [
        '**/src-tauri/target/**',
        '**/node_modules/**',
        '**/.git/**'
      ]
    }
    return config
  }
}

export default nextConfig
