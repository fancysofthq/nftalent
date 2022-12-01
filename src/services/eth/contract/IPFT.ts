import { CID } from "multiformats";
import { hex2Bytes } from "@/util";
import * as MultihashDigest from "multiformats/hashes/digest";
import { BigNumber } from "@ethersproject/bignumber";
import { Buffer } from "buffer";
import { Address } from "../Address";
import * as DagCbor from "@ipld/dag-cbor";
import { keccak256 } from "@multiformats/sha3";

export function cidToUint256(cid: CID): BigNumber {
  if (cid.multihash.size > 32) throw new Error("CID multihash is too big");
  if (cid.multihash.digest.every((b) => b == 0))
    throw new Error("CID multihash is all zeros");

  return BigNumber.from(cid.multihash.digest);
}

export function uint256ToCID(
  id: BigNumber,
  contentCodec: number = DagCbor.code,
  hashCodec: number = keccak256.code
): CID {
  const bytes = hex2Bytes(id._hex.padEnd(66, "0").slice(2));
  const digest = MultihashDigest.create(hashCodec, bytes);
  return CID.createV1(contentCodec, digest);
}

export class Tag {
  constructor(
    public readonly chainId: number,
    public readonly contract: Address,
    public readonly author: Address,
    public readonly nonce: number
  ) {}

  toBytes(): Uint8Array {
    const tag = Buffer.alloc(84);

    tag.writeUint32BE(0x69706674); // "ipft"
    tag.writeUint8(0x01, 4); // version
    tag.writeUint32BE(0x65766d00, 5); // "evm\0"
    tag.write(this.chainId.toString(16).padStart(64, "0"), 8, 32, "hex");
    tag.write(this.contract.toString().slice(2), 40, 20, "hex");
    tag.write(this.author.toString().slice(2), 60, 20, "hex");
    tag.writeUInt32BE(this.nonce, 80);

    return tag;
  }
}
