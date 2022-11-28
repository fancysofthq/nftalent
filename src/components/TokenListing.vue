<script setup lang="ts">
import Listing from "@/models/Listing";
import Chip from "./shared/Chip.vue";
import * as eth from "@/services/eth";
import { ref } from "vue";
import { ethers } from "ethers";

const props = defineProps<{ listing: Listing }>();
const isPrimary = ref(false);

eth.onConnect(() => {
  eth.metaStore
    .findPrimaryListing(
      props.listing.token.token.toERC1155Token(eth.ipnft1155.address).toNFT()
    )
    .then((listing) => {
      isPrimary.value = listing?.id === props.listing.id;
    });
});
</script>

<template lang="pug">
tr
  td
    .flex.items-center.gap-2
      span.text-xl(title="Primary listing") {{ isPrimary ? "👑" : "" }}
      Chip.bg-base-200.h-5.w-min(
        :account="listing.seller"
        pfp-class="bg-base-100"
      )
  td 
    img.inline-block.h-5.mr-1(src="/img/eth-icon.svg" title="ETH")
    span {{ ethers.utils.formatEther(listing.price) }}
  td {{ listing.stockSize }}
  td
    slot
</template>
