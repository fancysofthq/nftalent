<script setup lang="ts">
import Feed from "@/components/Feed.vue";
import PFP from "@/components/PFP.vue";
import TokenListing from "@/components/TokenListing.vue";
import { onConnect } from "@/service/eth";
import Account from "@/service/eth/Account";
import { type ListEvent } from "@/service/eth/contract/NFTSimpleListing";
import { ref, type ShallowRef } from "vue";
import * as ethEventDb from "@/service/eth/event-db";
import * as eth from "@/service/eth";
import { RichToken } from "@/components/RichToken";
import ERC1155Token from "@/service/eth/contract/ERC1155Token";
import { BigNumber } from "ethers";

const props = defineProps<{ account: Account }>();

type RichListing = {
  event: ListEvent;
  token: RichToken;
};

const listings: ShallowRef<RichListing[]> = ref([]);

onConnect(async () => {
  const events = await ethEventDb.accountListings(props.account);

  listings.value = events.map((e) => ({
    event: e,
    token: new RichToken(
      new ERC1155Token(eth.nftime.account, BigNumber.from(e.token.id))
    ),
  }));

  listings.value.forEach((l) => {
    l.token.enrichMetadata();
    l.token.enrichEth();
    l.token.enrichPrimaryListing();
  });
});
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg 🙂 Profile
    .flex.flex-col.items-center.bg-base-100.border.w-full.p-8.gap-4
      PFP.h-32.w-32.bg-base-200(:account="account" mask="squircle")
      h2.text-lg {{ account }}
    h2.font-bold.text-lg ✨ Listings
    .flex.flex-col.border.divide-y
      TokenListing(
        v-if="listings.length > 0"
        v-for="listing in listings"
        :token="listing.token"
      )
      .p-4.text-base-content.text-center(v-else) No listings yet
    h2.font-bold.text-lg 📰 Feed
    .flex.flex-col.border.divide-y
      Feed(:accountFilter="account")
</template>

<style scoped lang="scss"></style>
