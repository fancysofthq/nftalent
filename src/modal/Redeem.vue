<script setup lang="ts">
import { Listing } from "@/service/eth/contract/NFTSimpleListing";
import { OnClickOutside } from "@vueuse/components";
import { BigNumber, ethers } from "ethers";
import { computed, ref } from "vue";
import * as eth from "@/service/eth";
import { RichToken } from "@/components/RichToken";
import ERC1155Token from "@/service/eth/contract/ERC1155Token";
import Account from "@/service/eth/Account";
import Chip from "@/components/Chip.vue";
import { id2Cid } from "@/service/eth/contract/NFTime";

const props = defineProps<{
  token: ERC1155Token;
  balance: BigNumber;
  minter: Account;
}>();
const emit = defineEmits(["close"]);
const redeemAmount = ref(1);

const canTransact = computed(
  () =>
    redeemAmount.value > 0 &&
    props.balance.gte(redeemAmount.value) &&
    eth.account.value
);

async function transact() {
  const tx = await eth.nftime.redeem(
    id2Cid(props.token.id),
    BigNumber.from(redeemAmount.value)
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
        h1 Redeem NFTime token
        button(@click="emit('close')") ❌

      .flex.flex-col.gap-2.p-4
        .p-4.border.flex.flex-col.gap-2
          .inline-flex.gap-1.leading-none
            span.font-semibold Balance:
            span {{ balance.toBigInt() }} token{{ balance.gt(1) || balance.eq(0) ? "s" : "" }}

          .inline-flex.gap-1.leading-none
            span.font-semibold Redeemable per token:
            span 1 hour

          .flex.gap-4.items-center.p-4.border
            .text-xl ℹ️
            p.leading-tight 
              span After redeeming an NFTime token, you'd have to contact the minter (
              Chip.h-5.align-text-bottom(:account="minter")
              span ) for yourself.

        label.daisy-label
          .daisy-label-text.font-semibold Amount of tokens to redeem
        input.daisy-input.daisy-input-bordered.w-full(
          type="number"
          min="1"
          :max="balance.toNumber()"
          v-model="redeemAmount"
          placeholder="Amount"
        )

      .p-4
        button.daisy-btn.daisy-btn-primary.w-full.flex.items-center(
          @click="transact"
          :disabled="!canTransact"
        ) 
          span.text-xl 🎫
          span Redeem {{ redeemAmount || 0 }} token{{ redeemAmount > 1 || redeemAmount == 0 ? "s" : "" }}
          .rounded-full.text-sm(
            style="box-shadow: 0 0.5px 1px hsl(var(--bc) / var(--tw-text-opacity)); padding: 0.25rem 0.5rem; background-color: hsl(var(--pc) / var(--tw-text-opacity))"
          ) 🦊⚡️
</template>

<style scoped lang="scss"></style>
