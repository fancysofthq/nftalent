import { Deferred } from "@/util";
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
import { list } from "postcss";
import { provider } from "../eth";
import Account from "./Account";
import ERC1155Token from "./contract/ERC1155Token";
import { TransferEvent } from "./contract/NFTime";
import { ListEvent } from "./contract/NFTSimpleListing";

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
    };
  };

  "NFTSimpleListing.List": {
    key: [number, number]; // blockNumber + logIndex
    value: ListEvent;
    indexes: { listingId: string; tokenId: string; seller: string };
  };

  /**
   * Solidity mapping:
   *
   * ```solidity
   * event Purchase(
   *     address indexed buyer,
   *     uint256 indexed listingId,
   *     uint256 income,
   *     address royaltyAddress,
   *     uint256 royaltyValue,
   *     address indexed appAddress,
   *     uint256 appPremium,
   *     uint256 profit
   * );
   * ```
   */
  "NFTSimpleListing.Purchase": {
    key: [number, number]; // blockNumber + logIndex
    value: {
      transactionHash: string;
      blockNumber: number;
      logIndex: number;

      buyer: string;
      listingId: string; // NOTE: [^1]
      income: BigInt;
      royaltyAddress: string;
      royaltyValue: BigInt;
      // appAddress: string; // NOTE: It won't contain other app's listings anyway
      appPremium: BigInt;
      profit: BigInt;
    };
    indexes: { buyer: string; listingId: string };
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
    e1.createIndex("id", "id");
    e1.createIndex("fromId", ["from", "id"]);
    e1.createIndex("toId", ["to", "id"]);

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

export async function tokenHistory(token: ERC1155Token): Promise<ListEvent[]> {
  // * [x] Listed
  // * [ ] Purchased
  // * [ ] Redeemed

  let listEventPromise = new Deferred<ListEvent | undefined>();
  findEvent(
    "NFTSimpleListing.List",
    "tokenId",
    token.id._hex,
    "nextunique"
  ).then((e) => listEventPromise.resolve(e));

  const events: ListEvent[] = [];

  let listEvent;
  if ((listEvent = await listEventPromise.promise)) {
    events.push(listEvent);
  }

  return events;
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
  // * [ ] Purchased
  // * [ ] Redeemed
  // * [ ] Consumed

  let listEvents: ListEvent[] = [];

  await iterateEvents("NFTSimpleListing.List", "prev", (e) => {
    listEvents.push(e);
  });

  return listEvents;
}

export async function accountFeed(account: Account) {
  // * [x] Listed
  // * [ ] Purchased
  // * [ ] Redeemed
  // * [ ] Consumed

  let listEvents: ListEvent[] = [];

  await iterateEventIndex(
    "NFTSimpleListing.List",
    "seller",
    account.toString(),
    "prev",
    (e) => {
      listEvents.push(e);
    }
  );

  return listEvents;
}
