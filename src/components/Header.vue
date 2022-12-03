<script setup lang="ts">
/// <reference types="vite-svg-loader" />
import { account, login, logout } from "@/services/eth";
import PFP from "./shared/PFP.vue";
import { Bars3Icon } from "@heroicons/vue/20/solid";
import Logo from "@/assets/cryptalent.svg?component";
</script>

<template lang="pug">
header.w-full.daisy-navbar.bg-base-100.border-b.justify-center.px-0
  .w-full.max-w-3xl.h-full.px-4
    .daisy-navbar-start.flex.items-center.gap-2
      router-link.contents(to="/")
        Logo.inline-block.h-8.transition-transform.duration-100.active_scale-90
      router-link.transition-transform.duration-100.active_scale-90(
        to="/explore"
      ) ✨ Explore
    .daisy-navbar-center
    .daisy-navbar-end.flex.justify-end.items-center.gap-2
      router-link.border.rounded.px-2.py-1.transition-transform.duration-100.active_scale-90(
        v-if="account"
        to="/mint"
      ) 🌱 Mint
      .flex.h-12.items-center.gap-2(v-if="account")
        router-link#profile-link.h-full.flex.items-center.gap-2.transition-transform.duration-100.active_scale-95(
          :to="'/' + account.address.value?.toString()"
        )
          PFP.bg-base-200.cursor-pointer.h-full(
            :account="account"
            mask="squircle"
          )

        .daisy-dropdown.daisy-dropdown-end
          label(tabindex="0")
            Bars3Icon.h-6.cursor-pointer.transition-transform.duration-100.active_scale-90
          ul.daisy-menu.daisy-dropdown-content.rounded.mt-4.w-52.bg-base-100.shadow-lg.divide-y.border.rounded-tr-none(
            tabindex="0"
          )
            li
              router-link(to="/settings")
                span.text-xl ⚙️
                span Settings
            li
              button(@click="logout")
                span.text-xl 🚪
                span Logout
      button.daisy-btn.btn-commit.flex.gap-1(v-else @click="login")
        span.text-xl 🔌
        span Connect
</template>

<style scoped lang="scss">
.router-link-exact-active {
  @apply font-semibold text-primary;
}

#mint-button.router-link-exact-active {
  @apply bg-primary;
}

#profile-link.router-link-exact-active {
  #address {
    @apply font-bold text-primary;
  }

  .pfp {
    @apply bg-primary;
  }
}
</style>
