<script setup lang="ts">
import * as eth from "@/services/eth";
import { onMounted, type Ref, ref, type ShallowRef, markRaw } from "vue";
import * as IPNFT from "@/services/eth/contract/IPNFT";
import IPNFTModel from "@/models/IPNFT";
import History from "./Token/History.vue";
import Token from "@/components/Token.vue";
import edb from "@/services/eth/event-db";
import Listing from "@/models/Listing";
import { Listing as RawListing } from "@/services/eth/contract/MetaStore";
import TokenListing from "@/components/TokenListing.vue";
import Purchase from "@/components/modals/Purchase.vue";
import Redeem from "@/components/modals/Redeem.vue";

const props = defineProps<{ ipnft: IPNFTModel }>();
const listings: ShallowRef<Listing[]> = ref([]);
const purchaseListing: Ref<Listing | undefined> = ref();
const redeemModal = ref(false);

onMounted(() => {
  props.ipnft.fetchIPFSMetadata();

  edb.iterateEventsIndex(
    "MetaStore.List",
    "tokenId",
    IPNFT.cidToUint256(props.ipnft.token.cid)._hex,
    "next",
    (event) => {
      const listing = markRaw(new Listing(RawListing.fromDBEvent(event)));
      listings.value.push(listing);
      listing.fetchData();
    }
  );
});

eth.onConnect(() => props.ipnft.fetchEthMetadata());
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg 
      span.inline-block.select-none Token 💎
      span.text-gray-500.text-sm.ml-2 {{ props.ipnft.token.cid }}
    Token.border.rounded-lg(
      :token="ipnft"
      :showRedeemButton="true"
      @redeem="redeemModal = true"
    )
      template(v-if="ipnft.ipnft1155ExpiredAt")
        button.daisy-btn.daisy-btn-primary.mt-1(
          :disabled="!ipnft.ipnft1155Balance || ipnft.ipnft1155Balance.eq(0)"
          @click="redeemModal = true"
        )
          span.text-xl 🎟
          span Redeem (you have {{ ipnft.ipnft1155Balance }})

    h2.font-bold.text-lg Listings ({{ listings.length }}) 📦
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
            button.daisy-btn.daisy-btn-primary.daisy-btn-sm(
              :disabled="listing.stockSize.eq(0)"
              @click="purchaseListing = listing"
            )
              span.text-xl 💳
              span Purchase

    h2.font-bold.text-lg History 📜
    .border.rounded-lg.flex-col.gap-2.divide-y
      History(:token="ipnft.token")

Teleport(to="body")
  Purchase(
    v-if="purchaseListing"
    @close="purchaseListing = undefined"
    :listing="purchaseListing"
    :ipnft="ipnft"
  )
  Redeem(
    v-if="redeemModal && ipnft.ipnft1155Balance?.gt(0) && ipnft.ipnft1155ExpiredAt && ipnft.ipnft1155ExpiredAt.valueOf() > 0"
    @close="redeemModal = false"
    :ipnft="ipnft"
    :balance="ipnft.ipnft1155Balance"
  )
</template>
