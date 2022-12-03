<script setup lang="ts">
import Account from "@/models/Account";
import { onMounted, ref, type ShallowRef } from "vue";
import * as eth from "@/services/eth";
import { Address } from "@/services/eth/Address";
import * as api from "@/services/api";
import PFP from "@/components/shared/PFP.vue";

type Follower = {
  address: Address;
  isFollowing?: boolean;
};

const props = defineProps<{ account: Account }>();
const followers: ShallowRef<Follower[]> = ref([]);

onMounted(() => {
  eth.onConnect(async () => {
    await props.account.resolve();

    followers.value = (
      await api.getSubscribers(props.account.address.value!)
    ).map((address) => ({
      address,
    }));

    followers.value.forEach(async (follower) => {
      follower.isFollowing = await api.isSubscribed(
        eth.account.value!.address.value!,
        follower.address
      );
    });
  });
});

async function subscribe(to: Address) {
  await api.subscribe(eth.account.value!.address.value!, to);
}

async function unsubscribe(to: Address) {
  await api.unsubscribe(eth.account.value!.address.value!, to);
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
            :to="'/' + (account.ensName.value || account.address.value?.toString()) + '/followers'"
          ) Followers

    .bg-base-100.w-full.border.rounded-lg.gap-1.divide-y
      .flex.items-center.gap-1(
        v-if="followers.length > 0"
        v-for="follower in followers"
        :key="follower.address.toString()"
      )
        .flex.justify-between.items-center.w-full
          .flex.gap-1.items-center.p-4
            PFP.h-8(
              :account="Account.getOrCreateFromAddress(follower.address, true)"
            )
            router-link.daisy-link-hover.text-base-content.text-opacity-75.break-all(
              :to="'/' + follower.address.toString()"
            ) {{ follower.address.display }}
          .p-4
            button.daisy-btn.flex.gap-1.daisy-btn-sm(
              v-if="follower.isFollowing === true"
              :disabled="!eth.account.value"
              @click="unsubscribe(follower.address)"
            ) 🚫 Unfollow
            button.daisy-btn.daisy-btn-secondary.flex.gap-1.daisy-btn-sm(
              v-else-if="follower.isFollowing === false"
              :disabled="!eth.account.value"
              @click="subscribe(follower.address)"
            )
              span.text-xl 👀
              span Follow
            button.daisy-btn.flex.gap-1.daisy-btn-sm(v-else disabled)
              span.text-xl ⏳
              span Loading

      .p-4.text-base-content.text-opacity-75.flex.justify-center.items-center(
        v-else
      ) No followers yet.
</template>
