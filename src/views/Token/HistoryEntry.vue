<script setup lang="ts">
import { BigNumber, ethers } from "ethers";
import { computed, type ComputedRef, onMounted, ref, type Ref } from "vue";
import * as eth from "@/services/eth";
import Account from "@/models/Account";
import IPNFTModel from "@/models/IPNFT";
import Chip from "@/components/shared/Chip.vue";
import { EventWrapper, EventKind } from "./History.vue";
import { formatDistance } from "date-fns";

const props = defineProps<{ event: EventWrapper; token: IPNFTModel }>();
const timestamp: Ref<Date | undefined> = ref();

onMounted(() => {
  console.debug(props.event);
  props.token.fetchIPFSMetadata();
});

eth.onConnect(() => {
  props.token.fetchEthMetadata();

  eth.provider
    .value!.getBlock(props.event.blockNumber)
    .then((block) => (timestamp.value = new Date(block.timestamp * 1000)));
});

const eventEmoji: ComputedRef<string> = computed(() => {
  switch (props.event.kind) {
    case EventKind.IPNFT1155Mint:
      return "🌱";
    case EventKind.MetaStoreList:
      return "📦";
    case EventKind.MetaStorePurchase:
      return "💳";
    case EventKind.IPNFT1155Redeem:
      return "🎟";
  }
});

const eventName: ComputedRef<string> = computed(() => {
  switch (props.event.kind) {
    case EventKind.IPNFT1155Mint:
      return "minted";
    case EventKind.MetaStoreList:
      return "listed";
    case EventKind.MetaStorePurchase:
      return "purchased";
    case EventKind.IPNFT1155Redeem:
      return "redeemed";
  }
});

const eventActor: ComputedRef<string | undefined> = computed(() => {
  switch (props.event.kind) {
    case EventKind.IPNFT1155Mint:
      return props.event.asIPNFT1155Mint.from;
    case EventKind.MetaStoreList:
      return props.event.asMetaStoreList.seller;
    case EventKind.MetaStorePurchase:
      return props.event.asMetaStorePurchase.buyer;
    case EventKind.IPNFT1155Redeem:
      return props.event.asIPNFT1155Redeem.from;
  }
});

const eventAmount: ComputedRef<BigInt | undefined> = computed(() => {
  switch (props.event.kind) {
    case EventKind.IPNFT1155Mint:
      return props.event.asIPNFT1155Mint.value;
    case EventKind.MetaStoreList:
      return 0n; // TODO:
    case EventKind.MetaStorePurchase:
      return props.event.asMetaStorePurchase.amount;
    case EventKind.IPNFT1155Redeem:
      return props.event.asIPNFT1155Redeem.value;
  }
});
</script>

<template lang="pug">
.flex.justify-between.items-center.text-sm
  .flex.items-center.justify-start.gap-2.p-4
    span.text-2xl {{ eventEmoji }}
    Chip.gap-1.text-primary(
      v-if="eventActor"
      :account="Account.getOrCreateFromAddress(eventActor)"
      pfp-class="h-8 bg-base-100"
    )

    .flex.items-baseline.gap-1
      span {{ eventName }}
      span(v-if="eventAmount") &nbsp;{{ eventAmount }}
      span(v-if="event.isMetaStorePurchase")
        span &nbsp;for&nbsp;
        img.h-5.inline-block(src="/img/eth-icon.svg" title="ETH")
        span &nbsp;{{ ethers.utils.formatEther(BigNumber.from(event.asMetaStorePurchase.income)) }}

  .p-4(v-if="timestamp") 
    span.text-base-content.text-opacity-50(:title="timestamp.toLocaleString()") {{ formatDistance(timestamp, new Date(), { addSuffix: true }) }}
</template>

<style scoped lang="scss"></style>
