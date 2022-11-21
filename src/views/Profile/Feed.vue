<script setup lang="ts">
import { onMounted, type Ref, ref, onUnmounted } from "vue";
import Entry from "./FeedEntry.vue";
import IPNFTModel, { getOrCreate as getOrCreateIPNFT } from "@/models/IPNFT";
import { uint256ToCID } from "@/services/eth/contract/IPNFT";
import Account from "@/services/eth/Account";

type Entry = {
  event: EventWrapper;
  token: IPNFTModel;
};

const props = defineProps<{ account: Account }>();
const entries: Ref<Entry[]> = ref([]);
let cancelFeed = false;

onMounted(() => {
  subscribeToFeed(
    props.account,
    (_entries) => {
      if (cancelFeed) return;

      entries.value.unshift(
        ..._entries.map((e) => ({
          event: e,
          token: getOrCreateIPNFT(uint256ToCID(e.tokenId)),
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
Entry.p-4(
  v-if="entries.length"
  v-for="entry in entries"
  :event="entry.event"
  :token="entry.token"
  style="grid-template-columns: 7rem auto"
)
.text-base-content.text-center(v-else) Empty feed
</template>

<script lang="ts">
import edb, {
  type IERC721Transfer,
  type IERC1155Transfer,
  type Event,
  type List,
  type Purchase,
} from "@/services/eth/event-db";
import { timeout } from "@/util";
import { BigNumber } from "ethers";
import IPNFT1155 from "@/services/eth/contract/IPNFT1155";

export enum EventKind {
  Mint, // IERC721Transfer
  Redeem, // IERC1155Transfer
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

  get isMint(): boolean {
    return this.kind == EventKind.Mint;
  }

  get asMint(): IERC721Transfer {
    if (!this.isMint) throw new Error("Not a mint event");
    return this.event as IERC721Transfer;
  }

  get isReedem(): boolean {
    return this.kind == EventKind.Redeem;
  }

  get asRedeem(): IERC1155Transfer {
    if (!this.isReedem) throw new Error("Not a redeem event");
    return this.event as IERC1155Transfer;
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
      case EventKind.Mint:
        return BigNumber.from(this.asMint.tokenId);
      case EventKind.Redeem:
        return BigNumber.from(this.asRedeem.id);
      case EventKind.List:
        return BigNumber.from(this.asList.token.id);
      case EventKind.Purchase:
        return BigNumber.from(this.asPurchase.token.id);
    }
  }
}

async function subscribeToFeed(
  filter: Account,
  callback: (events: EventWrapper[]) => void,
  pollInterval: number,
  pollCancelled: () => boolean
) {
  let mintBlock = 0;
  let redeemBlock = 0;
  let listBlock = 0;
  let purchaseBlock = 0;

  while (!pollCancelled()) {
    const promises = [];
    const events: EventWrapper[] = [];

    // // IPNFT721 Mint.
    // promises.push(
    //   edb.iterateEventsIndex(
    //     "IPNFT721.Transfer", // TODO: Track `IPNFT721.Mint` instead
    //     "from-to-blockNumber",
    //     IDBKeyRange.bound(
    //       [AddressZero, filter.toString(), mintBlock],
    //       [AddressZero, filter.toString(), Number.MAX_SAFE_INTEGER]
    //     ),
    //     "next",
    //     (e) => {
    //       mintBlock = e.blockNumber + 1;
    //       events.push(new EventWrapper(EventKind.Mint, e));
    //     }
    //   )
    // );

    // IPNFT1155 Redeem (transfer to the contract address).
    promises.push(
      edb.iterateEventsIndex(
        "IPNFT1155.Transfer",
        "from-to-blockNumber",
        IDBKeyRange.bound(
          [filter.toString(), IPNFT1155.account.address, redeemBlock],
          [
            filter.toString(),
            IPNFT1155.account.address,
            Number.MAX_SAFE_INTEGER,
          ]
        ),
        "next",
        (e) => {
          redeemBlock = e.blockNumber + 1;
          events.push(new EventWrapper(EventKind.Redeem, e));
        }
      )
    );

    // List.
    promises.push(
      edb.iterateEventsIndex(
        "MetaStore.List",
        "seller-blockNumber",
        IDBKeyRange.bound(
          [filter.toString(), listBlock],
          [filter.toString(), Number.MAX_SAFE_INTEGER]
        ),
        "next",
        (e) => {
          listBlock = e.blockNumber + 1;
          events.push(new EventWrapper(EventKind.List, e));
        }
      )
    );

    // Purchase.
    promises.push(
      edb.iterateEventsIndex(
        "MetaStore.Purchase",
        "buyer-blockNumber",
        IDBKeyRange.bound(
          [filter.toString(), purchaseBlock],
          [filter.toString(), Number.MAX_SAFE_INTEGER]
        ),
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
