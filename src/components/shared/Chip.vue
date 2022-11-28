<script setup lang="ts">
import Account from "@/models/Account";
import { onMounted } from "vue";
import PFP from "./PFP.vue";

interface Props {
  account: Account;
  pfpClass?: string;
}

const { account, pfpClass } = defineProps<Props>();

onMounted(() => account.resolve());
</script>

<template lang="pug">
router-link.inline-flex.items-center.gap-1.daisy-link-hover.border.rounded-sm.pr-1.transition-transform.duration-100.active_scale-95(
  :to="'/' + account.address.value?.toString()"
)
  PFP.h-full.object-contain.rounded-l(:account="account" :class="pfpClass")
  span.lowercase {{ account.address.value?.display }}
</template>

<style scoped lang="scss"></style>
