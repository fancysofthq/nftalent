<script setup lang="ts">
import { onMounted, type Ref, ref, onUnmounted } from "vue";
import { uint256ToCID } from "@/services/eth/contract/IPNFT";
import IPNFT, { getOrCreate } from "@/models/IPNFT";
import Entry from "./FeedEntry.vue";

type Entry = {
  event: EventWrapper;
  token: IPNFT;
};

const entries: Ref<Entry[]> = ref([]);
let cancel = false;

onMounted(async () => {
  subscribeToFeed(
    (_entries) => {
      if (cancel) return;
      entries.value.unshift(
        ..._entries.map((e) => ({
          event: e,
          token: getOrCreate(uint256ToCID(e.tokenId)),
        }))
      );
    },
    1000,
    () => cancel
  );
});

onUnmounted(() => {
  cancel = true;
});
</script>

<template lang="pug">
Entry.p-4(
  v-if="entries.length"
  v-for="entry in entries"
  :event="entry.event"
  :token="entry.token"
  style="grid-template-columns: 7rem auto"
)
.p-4.text-base-content.text-center(v-else) Empty feed
</template>

<script lang="ts">
import edb, {
  type Event,
  type List,
  type Purchase,
} from "@/services/eth/event-db";
import { timeout } from "@/util";
import { BigNumber } from "ethers";

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
  callback: (events: EventWrapper[]) => void,
  pollInterval: number,
  pollCancelled: () => boolean
) {
  let listBlock = 0;
  let purchaseBlock = 0;

  while (!pollCancelled()) {
    const promises = [];
    const events: EventWrapper[] = [];

    // List
    promises.push(
      edb.iterateEventsIndex(
        "MetaStore.List",
        "blockNumber",
        IDBKeyRange.bound(listBlock, Number.MAX_SAFE_INTEGER),
        "next",
        (e) => {
          listBlock = e.blockNumber + 1;
          events.push(new EventWrapper(EventKind.List, e));
        }
      )
    );

    // Purchase
    promises.push(
      edb.iterateEventsIndex(
        "MetaStore.Purchase",
        "blockNumber",
        IDBKeyRange.bound(purchaseBlock, Number.MAX_SAFE_INTEGER),
        "next",
        (e) => {
          purchaseBlock = e.blockNumber + 1;
          events.push(new EventWrapper(EventKind.Purchase, e));
        }
      )
    );

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
