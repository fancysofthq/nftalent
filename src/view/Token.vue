<script setup lang="ts">
import ERC1155Token from "@/service/eth/contract/ERC1155Token";
import { getToken } from "@/service/db";
import { computed } from "vue";
import TokenListing from "@/components/TokenListing.vue";
import TokenHistory from "@/components/TokenHistory.vue";

const props = defineProps<{ token: ERC1155Token }>();
const token = computed(() => getToken(props.token.id.toNumber()));
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.font-bold.text-lg 
      span 🎫 Token
      span.text-gray-500.text-sm.ml-2 /{{ props.token.id._hex }}
    TokenListing.p-4.border(:token="token")

    h2.font-bold.text-lg 📜 History
    .border.flex-col.gap-2.divide-y
      TokenHistory(:token="props.token")
</template>

<style scoped lang="scss"></style>
