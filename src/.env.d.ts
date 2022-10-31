/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADDR_APP: string;
  readonly VITE_ADDR_NFTIME: string;
  readonly VITE_ADDR_NFT_SIMPLE_LISTING: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
