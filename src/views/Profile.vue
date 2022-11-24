<script lang="ts">
import eventDb from "@/services/eth/event-db";

export async function fetchPfa(account: string): Promise<string | undefined> {
  const accountObj = await eventDb.db.get("Account", account);

  return (
    accountObj?.personas.apps[eth.app.address]?.pfa ||
    accountObj?.personas.basic?.pfa
  );
}
</script>

<script setup lang="ts">
import PFP from "@/components/shared/PFP.vue";
import Account from "@/services/eth/Account";
import { computed, onMounted, type Ref, ref, type ShallowRef } from "vue";
import Token, { Kind as TokenKind } from "@/components/Token.vue";
import TokenModal from "@/components/modals/Token.vue";
import IPNFTModel, { getOrCreate as getOrCreateIPNFT } from "@/models/IPNFT";
import edb from "@/services/eth/event-db";
import * as IPNFT from "@/services/eth/contract/IPNFT";
import { BigNumber } from "@ethersproject/bignumber";
import * as eth from "@/services/eth";
import { PencilSquareIcon, BoltIcon } from "@heroicons/vue/24/outline";

const props = defineProps<{ account: Account }>();
const tokens: ShallowRef<IPNFTModel[]> = ref([]);
const tokenModal: ShallowRef<IPNFTModel | undefined> = ref();
const pfa: Ref<string | undefined> = ref();
const isChangingPfa: Ref<boolean> = ref(false);
const pfaEphemeral: Ref<string> = ref("");

const redeemables = computed(() =>
  tokens.value.filter((t) => t.ipnft1155ExpiredAt)
);

const collectibles = computed(() =>
  tokens.value.filter((t) => t.ipnft1155ExpiredAt === null)
);

const maySetPfa = computed(() => eth.account.value?.equals(props.account));

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

  fetchPfa(props.account.address).then((_pfa) => {
    pfa.value = _pfa;
  });
});

async function setPfa() {
  const tx = await eth.persona.setPfa(pfaEphemeral.value);
  pfa.value = pfaEphemeral.value;
  isChangingPfa.value = false;
}
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg Profile 🙂
    .flex.flex-col.items-center.bg-base-100.w-full.border.rounded-lg.p-4.gap-2
      PFP.h-32.w-32.bg-base-200(:account="account" mask="squircle")
      h2.text-lg.leading-none {{ account }}

      //- PFA
      template(v-if="isChangingPfa")
        .flex.flex-col.gap-2.p-2.border.rounded-lg
          textarea.daisy-textarea.daisy-textarea-bordered.leading-tight(
            type="text"
            v-model="pfaEphemeral"
          )
          .flex.gap-2
            button.daisy-btn.daisy-btn-sm.daisy-btn-error(
              @click="isChangingPfa = false"
            ) 🚫 Cancel
            button.daisy-btn.daisy-btn-sm.daisy-btn-success(
              @click="setPfa"
              :disabled="pfa == pfaEphemeral"
            )
              BoltIcon.h-4.w-4
              span Save
      template(v-else)
        .flex.gap-1
          p(v-if="pfa") {{ pfa }}
          p.text-base-content.text-opacity-50.italic(v-else) No PFA set
          PencilSquareIcon.h-5.w-5.cursor-pointer.text-base-content.text-opacity-40.transition-transform.transition-colors.hover_scale-105.hover_text-primary.hover_text-opacity-100(
            v-if="maySetPfa"
            @click="pfaEphemeral = pfa || ''; isChangingPfa = true"
          )

    template(v-if="redeemables.length > 0")
      h2.font-bold.text-lg Redeemables ({{ redeemables.length }}) 🎟
      //- TODO: Horizontally scrollable.
      .grid.grid-cols-4.gap-3
        Token.rounded.shadow-lg.bg-base-100.transition-transform.active_scale-95.cursor-pointer(
          v-for="token in redeemables"
          :token="token"
          :kind="TokenKind.Thumbnail"
          @click="tokenModal = token"
        )

    h2.font-bold.text-lg Collectibles ({{ collectibles.length }}) 🧸
    .grid.grid-cols-3.gap-3
      Token.rounded.shadow-lg.bg-base-100.transition-transform.active_scale-95.cursor-pointer(
        v-for="token in collectibles"
        :token="token"
        :kind="TokenKind.Card"
        @click="tokenModal = token"
      )

Teleport(to="body")
  TokenModal(
    v-if="tokenModal"
    @close="tokenModal = undefined"
    :ipnft="tokenModal"
  )
</template>
