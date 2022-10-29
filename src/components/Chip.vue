<script setup lang="ts">
import Account from "@/service/eth/Account";
import PFP from "./PFP.vue";

interface Props {
  account: Account;
  pfpClass?: string;
}

const { account, pfpClass } = defineProps<Props>();
</script>

<template lang="pug">
router-link.inline-flex.items-center.gap-1.daisy-link-hover.border.pr-1.transition-transform.duration-100.active_scale-95(
  :to="'/' + account"
)
  PFP.h-full.object-contain.rounded-l(:account="account" :class="pfpClass")
  span.lowercase {{ account.trimmed }}
</template>

<style scoped lang="scss"></style>
