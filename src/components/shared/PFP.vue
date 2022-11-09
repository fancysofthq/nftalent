<script setup lang="ts">
import type Account from "@/services/eth/Account";
import { computed } from "@vue/reactivity";
import * as jdenticon from "jdenticon";
import { type Ref, ref, onMounted } from "vue";

interface Props {
  account: Account;
  mask?: "squircle";
}

const { account, mask } = defineProps<Props>();

const svgRef: Ref<SVGElement | null> = ref(null);

function updateSvg() {
  jdenticon.updateSvg(svgRef.value!, account.toString());
}

const maskClass = computed(() => {
  if (mask === "squircle") {
    return "daisy-mask daisy-mask-squircle";
  }

  return "";
});

onMounted(updateSvg);
</script>

<template lang="pug">
svg(ref="svgRef" :class="maskClass")
</template>
