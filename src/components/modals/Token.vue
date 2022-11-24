<script setup lang="ts">
import { OnClickOutside } from "@vueuse/components";
import IPNFT from "@/models/IPNFT";
import View from "@/views/Token.vue";

const props = defineProps<{ ipnft: IPNFT }>();
const emit = defineEmits(["close"]);
</script>

<template lang="pug">
.fixed.left-0.top-0.w-full.bg-black.bg-opacity-25.z-20.h-screen.flex.justify-center.backdrop-blur.p-4
  OnClickOutside.transition-opacity.w-full.max-w-2xl.bg-base-100.rounded-lg.shadow-lg(
    @trigger="emit('close')"
  )
    .flex.flex-col.divide-y.h-full
      .font-semibold.text-xl.px-4.py-4.flex.justify-between.items-center
        h1 Token
        button(@click.stop="emit('close')") ❌
      .overflow-y-scroll
        View(:ipnft="ipnft")
</template>
