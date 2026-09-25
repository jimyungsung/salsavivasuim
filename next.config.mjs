/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /* The landing page is still the prototype's one self-contained file (see
     public/prototype/index.html). It is served at / by rewrite, not redirect,
     so the front door has the site's own address; the old address sends
     people to it. Every other prototype screen is reached by its own URL. */
  async rewrites() {
    return [{ source: '/', destination: '/prototype/index.html' }];
  },
  async redirects() {
    return [{ source: '/prototype/index.html', destination: '/', permanent: true }];
  },
};

export default nextConfig;
