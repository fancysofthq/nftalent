import { ref, Ref } from "vue";

export const nftStorageApiKeyKey = "nftStorageApiKey";
export const ipfsGatewayKey = "ipfsGateway";

export const nftStorageApiKey: Ref<string | null> = ref(
  window.localStorage.getItem(nftStorageApiKeyKey)
);

export const ipfsGateway = ref(
  window.localStorage.getItem(ipfsGatewayKey) || "nftstorage.link"
);
