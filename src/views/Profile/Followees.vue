<script setup lang="ts">
import Account from "@/models/Account";
import { onMounted, ref, type ShallowRef } from "vue";
import * as eth from "@/services/eth";
import { Address } from "@/services/eth/Address";
import * as api from "@/services/api";
import PFP from "@/components/shared/PFP.vue";

type Followee = {
  address: Address;
  isFollowing?: boolean;
};

const props = defineProps<{ account: Account }>();
const followees: ShallowRef<Followee[]> = ref([]);

onMounted(() => {
  eth.onConnect(async () => {
    await props.account.resolve();

    followees.value = (
      await api.getSubscriptions(props.account.address.value!)
    ).map((address) => ({
      address,
    }));

    followees.value.forEach(async (followee) => {
      followee.isFollowing = await api.isSubscribed(
        eth.account.value!.address.value!,
        followee.address
      );
    });
  });
});

async function subscribe(to: Followee) {
  await api.subscribe(eth.account.value!.address.value!, to.address);
  to.isFollowing = true;
}

async function unsubscribe(to: Followee) {
  await api.unsubscribe(eth.account.value!.address.value!, to.address);
  to.isFollowing = false;
}
</script>

<template lang="pug">
.w-full.flex.justify-center
  .w-full.max-w-3xl.flex.flex-col.p-4.gap-2
    .daisy-breadcrumbs.text-sm.p-0
      ul
        li.flex.gap-1
          PFP.h-5(:account="account")
          router-link.daisy-link-hover.text-base-content.text-opacity-75.break-all(
            :to="'/' + (account.ensName.value || account.address.value?.toString())"
          ) {{ account.ensName.value || account.address.value?.display }}
        li
          router-link.daisy-link-hover.text-base-content.text-opacity-75.break-all(
            :to="'/' + (account.ensName.value || account.address.value?.toString()) + '/followees'"
          ) Followees

    .bg-base-100.w-full.border.rounded-lg.gap-1.divide-y
      .flex.items-center.gap-1(
        v-if="followees.length > 0"
        v-for="followee in followees"
        :key="followee.address.toString()"
      )
        .flex.justify-between.items-center.w-full
          .flex.gap-1.items-center.p-4
            PFP.h-8(
              :account="Account.getOrCreateFromAddress(followee.address, true)"
            )
            router-link.daisy-link-hover.text-base-content.text-opacity-75.break-all(
              :to="'/' + followee.address.toString()"
            ) {{ followee.address.display }}
          .p-4
            button.daisy-btn.flex.gap-1.daisy-btn-sm(
              v-if="followee.isFollowing === true"
              :disabled="!eth.account.value"
              @click="unsubscribe(followee)"
            ) 🚫 Unfollow
            button.daisy-btn.daisy-btn-secondary.flex.gap-1.daisy-btn-sm(
              v-else-if="followee.isFollowing === false"
              :disabled="!eth.account.value"
              @click="subscribe(followee)"
            )
              span.text-xl 👀
              span Follow
            button.daisy-btn.flex.gap-1.daisy-btn-sm(v-else disabled)
              span.text-xl ⏳
              span Loading

      .p-4.text-base-content.text-opacity-75.flex.justify-center.items-center(
        v-else
      ) No followees yet.
</template>
