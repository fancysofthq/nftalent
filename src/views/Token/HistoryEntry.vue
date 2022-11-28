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

onMounted(() => props.token.fetchIPFSMetadata());

eth.onConnect(() => {
  props.token.fetchEthMetadata();

  eth.provider
    .value!.getBlock(props.event.blockNumber)
    .then((block) => (timestamp.value = new Date(block.timestamp * 1000)));
});

const eventEmoji: ComputedRef<string> = computed(() => {
  switch (props.event.kind) {
    case EventKind.IPNFT721Mint:
      return "🎉";
    case EventKind.IPNFT1155Mint:
      return "🎁";
    case EventKind.MetaStoreList:
      return "✨";
    case EventKind.MetaStorePurchase:
      return "💳";
    case EventKind.IPNFT1155Redeem:
      return "🎟";
  }
});

const eventName: ComputedRef<string> = computed(() => {
  switch (props.event.kind) {
    case EventKind.IPNFT721Mint:
      return "Minted (721)";
    case EventKind.IPNFT1155Mint:
      return "Minted (1155)";
    case EventKind.MetaStoreList:
      return "Listed";
    case EventKind.MetaStorePurchase:
      return "Purchased";
    case EventKind.IPNFT1155Redeem:
      return "Redeemed";
  }
});

const eventActor: ComputedRef<string | undefined> = computed(() => {
  switch (props.event.kind) {
    case EventKind.IPNFT721Mint:
    case EventKind.IPNFT1155Mint:
      return undefined; // TODO: Operator
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
    case EventKind.IPNFT721Mint:
      return undefined;
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

const eventTarget: ComputedRef<string | undefined> = computed(() => {
  switch (props.event.kind) {
    case EventKind.IPNFT721Mint:
      return props.event.asIPNFT721Mint.to;
    case EventKind.IPNFT1155Mint:
      return props.event.asIPNFT1155Mint.to;
    case EventKind.MetaStoreList:
    case EventKind.MetaStorePurchase:
    case EventKind.IPNFT1155Redeem:
      return undefined;
  }
});
</script>

<template lang="pug">
.flex.justify-between
  .inline-flex.items-center.gap-1.p-4
    span.text-xl {{ eventEmoji }}
    Chip.h-5.bg-base-200(
      v-if="eventActor"
      :account="Account.getOrCreateFromAddress(eventActor)"
      pfp-class="bg-base-100"
    )
    span {{ eventName }}

    span(v-if="eventAmount") N{{ eventAmount }}

    template(v-if="eventTarget")
      span to
      Chip.h-5.bg-base-200(
        :account="Account.getOrCreateFromAddress(eventTarget)"
        pfp-class="bg-base-100"
      )

    template(v-if="event.isMetaStorePurchase")
      span for
      img(src="/img/eth-icon.svg" style="height: 1.11rem" title="ETH")
      span {{ ethers.utils.formatEther(BigNumber.from(event.asMetaStorePurchase.income)) }}

  .p-4(v-if="timestamp") 
    span(:title="timestamp.toLocaleString()") {{ formatDistance(timestamp, new Date(), { addSuffix: true }) }}
</template>

<style scoped lang="scss"></style>
