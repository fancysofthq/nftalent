<script setup lang="ts">
import { computed, onMounted, ref, type Ref } from "vue";
import * as eth from "@/services/eth";
import Account from "@/services/eth/Account";
import IPNFTModel from "@/models/IPNFT";
import Placeholder from "@/components/shared/Placeholder.vue";
import Chip from "@/components/shared/Chip.vue";
import { EventWrapper, EventKind } from "./Feed.vue";
import { formatDistance } from "date-fns";
import Redeemable, { Kind as RedeemableKind } from "@/components/Token.vue";

const props = defineProps<{ event: EventWrapper; token: IPNFTModel }>();
const timestamp: Ref<Date | undefined> = ref();

onMounted(() => props.token.fetchIPFSMetadata());

eth.onConnect(() => {
  props.token.fetchEthMetadata();

  eth.provider
    .value!.getBlock(props.event.blockNumber)
    .then((block) => (timestamp.value = new Date(block.timestamp * 1000)));
});

const eventEmoji = computed(() => {
  switch (props.event.kind) {
    case EventKind.Mint:
      return "✨";
    case EventKind.List:
      return "💎";
    case EventKind.Purchase:
      return "💳";
    case EventKind.Redeem:
      return "🎟";
  }
});

const eventName = computed(() => {
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

const eventActor = computed(() => {
  switch (props.event.kind) {
    case EventKind.Mint:
      return props.event.asMint.to;
    case EventKind.List:
      return props.event.asList.seller;
    case EventKind.Purchase:
      return props.event.asPurchase.buyer;
    case EventKind.Redeem:
      return props.event.asRedeem.from;
  }
});
</script>

<template lang="pug">
.flex.flex-col.gap-2
  .flex.justify-between.items-center.text-sm
    .flex.leading-none.gap-2.items-center
      span.text-xl {{ eventEmoji }}
      Chip.h-5.bg-base-200(
        v-if="eventActor"
        :account="new Account(eventActor)"
        pfp-class="bg-base-100"
      )
      Placeholder.h-5.w-12(v-else)
      span {{ eventName }}

      template(v-if="event.isPurchase")
        .inline-flex.items-baseline(class="gap-0.5") 
          span {{ event.asPurchase.amount }}
          span ×
          span.border.px-1.rounded {{ token.metadata?.properties.unit }}

      template(v-if="event.isReedem")
        .inline-flex.items-baseline(class="gap-0.5")
          span {{ event.asRedeem.value }}
          span ×
          span.border.px-1.rounded {{ token.metadata?.properties.unit }}

    span.text-base-content.text-opacity-50(v-if="timestamp") {{ formatDistance(timestamp, new Date(), { addSuffix: true }) }}
    Placeholder.inline-block.h-5.w-12(v-else)

  .border.rounded(v-if="event.isList" style="grid-template-columns: 4rem auto")
    Redeemable(:token="token" :kind="RedeemableKind.Full")

  .border.rounded(v-else)
    Redeemable(:token="token" :kind="RedeemableKind.FeedEntry")
</template>
