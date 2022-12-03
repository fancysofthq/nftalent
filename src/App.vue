<script setup lang="ts">
import { onMounted } from "vue";
import * as eth from "@/services/eth";
import HeaderVue from "./components/Header.vue";
import FooterVue from "./components/Footer.vue";
import nProgress from "nprogress";
import { useRouter } from "vue-router";

nProgress.configure({ showSpinner: false });

onMounted(() => {
  eth.tryLogin();

  useRouter().afterEach(() => {
    nProgress.done();
  });

  useRouter().beforeEach(() => {
    nProgress.start();
  });
});
</script>

<template lang="pug">
HeaderVue
router-view(:key="$route.path")
FooterVue
</template>

<style lang="scss">
html {
  font-size: 16px;
}

body {
  @apply bg-base-100 font-sans;
}
</style>
