<script lang="ts">
export enum Kind {
  Full,
  Card,
  FeedEntry,
  Thumbnail,
}
</script>

<script setup lang="ts">
import * as eth from "@/services/eth";
import { computed, type ComputedRef, onMounted } from "vue";
import Placeholder from "@/components/shared/Placeholder.vue";
import IPNFTModel from "@/models/IPNFT";
import Markdown from "vue3-markdown-it";
import Chip from "@/components/shared/Chip.vue";
import { formatDistance } from "date-fns";
import * as IPFS from "@/services/ipfs";
import * as nftalent from "@/nftalent";
import { type FileWithUrl } from "@/components/shared/SelectImage.vue";

const {
  token,
  kind = Kind.Full,
  animatePlaceholder = true,
} = defineProps<{
  token: IPNFTModel;
  kind?: Kind;
  animatePlaceholder?: boolean;
}>();

const anyTags = computed(
  () =>
    token.ipnft1155ExpiredAt ||
    (token.metadata && token.metadata.properties.tags.length > 0) ||
    token.ipnft1155Finalized
);

onMounted(() => {
  token.fetchIPFSMetadata();
});

eth.onConnect(() => {
  token.fetchEthMetadata();
});

const rootClass = computed(() => {
  switch (kind) {
    case Kind.Full: {
      if (token.metadata?.$schema == "nftalent/collectible/image?v=1") {
        return "grid grid-cols-1";
      } else {
        return "grid grid-cols-1 sm_grid-cols-3";
      }
    }
    case Kind.Card:
      return "grid grid-cols-1";
    case Kind.FeedEntry:
      return "grid grid-cols-10";
    case Kind.Thumbnail:
      return "grid grid-cols-1";
  }
});

const infoClass = computed(() => {
  switch (kind) {
    case Kind.Full:
      return "col-span-2 justify-between";
    case Kind.Card:
      return "justify-between";
    case Kind.FeedEntry:
      return "col-span-8 justify-center";
  }
});

function urlFromImage(image: string | URL | FileWithUrl): URL {
  if (image instanceof URL) {
    return IPFS.processUri(image);
  } else if (typeof image == "string") {
    return IPFS.processUri(new URL(image));
  } else {
    console.debug("Image is a File", image.url?.toString());
    return image.url!;
  }
}

const imageUrl: ComputedRef<URL | undefined> = computed(() => {
  if (!token.metadata) return undefined;

  if (token.metadata.$schema == "nftalent/collectible/image?v=1") {
    const metadata = token.metadata as nftalent.Collectible.Image.Metadata;

    switch (kind) {
      // For Full kind, return the override image
      // if it exists, otherwise the preview image.
      case Kind.Full: {
        if (metadata.properties.image && metadata.properties.image.uri) {
          return urlFromImage(metadata.properties.image.uri);
        } else if (metadata.image) {
          return urlFromImage(metadata.image);
        }

        break;
      }

      // For other kinds, return the preview image
      case Kind.Card:
      case Kind.FeedEntry:
      case Kind.Thumbnail: {
        if (metadata.image) {
          return urlFromImage(metadata.image);
        }
      }
    }
  } else if (token.metadata?.image) {
    return urlFromImage(token.metadata.image);
  }
});
</script>

<template lang="pug">
.h-full.rounded-lg(
  :class="rootClass"
  style="grid-template-rows: min-content auto"
)
  // Image
  router-link.contents(tabindex="-1" :to="'/' + token.token.cid.toString()")
    .rounded-lg.aspect-square.object-contain.w-full.h-full.bg-cover.bg-center(
      v-if="imageUrl"
      :style="'background-image: url(' + imageUrl.toString() + ');'"
    )
      img.rounded-lg.aspect-square.object-contain.w-full.h-full.backdrop-blur.backdrop-brightness-75(
        :src="imageUrl.toString()"
      )
    Placeholder.w-full.aspect-square.object-cover(
      v-else
      :animate="animatePlaceholder"
    )

  .flex.flex-col.gap-2.p-3.h-full(
    :class="infoClass"
    v-if="kind != Kind.Thumbnail"
  )
    .flex.flex-col.gap-2(
      :class="{ 'justify-between h-full': kind === Kind.Card }"
    )
      // Basic information
      .flex.flex-col(:class="kind === Kind.FeedEntry ? 'gap-1' : 'gap-2'")
        // Title
        span.flex.flex-wrap.items-center.gap-1
          router-link.font-bold.text-primary.daisy-link-hover.text-lg.leading-none(
            v-if="token.metadata?.name"
            :to="'/' + token.token.cid.toString()"
          ) {{ token.metadata.name }}
          Placeholder.h-5.w-48(v-else :animate="animatePlaceholder")

        // Tags
        .flex.flex-wrap.gap-1(v-if="anyTags")
          template(v-if="token.ipnft1155ExpiredAt")
            .daisy-badge.daisy-badge-outline.daisy-badge-sm 🎟 Redeemable ({{ token.metadata?.properties.unit }})
            .daisy-badge.daisy-badge-outline.daisy-badge-sm 📅 Exp. {{ formatDistance(token.ipnft1155ExpiredAt, new Date(), { addSuffix: true }) }}

          .daisy-badge.daisy-badge-outline.daisy-badge-sm(
            v-if="token.ipnft1155Finalized"
          ) 🗿 Finalized

          span.daisy-badge.daisy-badge-outline.daisy-badge-secondary.daisy-badge-sm(
            v-if="token.metadata"
            v-for="tag in token.metadata.properties.tags"
          ) \#{{ tag }}

      // Description
      template(v-if="kind === Kind.Full")
        // TODO: Hide overflowing text.
        Markdown.leading-tight.flex.flex-col.gap-1.text-justify(
          v-if="token.metadata?.description"
          :source="token.metadata.description"
        )
        .flex.flex-col.gap-1(v-else)
          Placeholder.h-4.w-full(:animate="animatePlaceholder")
          Placeholder.h-4.w-full(:animate="animatePlaceholder")
          Placeholder.h-4.w-full(:animate="animatePlaceholder")

      // Mint data
      p.leading-tight.text-xs.text-base-content.text-opacity-75.whitespace-normal(
        v-if="kind === Kind.Full || kind === Kind.Card"
      )
        span.align-middle &copy;&nbsp;
        Chip.align-middle.h-4.bg-base-200.text-opacity-100.text-xs(
          v-if="token.ipnft721Minter"
          :account="token.ipnft721Minter"
          pfp-class="bg-base-100"
        )
        Placeholder.inline-block.h-5.w-full(
          v-else
          :animate="animatePlaceholder"
        )

        span &nbsp;⋅&nbsp;
        template(v-if="token.ipnft721MintedAt") 
          span minted&nbsp;
          span(:title="token.ipnft721MintedAt.toLocaleString()") {{ formatDistance(token.ipnft721MintedAt, new Date(), { addSuffix: true }) }}
        Placeholder.inline-block.h-5.w-full(
          v-else
          :animate="animatePlaceholder"
        )

        span &nbsp;⋅&nbsp;
        span(v-if="token.ipnft1155TotalSupply") {{ token.ipnft1155TotalSupply }} edition{{ token.ipnft1155TotalSupply.gt(1) || token.ipnft1155TotalSupply.eq(0) ? "s" : "" }}
        Placeholder.inline-block.h-5.w-full(
          v-else
          :animate="animatePlaceholder"
        )

        span &nbsp;⋅&nbsp;
        span {{ ((token.ipnft721Royalty || 0) * 100).toFixed(1) }}% royalty

    slot
</template>
