<script setup lang="ts">
import Feed from "@/components/Feed.vue";
import PFP from "@/components/PFP.vue";
import TokenListing from "@/components/TokenListing.vue";
import { events, Listing } from "@/service/db";
import Account from "@/service/eth/Account";
import { notNull } from "@/util";

const props = defineProps<{ account: Account }>();

const listings: Listing[] = events.filter(
  (event) =>
    event instanceof Listing &&
    notNull(event.tokenWrapper.minter).equals(props.account)
);
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
      TokenListing(v-for="listing in listings" :token="listing.tokenWrapper")
    h2.font-bold.text-lg 📰 Feed
    .flex.flex-col.border.divide-y
      Feed(:accountFilter="account")
</template>

<style scoped lang="scss"></style>
