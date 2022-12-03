/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ADDRESS: string;
  readonly VITE_IPNFT_REDEEMABLE_ADDRESS: string;
  readonly VITE_OPEN_STORE_ADDRESS: string;
  readonly VITE_PERSONA_ADDRESS: string;
  readonly VITE_API_URL: string;

  /** JSON-serialized {@link AddEthereumChainParameter}. */
  readonly VITE_CHAIN: string;

  readonly VITE_GENESIS_BLOCK: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
