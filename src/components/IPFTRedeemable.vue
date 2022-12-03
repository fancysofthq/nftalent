<script setup lang="ts">
import * as eth from "@/services/eth";
import { computed, type ComputedRef, onMounted } from "vue";
import Placeholder from "@/components/shared/Placeholder.vue";
import IPFTRedeemable from "@/models/IPFTRedeemable";
import Markdown from "vue3-markdown-it";
import Chip from "@/components/shared/Chip.vue";
import { formatDistance } from "date-fns";
import * as IPFS from "@/services/ipfs";
import { type FileWithUrl } from "@/components/shared/SelectImage.vue";
import { EllipsisHorizontalIcon } from "@heroicons/vue/24/outline";
import * as IPFT from "@/services/eth/contract/IPFT";

const {
  token,
  animatePlaceholder = true,
  fetchMetadata = true,
} = defineProps<{
  token: IPFTRedeemable;
  animatePlaceholder?: boolean;
  fetchMetadata?: boolean;
}>();

const emit = defineEmits<{
  (event: "clickInterest"): void;
  (event: "redeem"): void;
}>();

const mayRedeem = computed(() => {
  return token.balance?.gt(0);
});

const anyTags = computed(
  () =>
    token.expiredAt ||
    (token.metadata && token.metadata.properties.tags.length > 0) ||
    token.finalized
);

const imageUrl: ComputedRef<URL | undefined> = computed(() => {
  if (!token.metadata?.image) return undefined;
  return urlFromImage(token.metadata.image);
});

const maySetPfp = computed(() => {
  return eth.account.value && token.balance?.gt(0);
});

onMounted(() => {
  if (fetchMetadata) token.fetchIPFSMetadata();
});

eth.onConnect(() => {
  if (fetchMetadata) token.fetchEthData();
});

async function setPfp() {
  if (!maySetPfp.value) throw "Not allowed";

  const tx = await eth.persona.setPfp({
    contract: eth.ipftRedeemable.address,
    id: IPFT.cidToUint256(token.cid),
  });

  console.debug(tx);
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
.overflow-hidden.grid.grid-cols-2.sm_grid-cols-12(
  style="grid-template-rows: min-content auto"
)
  // Image
  router-link(
    :to="'/token/' + token.cid?.toString()"
    custom
    v-slot="{ href, navigate }"
  )
    a.w-full.col-span-3(
      tabindex="-1"
      :href="href"
      @click.exact.prevent="emit('clickInterest')"
    )
      .w-full.h-full.bg-checkerboard.bg-fixed(v-if="imageUrl")
        img.w-full.h-full.object-contain.aspect-square(
          :src="imageUrl.toString()"
        )
      Placeholder.w-full.h-full.aspect-square.object-cover(
        v-else
        :animate="animatePlaceholder"
        :rounded="false"
      )

  // Information
  .flex.flex-col.gap-2.p-3.h-full.col-span-8
    .flex.flex-col.gap-2
      // Basic information
      .flex.flex-col.gap-1
        // Title
        span.flex.flex-wrap.items-center.justify-between.gap-1
          router-link.daisy-link-hover.daisy-link-primary.font-semibold.leading-none(
            v-if="token.metadata?.name"
            :to="'/token/' + token.cid.toString()"
          ) {{ token.metadata.name }}
          Placeholder.h-5.w-48(
            v-else
            :animate="animatePlaceholder"
            @click="emit('clickInterest')"
          )

          .daisy-dropdown.daisy-dropdown-end
            label(tabindex="0")
              EllipsisHorizontalIcon.h-6.w-6.cursor-pointer.transition-transform.duration-100.active_scale-90
            ul.daisy-menu.daisy-dropdown-content.rounded.w-52.bg-base-100.shadow-lg.divide-y.border.rounded-tr-none(
              tabindex="0"
            )
              li(v-if="maySetPfp")
                button(@click="setPfp") 
                  span.text-xl 🖼
                  span Set as PFP

        // Tags
        .flex.flex-wrap.gap-1(v-if="anyTags")
          template(v-if="token.expiredAt")
            .daisy-badge.daisy-badge-outline.daisy-badge-sm 🎟 Redeemable ({{ token.metadata?.properties.unit }})
            .daisy-badge.daisy-badge-outline.daisy-badge-sm 📅 Exp. {{ formatDistance(token.expiredAt, new Date(), { addSuffix: true }) }}

          .daisy-badge.daisy-badge-outline.daisy-badge-sm(
            v-if="token.finalized"
          ) 🗿 Finalized

          span.daisy-badge.daisy-badge-outline.daisy-badge-secondary.daisy-badge-sm(
            v-if="token.metadata"
            v-for="tag in token.metadata.properties.tags"
          ) \#{{ tag }}

      // Description
      // TODO: Hide overflowing text.
      Markdown.leading-tight.flex.flex-col.gap-1.text-justify.text-sm(
        v-if="token.metadata?.description"
        :source="token.metadata.description"
      )
      .flex.flex-col.gap-1(v-else)
        Placeholder.h-4.w-full(:animate="animatePlaceholder")
        Placeholder.h-4.w-full(:animate="animatePlaceholder")
        Placeholder.h-4.w-full(:animate="animatePlaceholder")

      // Mint data
      .leading-tight.text-xs.text-base-content.text-opacity-75.whitespace-normal
        span.align-middle &copy;&nbsp;
        Chip.gap-1.align-middle.text-xs.text-primary(
          v-if="token.author"
          :account="token.author"
          pfp-class="h-5"
        )
        Placeholder.inline-block.h-3.w-8.align-middle(
          v-else
          :animate="animatePlaceholder"
        )

        span.align-middle &nbsp;⋅&nbsp;
        template(v-if="token.claimedAt") 
          span.align-middle claimed&nbsp;
          span.align-middle(:title="token.claimedAt.toLocaleString()") {{ formatDistance(token.claimedAt, new Date(), { addSuffix: true }) }}
        Placeholder.inline-block.h-3.w-8.align-middle(
          v-else
          :animate="animatePlaceholder"
        )

        span.align-middle &nbsp;⋅&nbsp;
        span.align-middle(v-if="token.totalSupply") {{ token.totalSupply }} edition{{ token.totalSupply.gt(1) || token.totalSupply.eq(0) ? "s" : "" }}
        Placeholder.inline-block.h-3.w-8.align-middle(
          v-else
          :animate="animatePlaceholder"
        )

        span.align-middle &nbsp;⋅&nbsp;
        span.align-middle {{ ((token.royalty || 0) * 100).toFixed(1) }}% royalty

  // Redeemable badge
  .app-redeemable-badge.flex.justify-center.items-center.h-full.w-full.border-dashed(
    :class="mayRedeem ? 'may-redeem cursor-pointer' : 'cursor-not-allowed'"
    @click="mayRedeem ? emit('redeem') : null"
  )
    .app-button.uppercase.text-base-content.select-none(
      :class="mayRedeem ? 'text-secondary transition-transform duration-100' : 'text-opacity-25'"
    ) Redeem ({{ token.balance }})
</template>

<style scoped lang="scss">
.app-redeemable-badge {
  &.may-redeem:hover {
    > .app-button {
      @apply text-secondary-focus;
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
