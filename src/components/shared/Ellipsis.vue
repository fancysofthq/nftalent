<script setup lang="ts">
import { timeout } from "@/util";
import { onMounted, ref } from "vue";

const text = ref("...");

onMounted(async () => {
  let length = 0;

  while (true) {
    await timeout(200);
    length = (length + 1) % 4;
    text.value = ".".repeat(length);
  }
});
</script>

<template lang="pug">
span {{ text }}
</template>

<style scoped lang="scss"></style>
