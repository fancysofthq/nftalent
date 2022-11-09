<script setup lang="ts">
import { BigNumber, ethers } from "ethers";
import { computed, type ComputedRef, onMounted, ref, type Ref } from "vue";
import * as eth from "@/services/eth";
import Account from "@/services/eth/Account";
import IPNFTSuper from "@/models/IPNFTSuper";
import Chip from "@/components/shared/Chip.vue";
import { EventBox, EventKind } from "./TokenFeed.vue";
import { formatDistance } from "date-fns";

const props = defineProps<{ event: EventBox; token: IPNFTSuper }>();
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
    case EventKind.IERC721Transfer:
    case EventKind.IERC1155Transfer:
      return "📤";
    case EventKind.Redeem:
      return "🎟";
    case EventKind.List:
      return "✨";
    case EventKind.Purchase:
      return "💳";
  }
});

const eventName: ComputedRef<string> = computed(() => {
  switch (props.event.kind) {
    case EventKind.IERC721Transfer:
    case EventKind.IERC1155Transfer:
      return "transferred";
    case EventKind.Redeem:
      return "redeemed";
    case EventKind.List:
      return "listed";
    case EventKind.Purchase:
      return "purchased";
  }
});

const eventActor: ComputedRef<string> = computed(() => {
  switch (props.event.kind) {
    case EventKind.IERC721Transfer:
      return props.event.asIERC721Transfer.from;
    case EventKind.IERC1155Transfer:
      return props.event.asIERC1155Transfer.from;
    case EventKind.Redeem:
      return props.event.asRedeem.redeemer;
    case EventKind.List:
      return props.event.asList.seller;
    case EventKind.Purchase:
      return props.event.asPurchase.buyer;
  }
});

const eventAmount: ComputedRef<BigInt | undefined> = computed(() => {
  switch (props.event.kind) {
    case EventKind.IERC721Transfer:
      return 1n;
    case EventKind.IERC1155Transfer:
      return props.event.asIERC1155Transfer.value;
    case EventKind.Redeem:
      return props.event.asRedeem.amount;
    case EventKind.Purchase:
      return props.event.asPurchase.amount;
  }
});

const eventTarget: ComputedRef<string | undefined> = computed(() => {
  switch (props.event.kind) {
    case EventKind.IERC721Transfer:
      return props.event.asIERC721Transfer.to;
    case EventKind.IERC1155Transfer:
      return props.event.asIERC1155Transfer.to;
  }
});
</script>

<template lang="pug">
.flex.justify-between
  .inline-flex.items-center.gap-1.p-4
    span.text-xl {{ eventEmoji }}
    Chip.h-5.bg-base-200(
      v-if="eventActor"
      :account="new Account(eventActor)"
      pfp-class="bg-base-100"
    )
    span {{ eventName }}

    span(v-if="eventAmount") {{ eventAmount }}

    template(v-if="eventTarget")
      span to
      Chip.h-5.bg-base-200(
        :account="new Account(eventTarget)"
        pfp-class="bg-base-100"
      )

    template(v-if="event.isPurchase")
      span for
      img(src="/img/eth-icon.svg" style="height: 1.11rem" title="ETH")
      span {{ ethers.utils.formatEther(BigNumber.from(event.asPurchase.income)) }}

  .p-4(v-if="timestamp") 
    span(:title="timestamp.toLocaleString()") {{ formatDistance(timestamp, new Date(), { addSuffix: true }) }}
</template>

<style scoped lang="scss"></style>
