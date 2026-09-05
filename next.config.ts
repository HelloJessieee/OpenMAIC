import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : 'standalone',
  transpilePackages: ['mathml2omml', 'pptxgenjs', '@openmaic/importer'],
  // These agent packages do a runtime `import(specifier)` with a computed
  // specifier (to lazily load node:fs/os/path without breaking browser/Vite
  // builds). webpack can't statically analyze that and bundling it throws
  // "Cannot find module as expression is too dynamic" at runtime on the server
  // (the "Edit with AI" Pro-mode path), which broke the #619 keep-alive e2e.
  // Mark them server-external so Next loads them natively and the dynamic
  // import resolves as a real Node call.
  serverExternalPackages: ['@earendil-works/pi-ai', '@earendil-works/pi-agent-core'],
  experimental: {
    proxyClientMaxBodySize: '200mb',
  },
  async headers() {
    // Official OpenMAIC defaults to frame-ancestors 'self' + X-Frame-Options:
    // SAMEORIGIN. That is correct for the hosted site (open.maic.chat) because
    // users play classrooms on the same origin. Finance Academy embeds the
    // sidecar in a cross-origin iframe, so a missing ALLOWED_FRAME_ANCESTORS
    // env silently produces a blank/silent classroom (browser blocks the
    // frame before TTS can start). Keep a Finance-oriented fallback so a
    // forgotten Render env cannot re-break embedding.
    const financeFallback =
      "https://ringingcareer.com https://www.ringingcareer.com https://*.ringingcareer.com https://*.netlify.app http://localhost:5173 http://127.0.0.1:5173 http://localhost:3000 http://127.0.0.1:3000";
    const extraAncestors = process.env.ALLOWED_FRAME_ANCESTORS?.trim() || financeFallback;
    const frameAncestors = `'self' ${extraAncestors}`;

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${frameAncestors}`,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
