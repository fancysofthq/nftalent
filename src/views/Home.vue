<script setup lang="ts">
import Redeem from "@/components/modals/Redeem.vue";
import TokenModal from "@/components/modals/Token.vue";
import IPFTRedeemable from "@/models/IPFTRedeemable";
import { ref, type Ref } from "vue";
import Feed from "./Home/Feed.vue";

const tokenModal: Ref<IPFTRedeemable | undefined> = ref();
const redeemModal: Ref<IPFTRedeemable | undefined> = ref();
</script>

<template lang="pug">
.w-full.flex.justify-center
  .w-full.max-w-3xl.flex.flex-col.p-4.gap-2
    Feed(@entry-click="tokenModal = $event" @redeem="redeemModal = $event")

Teleport(to="body")
  TokenModal(
    v-if="tokenModal"
    @close="tokenModal = undefined"
    :ipft="tokenModal"
  )

  Redeem(
    v-if="redeemModal && redeemModal.balance"
    @close="redeemModal = undefined"
    :ipft="redeemModal"
    :balance="redeemModal.balance"
  )
</template>
