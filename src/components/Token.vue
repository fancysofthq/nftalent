<script setup lang="ts">
import * as eth from "@/services/eth";
import { computed, onMounted } from "vue";
import Placeholder from "@/components/shared/Placeholder.vue";
import IPNFTSuper from "@/models/IPNFTSuper";
import { ethers } from "ethers";
import Markdown from "vue3-markdown-it";
import Chip from "@/components/shared/Chip.vue";
import { formatDistance } from "date-fns";

const {
  token,
  hideDescription = false,
  smallDescription = false,
  hideMintData = false,
  animatePlaceholder = true,
} = defineProps<{
  token: IPNFTSuper;
  hideDescription?: boolean;
  smallDescription?: boolean;
  hideMintData?: boolean;
  tokenFeedEntry?: boolean;
  animatePlaceholder?: boolean;
}>();

onMounted(() => {
  token.fetchIPFSMetadata();
});

eth.onConnect(() => {
  token.fetchEthMetadata();
});

const displayNbf = computed(
  () => token.redeemableMatureSince && token.redeemableMatureSince > new Date()
);
</script>

<template lang="pug">
.flex.flex-col.w-full.gap-1
  span.flex.flex-wrap.items-center.gap-1.text-sm
    router-link.font-bold.text-primary.daisy-link-hover.text-lg.leading-none(
      v-if="token.metadata?.name"
      :to="'/' + token.token.cid.toString()"
    ) {{ token.metadata.name }}
    Placeholder.h-5.w-48(v-else :animate="animatePlaceholder")

  .flex.flex-wrap.gap-1(
    v-if="token.metadata && token.metadata.properties.tags.length > 0"
  )
    span.daisy-badge.daisy-badge-outline.daisy-badge-secondary.daisy-badge-sm(
      v-for="tag in token.metadata.properties.tags"
    ) \#{{ tag }}

  span.flex.flex-wrap.items-baseline.gap-1.text-sm
    img.h-5.self-center(
      src="/img/eth-icon.svg"
      style="height: 1.11rem"
      alt="ETH"
      title="ETH"
    )
    template(v-if="token.nftSimpleListingPrimaryListing")
      span.border.rounded.px-1 {{ ethers.utils.formatEther(token.nftSimpleListingPrimaryListing.price) }}
      span per
      span.border.rounded.px-1(v-if="token.metadata?.properties.unit") {{ token.metadata?.properties.unit }}
      Placeholder.h-4.w-8.self-center(v-else :animate="animatePlaceholder")
    Placeholder.h-4.w-32(v-else :animate="animatePlaceholder")

    span ⋅
    span ⌛️
    span(
      v-if="token.redeemableMatureSince && token.redeemableMatureSince > new Date()"
    ) Ready
      span.ml-1(:title="token.redeemableMatureSince.toLocaleString()") {{ formatDistance(token.redeemableMatureSince, new Date(), { addSuffix: true }) }},
    span(v-if="token.redeemableExpiredAt") Expires
      span.ml-1.border.rounded.px-1(
        :title="token.redeemableExpiredAt.toLocaleString()"
      ) {{ formatDistance(token.redeemableExpiredAt, new Date(), { addSuffix: true }) }}
    Placeholder.h-4.w-32.self-center(v-else :animate="animatePlaceholder")

    span ⋅
    span 👑
    span(v-if="token.ipnft721Royalty !== undefined") Royalty
      span.ml-1.border.rounded.px-1 {{ (token.ipnft721Royalty * 100).toFixed(1) }}%
    Placeholder.inline-block.h-5.w-full(v-else :animate="animatePlaceholder")

  template(v-if="!hideDescription")
    // TODO: Hide overflowing text.
    Markdown.leading-tight.flex.flex-col.gap-1.text-justify(
      v-if="token.metadata?.description"
      :source="token.metadata.description"
      :class="{ 'text-sm': smallDescription, 'mt-1': !smallDescription }"
    )
    .flex.flex-col.gap-1(v-else :class="{ 'mt-1': !smallDescription }")
      Placeholder.h-4.w-full(:animate="animatePlaceholder")
      Placeholder.h-4.w-full(:animate="animatePlaceholder")
      Placeholder.h-4.w-full(:animate="animatePlaceholder")

  .flex.leading-none.gap-1.items-center.text-xs.text-base-content.text-opacity-75.mt-1(
    v-if="!hideMintData"
  )
    span &copy;
    Chip.h-5.bg-base-200.text-opacity-100(
      v-if="token.ipnft721Minter"
      :account="token.ipnft721Minter"
      pfp-class="bg-base-100"
    )
    Placeholder.inline-block.h-5.w-full(v-else :animate="animatePlaceholder")

    span ⋅
    span.flex.gap-1(v-if="token.ipnft721MintedAt") 
      span minted
      span(:title="token.ipnft721MintedAt.toLocaleString()") {{ formatDistance(token.ipnft721MintedAt, new Date(), { addSuffix: true }) }}
    Placeholder.inline-block.h-5.w-full(v-else :animate="animatePlaceholder")

    span ⋅
    span(v-if="token.ipnft1155MintedTotal") {{ token.ipnft1155MintedTotal }} edition{{ token.ipnft1155MintedTotal.gt(1) || token.ipnft1155MintedTotal.eq(0) ? "s" : "" }}
    Placeholder.inline-block.h-5.w-full(v-else :animate="animatePlaceholder")
  slot
</template>

<style scoped lang="scss"></style>
