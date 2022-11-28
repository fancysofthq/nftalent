<script setup lang="ts">
import { ref, onUnmounted, type ShallowRef } from "vue";
import { uint256ToCID } from "@/services/eth/contract/IPNFT";
import IPNFT from "@/models/IPNFT";
import Entry from "./FeedEntry.vue";
import * as eth from "@/services/eth";
import * as api from "@/services/api";
import Explore from "../Explore.vue";

type Entry = {
  event: EventWrapper;
  token: IPNFT;
};

const emit = defineEmits<{
  (event: "entryClick", ipnft: IPNFT): void;
  (event: "redeem", ipnft: IPNFT): void;
}>();

const subscriptions: ShallowRef<Address[]> = ref([]);

const entries: ShallowRef<Entry[]> = ref([]);
let cancelFeedSubscription = false;

eth.onConnect(async () => {
  subscriptions.value.push(eth.account.value!.address.value!);

  subscriptions.value.push(
    ...(await api.getSubscriptions(eth.account.value!.address.value!))
  );

  subscribeToFeed(
    subscriptions.value,
    (_entries) => {
      if (cancelFeedSubscription) return;

      entries.value.unshift(
        ..._entries.map((e) => ({
          event: e,
          token: IPNFT.getOrCreate(uint256ToCID(e.tokenId)),
        }))
      );
    },
    1000,
    () => cancelFeedSubscription
  );
});

onUnmounted(() => {
  cancelFeedSubscription = true;
});
</script>

<template lang="pug">
Entry(
  v-if="entries.length"
  v-for="entry in entries"
  :event="entry.event"
  :token="entry.token"
  style="grid-template-columns: 7rem auto"
  @entry-click="emit('entryClick', entry.token)"
  @redeem="emit('redeem', entry.token)"
)
Explore.border.rounded-lg(v-else)
</template>

<script lang="ts">
import edb, {
  type Event,
  type List,
  type Purchase,
} from "@/services/eth/event-db";
import { timeout } from "@/util";
import { BigNumber } from "ethers";
import { Address } from "@/services/eth/Address";

export enum EventKind {
  List,
  Purchase,
}

export class EventWrapper {
  constructor(public readonly kind: EventKind, private readonly event: Event) {}

  get blockNumber(): number {
    return this.event.blockNumber;
  }

  get logIndex(): number {
    return this.event.logIndex;
  }

  get isList(): boolean {
    return this.kind == EventKind.List;
  }

  get asList(): List {
    if (!this.isList) throw new Error("Invalid event kind");
    return this.event as List;
  }

  get isPurchase(): boolean {
    return this.kind == EventKind.Purchase;
  }

  get asPurchase(): Purchase {
    if (!this.isPurchase) throw new Error("Invalid event kind");
    return this.event as Purchase;
  }

  get tokenId(): BigNumber {
    switch (this.kind) {
      case EventKind.List:
        return BigNumber.from(this.asList.token.id);
      case EventKind.Purchase:
        return BigNumber.from(this.asPurchase.token.id);
    }
  }
}

async function subscribeToFeed(
  filter: Address[],
  callback: (events: EventWrapper[]) => void,
  pollInterval: number,
  pollCancelled: () => boolean
) {
  let listBlock = 0;
  let purchaseBlock = 0;
  const filterStrings = filter.map((a) => a.toString());

  while (!pollCancelled()) {
    const promises = [];
    const events: EventWrapper[] = [];

    // List
    promises.push(
      edb.iterateEventsIndex(
        "MetaStore.List",
        "blockNumber",
        IDBKeyRange.bound(
          [eth.app.toString(), listBlock],
          [eth.app.toString(), Number.MAX_SAFE_INTEGER]
        ),
        "next",
        (e) => {
          listBlock = e.blockNumber + 1;

          if (filterStrings.includes(e.seller)) {
            events.push(new EventWrapper(EventKind.List, e));
          }
        }
      )
    );

    // // Purchase
    // promises.push(
    //   edb.iterateEventsIndex(
    //     "MetaStore.Purchase",
    //     "blockNumber",
    //     IDBKeyRange.bound(purchaseBlock, Number.MAX_SAFE_INTEGER),
    //     "next",
    //     (e) => {
    //       purchaseBlock = e.blockNumber + 1;
    //       events.push(new EventWrapper(EventKind.Purchase, e));
    //     }
    //   )
    // );

    await Promise.all(promises);

    callback(
      events.sort((a, b) =>
        b.blockNumber == a.blockNumber
          ? b.logIndex - a.logIndex
          : b.blockNumber - a.blockNumber
      )
    );

    await timeout(pollInterval);
  }
}
</script>
