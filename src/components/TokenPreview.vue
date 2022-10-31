<script setup lang="ts">
import Placeholder from "./Placeholder.vue";
import { id2Cid } from "@/service/eth/contract/NFTime";
import { ethers } from "ethers";
import Markdown from "vue3-markdown-it";
import Chip from "./Chip.vue";
import { RichToken } from "./RichToken";

interface Props {
  token: RichToken;
  feedEntry?: boolean;
}

const { token, feedEntry = false } = defineProps<Props>();
</script>

<template lang="pug">
.flex.flex-col.w-full.gap-1
  .flex.justify-between.items-baseline.leading-zero
    span.inline-flex.items-baseline.gap-1
      router-link.font-bold.text-primary.daisy-link-hover.contents(
        :to="'/' + id2Cid(token.token.id)"
      ) 
        span.text-lg.leading-zero(v-if="token.aux.metadata.value") {{ token.aux.metadata.value.name }}
        Placeholder.h-5.w-32(v-else)
      img(src="/img/eth-icon.svg" style="height: 1.11rem; align-self: normal")
      template(v-if="token.aux.primaryListing.value")
        span {{ ethers.utils.formatEther(token.aux.primaryListing.value.config.price) }}
        span.text-sm per 1 hour
      Placeholder.h-5.w-32(v-else)
    span.text-base-content.text-opacity-75.text-sm(
      v-if="token.aux.expiredAt.value"
    ) ⌛️ Exp. {{ token.aux.expiredAt.value.toLocaleString() }}
    Placeholder.h-5.w-24(v-else)

  .flex.flex-wrap.gap-1(
    v-if="token.aux.metadata.value && token.aux.metadata.value.properties.tags.length > 0"
  )
    span.daisy-badge.daisy-badge-outline.daisy-badge-secondary.daisy-badge-sm(
      v-for="tag in token.aux.metadata.value.properties.tags"
    ) \#{{ tag }}

  // TODO: Hide overflowing text.
  Markdown.leading-tight.flex.flex-col.gap-1.text-justify(
    v-if="token.aux.metadata.value"
    :source="token.aux.metadata.value.description"
    :class="{ 'text-sm': feedEntry, 'text-base': !feedEntry }"
  )
  .flex.flex-col.gap-2(v-else)
    Placeholder.h-4.w-full
    Placeholder.h-4.w-full

  .flex.leading-none.gap-1.items-center.text-xs.text-base-content.text-opacity-75
    span &copy;
    Chip.h-5.bg-base-200.text-opacity-100(
      v-if="token.aux.minter.value"
      :account="token.aux.minter.value"
      pfp-class="bg-base-100"
    )
    Placeholder.inline-block.h-5.w-full(v-else)
    span ⋅
    span(v-if="token.aux.mintedAt.value") minted {{ token.aux.mintedAt.value.toLocaleDateString() }}
    Placeholder.inline-block.h-5.w-full(v-else)
    span ⋅
    span(v-if="token.aux.mintedEditions.value") {{ token.aux.mintedEditions.value }} edition{{ token.aux.mintedEditions.value.gt(1) || token.aux.mintedEditions.value.eq(0) ? "s" : "" }}
    Placeholder.inline-block.h-5.w-full(v-else)
    span ⋅
    span(v-if="token.aux.royalty.value") {{ (token.aux.royalty.value * 100).toFixed(1) }}% royalty
    Placeholder.inline-block.h-5.w-full(v-else)
  slot
</template>

<style scoped lang="scss"></style>
