<script setup lang="ts">
import * as eth from "@/services/eth";
import { onMounted } from "vue";
import TokenListing from "@/components/TokenListing.vue";
import { CID } from "multiformats";
import { Token as IPNFToken } from "@/services/eth/contract/IPNFT";
import IPNFTSuper from "@/models/IPNFTSuper";
import TokenFeed from "@/components/TokenFeed.vue";

const props = defineProps<{ cid: CID }>();
const ipnft = new IPNFTSuper(new IPNFToken(props.cid));

onMounted(() => ipnft.fetchIPFSMetadata());
eth.onConnect(() => ipnft.fetchEthMetadata());
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg 
      span.inline-block.select-none Redeemable 🎫
      span.text-gray-500.text-sm.ml-2 {{ cid }}
    TokenListing.p-4.border.rounded-lg(
      v-if="ipnft.nftSimpleListingPrimaryListing"
      :ipnft="ipnft"
      :listing="ipnft.nftSimpleListingPrimaryListing"
    )

    h2.font-bold.text-lg History 📜
    .border.rounded-lg.flex-col.gap-2.divide-y
      TokenFeed(:token="ipnft.token")
</template>

<style scoped lang="scss"></style>
