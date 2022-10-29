<script setup lang="ts">
import { ERC1155TokenWrapper } from "@/service/db";
import { notNull } from "@/util";
import TokenPreview from "./TokenPreview.vue";

const props = defineProps<{
  token: ERC1155TokenWrapper;
}>();
</script>

<template lang="pug">
.grid.p-4.gap-3(style="grid-template-columns: 10rem auto")
  router-link.font-bold.text-primary.daisy-link-hover(
    :to="'/token/' + token.token.id._hex"
  )
    img.rounded-lg.aspect-square.object-cover.w-full(
      :src="notNull(token.token.metadata).image"
    )
  TokenPreview(:token="token" :small="false")
    .flex.justify-between.mt-1.p-2.border
      .flex.gap-2.items-center
        button.daisy-btn.daisy-btn-primary.daisy-btn-sm
          span.text-xl 💳
          span Purchase!
        span.text-base-content.text-opacity-75.text-sm
          span.font-semibold 10
          span.ml-1 in stock
      .flex.gap-2.items-center
        span.text-base-content.text-opacity-75.text-sm
          span You have
          span.font-semibold.ml-1 {{ token.balance }}
        button.daisy-btn.daisy-btn-secondary.daisy-btn-sm(
          :disabled="notNull(token.balance).eq(0)"
        ) 
          span.text-xl 🎟
          span Redeem!
</template>

<style scoped lang="scss"></style>
