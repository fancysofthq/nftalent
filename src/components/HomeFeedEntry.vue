<script setup lang="ts">
import { BigNumber, ethers } from "ethers";
import { computed, onMounted, ref, type Ref } from "vue";
import * as eth from "@/services/eth";
import Account from "@/services/eth/Account";
import * as ipfs from "@/services/ipfs";
import IPNFTSuper from "@/models/IPNFTSuper";
import Placeholder from "@/components/shared/Placeholder.vue";
import Chip from "@/components/shared/Chip.vue";
import Token from "@/components/Token.vue";
import { EventBox, EventKind } from "./HomeFeed.vue";
import { formatDistance } from "date-fns";

const props = defineProps<{ event: EventBox; token: IPNFTSuper }>();
const timestamp: Ref<Date | undefined> = ref();

onMounted(() => props.token.fetchIPFSMetadata());

eth.onConnect(() => {
  console.debug("Feed/Common/Entry: eth.onConnect");
  props.token.fetchEthMetadata();

  eth.provider
    .value!.getBlock(props.event.blockNumber)
    .then((block) => (timestamp.value = new Date(block.timestamp * 1000)));
});

const eventEmoji = computed(() => {
  switch (props.event.kind) {
    case EventKind.List:
      return "✨";
    case EventKind.Purchase:
      return "💳";
    case EventKind.Redeem:
      return "🎟";
  }
});

const eventName = computed(() => {
  switch (props.event.kind) {
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
    case EventKind.List:
      return props.event.asList.seller;
    case EventKind.Purchase:
      return props.event.asPurchase.buyer;
    case EventKind.Redeem:
      return props.event.asRedeem.redeemer;
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

      template(v-if="event.isRedeem")
        .inline-flex.items-baseline(class="gap-0.5") 
          span {{ event.asRedeem.amount }}
          span ×
          span.border.px-1.rounded {{ token.metadata?.properties.unit }}

    span.text-base-content.text-opacity-50(v-if="timestamp") {{ formatDistance(timestamp, new Date(), { addSuffix: true }) }}
    Placeholder.inline-block.h-5.w-12(v-else)

  .grid.gap-x-2.border.rounded.ml-7.p-2.hover_bg-base-200.shadow-sm(
    style="grid-template-columns: 4rem auto"
  )
    router-link.font-bold.text-primary.daisy-link-hover(
      v-if="token.metadata"
      tabindex="-1"
      :to="'/' + token.token.cid.toString()"
    )
      img.rounded.aspect-square.object-cover.w-full(
        tabindex="-1"
        :src="ipfs.processUri(token.metadata.image).toString()"
      )
    Placeholder.w-full.aspect-square(v-else)
    Token.self-center(
      :token="token"
      :hide-mint-data="true"
      :hide-description="true"
    )
</template>

<style scoped lang="scss"></style>
