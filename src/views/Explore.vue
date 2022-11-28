<script lang="ts">
export class Collection {
  readonly accounts: Account[];

  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly desc: string,
    addresses: Address[]
  ) {
    this.accounts = addresses.map((a) =>
      Account.getOrCreateFromAddress(a, true)
    );
  }
}
</script>

<script setup lang="ts">
import Account from "@/models/Account";
import PFP from "@/components/shared/PFP.vue";
import { Address } from "@/services/eth/Address";
import { onMounted, ref, type ShallowRef } from "vue";
import * as api from "@/services/api";

const collections: ShallowRef<Collection[]> = ref([]);

onMounted(async () => {
  collections.value = await (
    await api.getCollections()
  ).map((c) => new Collection(c.id, c.title, c.desc, c.addresses));
});
</script>

<template lang="pug">
.w-full.flex.justify-center.p-4
  .w-full.max-w-3xl.flex.flex-col.gap-2
    h2.flex.items-baseline.gap-2
      span.font-bold.text-lg ✨ Explore
      span.text-base-content.text-opacity-75.text-sm Find new accounts to follow

    .flex.flex-col.gap-2.border.rounded-2xl.p-4(
      v-for="collection in collections"
    )
      .flex.flex-col
        h3.font-semibold.leading-none.text-primary {{ collection.title }}
        p.text-sm {{ collection.desc }}
      .flex.gap-3.flex-wrap
        router-link.flex.flex-col.gap-1.items-center(
          v-for="account in collection.accounts"
          :to="'/' + account.address.value?.toString()"
        )
          PFP.bg-base-200(:account="account")
          code.daisy-badge.daisy-badge-primary.daisy-badge-sm(
            v-if="account.ensName.value"
          ) {{ account.ensName.value }}
          code.daisy-badge.daisy-badge-sm(v-else="account.address.value") {{ account.address.value?.display }}
</template>
