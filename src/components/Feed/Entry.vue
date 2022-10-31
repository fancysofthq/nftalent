<script setup lang="ts">
import { RichToken } from "../RichToken";
import {
  isListEvent,
  isPurchaseEvent,
  type PurchaseEvent,
  type ListEvent,
} from "@/service/eth/contract/NFTSimpleListing";
import ERC1155Token from "@/service/eth/contract/ERC1155Token";
import * as eth from "@/service/eth";
import * as ipfs from "@/service/ipfs";
import { BigNumber, ethers } from "ethers";
import { computed, onMounted, ref, type Ref } from "vue";
import Placeholder from "../Placeholder.vue";
import Chip from "../Chip.vue";
import TokenPreview from "../TokenPreview.vue";
import {
  type BurnEvent,
  id2Cid,
  isBurnEvent,
} from "@/service/eth/contract/NFTime";
import Account from "@/service/eth/Account";

const props = defineProps<{ event: ListEvent | PurchaseEvent | BurnEvent }>();
const richEvent = {
  event: props.event,
  token: new RichToken(
    new ERC1155Token(eth.nftimeAddress, BigNumber.from(props.event.token.id))
  ),
};
const timestamp: Ref<Date | undefined> = ref();

onMounted(() => richEvent.token.enrichMetadata());

eth.onConnect(() => {
  richEvent.token.enrichEth();
  richEvent.token.enrichPrimaryListing();

  eth.provider
    .value!.getBlock(props.event.blockNumber)
    .then((block) => (timestamp.value = new Date(block.timestamp * 1000)));
});

function eventEmoji(event: ListEvent | PurchaseEvent | BurnEvent) {
  if (isListEvent(event)) return "✨";
  else if (isPurchaseEvent(event)) return "💳";
  else if (isBurnEvent(event)) return "🎫";
  else return "🤷‍♂️";
}

function eventName(event: ListEvent | PurchaseEvent | BurnEvent) {
  if (isListEvent(event)) return "listed";
  else if (isPurchaseEvent(event)) return "purchased";
  else if (isBurnEvent(event)) return "redeemed";
  else return "did what";
}

const eventActor = computed(() => {
  if (isListEvent(props.event)) return props.event.seller;
  else if (isPurchaseEvent(props.event)) return props.event.buyer;
  else if (isBurnEvent(props.event)) return props.event.from;
  else return undefined;
});
</script>

<template lang="pug">
.flex.flex-col.gap-2.p-4.pt-1
  .flex.leading-none.-mb-1.gap-1.items-center.text-xs.text-base-content.text-opacity-75
    Chip.h-5.bg-base-200(
      v-if="eventActor"
      :account="new Account(eventActor)"
      pfp-class="bg-base-100"
    )
    Placeholder.h-5.w-12(v-else)
    span.text-lg {{ eventEmoji(event) }}
    span {{ eventName(event) }}

    template(v-if="isPurchaseEvent(event)")
      span {{ event.amount }} for
      img.h-5(src="/img/eth-icon.svg")
      span {{ ethers.utils.formatEther(BigNumber.from(event.income)) }}

    template(v-else-if="isBurnEvent(event)")
      span {{ event.value }}

    span(v-if="timestamp") at {{ timestamp.toLocaleString() }}
    Placeholder.inline-block.h-5.w-12(v-else)

  .grid.gap-x-2.border.p-2(style="grid-template-columns: 5rem auto")
    router-link.font-bold.text-primary.daisy-link-hover(
      v-if="richEvent.token.aux.metadata.value"
      tabindex="-1"
      :to="'/' + id2Cid(richEvent.token.token.id)"
    )
      img.rounded.aspect-square.object-cover.w-full(
        tabindex="-1"
        :src="ipfs.processUri(richEvent.token.aux.metadata.value.image).toString()"
      )
    Placeholder.w-full.aspect-square(v-else)
    TokenPreview(:token="richEvent.token" :feed-entry="true")
</template>

<style scoped lang="scss"></style>
