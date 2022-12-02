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
import { Claim } from "./contract/IPFTRedeemable";
import * as OpenStore from "./contract/OpenStore";
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
  | IERC1155Transfer
  | OpenStore.List
  | OpenStore.Replenish
  | OpenStore.Withdraw
  | OpenStore.Purchase;

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

  "IPFTRedeemable.Claim": {
    key: [number, number]; // blockNumber + logIndex
    value: Claim;
    indexes: {
      blockNumber: number;
      author: string;
      id: string;
      ["author-blockNumber"]: [string, number];
    };
  };

  "IPFTRedeemable.Transfer": {
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
  };

  "OpenStore.List": {
    key: [number, number]; // blockNumber + logIndex
    value: OpenStore.List;
    indexes: {
      blockNumber: [
        string, // appAddress
        number // blockNumber
      ];
      listingId: string;
      token: [
        string, // appAddress
        string, // token.contract
        string // token.id
      ];
      seller: [
        string, // appAddress
        string // seller
      ];
      ["token-blockNumber"]: [
        string, // appAddress
        string, // token.contract
        string, // token.id
        number // blockNumber
      ];
      ["seller-blockNumber"]: [
        string, // appAddress
        string, // seller
        number // blockNumber
      ];
    };
  };

  "OpenStore.Replenish": {
    key: [number, number]; // blockNumber + logIndex
    value: OpenStore.Replenish;
    indexes: {
      listingId: string;
      ["listingId-blockNumber"]: [string, number];
    };
  };

  "OpenStore.Withdraw": {
    key: [number, number]; // blockNumber + logIndex
    value: OpenStore.Withdraw;
    indexes: {
      listingId: string;
      ["listingId-blockNumber"]: [string, number];
    };
  };

  "OpenStore.Purchase": {
    key: [number, number]; // blockNumber + logIndex
    value: OpenStore.Purchase;
    indexes: {
      blockNumber: [
        string, // appAddress
        number // blockNumber
      ];
      token: [
        string, // appAddress
        string, // token.contract
        string // token.id
      ];
      listingId: string;
      buyer: [
        string, // appAddress
        string // buyer
      ];
      ["token-blockNumber"]: [
        string, // appAddress
        string, // token.contract
        string, // token.id
        number // blockNumber
      ];
      ["listingId-blockNumber"]: [string, number];
      ["buyer-blockNumber"]: [
        string, // appAddress
        string, // buyer
        number // blockNumber
      ];
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

const SYNC_BLOCK_BATCH_SIZE = 100;

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

          const e1 = db.createObjectStore("IPFTRedeemable.Claim", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e1.createIndex("blockNumber", "blockNumber");
          e1.createIndex("author", "author");
          e1.createIndex("id", "id");
          e1.createIndex("author-blockNumber", ["author", "blockNumber"]);

          const e2 = db.createObjectStore("IPFTRedeemable.Transfer", {
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

          const e3 = db.createObjectStore("OpenStore.List", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e3.createIndex("blockNumber", ["appAddress", "blockNumber"]);
          e3.createIndex("listingId", "listingId");
          e3.createIndex("token", ["appAddress", "token.contract", "token.id"]);
          e3.createIndex("seller", ["appAddress", "seller"]);
          e3.createIndex("seller-blockNumber", [
            "appAddress",
            "seller",
            "blockNumber",
          ]);
          e3.createIndex("token-blockNumber", [
            "appAddress",
            "token.contract",
            "token.id",
            "blockNumber",
          ]);

          const e4 = db.createObjectStore("OpenStore.Replenish", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e4.createIndex("listingId", "listingId");
          e4.createIndex("listingId-blockNumber", ["listingId", "blockNumber"]);

          const e5 = db.createObjectStore("OpenStore.Withdraw", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e5.createIndex("listingId", "listingId");
          e5.createIndex("listingId-blockNumber", ["listingId", "blockNumber"]);

          const e6 = db.createObjectStore("OpenStore.Purchase", {
            keyPath: ["blockNumber", "logIndex"],
          });

          e6.createIndex("blockNumber", ["appAddress", "blockNumber"]);
          e6.createIndex("token", ["appAddress", "token.contract", "token.id"]);
          e6.createIndex("listingId", "listingId");
          e6.createIndex("buyer", ["appAddress", "buyer"]);
          e6.createIndex("token-blockNumber", [
            "appAddress",
            "token.contract",
            "token.id",
            "blockNumber",
          ]);
          e6.createIndex("listingId-blockNumber", ["listingId", "blockNumber"]);
          e6.createIndex("buyer-blockNumber", [
            "appAddress",
            "buyer",
            "blockNumber",
          ]);
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
      parseInt(import.meta.env.VITE_GENESIS_BLOCK) ||
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
        parseInt(import.meta.env.VITE_GENESIS_BLOCK) ||
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

const db = new EventDB();
export default db;

db.open();
