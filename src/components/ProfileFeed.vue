<script lang="ts">
import edb, {
  type Event,
  type List,
  type Purchase,
  type Redeem,
} from "@/services/eth/event-db";
import { timeout } from "@/util";
import Account from "@/services/eth/Account";
import { BigNumber } from "ethers";

export enum EventKind {
  Redeem,
  List,
  Purchase,
}

export class EventBox {
  constructor(public readonly kind: EventKind, private readonly event: Event) {}

  get blockNumber(): number {
    return this.event.blockNumber;
  }

  get logIndex(): number {
    return this.event.logIndex;
  }

  get isRedeem(): boolean {
    return this.kind == EventKind.Redeem;
  }

  get asRedeem(): Redeem {
    if (!this.isRedeem) throw new Error("Not a redeem event");
    return this.event as Redeem;
  }

  get isList(): boolean {
    return this.kind == EventKind.List;
  }

  get asList(): List {
    if (!this.isList) throw new Error("Not a list event");
    return this.event as List;
  }

  get isPurchase(): boolean {
    return this.kind == EventKind.Purchase;
  }

  get asPurchase(): Purchase {
    if (!this.isPurchase) throw new Error("Not a purchase event");
    return this.event as Purchase;
  }

  get tokenId(): BigNumber {
    switch (this.kind) {
      case EventKind.Redeem:
        return BigNumber.from(this.asRedeem.tokenId);
      case EventKind.List:
        return BigNumber.from(this.asList.token.id);

      case EventKind.Purchase:
        return BigNumber.from(this.asPurchase.token.id);
    }
  }
}

async function accountFeed(
  filter: Account,
  callback: (events: EventBox[]) => void,
  pollInterval: number,
  pollCancelled: () => boolean
) {
  let redeemBlock = 0;
  let listBlock = 0;
  let purchaseBlock = 0;

  while (!pollCancelled()) {
    const promises = [];
    const events: EventBox[] = [];

    // Redeem redeemer
    promises.push(
      edb.iterateEventsIndex(
        "ERC1876Redeemable.Redeem",
        "redeemer-blockNumber",
        IDBKeyRange.bound(
          [filter.toString(), redeemBlock],
          [filter.toString(), Number.MAX_SAFE_INTEGER]
        ),
        "next",
        (e) => {
          redeemBlock = e.blockNumber + 1;
          events.push(new EventBox(EventKind.Redeem, e));
        }
      )
    );

    // List
    promises.push(
      edb.iterateEventsIndex(
        "NFTSimpleListing.List",
        "seller-blockNumber",
        IDBKeyRange.bound(
          [filter.toString(), listBlock],
          [filter.toString(), Number.MAX_SAFE_INTEGER]
        ),
        "next",
        (e) => {
          listBlock = e.blockNumber + 1;
          events.push(new EventBox(EventKind.List, e));
        }
      )
    );

    // Purchase
    promises.push(
      edb.iterateEventsIndex(
        "NFTSimpleListing.Purchase",
        "buyer-blockNumber",
        IDBKeyRange.bound(
          [filter.toString(), purchaseBlock],
          [filter.toString(), Number.MAX_SAFE_INTEGER]
        ),
        "next",
        (e) => {
          purchaseBlock = e.blockNumber + 1;
          events.push(new EventBox(EventKind.Purchase, e));
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

<script setup lang="ts">
import { onMounted, type Ref, ref, onUnmounted } from "vue";
import EntryVue from "./ProfileFeedEntry.vue";
import IPNFTSuper, { getOrCreate } from "@/models/IPNFTSuper";

import { uint256ToCID } from "@/services/eth/contract/IPNFT";

type Entry = {
  event: EventBox;
  token: IPNFTSuper;
};

const props = defineProps<{ account: Account }>();
const feed: Ref<Entry[]> = ref([]);
let cancelFeed = false;

onMounted(() => {
  accountFeed(
    props.account,
    (entries) => {
      if (cancelFeed) return;

      feed.value.unshift(
        ...entries.map((e) => ({
          event: e,
          token: getOrCreate(uint256ToCID(e.tokenId)),
        }))
      );
    },
    1000,
    () => cancelFeed
  );
});

onUnmounted(() => {
  cancelFeed = true;
});
</script>

<template lang="pug">
EntryVue.p-4(
  v-if="feed.length"
  v-for="entry in feed"
  :event="entry.event"
  :token="entry.token"
  style="grid-template-columns: 7rem auto"
)
.text-base-content.text-center(v-else) Empty feed
</template>

<style scoped lang="scss"></style>
