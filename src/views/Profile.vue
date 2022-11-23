<script setup lang="ts">
import PFP from "@/components/shared/PFP.vue";
import Account from "@/services/eth/Account";
import { computed, onMounted, ref, type ShallowRef } from "vue";
import Token, { Kind as TokenKind } from "@/components/Token.vue";
import IPNFTModel, { getOrCreate as getOrCreateIPNFT } from "@/models/IPNFT";
import edb from "@/services/eth/event-db";
import * as IPNFT from "@/services/eth/contract/IPNFT";
import { BigNumber } from "@ethersproject/bignumber";

const props = defineProps<{ account: Account }>();
const tokens: ShallowRef<IPNFTModel[]> = ref([]);

const redeemables = computed(() =>
  tokens.value.filter((t) => t.ipnft1155ExpiredAt)
);

const collectibles = computed(() =>
  tokens.value.filter((t) => t.ipnft1155ExpiredAt === null)
);

onMounted(() => {
  edb.iterateEventsIndex(
    "IPNFT",
    "currentOwner",
    props.account.address,
    "prev",
    (t) => {
      const token = getOrCreateIPNFT(IPNFT.uint256ToCID(BigNumber.from(t.id)));
      token.ipnft1155ExpiredAt = t.ipnft1155ExpiredAt;
      token.ipnft1155Finalized = t.ipnft1155IsFinalized;
      tokens.value.push(token);
    }
  );
});
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg Profile 🙂
    .flex.flex-col.items-center.bg-base-100.w-full.gap-4.border.rounded-lg.p-4
      PFP.h-32.w-32.bg-base-200(:account="account" mask="squircle")
      h2.text-lg {{ account }}

    template(v-if="redeemables.length > 0")
      h2.font-bold.text-lg Redeemables ({{ redeemables.length }}) 🎟
      //- TODO: Horizontally scrollable.
      .grid.grid-cols-4.gap-3
        Token.rounded.shadow.bg-base-100.transition-transform.active_scale-95(
          v-for="token in redeemables"
          :token="token"
          :kind="TokenKind.Thumbnail"
        )

    h2.font-bold.text-lg Collectibles ({{ collectibles.length }}) 🧸
    .grid.grid-cols-3.gap-3
      Token.rounded.shadow.bg-base-100.transition-transform.active_scale-95(
        v-for="token in collectibles"
        :token="token"
        :kind="TokenKind.Card"
      )
</template>
