<script setup lang="ts">
import Feed from "@/components/ProfileFeed.vue";
import PFP from "@/components/shared/PFP.vue";
import TokenListing from "@/components/TokenListing.vue";
import * as eth from "@/services/eth";
import Account from "@/services/eth/Account";
import { ref, type ShallowRef } from "vue";
import { type IPNFTSuperListing, accountListings } from "@/logic/listing";

const props = defineProps<{ account: Account }>();

const listings: ShallowRef<IPNFTSuperListing[]> = ref([]);

eth.onConnect(async () => {
  listings.value = (await accountListings(props.account)).filter((l) =>
    l.listing.stockSize.gt(0)
  );

  listings.value.forEach((l) => {
    l.token.fetchIPFSMetadata();
    l.token.fetchEthMetadata();
  });
});
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg Profile 🙂
    .flex.flex-col.items-center.bg-base-100.w-full.gap-4.border.rounded-lg.p-4
      PFP.h-32.w-32.bg-base-200(:account="account" mask="squircle")
      h2.text-lg {{ account }}

    h2.font-bold.text-lg Listings ✨
    .flex.flex-col.divide-y.border.rounded-lg
      TokenListing(
        v-if="listings.length > 0"
        v-for="listing in listings"
        :listing="listing.listing"
        :ipnft="listing.token"
      )
      .text-base-content.text-center.p-4(v-else) No active listings

    h2.font-bold.text-lg Feed 📰
    .flex.flex-col.gap-2.border.rounded-lg.divide-y
      Feed(:account="account")
</template>

<style scoped lang="scss"></style>
