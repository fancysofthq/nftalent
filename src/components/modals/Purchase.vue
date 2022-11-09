<script setup lang="ts">
import { Listing } from "@/services/eth/contract/NFTSimpleListing";
import { OnClickOutside } from "@vueuse/components";
import { BigNumber, ethers } from "ethers";
import { computed, ref } from "vue";
import * as eth from "@/services/eth";
import IPNFTSuper from "@/models/IPNFTSuper";
import { formatDistance } from "date-fns";

const props = defineProps<{ listing: Listing; ipnft: IPNFTSuper }>();
const emit = defineEmits(["close"]);
const purchaseAmount = ref(1);
const sum = computed(() => props.listing.price.mul(purchaseAmount.value || 0));

const canTransact = computed(() => sum.value.gt(0) && eth.account.value);

async function transact() {
  const tx = await eth.nftSimpleListing.purchase(
    props.listing.id,
    BigNumber.from(purchaseAmount.value || 0),
    sum.value
  );

  console.debug(tx);
}
</script>

<template lang="pug">
.fixed.top-0.w-full.bg-black.bg-opacity-25.z-10.h-screen.flex.justify-center.items-center.backdrop-blur
  OnClickOutside.transition-opacity.w-full.max-w-lg.bg-base-100.rounded-lg.shadow-lg(
    @trigger="emit('close')"
  )
    .flex.flex-col.divide-y
      .font-semibold.text-xl.px-4.py-4.flex.justify-between.items-center
        h1 Purchase token
        button(@click="emit('close')") ❌

      .flex.flex-col.gap-2.p-4
        .flex.flex-col.border.p-4.rounded-lg
          .flex.gap-1.items-baseline
            span.font-semibold Stock size:
            span.text-sm {{ listing.stockSize }} tokens

          .flex.items-center.gap-1
            span.font-semibold Price:
            img(src="/img/eth-icon.svg" style="height: 1.11rem" title="ETH")
            span.text-sm {{ ethers.utils.formatEther(listing.price) }} per token

          .flex.gap-1.items-baseline
            span.font-semibold Redeemable per token:
            span.border.px-1.rounded-sm.text-sm {{ ipnft.metadata?.properties.unit }}

          .flex.gap-1.items-baseline(v-if="ipnft.redeemableMatureSince")
            span.font-semibold Redeem not before:
            span.text-sm {{ ipnft.redeemableMatureSince?.toLocaleString() }} ({{ formatDistance(ipnft.redeemableMatureSince, new Date(), { addSuffix: true }) }})
            span.text-sm(v-if="ipnft.redeemableMatureSince < new Date()") ✅

          .flex.gap-1.items-baseline(v-if="ipnft.redeemableExpiredAt")
            span.font-semibold Redeem not after:
            span.text-sm {{ ipnft.redeemableExpiredAt?.toLocaleString() }} ({{ formatDistance(ipnft.redeemableExpiredAt, new Date(), { addSuffix: true }) }})
            span.text-sm(v-if="ipnft.redeemableExpiredAt > new Date()") ✅

        //- .daisy-alert.daisy-alert-info
        .flex.items-center.gap-2.border.p-4.rounded-lg
          .text-xl ☝️
          p.leading-tight After purchasing a redeemable token, you'd be able to resell it, or redeem later.

      .p-4
        label.daisy-label.pt-0
          .daisy-label-text.font-semibold Amount of tokens to purchase
        input.daisy-input.daisy-input-bordered.w-full(
          type="number"
          min="1"
          :max="listing.stockSize.toNumber()"
          v-model="purchaseAmount"
          placeholder="Amount"
        )

      .p-4
        button.daisy-btn.daisy-btn-primary.w-full.flex.items-center(
          @click="transact"
          :disabled="!canTransact"
        ) 
          span.text-xl 💳
          span Purchase {{ purchaseAmount || 0 }} for
          img.h-5.inline-block(src="/img/eth-icon.svg")
          span {{ ethers.utils.formatEther(sum) }}
          .rounded-full.text-sm(
            style="box-shadow: 0 0.5px 1px hsl(var(--bc) / var(--tw-text-opacity)); padding: 0.25rem 0.5rem; background-color: hsl(var(--pc) / var(--tw-text-opacity))"
          ) 🦊⚡️
</template>

<style scoped lang="scss"></style>
