import * as ethers from "ethers";
import {
  openDB,
  DBSchema,
  StoreNames,
  StoreValue,
  IndexNames,
  IndexKey,
  IDBPDatabase,
} from "idb";
import { Transfer as IERC1155Transfer } from "./contract/IERC1155";
import { Transfer as IERC721Transfer } from "./contract/IERC721";
import {
  List,
  Replenish,
  Withdraw,
  Purchase,
} from "./contract/NFTSimpleListing";
import { Qualify, Redeem } from "./contract/ERC1876Redeemable";

export type Event =
  | IERC721Transfer
  | IERC1155Transfer
  | Qualify
  | Redeem
  | List
  | Replenish
  | Withdraw
  | Purchase;

export type {
  IERC721Transfer,
  IERC1155Transfer,
  Qualify,
  Redeem,
  List,
  Replenish,
  Withdraw,
  Purchase,
};

interface Schema extends DBSchema {
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
      ["to-blockNumber"]: [string, number];
      ["id-blockNumber"]: [string, number];
      ["to-id-blockNumber"]: [string, string, number];
    };
    foo: "bar";
  };

  "ERC1876Redeemable.Qualify": {
    key: [number, number]; // blockNumber + logIndex
    value: Qualify;
    indexes: {
      blockNumber: number;
      operator: string;
      tokenId: string;
      ["operator-blockNumber"]: [string, number];
      ["tokenId-blockNumber"]: [string, number];
    };
  };

  "ERC1876Redeemable.Redeem": {
    key: [number, number, number]; // blockNumber + logIndex + subIndex
    value: Redeem;
    indexes: {
      blockNumber: number;
      operator: string;
      redeemer: string;
      tokenId: string;
      ["operator-blockNumber"]: [string, number];
      ["redeemer-blockNumber"]: [string, number];
      ["tokenId-blockNumber"]: [string, number];
    };
  };

  "NFTSimpleListing.List": {
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

  "NFTSimpleListing.Replenish": {
    key: [number, number]; // blockNumber + logIndex
    value: Replenish;
    indexes: {
      blockNumber: number;
      tokendId: string;
      listingId: string;
      operator: string;
      ["tokenId-blockNumber"]: [string, number];
      ["listingId-blockNumber"]: [string, number];
      ["operator-blockNumber"]: [string, number];
    };
  };

  "NFTSimpleListing.Withdraw": {
    key: [number, number]; // blockNumber + logIndex
    value: Withdraw;
    indexes: {
      blockNumber: number;
      tokendId: string;
      listingId: string;
      operator: string;
      to: string;
      ["tokenId-blockNumber"]: [string, number];
      ["listingId-blockNumber"]: [string, number];
      ["operator-blockNumber"]: [string, number];
      ["to-blockNumber"]: [string, number];
    };
  };

  "NFTSimpleListing.Purchase": {
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
}

const SYNC_BLOCK_BATCH_SIZE = 10;

export class EventDB {
  private db!: IDBPDatabase<Schema>;

  async open() {
    this.db = await openDB<Schema>("eth_event_db", 1, {
      upgrade(db) {
        const e1 = db.createObjectStore("IPNFT721.Transfer", {
          keyPath: ["blockNumber", "logIndex"],
        });

        e1.createIndex("blockNumber", "blockNumber");
        e1.createIndex("from", "from");
        e1.createIndex("to", "to");
        e1.createIndex("tokenId", "tokenId");
        e1.createIndex("from-blockNumber", ["from", "blockNumber"]);
        e1.createIndex("from-tokenId", ["from", "tokenId"]);
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
        e2.createIndex("to-blockNumber", ["to", "blockNumber"]);
        e2.createIndex("id-blockNumber", ["id", "blockNumber"]);
        e2.createIndex("to-id-blockNumber", ["to", "id", "blockNumber"]);

        const e3 = db.createObjectStore("ERC1876Redeemable.Qualify", {
          keyPath: ["blockNumber", "logIndex"],
        });

        e3.createIndex("blockNumber", "blockNumber");
        e3.createIndex("operator", "operator");
        e3.createIndex("tokenId", "tokenId");
        e3.createIndex("operator-blockNumber", ["operator", "blockNumber"]);
        e3.createIndex("tokenId-blockNumber", ["tokenId", "blockNumber"]);

        const e4 = db.createObjectStore("ERC1876Redeemable.Redeem", {
          keyPath: ["blockNumber", "logIndex", "subIndex"],
        });

        e4.createIndex("blockNumber", "blockNumber");
        e4.createIndex("operator", "operator");
        e4.createIndex("redeemer", "redeemer");
        e4.createIndex("tokenId", "tokenId");
        e4.createIndex("operator-blockNumber", ["operator", "blockNumber"]);
        e4.createIndex("redeemer-blockNumber", ["redeemer", "blockNumber"]);
        e4.createIndex("tokenId-blockNumber", ["tokenId", "blockNumber"]);

        const e5 = db.createObjectStore("NFTSimpleListing.List", {
          keyPath: ["blockNumber", "logIndex"],
        });

        e5.createIndex("blockNumber", "blockNumber");
        e5.createIndex("listingId", "listingId");
        e5.createIndex("tokenId", "token.id");
        e5.createIndex("seller", "seller");
        e5.createIndex("seller-blockNumber", ["seller", "blockNumber"]);
        e5.createIndex("tokenId-blockNumber", ["token.id", "blockNumber"]);

        const e6 = db.createObjectStore("NFTSimpleListing.Replenish", {
          keyPath: ["blockNumber", "logIndex"],
        });

        e6.createIndex("blockNumber", "blockNumber");
        e6.createIndex("tokendId", "token.id");
        e6.createIndex("listingId", "listingId");
        e6.createIndex("operator", "operator");
        e6.createIndex("tokenId-blockNumber", ["token.id", "blockNumber"]);
        e6.createIndex("listingId-blockNumber", ["listingId", "blockNumber"]);
        e6.createIndex("operator-blockNumber", ["operator", "blockNumber"]);

        const e7 = db.createObjectStore("NFTSimpleListing.Withdraw", {
          keyPath: ["blockNumber", "logIndex"],
        });

        e7.createIndex("blockNumber", "blockNumber");
        e7.createIndex("tokendId", "token.id");
        e7.createIndex("listingId", "listingId");
        e7.createIndex("operator", "operator");
        e7.createIndex("to", "to");
        e7.createIndex("tokenId-blockNumber", ["token.id", "blockNumber"]);
        e7.createIndex("listingId-blockNumber", ["listingId", "blockNumber"]);
        e7.createIndex("operator-blockNumber", ["operator", "blockNumber"]);
        e7.createIndex("to-blockNumber", ["to", "blockNumber"]);

        const e8 = db.createObjectStore("NFTSimpleListing.Purchase", {
          keyPath: ["blockNumber", "logIndex"],
        });

        e8.createIndex("blockNumber", "blockNumber");
        e8.createIndex("tokenId", "token.id");
        e8.createIndex("listingId", "listingId");
        e8.createIndex("buyer", "buyer");
        e8.createIndex("tokenId-blockNumber", ["token.id", "blockNumber"]);
        e8.createIndex("listingId-blockNumber", ["listingId", "blockNumber"]);
        e8.createIndex("buyer-blockNumber", ["buyer", "blockNumber"]);

        const latestFetchedEventBlock = db.createObjectStore(
          "latestFetchedEventBlock"
        );
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
    const tx = this.db.transaction(store, "readwrite");
    await Promise.all([...values.map((obj) => tx.store.put(obj)), tx.done]);
  }

  async put<Store extends StoreNames<Schema>>(
    store: Store,
    value: StoreValue<Schema, Store>,
    key?: IDBKeyRange | Schema[Store]["key"]
  ) {
    console.debug("Put", store, value);
    await this.db.put(store, value, key);
  }

  async syncEvents<Store extends StoreNames<Schema>>(
    store: Store,
    contract: ethers.Contract,
    filter: ethers.EventFilter,
    mapping: (
      e: any
    ) => StoreValue<Schema, Store> | StoreValue<Schema, Store>[],
    untilBlock: number
  ) {
    await this._syncPastEvents(store, contract, filter, mapping, untilBlock);

    contract.on(filter, async (...data) => {
      const e = data[data.length - 1];

      // We've already synchronized this event.
      if (e.blockNumber <= untilBlock) return;

      const mapped = mapping(e);

      if (mapped instanceof Array) await this.putBatch(store, mapped);
      else await this.put(store, mapped);

      await this.put("latestFetchedEventBlock", e.blockNumber, store);
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
    const tx = this.db.transaction(eventStore);
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
    const tx = this.db.transaction(eventStore);
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
   * @param eventCallback must be synchronous
   * @param finalBlock the block to sync until (including)
   */
  private async _syncPastEvents<Store extends StoreNames<Schema>>(
    eventStore: Store,
    contract: ethers.Contract,
    filter: ethers.EventFilter,
    eventCallback: (
      value: ethers.Event,
      index: number,
      array: ethers.Event[]
    ) => StoreValue<Schema, Store> | StoreValue<Schema, Store>[],
    finalBlock: number
  ) {
    let fromBlock =
      (await this.db.get("latestFetchedEventBlock", eventStore)) ||
      parseInt(import.meta.env.VITE_ETH_GENESIS_BLOCK) ||
      0;

    while (fromBlock < finalBlock) {
      const toBlock = Math.min(finalBlock, fromBlock + SYNC_BLOCK_BATCH_SIZE);

      const rawEvents = await contract.queryFilter(filter, fromBlock, toBlock);
      const mappedEvents = rawEvents.flatMap(eventCallback);

      if (mappedEvents.length > 0)
        await this.putBatch(eventStore, mappedEvents);
      await this.db.put("latestFetchedEventBlock", toBlock, eventStore);

      fromBlock = toBlock + 1;
    }
  }
}

export default await new EventDB().open();
