<script setup lang="ts">
import { Listing } from "@/service/eth/contract/NFTSimpleListing";
import { OnClickOutside } from "@vueuse/components";
import { BigNumber, ethers } from "ethers";
import { computed, ref } from "vue";
import * as eth from "@/service/eth";

const props = defineProps<{ listing: Listing }>();
const emit = defineEmits(["close"]);
const purchaseAmount = ref(1);
const sum = computed(() =>
  props.listing.config.price.mul(purchaseAmount.value || 0)
);

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
.fixed.top-0.w-full.bg-black.bg-opacity-25.z-10.h-screen.flex.justify-center.items-center
  OnClickOutside.transition-opacity.w-full.max-w-lg.bg-base-100.rounded-lg.shadow-lg(
    @trigger="emit('close')"
  )
    .flex.flex-col.divide-y
      .font-semibold.text-xl.px-4.py-4.flex.justify-between.items-center
        h1 Purchase NFTime token
        button(@click="emit('close')") ❌

      .flex.flex-col.gap-2.p-4
        .p-4.border.flex.flex-col.gap-2
          .inline-flex.gap-1.leading-none
            span.font-semibold Stock size:
            span {{ listing.stockSize }} tokens

          .inline-flex.gap-1.leading-none
            span.font-semibold Redeemable per token:
            span 1 hour

          .inline-flex.gap-1.items-center.leading-none
            span.font-semibold Price:
            img.h-5(src="/img/eth-icon.svg")
            span {{ ethers.utils.formatEther(listing.config.price) }} per token

          .flex.gap-4.items-center.p-4.border
            .text-xl ℹ️
            p.leading-tight After purchasing an NFTime token, you'd be able to resell it, or redeem later.

        label.daisy-label
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
