<script lang="ts">
import eventDb from "@/services/eth/event-db";
import { copyToClipboard, notNull } from "@/util";
import { Address } from "@/services/eth/Address";
import Redeem from "@/components/modals/Redeem.vue";
import * as DagCbor from "@ipld/dag-cbor";
import { keccak256 } from "@multiformats/sha3";

export async function fetchPfa(account: string): Promise<string | undefined> {
  const accountObj = await eventDb.db.get("Account", account);

  return (
    accountObj?.personas.apps[eth.app.toString()]?.pfa ||
    accountObj?.personas.basic?.pfa
  );
}
</script>

<script setup lang="ts">
import PFP from "@/components/shared/PFP.vue";
import Account from "@/models/Account";
import { computed, onMounted, type Ref, ref, type ShallowRef } from "vue";
import IPFTRedeemableVue from "@/components/IPFTRedeemable.vue";
import TokenModal from "@/components/modals/Token.vue";
import IPFTRedeemable from "@/models/IPFTRedeemable";
import edb from "@/services/eth/event-db";
import * as IPFT from "@/services/eth/contract/IPFT";
import { BigNumber } from "@ethersproject/bignumber";
import * as eth from "@/services/eth";
import {
  PencilSquareIcon,
  DocumentDuplicateIcon,
} from "@heroicons/vue/24/outline";
import * as api from "@/services/api";

const props = defineProps<{ account: Account }>();

const redeemables: ShallowRef<IPFTRedeemable[]> = ref([]);
const tokenModal: ShallowRef<IPFTRedeemable | undefined> = ref();
const redeemModal: ShallowRef<IPFTRedeemable | undefined> = ref();

const isSelf = computed(() => eth.account.value?.equals(props.account));

const pfa: Ref<string | undefined> = ref();
const isChangingPfa: Ref<boolean> = ref(false);
const pfaEphemeral: Ref<string> = ref("");

const followers: ShallowRef<Address[]> = ref([]);
const followees: ShallowRef<Address[]> = ref([]);
const isFollowing = ref(false);

onMounted(async () => {
  await props.account.resolve();

  edb.iterateEventsIndex(
    "IPFTRedeemable.Claim",
    "author",
    props.account.address.value!.toString(),
    "next",
    async (t) => {
      const cid = IPFT.uint256ToCID(
        BigNumber.from(t.id),
        DagCbor.code,
        keccak256.code
      );

      const exists = await eth.ipftRedeemable.exists(cid);
      if (!exists) return;

      const token = IPFTRedeemable.getOrCreate(cid);
      eth.onConnect(() => token.fetchEthData());
      token.fetchIPFSMetadata();

      redeemables.value.push(token);
    }
  );

  fetchPfa(props.account.address.value!.toString()).then((_pfa) => {
    pfa.value = _pfa;
  });

  fetchFollowers();
  fetchFollowees();
});

eth.onConnect(() => {
  if (!isSelf.value) {
    api
      .isSubscribed(
        eth.account.value!.address.value,
        props.account.address.value!
      )
      .then((res) => {
        isFollowing.value = res;
      });
  }
});

async function fetchFollowers() {
  followers.value = await api.getSubscribers(props.account.address.value!);
}

async function fetchFollowees() {
  followees.value = await api.getSubscriptions(props.account.address.value!);
}

async function setPfa() {
  const tx = await eth.persona.setPfa(pfaEphemeral.value);
  pfa.value = pfaEphemeral.value;
  isChangingPfa.value = false;
}

async function follow() {
  const tx = await api.subscribe(
    eth.account.value!.address.value!,
    props.account.address.value!
  );

  isFollowing.value = true;
  await fetchFollowers();
}

async function unfollow() {
  const tx = await api.unsubscribe(
    eth.account.value!.address.value!,
    props.account.address.value!
  );

  isFollowing.value = false;
  await fetchFollowers();
}
</script>

<template lang="pug">
.w-full.flex.justify-center
  .w-full.max-w-3xl.flex.flex-col.p-4.gap-2
    .daisy-breadcrumbs.text-sm.p-0
      ul
        li.flex.gap-1.items-center
          PFP.h-5(:account="account")
          router-link.daisy-link-hover.text-base-content.text-opacity-75.break-all(
            :to="'/' + (account.ensName.value || account.address.value?.toString())"
          ) {{ account.ensName.value || account.address.value?.display }}

    .flex.flex-col.items-center.bg-base-100.w-full.border.rounded-lg.p-4.gap-1
      PFP.h-32.w-32.bg-base-200.mb-2(:account="account")

      .flex.gap-1.leading-none(v-if="account.address.value")
        span.text-sm.text-base-content.text-opacity-70 {{ account.address.value.toString() }}
        DocumentDuplicateIcon.h-4.w-4.cursor-pointer.text-base-content.text-opacity-40(
          @click="copyToClipboard(notNull(account.address.value).toString())"
        )

      .flex.items-baseline.gap-1(v-if="account.ensName.value")
        span.text-base-content.text-opacity-50 a.k.a.
        code.daisy-badge.daisy-badge-primary {{ account.ensName.value }}

      //- PFA
      template(v-if="isChangingPfa")
        //- TODO: On click outside.
        //- TODO: Render Markdown.
        .flex.flex-col.items-center.gap-1.w-full
          textarea.text-center.text-lg.daisy-textarea.daisy-textarea-bordered.leading-tight.w-full(
            type="text"
            v-model="pfaEphemeral"
          )
          .flex.gap-1
            button.daisy-btn.daisy-btn-sm.daisy-btn-error.flex.gap-1.grow(
              @click="isChangingPfa = false"
            ) 🚫 Cancel
            button.daisy-btn.daisy-btn-sm.btn-commit.flex.gap-1.grow(
              @click="setPfa"
              :disabled="pfa == pfaEphemeral"
            ) ✅ Save
      template(v-else)
        .flex.gap-1
          p.text-lg(v-if="pfa") {{ pfa }}
          p.text-base-content.text-opacity-50.italic(v-else) No PFA set
          PencilSquareIcon.h-4.w-4.cursor-pointer.text-base-content.text-opacity-40.transition-transform.transition-colors.hover_scale-105.hover_text-primary.hover_text-opacity-100(
            v-if="isSelf"
            @click="pfaEphemeral = pfa || ''; isChangingPfa = true"
          )

      .flex.justify-center.text-base-content.text-opacity-75.text-sm
        router-link.daisy-link.daisy-link-hover(
          :to="'/' + (account.ensName.value || account.address.value?.toString()) + '/followers'"
        ) {{ followers.length }} followers(s)
        span &nbsp;⋅&nbsp;
        router-link.daisy-link.daisy-link-hover(
          :to="'/' + (account.ensName.value || account.address.value?.toString()) + '/followees'"
        ) {{ followees.length }} followee(s)

      template(v-if="isSelf !== undefined && !isSelf")
        button.daisy-btn.mt-1.flex.gap-1.daisy-btn-sm(
          v-if="isFollowing"
          :disabled="!eth.account.value"
          @click="unfollow"
        ) 🚫 Unfollow
        button.daisy-btn.daisy-btn-secondary.mt-1.flex.gap-1.daisy-btn-sm(
          v-else
          :disabled="!eth.account.value"
          @click="follow"
        )
          span.text-xl 👀
          span Follow

    template(v-if="redeemables.length > 0")
      h2.flex.gap-2.items-baseline
        span.font-bold.text-lg.min-w-max 🎟 Redeemables ({{ redeemables.length }})
        span.text-sm.text-base-content.text-opacity-75.break-all Tokens which may be redeemed
      .flex.flex-col.gap-3
        IPFTRedeemableVue.rounded.bg-base-100.border.transition-colors.hover_border-base-content.hover_border-opacity-25(
          v-for="token in redeemables"
          :token="token"
          @click-interest="tokenModal = token"
          @redeem="redeemModal = token"
        )

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
