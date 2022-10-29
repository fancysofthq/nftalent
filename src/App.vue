<script setup lang="ts">
import { onMounted } from "vue";
import * as eth from "@/service/eth";
import HeaderVue from "./components/Header.vue";
import FooterVue from "./components/Footer.vue";

onMounted(() => {
  const provider = window.localStorage.getItem(eth.PROVIDER_KEY);
  if (provider) eth.login();
});
</script>

<template lang="pug">
HeaderVue
router-view
FooterVue
</template>

<style lang="scss">
html {
  font-size: 16px;
}

body {
  font-family: "Nunito", sans-serif;
  @apply bg-base-100;
}
</style>
