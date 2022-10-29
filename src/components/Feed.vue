<script setup lang="ts">
import Account from "@/service/eth/Account";
import TokenPreview from "@/components/TokenPreview.vue";
import Chip from "./Chip.vue";
import { events, Listing, Purchase } from "@/service/db";
import { notNull } from "@/util";
import ERC1155Token from "@/service/eth/contract/ERC1155Token";

interface Props {
  accountFilter?: Account;
  tokenFilter?: ERC1155Token;
  oneline?: boolean;
}

const { accountFilter, tokenFilter, oneline = false } = defineProps<Props>();

function actionEmoji(action: Purchase | Listing) {
  if (action instanceof Purchase) {
    return "💳";
  } else if (action instanceof Listing) {
    return "✨";
  } else {
    return "🤷‍♂️";
  }
}

function actionName(event: Listing | Purchase) {
  if (event instanceof Listing) {
    return "listed";
  } else if (event instanceof Purchase) {
    return "purchased";
  } else {
    return "did what";
  }
}
</script>

<template lang="pug">
.flex.flex-col.gap-2.p-4.pt-2(
  v-for="event in events"
  style="grid-template-columns: 7rem auto"
)
  .flex.leading-none.-mb-1.gap-1.items-center.text-xs.text-base-content.text-opacity-75
    Chip.h-5.bg-base-200(
      :account="notNull(event.tokenWrapper.minter)"
      pfp-class="bg-base-100"
    )
    span.text-lg {{ actionEmoji(event) }}
    span {{ actionName(event) }} 1 day ago
  .grid.gap-x-2.border.p-4(style="grid-template-columns: 7rem auto")
    img.rounded-lg.aspect-square.object-cover.w-full(
      :src="notNull(event.tokenWrapper.token.metadata).image"
    )
    TokenPreview(:token="event.tokenWrapper" :small="true")
</template>

<style scoped lang="scss"></style>
