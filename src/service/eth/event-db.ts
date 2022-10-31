import { AddressZero } from "@ethersproject/constants";
import { Contract, Event, EventFilter } from "ethers";
import {
  openDB,
  DBSchema,
  StoreNames,
  StoreValue,
  IndexNames,
  IndexKey,
} from "idb";
import Account from "./Account";
import ERC1155Token from "./contract/ERC1155Token";
import { BurnEvent, TransferEvent } from "./contract/NFTime";
import { ListEvent, PurchaseEvent } from "./contract/NFTSimpleListing";

interface EventDB extends DBSchema {
  latestFetchedEventBlock: {
    key: string;
    value: number;
  };

  "NFTime.Transfer": {
    key: [number, number, number]; // blockNumber + logIndex + (token index)
    value: TransferEvent;
    indexes: {
      from: string;
      to: string;
      id: string;
      fromId: [string, string];
      toId: [string, string];
      fromTo: [string, string];
    };
  };

  "NFTSimpleListing.List": {
    key: [number, number]; // blockNumber + logIndex
    value: ListEvent;
    indexes: { listingId: string; tokenId: string; seller: string };
  };

  "NFTSimpleListing.Purchase": {
    key: [number, number]; // blockNumber + logIndex
    value: PurchaseEvent;
    indexes: { buyer: string; tokenId: string; listingId: string };
  };
}
// [1]: It should have been `BigInt` instead,
// but `BigInt` can't be used for indexing.

const db = await openDB<EventDB>("eth_event_db", 1, {
  upgrade(db) {
    const e1 = db.createObjectStore("NFTime.Transfer", {
      keyPath: ["blockNumber", "logIndex", "subIndex"],
    });

    e1.createIndex("from", "from");
    e1.createIndex("to", "to");
    e1.createIndex("id", "token.id");
    e1.createIndex("fromId", ["from", "token.id"]);
    e1.createIndex("toId", ["to", "token.id"]);
    e1.createIndex("fromTo", ["from", "to"]);

    const e2 = db.createObjectStore("NFTSimpleListing.List", {
      keyPath: ["blockNumber", "logIndex"],
    });

    e2.createIndex("listingId", "listingId");
    e2.createIndex("tokenId", "token.id");
    e2.createIndex("seller", "seller");

    const e3 = db.createObjectStore("NFTSimpleListing.Purchase", {
      keyPath: ["blockNumber", "logIndex"],
    });

    e3.createIndex("buyer", "buyer");
    e3.createIndex("tokenId", "token.id");
    e3.createIndex("listingId", "listingId");

    const latestFetchedEventBlock = db.createObjectStore(
      "latestFetchedEventBlock"
    );
  },
});

/**
 * Put multiple items in one transaction.
 * Replaces any item with the same key.
 */
export async function putBatch<Store extends StoreNames<EventDB>>(
  store: Store,
  items: StoreValue<EventDB, Store>[]
) {
  console.debug("EventDB: Put batch:", store, items);
  const tx = db.transaction(store, "readwrite");
  await Promise.all([...items.map((obj) => tx.store.put(obj)), tx.done]);
}

const SYNC_BLOCK_BATCH_SIZE = 10;

/**
 * Synchronize events.
 *
 * @param contract
 * @param eventStore
 * @param filter
 * @param eventCallback must be synchronous
 * @param finalBlock the block to sync until (including)
 */
export async function syncEvents<Store extends StoreNames<EventDB>>(
  eventStore: Store,
  contract: Contract,
  filter: EventFilter,
  eventCallback: (
    value: Event,
    index: number,
    array: Event[]
  ) => StoreValue<EventDB, Store>,
  finalBlock: number
) {
  let fromBlock =
    (await db.get("latestFetchedEventBlock", eventStore)) ||
    parseInt(import.meta.env.VITE_ETH_GENESIS_BLOCK) ||
    0;

  // console.debug(fromBlock);

  while (fromBlock < finalBlock) {
    const toBlock = Math.min(finalBlock, fromBlock + SYNC_BLOCK_BATCH_SIZE);
    // console.debug(fromBlock, toBlock);

    const rawEvents = await contract.queryFilter(filter, fromBlock, toBlock);
    console.debug(rawEvents);
    const mappedEvents = rawEvents.flatMap(eventCallback);
    console.debug(mappedEvents);

    if (mappedEvents.length > 0) await putBatch(eventStore, mappedEvents);
    await db.put("latestFetchedEventBlock", toBlock, eventStore);

    fromBlock = toBlock + 1;
  }
}

/**
 * Iterate events over primary key.
 *
 * @param eventStore
 * @param direction
 * @param callback
 */
export async function iterateEvents<Store extends StoreNames<EventDB>>(
  eventStore: Store,
  direction: IDBCursorDirection | undefined,
  callback: (value: StoreValue<EventDB, Store>) => void
): Promise<void> {
  const tx = db.transaction(eventStore);
  const store = tx.objectStore(eventStore);
  let cursor = await store.openCursor(undefined, direction);

  while (cursor) {
    callback(cursor.value);
    cursor = await cursor.continue();
  }
}

export async function iterateEventIndex<
  Store extends StoreNames<EventDB>,
  IndexName extends IndexNames<EventDB, Store>
>(
  eventStore: Store,
  index: IndexName,
  query: IndexKey<EventDB, Store, IndexName> | IDBKeyRange | null,
  direction: IDBCursorDirection | undefined,
  callback: (value: StoreValue<EventDB, Store>) => void
): Promise<void> {
  const tx = db.transaction(eventStore);
  const _index = tx.objectStore(eventStore).index(index);

  let cursor = await _index.openCursor(query, direction);

  while (cursor) {
    callback(cursor.value);
    cursor = await cursor.continue();
  }
}

export async function findEvent<
  Store extends StoreNames<EventDB>,
  IndexName extends IndexNames<EventDB, Store>
>(
  eventStore: Store,
  index: IndexName,
  query: IndexKey<EventDB, Store, IndexName> | IDBKeyRange | null,
  direction: IDBCursorDirection | undefined
): Promise<EventDB[Store]["value"] | undefined> {
  const tx = db.transaction(eventStore);
  const _index = tx.objectStore(eventStore).index(index);

  let cursor = await _index.openCursor(query, direction);
  return cursor?.value;
}

export default db;

export async function tokenHistory(
  token: ERC1155Token
): Promise<(ListEvent | PurchaseEvent | BurnEvent)[]> {
  // * [x] Listed
  // * [x] Purchased
  // * [x] Redeemed

  const events: (ListEvent | PurchaseEvent | BurnEvent)[] = [];

  await Promise.all([
    iterateEventIndex(
      "NFTime.Transfer",
      "toId",
      [AddressZero, token.id._hex],
      "prev",
      (e) => events.push(e)
    ),

    findEvent(
      "NFTSimpleListing.List",
      "tokenId",
      token.id._hex,
      "nextunique"
    ).then((e) => {
      if (e) events.push(e);
    }),

    iterateEventIndex(
      "NFTSimpleListing.Purchase",
      "tokenId",
      token.id._hex,
      "prev",
      (e) => events.push(e)
    ),
  ]);

  return events.sort((a, b) => b.blockNumber - a.blockNumber);
}

export async function accountListings(account: Account): Promise<ListEvent[]> {
  const events: ListEvent[] = [];

  await iterateEventIndex(
    "NFTSimpleListing.List",
    "seller",
    account.toString(),
    "prev",
    (e) => {
      events.push(e);
    }
  );

  return events;
}

export async function feed() {
  // * [x] Listed
  // * [x] Purchased
  // * [x] Redeemed
  // * [ ] Consumed

  let events: (ListEvent | PurchaseEvent | BurnEvent)[] = [];

  await Promise.all([
    iterateEvents("NFTSimpleListing.List", "prev", (e) => events.push(e)),
    iterateEvents("NFTSimpleListing.Purchase", "prev", (e) => events.push(e)),
    iterateEventIndex("NFTime.Transfer", "to", AddressZero, "prev", (e) =>
      events.push(e)
    ),
  ]);

  return events.sort((a, b) => b.blockNumber - a.blockNumber);
}

export async function accountFeed(account: Account) {
  // * [x] Listed
  // * [x] Purchased
  // * [x] Redeemed (burning)
  // * [ ] Consumed

  let events: (ListEvent | PurchaseEvent | BurnEvent)[] = [];

  await Promise.all([
    // BurnEvent
    iterateEventIndex(
      "NFTime.Transfer",
      "fromTo",
      [account.toString(), AddressZero],
      "prev",
      (e) => events.push(e)
    ),

    // ListEvent
    iterateEventIndex(
      "NFTSimpleListing.List",
      "seller",
      account.toString(),
      "prev",
      (e) => events.push(e)
    ),

    // PurchaseEvent
    iterateEventIndex(
      "NFTSimpleListing.Purchase",
      "buyer",
      account.toString(),
      "prev",
      (e) => events.push(e)
    ),
  ]);

  return events.sort((a, b) => b.blockNumber - a.blockNumber);
}
