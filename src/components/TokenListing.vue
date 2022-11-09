<script setup lang="ts">
import Placeholder from "@/components/shared/Placeholder.vue";
import * as ipfs from "@/services/ipfs";
import IPNFTVue from "./Token.vue";
import IPNFTSuper from "@/models/IPNFTSuper";
import Purchase from "@/components/modals/Purchase.vue";
import { ref } from "vue";
import Redeem from "@/components/modals/Redeem.vue";
import { Listing } from "@/services/eth/contract/NFTSimpleListing";

const { ipnft, listing = undefined } = defineProps<{
  ipnft: IPNFTSuper;
  listing: Listing;
}>();

const purchaseModal = ref(false);
const redeemModal = ref(false);
</script>

<template lang="pug">
//- https://github.com/akauppi/GroundLevel-firebase-es/issues/20#issuecomment-1049968242
.grid.p-4.gap-3(style="grid-template-columns: 10rem auto" v-bind="$attrs")
  router-link.contents(tabindex="-1" :to="'/' + ipnft.token.cid.toString()")
    img.rounded-lg.aspect-square.object-cover.w-full(
      v-if="ipnft.metadata"
      :src="ipfs.processUri(ipnft.metadata.image).toString()"
    )
    Placeholder.w-full.aspect-square(v-else)
  IPNFTVue(:token="ipnft")
    .flex.justify-between.mt-1.p-2.border.rounded-xl
      .flex.gap-2.items-center
        button.daisy-btn.daisy-btn-primary.daisy-btn-sm(
          :disabled="listing.stockSize.eq(0)"
          @click="purchaseModal = true"
        ) 
          span.text-xl 💳
          span Purchase
        .text-base-content.text-opacity-75.text-sm.flex.justify-center.gap-1
          span.font-semibold.ml-1 {{ listing.stockSize.toNumber() }}
          span in stock
      .flex.gap-2.items-center
        .text-base-content.text-opacity-75.text-sm.flex.justify-center.gap-1
          span You have
          span.font-semibold(v-if="ipnft.ipnft1155Balance") {{ ipnft.ipnft1155Balance }}
          Placeholder.inline-block.h-5.w-12(v-else)
        button.daisy-btn.daisy-btn-secondary.daisy-btn-sm(
          :disabled="!ipnft.ipnft1155Balance?.gt(0)"
          @click="redeemModal = true"
        ) 
          span.text-xl 🎟
          span Redeem

Teleport(to="body")
  Purchase(
    v-if="purchaseModal"
    @close="purchaseModal = false"
    :listing="listing"
    :ipnft="ipnft"
  )
  Redeem(
    v-if="redeemModal && ipnft.ipnft1155Balance?.gt(0) && ipnft.redeemableQualifiedAt"
    @close="redeemModal = false"
    :ipnft="ipnft"
    :balance="ipnft.ipnft1155Balance"
  )
</template>

<style scoped lang="scss"></style>
