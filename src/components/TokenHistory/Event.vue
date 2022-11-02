<script setup lang="ts">
import * as eth from "@/service/eth";
import Account from "@/service/eth/Account";
import { type BurnEvent, isBurnEvent } from "@/service/eth/contract/NFTime";
import {
  type ListEvent,
  isListEvent,
  type PurchaseEvent,
  isPurchaseEvent,
} from "@/service/eth/contract/NFTSimpleListing";
import { computed } from "@vue/reactivity";
import { BigNumber, ethers } from "ethers";
import { ref, type Ref } from "vue";
import Chip from "../Chip.vue";

type EventType = ListEvent | PurchaseEvent | BurnEvent;

const props = defineProps<{ event: EventType }>();
const timestamp: Ref<Date | undefined> = ref();

function eventEmoji(event: EventType) {
  if (isListEvent(event)) return "✨";
  else if (isPurchaseEvent(event)) return "💳";
  else if (isBurnEvent(event)) return "🎫";
  else return "🤷‍♂️";
}

function eventName(event: EventType) {
  if (isListEvent(event)) return "listed";
  else if (isPurchaseEvent(event)) return "purchased";
  else if (isBurnEvent(event)) return "redeemed";
  else return "did what";
}

eth.onConnect(async () => {
  timestamp.value = new Date(
    (await eth.provider.value!.getBlock(props.event.blockNumber)).timestamp *
      1000
  );
});

const eventActor = computed(() => {
  if (isListEvent(props.event)) return props.event.seller;
  else if (isPurchaseEvent(props.event)) return props.event.buyer;
  else if (isBurnEvent(props.event)) return props.event.from;
  else return undefined;
});
</script>

<template lang="pug">
.flex.justify-between
  .inline-flex.items-center.gap-1.p-4
    Chip.h-5.bg-base-200(
      v-if="eventActor"
      :account="new Account(eventActor)"
      pfp-class="bg-base-100"
    )
    span {{ eventEmoji(event) }}
    span {{ eventName(event) }}

    template(v-if="isPurchaseEvent(event)")
      span {{ event.amount }} for
      img.h-5(src="/img/eth-icon.svg")
      span {{ ethers.utils.formatEther(BigNumber.from(event.income)) }}

    template(v-if="isBurnEvent(event)")
      // TODO: redeemed 1x[1 hour].
      span {{ event.value }}

  .p-4 {{ timestamp?.toLocaleString() }}
</template>

<style scoped lang="scss"></style>
