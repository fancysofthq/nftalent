/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ADDRESS: string;
  readonly VITE_IPNFT721_ADDRESS: string;
  readonly VITE_IPNFT1155_ADDRESS: string;
  readonly VITE_ERC1876_REDEEMABLE_ADDRESS: string;
  readonly VITE_NFT_SIMPLE_LISTING_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
