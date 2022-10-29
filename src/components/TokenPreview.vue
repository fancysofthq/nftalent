<script setup lang="ts">
import { ERC1155TokenWrapper } from "@/service/db";
import { notNull } from "@/util";
import { ethers } from "ethers";
import { ref } from "vue";
import Markdown from "vue3-markdown-it";
import Chip from "./Chip.vue";
import PFP from "./PFP.vue";

interface Props {
  token: ERC1155TokenWrapper;
  small?: boolean;
}

const { token, small = false } = defineProps<Props>();
const textHidden = ref(true);
</script>

<template lang="pug">
.flex.flex-col.gap-1.w-full
  .flex.justify-between.items-end
    span.inline-flex.items-center.gap-2.text-lg.leading-none
      router-link.font-bold.text-primary.daisy-link-hover(
        :to="'/token/' + token.token.id._hex"
      ) {{ notNull(token.token.metadata).name }}
      span.inline-flex.items-center.gap-1
        img.h-5(src="/img/eth-icon.svg")
        span {{ ethers.utils.formatEther(notNull(token.price)) }}
        span /hr
    span.text-base-content.text-opacity-75.text-sm ⌛️ Expires {{ notNull(token.token.metadata).properties.expiresAt.toLocaleDateString() }}

  .flex.flex-wrap.gap-1(
    v-if="notNull(token.token.metadata).properties.tags.length > 0"
  )
    span.daisy-badge.daisy-badge-outline.daisy-badge-secondary.daisy-badge-sm(
      v-for="tag in notNull(token.token.metadata).properties.tags"
    ) \#{{ tag }}

  // TODO: Hide overflowing text.
  Markdown.leading-tight.flex.flex-col.gap-1.text-justify(
    :source="notNull(token.token.metadata).description"
    :class="{ 'text-sm': small, 'text-base': !small }"
  )

  .flex.leading-none.gap-1.items-center.text-xs.text-base-content.text-opacity-75
    span &copy;
    Chip.h-5.bg-base-200.text-opacity-100(
      :account="notNull(token.minter)"
      pfp-class="bg-base-100"
    )
    span ⋅
    span minted 1 day ago
    span ⋅
    span {{ token.editions }} editions
    span ⋅
    span {{ (notNull(token.royalty).royalty * 100).toFixed(1) }}% royalty
  slot
</template>

<style scoped lang="scss"></style>
