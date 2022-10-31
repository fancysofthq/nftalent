<script setup lang="ts">
import ERC1155Token from "@/service/eth/contract/ERC1155Token";
import { OnClickOutside } from "@vueuse/components";

const props = defineProps<{ token: ERC1155Token }>();
const emit = defineEmits(["close"]);
</script>

<template lang="pug">
.fixed.top-0.w-full.bg-black.bg-opacity-25.z-10.h-screen.flex.justify-center.items-center
  OnClickOutside.transition-opacity.w-full.max-w-4xl.bg-base-100.rounded-lg(
    @trigger="emit('close')"
  )
    h1 Purchase
</template>

<style scoped lang="scss"></style>
