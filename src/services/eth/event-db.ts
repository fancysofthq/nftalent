import * as ethers from "ethers";
import {
  openDB,
  DBSchema,
  StoreNames,
  StoreValue,
  IndexNames,
  IndexKey,
  IDBPDatabase,
  IDBPTransaction,
} from "idb";
import { Transfer as IERC1155Transfer } from "./contract/IERC1155";
import { Transfer as IERC721Transfer } from "./contract/IERC721";
import { List, Replenish, Withdraw, Purchase } from "./contract/MetaStore";
import {
  SetBasicPfp,
  SetBasicBgp,
  SetBasicPfa,
  SetBasicMetadata,
  SetAppPfp,
  SetAppBgp,
  SetAppPfa,
  SetAppMetadata,
} from "./contract/Persona";

export type Event =
  | IERC721Transfer
  | IERC1155Transfer
  | List
  | Replenish
  | Withdraw
  | Purchase;

export type {
  IERC721Transfer,
  IERC1155Transfer,
  List,
  Replenish,
  Withdraw,
  Purchase,
};

export type IPNFT = {
  id: string;
  currentOwner: string;
  ipnft721MintEvent: [number, number]; // IERC721Transfer key
  ipnft1155IsFinalized?: boolean | null;
  ipnft1155ExpiredAt?: Date | null;
};

export type Persona = {
  pfp?: { contractAddress: string; tokenId: string };
  bgp?: { contractAddress: string; tokenId: string };
  pfa?: string;
  metadata?: Uint8Array;
};

export type Account = {
  address: string;
  personas: {
    basic?: Persona;
    apps: Record<string, Persona>;
  };
};

interface Schema extends DBSchema {
  // It's a part of the DB to ensure atomicity.
  latestFetchedEventBlock: {
    key: string;
    value: number;
  };

  "IPNFT721.Transfer": {
    key: [number, number]; // blockNumber + logIndex
    value: IERC721Transfer;
    indexes: {
      blockNumber: number;
      from: string;
      to: string;
      tokenId: string;
      ["from-blockNumber"]: [string, number];
      ["from-tokenId"]: [string, string];
      ["from-to-blockNumber"]: [string, string, number];
      ["to-blockNumber"]: [string, number];
      ["tokenId-blockNumber"]: [string, number];
      ["to-tokenId-blockNumber"]: [string, string, number];
    };
  };

  "IPNFT1155.Transfer": {
    key: [number, number, number]; // blockNumber + logIndex + subIndex
    value: IERC1155Transfer;
    indexes: {
      blockNumber: number;
      from: string;
      to: string;
      id: string;
      ["from-blockNumber"]: [string, number];
      ["from-id"]: [string, string];
      ["from-to-blockNumber"]: [string, string, number];
      ["to-blockNumber"]: [string, number];
      ["id-blockNumber"]: [string, number];
      ["to-id-blockNumber"]: [string, string, number];
    };
    foo: "bar";
  };

  "MetaStore.List": {
    key: [number, number]; // blockNumber + logIndex
    value: List;
    indexes: {
      blockNumber: number;
      listingId: string;
      tokenId: string;
      seller: string;
      ["seller-blockNumber"]: [string, number];
      ["tokenId-blockNumber"]: [string, number];
    };
  };

  "MetaStore.Replenish": {
    key: [number, number]; // blockNumber + logIndex
    value: Replenish;
    indexes: {
      blockNumber: number;
      tokendId: string;
      listingId: string;
      ["tokenId-blockNumber"]: [string, number];
      ["listingId-blockNumber"]: [string, number];
    };
  };

  "MetaStore.Withdraw": {
    key: [number, number]; // blockNumber + logIndex
    value: Withdraw;
    indexes: {
      blockNumber: number;
      tokendId: string;
      listingId: string;
      to: string;
      ["tokenId-blockNumber"]: [string, number];
      ["listingId-blockNumber"]: [string, number];
      ["to-blockNumber"]: [string, number];
    };
  };

  "MetaStore.Purchase": {
    key: [number, number]; // blockNumber + logIndex
    value: Purchase;
    indexes: {
      blockNumber: number;
      tokenId: string;
      listingId: string;
      buyer: string;
      ["tokenId-blockNumber"]: [string, number];
      ["listingId-blockNumber"]: [string, number];
      ["buyer-blockNumber"]: [string, number];
    };
  };

  IPNFT: {
    key: string;
    value: IPNFT;
    indexes: {
      currentOwner: string;
    };
  };

  Account: {
    key: string;
    value: Account;
  };

  "Persona.SetBasicPfp": {
    key: [number, number]; // blockNumber + logIndex
    value: SetBasicPfp;
    indexes: { account: string };
  };

  "Persona.SetBasicBgp": {
    key: [number, number]; // blockNumber + logIndex
    value: SetBasicBgp;
    indexes: { account: string };
  };

  "Persona.SetBasicPfa": {
    key: [number, number]; // blockNumber + logIndex
    value: SetBasicPfa;
    indexes: { account: string };
  };

  "Persona.SetBasicMetadata": {
    key: [number, number]; // blockNumber + logIndex
    value: SetBasicMetadata;
    indexes: { account: string };
  };

  "Persona.SetAppPfp": {
    key: [number, number]; // blockNumber + logIndex
    value: SetAppPfp;
    indexes: { account: string };
  };

  "Persona.SetAppBgp": {
    key: [number, number]; // blockNumber + logIndex
    value: SetAppBgp;
    indexes: { account: string };
  };

  "Persona.SetAppPfa": {
    key: [number, number]; // blockNumber + logIndex
    value: SetAppPfa;
    indexes: { account: string };
  };

  "Persona.SetAppMetadata": {
    key: [number, number]; // blockNumber + logIndex
    value: SetAppMetadata;
    indexes: { account: string };
  };
}

const SYNC_BLOCK_BATCH_SIZE = 10;

export class EventDB {
  private _db!: IDBPDatabase<Schema>;

  get db(): IDBPDatabase<Schema> {
    return this._db;
  }

  async open() {
    this._db = await openDB<Schema>("eth_event_db", 2, {
      upgrade(db, oldVersion, newVersion) {
        if (oldVersion < 1) {
          console.debug("Upgrading DB from version 0");

          const latestFetchedEventBlock = db.createObjectStore(
            "latestFetchedEventBlock"
          );

          const e1 = db.createObjectStore("IPNFT721.Transfer", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e1.createIndex("blockNumber", "blockNumber");
          e1.createIndex("from", "from");
          e1.createIndex("to", "to");
          e1.createIndex("tokenId", "tokenId");
          e1.createIndex("from-blockNumber", ["from", "blockNumber"]);
          e1.createIndex("from-tokenId", ["from", "tokenId"]);
          e1.createIndex("from-to-blockNumber", ["from", "to", "blockNumber"]);
          e1.createIndex("to-blockNumber", ["to", "blockNumber"]);
          e1.createIndex("tokenId-blockNumber", ["tokenId", "blockNumber"]);
          e1.createIndex("to-tokenId-blockNumber", [
            "to",
            "tokenId",
            "blockNumber",
          ]);

          const e2 = db.createObjectStore("IPNFT1155.Transfer", {
            keyPath: ["blockNumber", "logIndex", "subIndex"],
          });

          e2.createIndex("blockNumber", "blockNumber");
          e2.createIndex("from", "from");
          e2.createIndex("to", "to");
          e2.createIndex("id", "id");
          e2.createIndex("from-blockNumber", ["from", "blockNumber"]);
          e2.createIndex("from-id", ["from", "id"]);
          e2.createIndex("from-to-blockNumber", ["from", "to", "blockNumber"]);
          e2.createIndex("to-blockNumber", ["to", "blockNumber"]);
          e2.createIndex("id-blockNumber", ["id", "blockNumber"]);
          e2.createIndex("to-id-blockNumber", ["to", "id", "blockNumber"]);

          const e3 = db.createObjectStore("MetaStore.List", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e3.createIndex("blockNumber", "blockNumber");
          e3.createIndex("listingId", "listingId");
          e3.createIndex("tokenId", "token.id");
          e3.createIndex("seller", "seller");
          e3.createIndex("seller-blockNumber", ["seller", "blockNumber"]);
          e3.createIndex("tokenId-blockNumber", ["token.id", "blockNumber"]);

          const e4 = db.createObjectStore("MetaStore.Replenish", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e4.createIndex("blockNumber", "blockNumber");
          e4.createIndex("listingId", "listingId");
          e4.createIndex("listingId-blockNumber", ["listingId", "blockNumber"]);

          const e5 = db.createObjectStore("MetaStore.Withdraw", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e5.createIndex("blockNumber", "blockNumber");
          e5.createIndex("listingId", "listingId");
          e5.createIndex("to", "to");
          e5.createIndex("listingId-blockNumber", ["listingId", "blockNumber"]);
          e5.createIndex("to-blockNumber", ["to", "blockNumber"]);

          const e6 = db.createObjectStore("MetaStore.Purchase", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e6.createIndex("blockNumber", "blockNumber");
          e6.createIndex("listingId", "listingId");
          e6.createIndex("buyer", "buyer");
          e6.createIndex("tokenId-blockNumber", ["token.id", "blockNumber"]);
          e6.createIndex("listingId-blockNumber", ["listingId", "blockNumber"]);
          e6.createIndex("buyer-blockNumber", ["buyer", "blockNumber"]);

          const o1 = db.createObjectStore("IPNFT", {
            keyPath: "id",
          });

          o1.createIndex("currentOwner", "currentOwner");
        }

        if (oldVersion < 2) {
          console.debug("Upgrading DB from version 1");

          const e1 = db.createObjectStore("Persona.SetBasicPfp", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e1.createIndex("account", "account");

          const e2 = db.createObjectStore("Persona.SetBasicBgp", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e2.createIndex("account", "account");

          const e3 = db.createObjectStore("Persona.SetBasicPfa", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e3.createIndex("account", "account");

          const e4 = db.createObjectStore("Persona.SetBasicMetadata", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e4.createIndex("account", "account");

          const e5 = db.createObjectStore("Persona.SetAppPfp", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e5.createIndex("account", "account");

          const e6 = db.createObjectStore("Persona.SetAppBgp", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e6.createIndex("account", "account");

          const e7 = db.createObjectStore("Persona.SetAppPfa", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e7.createIndex("account", "account");

          const e8 = db.createObjectStore("Persona.SetAppMetadata", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e8.createIndex("account", "account");

          const o1 = db.createObjectStore("Account", {
            keyPath: "address",
          });
        }
      },
    });

    return this;
  }

  /**
   * Put multiple items in one transaction.
   * Replaces items with the same key.
   */
  async putBatch<Store extends StoreNames<Schema>>(
    store: Store,
    values: StoreValue<Schema, Store>[]
  ) {
    console.debug("Put batch", store, values);
    const tx = this._db.transaction(store, "readwrite");
    await Promise.all([...values.map((obj) => tx.store.put(obj)), tx.done]);
  }

  async put<Store extends StoreNames<Schema>>(
    store: Store,
    value: StoreValue<Schema, Store>,
    key?: IDBKeyRange | Schema[Store]["key"]
  ) {
    console.debug("Put", store, value);
    await this._db.put(store, value, key);
  }

  /**
   * Synchronize the database with old events from the blockchain,
   * and subscribe to new events.
   *
   * @param eventStore The main event store
   * @param txStores Object stores referenced by the transaction
   * @param untilBlock
   * @param contract
   * @param filter Event filter
   * @param rawEventMap Synchrnous function to map raw event to a typed event
   * @param eventIter Iterate over typed events to get some data to be stored in the transaction.
   * It may be undefined if there is no any out-of-database interaction needed.
   * @param txEventIter Iterate over typed events and the data in the same transaction.
   * Keep in mind that an IndexedDB transaction would commit as soon as it has nothing to do.
   */
  async syncEvents<
    EventStore extends StoreNames<Schema>,
    EventIterReturnT = unknown,
    TxStores extends StoreNames<Schema>[] = [
      EventStore,
      "latestFetchedEventBlock"
    ]
  >(
    eventStore: EventStore,
    txStores: TxStores,
    untilBlock: number,
    contract: ethers.Contract,
    filter: ethers.EventFilter,
    rawEventMap: (e: ethers.Event) => StoreValue<Schema, EventStore>[],
    eventIter?: (
      e: StoreValue<Schema, EventStore>
    ) => Promise<EventIterReturnT>,
    txEventIter?: (
      tx: IDBPTransaction<Schema, TxStores, "readwrite">,
      e: StoreValue<Schema, EventStore>,
      i: EventIterReturnT | undefined
    ) => Promise<void>
  ) {
    await this._syncPastEvents(
      eventStore,
      txStores,
      untilBlock,
      contract,
      filter,
      rawEventMap,
      eventIter,
      txEventIter
    );

    contract.on(filter, async (...data) => {
      const e = data[data.length - 1];

      // We've already synchronized this event.
      if (e.blockNumber <= untilBlock) return;

      const mappedEvents = rawEventMap(e);

      if (mappedEvents.length > 0) {
        const iterResults = await Promise.all(
          mappedEvents.map((e) => eventIter?.(e))
        );

        const tx = this._db.transaction(txStores, "readwrite");
        let latestFetchedBlock =
          (await tx.objectStore("latestFetchedEventBlock").get(eventStore)) ||
          parseInt(import.meta.env.VITE_ETH_GENESIS_BLOCK) ||
          0;

        if (latestFetchedBlock <= e.blockNumber) {
          try {
            for (let i = 0; i < mappedEvents.length; i++) {
              console.debug("Put event", mappedEvents[i]);
              try {
                await tx.objectStore(eventStore).add(mappedEvents[i]);
                if (txEventIter)
                  await txEventIter(tx, mappedEvents[i], iterResults[i]);
              } catch (e) {
                console.error("Already added", mappedEvents[i]);
              }
            }

            await tx
              .objectStore("latestFetchedEventBlock")
              .put(e.blockNumber, eventStore);

            tx.commit();
          } catch (e) {
            console.error("Tx failed", e);
          }
        } else {
          console.debug("Skipping event", e);
        }
      }
    });
  }

  /**
   * Try finding a single event by index.
   *
   * @param eventStore
   * @param index
   * @param query
   * @param direction
   */
  async findEvent<
    Store extends StoreNames<Schema>,
    IndexName extends IndexNames<Schema, Store>
  >(
    eventStore: Store,
    index: IndexName,
    query: IndexKey<Schema, Store, IndexName> | IDBKeyRange | null,
    direction: IDBCursorDirection | undefined
  ): Promise<StoreValue<Schema, Store> | undefined> {
    const tx = this._db.transaction(eventStore);
    const _index = tx.objectStore(eventStore).index(index);
    let cursor = await _index.openCursor(query, direction);
    return cursor?.value;
  }

  /**
   * Iterate events over index.
   * TODO: Return array of events.
   */
  async iterateEventsIndex<
    Store extends StoreNames<Schema>,
    IndexName extends IndexNames<Schema, Store>
  >(
    eventStore: Store,
    index: IndexName,
    query: IndexKey<Schema, Store, IndexName> | IDBKeyRange | null,
    direction: IDBCursorDirection | undefined,
    callback: (value: StoreValue<Schema, Store>) => void
  ): Promise<void> {
    const tx = this._db.transaction(eventStore);
    const _index = tx.objectStore(eventStore).index(index);
    let cursor = await _index.openCursor(query, direction);

    while (cursor) {
      callback(cursor.value);
      cursor = await cursor.continue();
    }
  }

  /**
   * Synchronize past events.
   *
   * @tparam TxStores object stores covered by the transaction.
   *
   * @param rawEventMap must be synchronous
   * @param finalBlock the block to sync until (including)
   */
  private async _syncPastEvents<
    EventStore extends StoreNames<Schema>,
    EventIterReturnT = unknown,
    TxStores extends StoreNames<Schema>[] = [
      EventStore,
      "latestFetchedEventBlock"
    ]
  >(
    eventStore: EventStore,
    txStores: TxStores,
    finalBlock: number,
    contract: ethers.Contract,
    filter: ethers.EventFilter,
    rawEventMap: (e: ethers.Event) => StoreValue<Schema, EventStore>[],
    eventIter?: (
      e: StoreValue<Schema, EventStore>
    ) => Promise<EventIterReturnT>,
    txEventIter?: (
      tx: IDBPTransaction<Schema, TxStores, "readwrite">,
      e: StoreValue<Schema, EventStore>,
      i: EventIterReturnT | undefined
    ) => Promise<void>
  ) {
    let fromBlock =
      (await this._db.get("latestFetchedEventBlock", eventStore)) ||
      parseInt(import.meta.env.VITE_ETH_GENESIS_BLOCK) ||
      0;

    while (fromBlock < finalBlock) {
      const toBlock = Math.min(finalBlock, fromBlock + SYNC_BLOCK_BATCH_SIZE);

      console.debug("Querying events", eventStore, fromBlock, toBlock);
      const rawEvents = await contract.queryFilter(filter, fromBlock, toBlock);

      const mappedEvents = rawEvents.flatMap(rawEventMap);
      const iterResults = await Promise.all(
        mappedEvents.map((e) => eventIter?.(e))
      );

      const tx = this._db.transaction(txStores, "readwrite");
      let latestBlock =
        (await tx.objectStore("latestFetchedEventBlock").get(eventStore)) ||
        parseInt(import.meta.env.VITE_ETH_GENESIS_BLOCK) ||
        0;

      if (latestBlock <= fromBlock) {
        if (mappedEvents.length > 0) {
          for (let i = 0; i < mappedEvents.length; i++) {
            await tx.objectStore(eventStore).put(mappedEvents[i]);

            if (txEventIter)
              await txEventIter(tx, mappedEvents[i], iterResults[i]);
          }
        }

        await tx
          .objectStore("latestFetchedEventBlock")
          .put(toBlock, eventStore);

        tx.commit();
      }

      fromBlock = toBlock + 1;
    }
  }
}

export default await new EventDB().open();
