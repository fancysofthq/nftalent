<script setup lang="ts">
/// <reference types="vite-svg-loader" />
import { account, login, logout } from "@/services/eth";
import PFP from "./shared/PFP.vue";
import Bars3Icon from "@/assets/bars-2.svg?component";
</script>

<template lang="pug">
header.w-full.daisy-navbar.bg-base-100.border-b.justify-center
  .w-full.max-w-3xl.px-2
    .daisy-navbar-start 
      router-link.transition-transform.duration-100.active_scale-90.block.w-min(
        to="/"
      ) 
        span.font-bold.text-lg NFTime
    .daisy-navbar-center
    .daisy-navbar-end.flex.justify-end
      .flex.h-12.items-center.gap-2(v-if="account") 
        router-link.bbtn(to="/mint") 
          span ✨
        router-link.h-full.flex.items-center.gap-2.transition-transform.duration-100.active_scale-95(
          :to="'/' + account.toString()"
        )
          span.text-sm.lowercase {{ account.trimmed }}
          PFP.bg-base-200.cursor-pointer.h-full(
            :account="account"
            mask="squircle"
          ) 

        .daisy-dropdown.daisy-dropdown-end
          Bars3Icon.h-6.w-6.cursor-pointer.transition-transform.duration-100.active_scale-90(
            tabindex="0"
          )
          ul.daisy-menu.daisy-dropdown-content.rounded.mt-4.w-52.bg-base-100.shadow-lg.divide-y(
            tabindex="0"
          )
            li
              router-link(to="/settings") ⚙️ Settings
            li
              button(@click="logout") 🚪 Logout
      button.daisy-btn.daisy-btn-primary(v-else @click="login") 
        span.text-lg 🦊
        span Connect
</template>

<style scoped lang="scss"></style>
