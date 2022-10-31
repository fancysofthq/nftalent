<script setup lang="ts">
import Account from "@/service/eth/Account";
import { onMounted, type Ref, ref } from "vue";
import {
  type ListEvent,
  type PurchaseEvent,
} from "@/service/eth/contract/NFTSimpleListing";
import * as eventDb from "@/service/eth/event-db";
import { Box } from "@/util";
import Entry from "./Feed/Entry.vue";
import { type BurnEvent } from "@/service/eth/contract/NFTime";

interface Props {
  accountFilter?: Account;
}

const { accountFilter = undefined } = defineProps<Props>();
const feed: Ref<(ListEvent | PurchaseEvent | BurnEvent)[]> = ref([]);

onMounted(async () => {
  if (accountFilter) {
    feed.value = await eventDb.accountFeed(accountFilter);
  } else {
    feed.value = await eventDb.feed();
  }
});
</script>

<template lang="pug">
Entry(
  v-if="feed.length"
  v-for="event in feed"
  :event="event"
  style="grid-template-columns: 7rem auto"
)
.p-4.text-base-content.text-center(v-else) Empty feed
</template>

<style scoped lang="scss"></style>
