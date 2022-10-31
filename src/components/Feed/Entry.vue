<script setup lang="ts">
import { RichToken } from "../RichToken";
import { type ListEvent } from "@/service/eth/contract/NFTSimpleListing";
import ERC1155Token from "@/service/eth/contract/ERC1155Token";
import * as eth from "@/service/eth";
import * as ipfs from "@/service/ipfs";
import { BigNumber } from "ethers";
import { onMounted, ref, type Ref } from "vue";
import { Box } from "@/util";
import Placeholder from "../Placeholder.vue";
import Chip from "../Chip.vue";
import TokenPreview from "../TokenPreview.vue";
import { id2Cid } from "@/service/eth/contract/NFTime";

const props = defineProps<{ event: Box<ListEvent> }>();
const richEvent = {
  event: props.event,
  token: new RichToken(
    new ERC1155Token(
      eth.nftimeAddress,
      BigNumber.from(props.event.value.token.id)
    )
  ),
};
const timestamp: Ref<Date | undefined> = ref();

onMounted(() => richEvent.token.enrichMetadata());

eth.onConnect(() => {
  richEvent.token.enrichEth();
  richEvent.token.enrichPrimaryListing();

  eth.provider
    .value!.getBlock(props.event.value.blockNumber)
    .then((block) => (timestamp.value = new Date(block.timestamp * 1000)));
});

function actionEmoji(action: Box<ListEvent>) {
  if (action instanceof Box<ListEvent>) {
    return "✨";
  } else {
    return "🤷‍♂️";
  }
}

function actionName(event: Box<ListEvent>) {
  if (event instanceof Box<ListEvent>) {
    return "listed";
  } else {
    return "did what";
  }
}
</script>

<template lang="pug">
.flex.flex-col.gap-2.p-4(style="grid-template-columns: 7rem auto")
  .flex.leading-none.-mb-1.gap-1.items-center.text-xs.text-base-content.text-opacity-75
    Chip.h-5.bg-base-200(
      v-if="richEvent.token.aux.minter.value"
      :account="richEvent.token.aux.minter.value"
      pfp-class="bg-base-100"
    )
    Placeholder.h-5.w-12(v-else)
    span.text-lg {{ actionEmoji(event) }}
    span(v-if="timestamp") {{ actionName(event) }} at {{ timestamp.toLocaleString() }}
    Placeholder.inline-block.h-5.w-12(v-else)
  .grid.gap-x-2.border.p-4(style="grid-template-columns: 8rem auto")
    router-link.font-bold.text-primary.daisy-link-hover(
      v-if="richEvent.token.aux.metadata.value"
      tabindex="-1"
      :to="'/' + id2Cid(richEvent.token.token.id)"
    )
      img.rounded-lg.aspect-square.object-cover.w-full(
        tabindex="-1"
        :src="ipfs.processUri(richEvent.token.aux.metadata.value.image).toString()"
      )
    Placeholder.w-full.aspect-square(v-else)
    TokenPreview(:token="richEvent.token" :feed-entry="true")
</template>

<style scoped lang="scss"></style>
