<script setup lang="ts">
import Feed from "./Profile/Feed.vue";
import PFP from "@/components/shared/PFP.vue";
import * as eth from "@/services/eth";
import Account from "@/services/eth/Account";
import { ref, type ShallowRef } from "vue";
import Listing from "@/models/Listing";
import { getOrCreate as getOrCreateListing } from "@/models/Listing";
import Redeemable, { Kind as RedeemableKind } from "@/components/Token.vue";

const props = defineProps<{ account: Account }>();
const listings: ShallowRef<Listing[]> = ref([]);

eth.onConnect(async () => {
  listings.value = (await accountListings(props.account)).filter((l) =>
    l.stockSize.gt(0)
  );

  listings.value.forEach((l) => {
    l.token.fetchIPFSMetadata();
    l.token.fetchEthMetadata();
  });
});

/**
 * Return active listings by account (including those with zero balance).
 */
async function accountListings(account: Account): Promise<Listing[]> {
  // 1. Fetch all listings where the seller is the account.
  const listings = await eth.metaStore.listingsByAccount(account);

  // 2. Fetch the contract for actual listing actual details.
  await Promise.all(
    listings.map(async (listing) => {
      const res = await eth.metaStore.getListing(listing.id);
      if (!res) throw "Listing not found with id " + listing.id;

      listing.price = res.price;
      listing.stockSize = res.stockSize;
    })
  );

  return listings.map((l) => getOrCreateListing(l));
}
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg Profile 🙂
    .flex.flex-col.items-center.bg-base-100.w-full.gap-4.border.rounded-lg.p-4
      PFP.h-32.w-32.bg-base-200(:account="account" mask="squircle")
      h2.text-lg {{ account }}

    template(v-if="listings.length > 0")
      h2.font-bold.text-lg Redeemables ({{ listings.length }}) 🎟
      //- TODO: Horizontally scrollable.
      .grid.grid-cols-3.border.rounded-lg.p-4.gap-3.bg-base-200
        Redeemable.rounded.shadow.bg-base-100(
          v-for="listing in listings"
          :ipnft="listing.token"
          :token="listing.token"
          :kind="RedeemableKind.Card"
        )
          router-link.daisy-btn.daisy-btn-primary.daisy-btn-sm(
            :to="'/' + listing.token.token.cid.toString()"
          )
            span.text-xl 👀
            span Open

    h2.font-bold.text-lg Feed 📰
    .flex.flex-col.border.rounded-lg.divide-y
      Feed(:account="account")
</template>
