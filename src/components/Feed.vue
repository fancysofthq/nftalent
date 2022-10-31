<script setup lang="ts">
import Account from "@/service/eth/Account";
import { onMounted, type Ref, ref } from "vue";
import { type ListEvent } from "@/service/eth/contract/NFTSimpleListing";
import * as eventDb from "@/service/eth/event-db";
import { Box } from "@/util";
import Entry from "./Feed/Entry.vue";

interface Props {
  accountFilter?: Account;
}

const { accountFilter = undefined } = defineProps<Props>();
const feed: Ref<Box<ListEvent>[]> = ref([]);

onMounted(async () => {
  if (accountFilter) {
    feed.value = (await eventDb.accountFeed(accountFilter)).map(
      (event) => new Box(event)
    );
  } else {
    feed.value = (await eventDb.feed()).map((event) => new Box(event));
  }
});
</script>

<template lang="pug">
Entry(
  v-for="event in feed"
  :event="event"
  style="grid-template-columns: 7rem auto"
)
</template>

<style scoped lang="scss"></style>
