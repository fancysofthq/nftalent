import { ref, Ref } from "vue";

export const nftStorageApiKey: Ref<string | null> = ref(
  window.localStorage.getItem("nftStorageApiKey")
);

export const ipfsGateway = ref("https://ipfs.io/ipfs");
