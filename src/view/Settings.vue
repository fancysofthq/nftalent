<script setup lang="ts">
import { nftStorageApiKey, ipfsGateway } from "@/store";

// Save `nftStorageApiKey` to localStorage
function saveNftStorageApiKey() {
  if (nftStorageApiKey.value) {
    localStorage.setItem("nftStorageApiKey", nftStorageApiKey.value);
    console.log("Saved nftStorageApiKey to localStorage");
  } else {
    localStorage.removeItem("nftStorageApiKey");
    console.log("Removed nftStorageApiKey from localStorage");
  }
}

// Save `ipfsGateway` to localStorage
function saveIpfsGateway() {
  if (ipfsGateway.value) {
    localStorage.setItem("ipfsGateway", ipfsGateway.value);
    console.log("Saved ipfsGateway to localStorage");
  } else {
    localStorage.removeItem("ipfsGateway");
    console.log("Removed ipfsGateway from localStorage");
  }
}
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg ⚙️ Settings
    form.daisy-form-control.w-full.p-4.border
      label.daisy-label
        span.daisy-label-text 
          a.daisy-link(href="https://nft.storage") NFT.storage
          span &nbsp;API key
      .flex.gap-2
        input.daisy-input.daisy-input-bordered.w-full(
          type="password"
          autocomplete="off"
          v-model="nftStorageApiKey"
        )
        //- TODO: Add "👌" effect.
        button.daisy-btn.daisy-btn-primary(@click="saveNftStorageApiKey") 
          span.text-lg 💾
          span Save

      label.daisy-label
        span.daisy-label-text IPFS gateway
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

<style scoped lang="scss"></style>
