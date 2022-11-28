<script setup lang="ts">
import { computed, onMounted, ref, type Ref } from "vue";
import * as eth from "@/services/eth";
import Account from "@/models/Account";
import IPNFT from "@/models/IPNFT";
import Placeholder from "@/components/shared/Placeholder.vue";
import Chip from "@/components/shared/Chip.vue";
import { EventWrapper, EventKind } from "./Feed.vue";
import { formatDistance } from "date-fns";
import Token, { Kind as TokenKind } from "@/components/Token.vue";

const props = defineProps<{ event: EventWrapper; token: IPNFT }>();
const emit = defineEmits<{
  (event: "entryClick", token: IPNFT): void;
  (event: "redeem", token: IPNFT): void;
}>();

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
      return "📦";
    case EventKind.Purchase:
      return "💳";
  }
});

const eventName = computed(() => {
  switch (props.event.kind) {
    case EventKind.List:
      return "listed";
    case EventKind.Purchase:
      return "purchased";
  }
});

const eventActor = computed(() => {
  switch (props.event.kind) {
    case EventKind.List:
      return props.event.asList.seller;
    case EventKind.Purchase:
      return props.event.asPurchase.buyer;
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
        :account="Account.getOrCreateFromAddress(eventActor)"
        pfp-class="bg-base-100"
      )
      Placeholder.h-5.w-12(v-else)
      span {{ eventName }}

      template(v-if="event.isPurchase")
        .inline-flex.items-baseline(class="gap-0.5") 
          span {{ event.asPurchase.amount }}
          span ×
          span.border.px-1.rounded {{ token.metadata?.properties.unit }}

    span.text-base-content.text-opacity-50(v-if="timestamp") {{ formatDistance(timestamp, new Date(), { addSuffix: true }) }}
    Placeholder.inline-block.h-5.w-12(v-else)

  Token.border.rounded(
    v-if="event.isList"
    :token="token"
    :kind="TokenKind.Full"
    @click-interest="emit('entryClick', token)"
    @redeem="emit('redeem', token)"
  )
</template>
