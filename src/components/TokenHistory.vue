<script setup lang="ts">
import ERC1155Token from "@/service/eth/contract/ERC1155Token";
import { tokenHistory } from "@/service/eth/event-db";
import { Box } from "@/util";
import {
  type PurchaseEvent,
  type ListEvent,
} from "@/service/eth/contract/NFTSimpleListing";
import { ref, type Ref } from "vue";
import * as eth from "@/service/eth";
import Event from "./TokenHistory/Event.vue";
import { type BurnEvent } from "@/service/eth/contract/NFTime";

const props = defineProps<{ token: ERC1155Token }>();
const events: Ref<(ListEvent | PurchaseEvent | BurnEvent)[]> = ref([]);

eth.onConnect(async () => {
  events.value = await tokenHistory(props.token);
});
</script>

<template lang="pug">
Event(v-for="event in events" :event="event")
</template>

<style scoped lang="scss"></style>
