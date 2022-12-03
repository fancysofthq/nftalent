<script setup lang="ts">
import { OnClickOutside } from "@vueuse/components";
import { BigNumber } from "ethers";
import { computed, ref } from "vue";
import * as eth from "@/services/eth";
import IPNFTRedeemable from "@/models/IPFTRedeemable";

const props = defineProps<{
  ipft: IPNFTRedeemable;
  balance: BigNumber;
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
  const tx = await eth.ipftRedeemable.safeTransferFrom(
    eth.account.value!.address.value!,
    eth.ipftRedeemable.address,
    props.ipft.cid,
    BigNumber.from(redeemAmount.value)
  );

  console.debug(tx);
}
</script>

<template lang="pug">
//- FIXME: Buggy on small-height screens
.fixed.left-0.top-0.w-full.bg-black.bg-opacity-25.z-20.h-screen.flex.justify-center.items-center.backdrop-blur.p-4(
  style="position: fixed"
)
  OnClickOutside.transition-opacity.w-full.max-w-lg.bg-base-100.rounded-lg.shadow-lg(
    style="max-height: 100%"
    @trigger="emit('close')"
  )
    .flex.flex-col.divide-y
      .font-semibold.text-xl.px-4.py-4.flex.justify-between.items-center
        h1 Redeem token
        button(@click="emit('close')") ❌

      .flex.flex-col.gap-2.p-4
        .flex.flex-col.border.p-4.rounded-lg
          .flex.gap-1.items-baseline
            span.font-semibold Balance:
            span.text-sm {{ balance.toBigInt() }} token{{ balance.gt(1) || balance.eq(0) ? "s" : "" }}

          .flex.gap-1.items-baseline
            span.font-semibold Redeemable per token:
            span.border.px-1.rounded-sm.text-sm {{ ipft.metadata?.properties.unit }}

        .flex.items-center.gap-2.border.rounded-lg.p-4
          .text-xl ☝️
          p.leading-tight After redeeming a token, you'd have to contact its minter on your own.

      .p-4
        label.daisy-label.pt-0
          .daisy-label-text.font-semibold Amount of tokens to redeem
        input.daisy-input.daisy-input-bordered.w-full(
          type="number"
          min="1"
          :max="balance.toNumber()"
          v-model="redeemAmount"
          placeholder="Amount"
        )

      .p-4
        button.daisy-btn.btn-commit.w-full.flex.items-center.flex.gap-1(
          @click="transact"
          :disabled="!canTransact"
        )
          span.text-xl 🎟
          span Redeem {{ redeemAmount || 0 }} token{{ redeemAmount > 1 || redeemAmount == 0 ? "s" : "" }}
</template>

<style scoped lang="scss"></style>
