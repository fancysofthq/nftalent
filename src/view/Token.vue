<script setup lang="ts">
import ERC1155Token from "@/service/eth/contract/ERC1155Token";
import * as eth from "@/service/eth";
import { onMounted, onUnmounted } from "vue";
import TokenListing from "@/components/TokenListing.vue";
import TokenHistoryEvent from "@/components/TokenHistory/Event.vue";
import { CID } from "multiformats";
import { cid2Id } from "@/service/eth/contract/NFTime";
import Account from "@/service/eth/Account";
import { RichToken } from "@/components/RichToken";
import {
  type PurchaseEvent,
  type ListEvent,
} from "@/service/eth/contract/NFTSimpleListing";
import { tokenHistory } from "@/service/eth/event-db";
import { ref, type Ref } from "vue";
import { type BurnEvent } from "@/service/eth/contract/NFTime";

const props = defineProps<{ cid: CID }>();
const token = new RichToken(
  new ERC1155Token(
    new Account(import.meta.env.VITE_ADDR_NFTIME),
    cid2Id(props.cid)
  )
);

const history: Ref<(ListEvent | PurchaseEvent | BurnEvent)[]> = ref([]);
const cancelled = ref(false);

onMounted(() => {
  token.enrichMetadata();
  cancelled.value = false;

  tokenHistory(
    token.token,
    (e) => {
      // TOOD: Blink on non-first time?
      history.value.unshift(...e);
    },
    1000,
    () => cancelled.value
  );
});

onUnmounted(() => {
  cancelled.value = true;
});

eth.onConnect(async () => {
  token.enrichEth();
  token.enrichPrimaryListing();
});
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg 
      span.inline-block.select-none 🎫 Token
      span.text-gray-500.text-sm.ml-2 {{ cid }}
    TokenListing.p-4.border(:token="token")

    h2.font-bold.text-lg 📜 History
    .border.flex-col.gap-2.divide-y
      TokenHistoryEvent(v-for="event in history" :event="event")
</template>

<style scoped lang="scss"></style>
