<script setup lang="ts">
import { Listing, Purchase } from "@/service/db";
import ERC1155Token from "@/service/eth/contract/ERC1155Token";
import * as db from "@/service/db";
import Chip from "./Chip.vue";
import { notNull } from "@/util";

const props = defineProps<{ token: ERC1155Token }>();

function actionEmoji(action: Purchase | Listing) {
  if (action instanceof Purchase) {
    return "💳";
  } else if (action instanceof Listing) {
    return "✨";
  } else {
    return "🤷‍♂️";
  }
}

function actionName(event: Listing | Purchase) {
  if (event instanceof Listing) {
    return "listed";
  } else if (event instanceof Purchase) {
    return "purchased";
  } else {
    return "did what";
  }
}

const events = db.events.filter((e) =>
  e.tokenWrapper.token.equals(props.token)
);
</script>

<template lang="pug">
.flex.justify-between(v-for="event in events")
  template(v-if="event instanceof Listing && true")
    .inline-flex.items-center.gap-1.p-4
      Chip.h-5.bg-base-200(
        :account="notNull(event.tokenWrapper.minter)"
        pfp-class="bg-base-100"
      )
      span {{ actionEmoji(event) }}
      span {{ actionName(event) }}

  template(v-if="event instanceof Purchase && true")
    .inline-flex.items-center.gap-1.p-4
      Chip.h-5.bg-base-200(
        :account="notNull(event.tokenWrapper.minter)"
        pfp-class="bg-base-100"
      )
      span {{ actionEmoji(event) }}
      span {{ actionName(event) }}

  .p-4 {{ event.timestamp.toLocaleString() }}
</template>

<style scoped lang="scss"></style>
