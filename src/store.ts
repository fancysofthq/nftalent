import { ref, Ref } from "vue";

export const web3StorageApiKeyKey = "web3StorageApiKey";
export const ipfsGatewayKey = "ipfsGateway";

export const web3StorageApiKey: Ref<string | null> = ref(
  window.localStorage.getItem(web3StorageApiKeyKey)
);

export const ipfsGateway = ref(
  window.localStorage.getItem(ipfsGatewayKey) || "w3s.link"
);
