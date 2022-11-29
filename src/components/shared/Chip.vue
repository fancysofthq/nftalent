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
router-link.daisy-link-hover.inline-flex.items-center(
  :to="'/' + account.address.value?.toString()"
) 
  PFP(:account="account" :class="pfpClass")
  span {{ account.ensName.value ? account.ensName.value : account.address.value?.display }}
</template>

<style scoped lang="scss"></style>
