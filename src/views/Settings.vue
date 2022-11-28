<script setup lang="ts">
import {
  web3StorageApiKeyKey,
  web3StorageApiKey,
  ipfsGatewayKey,
  ipfsGateway,
} from "@/store";

// Save `web3StorageApiKey` to localStorage
function saveWeb3StorageApiKey() {
  if (web3StorageApiKey.value) {
    localStorage.setItem(web3StorageApiKeyKey, web3StorageApiKey.value);
    console.log("Saved web3StorageApiKey to localStorage");
  } else {
    localStorage.removeItem(web3StorageApiKeyKey);
    console.log("Removed web3StorageApiKey from localStorage");
  }
}

// Save `ipfsGateway` to localStorage
function saveIpfsGateway() {
  if (ipfsGateway.value) {
    localStorage.setItem(ipfsGatewayKey, ipfsGateway.value);
    console.log("Saved ipfsGateway to localStorage");
  } else {
    localStorage.removeItem(ipfsGatewayKey);
    console.log("Removed ipfsGateway from localStorage");
  }
}
</script>

<template lang="pug">
.w-full.flex.justify-center
  .w-full.max-w-3xl.flex.flex-col.p-4.gap-2
    h2.flex.items-baseline.gap-2
      span.font-bold.text-lg ⚙️ Settings
      small.text-sm.text-base-content.text-opacity-75 Set things here
    form.daisy-form-control.w-full.p-4.border
      label.daisy-label
        span.daisy-label-text 
          a.daisy-link(href="https://web3.storage") Web3.Storage
          span &nbsp;API key
      .flex.gap-2
        input.daisy-input.daisy-input-bordered.w-full(
          type="password"
          autocomplete="off"
          v-model="web3StorageApiKey"
        )
        //- TODO: Add "👌" effect.
        button.daisy-btn.daisy-btn-primary(@click="saveWeb3StorageApiKey") 
          span.text-lg 💾
          span Save

      label.daisy-label
        span.daisy-label-text 
          span IPFS&nbsp;
          a.daisy-link(
            href="https://docs.ipfs.tech/concepts/ipfs-gateway/#subdomain"
          ) subdomain gateway
      .flex.gap-2
        input.daisy-input.daisy-input-bordered.w-full(
          type="text"
          v-model="ipfsGateway"
        )
        //- TODO: Add "👌" effect.
        button.daisy-btn.daisy-btn-primary(@click="saveIpfsGateway") 
          span.text-lg 💾
          span Save
</template>
