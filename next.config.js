/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // simplest allow-list — add/remove as needed
    domains: [
      'm.media-amazon.com',
      'image.tmdb.org',
      'images-na.ssl-images-amazon.com',
      'img.omdbapi.com',
      'ajfxkdcloghidklsqgqf.supabase.co',
    ],
    // If you prefer patterns later, you can switch to remotePatterns.
  },

  // keep your existing webpack tweak
  webpack: (config) => {
    config.ignoreWarnings = [{ module: /node_modules\/punycode/ }];
    return config;
  },
};

module.exports = nextConfig;
