<script setup lang="ts">
import { BigNumber, ethers } from "ethers";
import { computed, type ComputedRef, onMounted, ref, type Ref } from "vue";
import * as eth from "@/services/eth";
import Account from "@/models/Account";
import IPFTRedeemable from "@/models/IPFTRedeemable";
import Chip from "@/components/shared/Chip.vue";
import { EventWrapper, EventKind } from "./History.vue";
import { formatDistance } from "date-fns";

const props = defineProps<{ event: EventWrapper; token: IPFTRedeemable }>();
const timestamp: Ref<Date | undefined> = ref();

onMounted(() => {
  props.token.fetchIPFSMetadata();
});

eth.onConnect(() => {
  props.token.fetchEthData();

  eth.provider
    .value!.getBlock(props.event.blockNumber)
    .then((block) => (timestamp.value = new Date(block.timestamp * 1000)));
});

const eventEmoji: ComputedRef<string> = computed(() => {
  switch (props.event.kind) {
    case EventKind.Mint:
      return "🌱";
    case EventKind.List:
      return "📦";
    case EventKind.Purchase:
      return "💳";
    case EventKind.Redeem:
      return "🎟";
  }
});

const eventName: ComputedRef<string> = computed(() => {
  switch (props.event.kind) {
    case EventKind.Mint:
      return "minted";
    case EventKind.List:
      return "listed";
    case EventKind.Purchase:
      return "purchased";
    case EventKind.Redeem:
      return "redeemed";
  }
});

const eventActor: ComputedRef<string | undefined> = computed(() => {
  switch (props.event.kind) {
    case EventKind.Mint:
      return props.event.asMint.from;
    case EventKind.List:
      return props.event.asList.seller;
    case EventKind.Purchase:
      return props.event.asPurchase.buyer;
    case EventKind.Redeem:
      return props.event.asRedeem.from;
  }
});

const eventAmount: ComputedRef<BigInt | undefined> = computed(() => {
  switch (props.event.kind) {
    case EventKind.Mint:
      return props.event.asMint.value;
    case EventKind.List:
      return BigInt(0); // TODO:
    case EventKind.Purchase:
      return props.event.asPurchase.amount;
    case EventKind.Redeem:
      return props.event.asRedeem.value;
  }
});
</script>

<template lang="pug">
.flex.justify-between.items-center.text-sm.overflow-x-scroll
  .flex.items-center.justify-start.gap-2.p-4.min-w-max
    span.text-2xl {{ eventEmoji }}

    Chip.gap-1.text-primary.w-max(
      v-if="eventActor"
      :account="Account.getOrCreateFromAddress(eventActor)"
      pfp-class="h-8 bg-base-100"
    )

    .flex.items-baseline.gap-1.w-max
      span {{ eventName }}
      span(v-if="eventAmount") &nbsp;{{ eventAmount }}
      span(v-if="event.isPurchase")
        span &nbsp;for&nbsp;
        img.h-5.inline-block(src="/img/eth-icon.svg" title="ETH")
        span &nbsp;{{ ethers.utils.formatEther(BigNumber.from(event.asPurchase.income)) }}

  .p-4(v-if="timestamp") 
    .text-base-content.text-opacity-50.w-max(
      :title="timestamp.toLocaleString()"
    ) {{ formatDistance(timestamp, new Date(), { addSuffix: true }) }}
</template>

<style scoped lang="scss"></style>
