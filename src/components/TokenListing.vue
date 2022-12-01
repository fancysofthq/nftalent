<script setup lang="ts">
import Listing from "@/models/Listing";
import Chip from "./shared/Chip.vue";
import * as eth from "@/services/eth";
import { ref } from "vue";
import { ethers } from "ethers";
import * as IPFT from "@/services/eth/contract/IPFT";

const props = defineProps<{ listing: Listing }>();
const isPrimary = ref(false);

eth.onConnect(() => {
  eth.openStore
    .findPrimaryListing({
      contract: eth.ipftRedeemable.address,
      id: IPFT.cidToUint256(props.listing.token.cid),
    })
    .then((listing) => {
      isPrimary.value = listing?.id === props.listing.id;
    });
});
</script>

<template lang="pug">
tr
  td
    .flex.items-center.gap-2
      Chip.gap-1.text-sm.text-primary(
        :account="listing.seller"
        pfp-class="h-8 bg-base-100"
      )
      span.text-2xl(title="Primary listing") {{ isPrimary ? "👑" : "" }}
  td 
    img.inline-block.h-5.mr-1(src="/img/eth-icon.svg" title="ETH")
    span {{ ethers.utils.formatEther(listing.price) }}
  td {{ listing.stockSize }}
  td
    slot
</template>
