/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* The old addresses, from the catalogue concept and the static prototype,
     land on their nearest successor rather than a 404. */
  async redirects() {
    return [
      { source: '/masterplan', destination: '/today', permanent: true },
      { source: '/programs/:slug', destination: '/week', permanent: true },
      { source: '/sessions/:id', destination: '/today', permanent: true },
      { source: '/drills', destination: '/week', permanent: true },
      { source: '/drills/:path*', destination: '/week', permanent: true },
      { source: '/prototype/:path*', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
