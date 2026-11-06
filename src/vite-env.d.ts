/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
  readonly VITE_DEV_TOKEN?: string;
  /** 'true' = run on the sample data in src/mock/ (no backend, no Razorpay) */
  readonly VITE_MOCK_API?: string;
  /** 'true' in `npm run build:standalone` (Vercel): config comes from /api/session */
  readonly VITE_STANDALONE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
