<script setup lang="ts"></script>

<template lang="pug">
footer.border-t.flex.justify-center.py-8
  .daisy-footer.max-w-3xl.px-4
    div
      img.h-16(src="/fancysoft.svg")
      p 
        a.daisy-link.daisy-link-hover(
          href="https://twitter.com/fancysoft"
          target="_blank"
        ) Fancy Software
        span &nbsp;© 2022
        br
        i.text-base-content.text-opacity-75 Thats's what we do.
    div
      span.daisy-footer-title Services
      a.daisy-link.daisy-link-hover Web3 development
    div
      span.daisy-footer-title Company
      a.daisy-link.daisy-link-hover About us
      a.daisy-link.daisy-link-hover Contact
      a.daisy-link.daisy-link-hover Jobs
      a.daisy-link.daisy-link-hover Press kit
    div
      span.daisy-footer-title Legal
      a.daisy-link.daisy-link-hover Terms of service
      a.daisy-link.daisy-link-hover Privacy policy
      a.daisy-link.daisy-link-hover Cookie policy
</template>

<style scoped lang="scss"></style>
