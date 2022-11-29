<script lang="ts">
export enum Kind {
  Full,
  Card,
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
import { EllipsisHorizontalIcon } from "@heroicons/vue/24/outline";

const {
  token,
  kind = Kind.Full,
  animatePlaceholder = true,
} = defineProps<{
  token: IPNFTModel;
  kind?: Kind;
  animatePlaceholder?: boolean;
}>();

const emit = defineEmits<{
  (event: "clickInterest"): void;
  (event: "redeem"): void;
}>();

const isRedeemable = computed(() => {
  return token.ipnft1155ExpiredAt;
});

const mayRedeem = computed(() => {
  return isRedeemable.value && token.ipnft1155Balance?.gt(0);
});

const anyTags = computed(
  () =>
    token.ipnft1155ExpiredAt ||
    (token.metadata && token.metadata.properties.tags.length > 0) ||
    token.ipnft1155Finalized
);

const rootClass = computed(() => {
  switch (kind) {
    case Kind.Full: {
      if (token.metadata?.$schema == "nftalent/collectible/image?v=1") {
        return "grid grid-cols-1";
      } else if (token.ipnft1155ExpiredAt) {
        return "grid grid-cols-2 sm_grid-cols-12";
      } else {
        return "grid grid-cols-1 sm_grid-cols-3";
      }
    }
    case Kind.Card:
      return "grid grid-cols-1";
  }
});

const imgWrapperClass = computed(() => {
  switch (kind) {
    case Kind.Full:
      if (token.ipnft1155ExpiredAt) {
        return "col-span-3";
      } else {
        return "col-span-1";
      }
    case Kind.Card:
      return "col-span-1";
  }
});

const infoClass = computed(() => {
  switch (kind) {
    case Kind.Full:
      if (token.ipnft1155ExpiredAt) {
        return "col-span-8";
      }
    case Kind.Card:
      return "justify-between";
  }
});

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
      case Kind.Card: {
        if (metadata.image) {
          return urlFromImage(metadata.image);
        }
      }
    }
  } else if (token.metadata?.image) {
    return urlFromImage(token.metadata.image);
  }
});

const maySetPfp = computed(() => {
  return (
    eth.account.value && token.ipnft721CurrentOwner?.equals(eth.account.value)
  );
});

onMounted(() => {
  token.fetchIPFSMetadata();
});

eth.onConnect(() => {
  token.fetchEthMetadata();
});

async function setPfp() {
  if (!maySetPfp.value) throw "Not allowed";
  const tx = await eth.persona.setPfp(
    token.token.toERC721Token(eth.ipnft721.address).toNFT()
  );
  console.debug("Set PFP", tx);
}

function urlFromImage(image: string | URL | FileWithUrl): URL {
  if (image instanceof URL) {
    return IPFS.processUri(image);
  } else if (typeof image == "string") {
    return IPFS.processUri(new URL(image));
  } else {
    return image.url!;
  }
}
</script>

<template lang="pug">
.overflow-hidden(
  :class="rootClass"
  style="grid-template-rows: min-content auto"
)
  // Image
  router-link(
    :to="'/' + token.token.cid.toString()"
    custom
    v-slot="{ href, navigate }"
  )
    a.w-full(
      tabindex="-1"
      :href="href"
      :class="imgWrapperClass"
      @click.exact.prevent="emit('clickInterest')"
    )
      .w-full.h-full.bg-checkerboard.bg-fixed(v-if="imageUrl")
        img.w-full.h-full.object-contain(
          :src="imageUrl.toString()"
          :class="{ 'aspect-square': isRedeemable || kind === Kind.Card }"
        )
      Placeholder.w-full.h-full.aspect-square.object-cover(
        v-else
        :animate="animatePlaceholder"
        :rounded="false"
        :class="{ 'aspect-square': isRedeemable || kind === Kind.Card }"
      )

  // Information
  .flex.flex-col.gap-2.p-3.h-full(:class="infoClass")
    .flex.flex-col.gap-2(
      :class="{ 'justify-between h-full': kind === Kind.Card }"
    )
      // Basic information
      .flex.flex-col.gap-1
        // Title
        span.flex.flex-wrap.items-center.justify-between.gap-1
          router-link(
            v-if="token.metadata?.name"
            :to="'/' + token.token.cid.toString()"
            custom
            v-slot="{ href, navigate }"
          ) 
            a.daisy-link-primary.font-bold.text-lg.leading-none(
              :href="href"
              @click.exact.prevent="emit('clickInterest')"
            ) {{ token.metadata.name }}
          Placeholder.h-5.w-48(
            v-else
            :animate="animatePlaceholder"
            @click="emit('clickInterest')"
          )

          .daisy-dropdown.daisy-dropdown-end(v-if="kind === Kind.Full")
            label(tabindex="0")
              EllipsisHorizontalIcon.h-6.w-6.cursor-pointer.transition-transform.duration-100.active_scale-90
            ul.daisy-menu.daisy-dropdown-content.rounded.w-52.bg-base-100.shadow-lg.divide-y(
              tabindex="0"
            )
              li(v-if="maySetPfp")
                button(@click="setPfp") ⛓🖼 Set as PFP

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
      .leading-tight.text-xs.text-base-content.text-opacity-75.whitespace-normal(
        v-if="kind === Kind.Full || kind === Kind.Card"
      )
        span.align-middle &copy;&nbsp;
        Chip.align-middle.h-4.bg-base-200.text-opacity-100.text-xs(
          v-if="token.ipnft721Minter"
          :account="token.ipnft721Minter"
          pfp-class="bg-base-100"
        )
        Placeholder.inline-block.h-3.w-8.align-middle(
          v-else
          :animate="animatePlaceholder"
        )

        span.align-middle &nbsp;⋅&nbsp;
        template(v-if="token.ipnft721MintedAt") 
          span.align-middle minted&nbsp;
          span.align-middle(:title="token.ipnft721MintedAt.toLocaleString()") {{ formatDistance(token.ipnft721MintedAt, new Date(), { addSuffix: true }) }}
        Placeholder.inline-block.h-3.w-8.align-middle(
          v-else
          :animate="animatePlaceholder"
        )

        span.align-middle &nbsp;⋅&nbsp;
        span.align-middle(v-if="token.ipnft1155TotalSupply") {{ token.ipnft1155TotalSupply }} edition{{ token.ipnft1155TotalSupply.gt(1) || token.ipnft1155TotalSupply.eq(0) ? "s" : "" }}
        Placeholder.inline-block.h-3.w-8.align-middle(
          v-else
          :animate="animatePlaceholder"
        )

        span.align-middle &nbsp;⋅&nbsp;
        span.align-middle {{ ((token.ipnft721Royalty || 0) * 100).toFixed(1) }}% royalty

  // Redeemable badge
  .app-redeemable-badge.flex.justify-center.items-center.h-full.w-full.border-dashed(
    v-if="kind === Kind.Full && isRedeemable"
    :class="mayRedeem ? 'may-redeem cursor-pointer' : 'cursor-not-allowed'"
    @click="mayRedeem ? emit('redeem') : null"
  )
    .app-button.uppercase.text-base-content.select-none(
      :class="mayRedeem ? 'transition-all duration-100 font-semibold' : 'text-opacity-50'"
    ) Redeem ({{ token.ipnft1155Balance }})
</template>

<style scoped lang="scss">
.app-redeemable-badge {
  &.may-redeem:hover {
    > .app-button {
      @apply text-primary;
    }
  }

  &.may-redeem:active {
    > .app-button {
      @apply scale-90;
    }
  }
}

@media (max-width: 639px) {
  .app-redeemable-badge {
    @apply col-span-2 border-t-2 p-4;
  }
}

@media (min-width: 640px) {
  .app-redeemable-badge {
    @apply border-l-2;
  }

  .app-button {
    text-orientation: mixed;
    writing-mode: vertical-lr;
  }
}
</style>
