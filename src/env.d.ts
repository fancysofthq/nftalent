/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ADDRESS: string;
  readonly VITE_IPNFT_REDEEMABLE_ADDRESS: string;
  readonly VITE_OPEN_STORE_ADDRESS: string;
  readonly VITE_PERSONA_ADDRESS: string;
  readonly VITE_API_URL: string;
  readonly VITE_CHAIN_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
