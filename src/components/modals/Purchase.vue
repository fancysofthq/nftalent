<script setup lang="ts">
import Listing from "@/models/Listing";
import { OnClickOutside } from "@vueuse/components";
import { BigNumber, ethers } from "ethers";
import { computed, ref } from "vue";
import * as eth from "@/services/eth";
import IPNFT from "@/models/IPNFT";
import { formatDistance } from "date-fns";

const props = defineProps<{ listing: Listing; ipnft: IPNFT }>();
const emit = defineEmits(["close"]);
const purchaseAmount = ref(1);
const sum = computed(() =>
  props.listing.priceRef.value.mul(purchaseAmount.value || 0)
);

const canTransact = computed(() => sum.value.gt(0) && eth.account.value);

async function transact() {
  if (!canTransact.value) throw new Error("Cannot transact");
  const amount = BigNumber.from(purchaseAmount.value);

  const tx = await eth.metaStore.purchase(props.listing.id, amount, sum.value);
  console.debug(tx);

  props.listing.stockSizeSub(amount);
}
</script>

<template lang="pug">
//- FIXME: Buggy on small-height screens
.fixed.left-0.top-0.w-full.bg-black.bg-opacity-25.z-20.h-screen.flex.justify-center.items-center.backdrop-blur.p-4(
  style="position: fixed"
)
  OnClickOutside.transition-opacity.max-w-lg.bg-base-100.rounded-lg.shadow-lg(
    style="max-height: 100%"
    @trigger="emit('close')"
  )
    .flex.flex-col.h-full.divide-y
      .font-semibold.text-xl.px-4.py-4.flex.justify-between.items-center
        h1 Purchase token
        button(@click.stop="emit('close')") ❌

      .overflow-y-scroll.h-full
        .flex.flex-col.gap-2.p-4
          .flex.flex-col.border.p-4.rounded-lg
            .flex.gap-1.items-baseline
              span.font-semibold Stock size:
              span.text-sm {{ listing.stockSize }} tokens

            .flex.items-center.gap-1
              span.font-semibold Price:
              img(src="/img/eth-icon.svg" style="height: 1.11rem" title="ETH")
              span.text-sm {{ ethers.utils.formatEther(listing.priceRef.value) }} per token

            .flex.gap-1.items-baseline
              span.font-semibold Redeemable per token:
              span.border.px-1.rounded-sm.text-sm {{ ipnft.metadata?.properties.unit }}

            .flex.gap-1.items-baseline(v-if="ipnft.ipnft1155ExpiredAt")
              span.font-semibold Expiration:
              span.text-sm {{ ipnft.ipnft1155ExpiredAt?.toLocaleString() }} ({{ formatDistance(ipnft.ipnft1155ExpiredAt, new Date(), { addSuffix: true }) }})
              span.text-sm(v-if="ipnft.ipnft1155ExpiredAt > new Date()") ✅

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
