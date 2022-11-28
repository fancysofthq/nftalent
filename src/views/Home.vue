<script setup lang="ts">
import Redeem from "@/components/modals/Redeem.vue";
import TokenModal from "@/components/modals/Token.vue";
import IPNFTModel from "@/models/IPNFT";
import { ref, type Ref } from "vue";
import Feed from "./Home/Feed.vue";

const tokenModal: Ref<IPNFTModel | undefined> = ref();
const redeemModal: Ref<IPNFTModel | undefined> = ref();
</script>

<template lang="pug">
.w-full.flex.justify-center
  .w-full.max-w-3xl.flex.flex-col.p-4.gap-2
    Feed(@entry-click="tokenModal = $event" @redeem="redeemModal = $event")

Teleport(to="body")
  TokenModal(
    v-if="tokenModal"
    @close="tokenModal = undefined"
    :ipnft="tokenModal"
  )

  Redeem(
    v-if="redeemModal && redeemModal.ipnft1155Balance"
    @close="redeemModal = undefined"
    :ipnft="redeemModal"
    :balance="redeemModal.ipnft1155Balance"
  )
</template>
