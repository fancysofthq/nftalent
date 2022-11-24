<script setup lang="ts">
import TokenModal from "@/components/modals/Token.vue";
import IPNFTModel from "@/models/IPNFT";
import { ref, type Ref } from "vue";
import Feed from "./Home/Feed.vue";

const tokenModal: Ref<IPNFTModel | undefined> = ref();
</script>

<template lang="pug">
.w-full.flex.justify-center
  .w-full.max-w-3xl.flex.flex-col.border-x.divide-y
    Feed(@entry-click="tokenModal = $event")

Teleport(to="body")
  TokenModal(
    v-if="tokenModal"
    @close="tokenModal = undefined"
    :ipnft="tokenModal"
  )
</template>
