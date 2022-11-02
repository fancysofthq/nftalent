<script setup lang="ts">
import Placeholder from "./Placeholder.vue";
import { id2Cid } from "@/service/eth/contract/NFTime";
import * as ipfs from "@/service/ipfs";
import TokenPreview from "./TokenPreview.vue";
import { RichToken } from "./RichToken";
import Purchase from "@/modal/Purchase.vue";
import { ref } from "vue";
import Redeem from "@/modal/Redeem.vue";

const props = defineProps<{ token: RichToken }>();
const purchaseModal = ref(false);
const redeemModal = ref(false);
</script>

<template lang="pug">
//- https://github.com/akauppi/GroundLevel-firebase-es/issues/20#issuecomment-1049968242
.grid.p-4.gap-3(style="grid-template-columns: 10rem auto" v-bind="$attrs")
  router-link.contents(tabindex="-1" :to="'/' + id2Cid(token.token.id)")
    img.rounded-lg.aspect-square.object-cover.w-full(
      v-if="token.aux.metadata.value"
      :src="ipfs.processUri(token.aux.metadata.value.image).toString()"
    )
    Placeholder.w-full.aspect-square(v-else)
  TokenPreview(:token="token" :feed-entry="false")
    .flex.justify-between.mt-1.p-2.border
      .flex.gap-2.items-center
        button.daisy-btn.daisy-btn-primary.daisy-btn-sm(
          :disabled="!(token.aux.primaryListing.value && token.aux.primaryListing.value.stockSize.gt(0))"
          @click="purchaseModal = true"
        ) 
          span.text-xl 💳
          span Purchase
        .text-base-content.text-opacity-75.text-sm.flex.justify-center.gap-1
          span.font-semibold.ml-1(v-if="token.aux.primaryListing.value") {{ token.aux.primaryListing.value.stockSize.toNumber() }}
          Placeholder.inline-block.h-5.w-12(v-else)
          span in stock
      .flex.gap-2.items-center
        .text-base-content.text-opacity-75.text-sm.flex.justify-center.gap-1
          span You have
          span.font-semibold(v-if="token.aux.balance.value") {{ token.aux.balance.value }}
          Placeholder.inline-block.h-5.w-12(v-else)
        button.daisy-btn.daisy-btn-secondary.daisy-btn-sm(
          :disabled="!token.aux.balance.value?.gt(0)"
          @click="redeemModal = true"
        ) 
          span.text-xl 🎟
          span Redeem

Teleport(to="body")
  Purchase(
    v-if="purchaseModal && token.aux.primaryListing.value"
    @close="purchaseModal = false"
    :listing="token.aux.primaryListing.value"
  )
  Redeem(
    v-if="redeemModal && token.aux.balance.value?.gt(0) && token.aux.minter.value"
    @close="redeemModal = false"
    :token="token.token"
    :balance="token.aux.balance.value"
    :minter="token.aux.minter.value"
  )
</template>

<style scoped lang="scss"></style>
