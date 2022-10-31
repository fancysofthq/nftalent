<script setup lang="ts">
import ERC1155Token from "@/service/eth/contract/ERC1155Token";
import * as eth from "@/service/eth";
import { onMounted } from "vue";
import TokenListing from "@/components/TokenListing.vue";
import TokenHistory from "@/components/TokenHistory.vue";
import { CID } from "multiformats";
import { cid2Id } from "@/service/eth/contract/NFTime";
import Account from "@/service/eth/Account";
import { RichToken } from "@/components/RichToken";

const props = defineProps<{ cid: CID }>();
const token = new RichToken(
  new ERC1155Token(
    new Account(import.meta.env.VITE_ADDR_NFTIME),
    cid2Id(props.cid)
  )
);

onMounted(() => token.enrichMetadata());

eth.onConnect(() => {
  token.enrichEth();
  token.enrichPrimaryListing();
});
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg 
      span 🎫 Token
      span.text-gray-500.text-sm.ml-2 {{ cid }}
    TokenListing.p-4.border(:token="token")

    h2.font-bold.text-lg 📜 History
    .border.flex-col.gap-2.divide-y
      TokenHistory(:token="token.token")
</template>

<style scoped lang="scss"></style>
