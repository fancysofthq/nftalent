<script setup lang="ts">
import * as eth from "@/service/eth";
import Account from "@/service/eth/Account";
import { type ListEvent } from "@/service/eth/contract/NFTSimpleListing";
import { Box } from "@/util";
import { ref, type Ref } from "vue";
import Chip from "../Chip.vue";

const props = defineProps<{ event: Box<ListEvent> }>();
const timestamp: Ref<Date | undefined> = ref();

function actionEmoji(action: Box<ListEvent>) {
  if (action instanceof Box<ListEvent>) {
    return "✨";
  } else {
    return "🤷‍♂️";
  }
}

function actionName(event: Box<ListEvent>) {
  if (event instanceof Box<ListEvent>) {
    return "listed";
  } else {
    return "did what";
  }
}

eth.onConnect(async () => {
  timestamp.value = new Date(
    (await eth.provider.value!.getBlock(props.event.value.blockNumber))
      .timestamp * 1000
  );
});

const ListEventBox = Box<ListEvent>;
</script>

<template lang="pug">
.flex.justify-between
  template(v-if="event instanceof ListEventBox && true")
    .inline-flex.items-center.gap-1.p-4
      Chip.h-5.bg-base-200(
        :account="new Account(event.value.seller)"
        pfp-class="bg-base-100"
      )
      span {{ actionEmoji(event) }}
      span {{ actionName(event) }}

  .p-4 {{ timestamp?.toLocaleString() }}
</template>

<style scoped lang="scss"></style>
