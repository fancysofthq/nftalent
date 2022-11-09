import { CID } from "multiformats";
import { CarReader } from "@ipld/car/reader";
import { Block } from "@ipld/car/api";
import { Blockstore } from "ipfs-car/blockstore";

/**
 * An implementation of the CAR reader interface that is backed by a blockstore.
 */
export default class BlockstoreCarReader implements CarReader {
  _version: number;
  _roots: CID[];
  _blockstore: Blockstore;
  _keys: string[] = [];
  _blocks: Block[] = [];

  constructor(version: number, roots: CID[], blockstore: Blockstore) {
    this._version = version;
    this._roots = roots;
    this._blockstore = blockstore;
  }

  get version() {
    return this._version;
  }

  get blockstore() {
    return this._blockstore;
  }

  async getRoots() {
    return this._roots;
  }

  has(cid: CID) {
    return this._blockstore.has(cid);
  }

  async get(cid: CID) {
    const bytes = await this._blockstore.get(cid);
    return { cid, bytes };
  }

  blocks() {
    return this._blockstore.blocks();
  }

  async *cids() {
    for await (const b of this.blocks()) {
      yield b.cid;
    }
  }
}
