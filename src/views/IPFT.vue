<script setup lang="ts">
import * as eth from "@/services/eth";
import { onMounted, type Ref, ref, type ShallowRef } from "vue";
import * as IPFT from "@/services/eth/contract/IPFT";
import IPFTRedeemable from "@/models/IPFTRedeemable";
import RedeemableHistory from "./IPFT/Redeemable/History.vue";
import IPFTRedeemableVue from "@/components/IPFTRedeemable.vue";
import edb from "@/services/eth/event-db";
import Listing from "@/models/Listing";
import * as OpenStore from "@/services/eth/contract/OpenStore";
import TokenListing from "@/components/TokenListing.vue";
import Purchase from "@/components/modals/Purchase.vue";
import Redeem from "@/components/modals/Redeem.vue";
import { CID } from "multiformats/cid";

const props = defineProps<{ cid: CID }>();
const ipft: Ref<IPFTRedeemable | undefined> = ref();
const listings: ShallowRef<Listing[]> = ref([]);
const purchaseListing: ShallowRef<Listing | undefined> = ref();
const redeemModal = ref(false);

// TODO: Fetch IPFS, find ipftTag in the bytes,
// render the according token type.

onMounted(() => {
  ipft.value = IPFTRedeemable.getOrCreate(props.cid);

  eth.onConnect(() => {
    ipft.value!.fetchEthData();

    edb.iterateEventsIndex(
      "OpenStore.List",
      "token",
      [
        eth.app.toString(),
        eth.ipftRedeemable.address.toString(),
        IPFT.cidToUint256(props.cid)._hex,
      ],
      "next",
      (event) => {
        const listing = Listing.getOrCreate(
          OpenStore.Listing.fromDBEvent(event)
        );
        listings.value.push(listing);
        listing.fetchData();
      }
    );
  });
});
</script>

<template lang="pug">
.w-full.flex.justify-center
  .w-full.max-w-3xl.flex.flex-col.p-4.gap-2
    h2.flex.gap-2.items-baseline
      span.font-bold.text-lg.min-w-max 💎 Token
      router-link.text-sm.text-base-content.text-opacity-75.break-all.daisy-link-hover(
        :to="'/token/' + cid.toString()"
      ) /ipft/{{ cid }}
    IPFTRedeemableVue.border.rounded-lg(
      v-if="ipft"
      :token="ipft"
      :showRedeemButton="true"
      @redeem="redeemModal = true"
    )

    h2.flex.gap-2.items-baseline
      span.font-bold.text-lg.min-w-max 📦 Listings ({{ listings.length }})
    table.daisy-table.rounded-lg.border
      thead
        tr
          th Seller
          th Price
          th In stock
          th.text-right Action
      tbody
        TokenListing(v-for="listing in listings" :listing="listing")
          .flex.gap-2.items-center.justify-end
            button.daisy-btn.daisy-btn-primary.daisy-btn-sm.flex.gap-1(
              :disabled="listing.stockSize.eq(0)"
              @click="purchaseListing = listing"
            )
              span.text-xl 💳
              span Purchase

    h2.flex.gap-2.items-baseline
      span.font-bold.text-lg.min-w-max 📜 History
    .border.rounded-lg.flex-col.gap-2.divide-y
      RedeemableHistory(v-if="ipft" :token="ipft")

    Purchase(
      v-if="purchaseListing && ipft"
      @close="purchaseListing = undefined"
      :listing="purchaseListing"
      :ipft="ipft"
    )

    Redeem(
      v-if="redeemModal && ipft && ipft.balance?.gt(0) && ipft?.expiredAt && ipft.expiredAt.valueOf() > 0"
      @close="redeemModal = false"
      :ipft="ipft"
      :balance="ipft?.balance"
    )
</template>
