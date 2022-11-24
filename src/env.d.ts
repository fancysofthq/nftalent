/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ADDRESS: string;
  readonly VITE_IPNFT721_ADDRESS: string;
  readonly VITE_IPNFT1155_ADDRESS: string;
  readonly VITE_META_STORE_ADDRESS: string;
  readonly VITE_PERSONA_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
