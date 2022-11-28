import { CID } from "multiformats";
import { hex2Bytes } from "@/util";
import * as MultihashDigest from "multiformats/hashes/digest";
import { sha256 } from "multiformats/hashes/sha2";
import * as dagCbor from "@ipld/dag-cbor";
import { Token as ERC721Token } from "./IERC721";
import { Token as ERC1155Token } from "./IERC1155";
import { BigNumber } from "@ethersproject/bignumber";
import { Buffer } from "buffer";
import { Address } from "../Address";

export class Token {
  cid: CID;

  constructor(cid: CID) {
    this.cid = cid;
  }

  get id(): BigNumber {
    return cidToUint256(this.cid);
  }

  toERC721Token(contract: Address): ERC721Token {
    return new ERC721Token(contract, cidToUint256(this.cid));
  }

  toERC1155Token(contract: Address): ERC1155Token {
    return new ERC1155Token(contract, cidToUint256(this.cid));
  }
}

export function cidToUint256(cid: CID): BigNumber {
  if (cid.multihash.size > 32) throw new Error("CID multihash is too big");
  if (cid.multihash.digest.every((b) => b == 0))
    throw new Error("CID multihash is all zeros");

  return BigNumber.from(cid.multihash.digest);
}

// TODO: Accept `codec` argument.
export function uint256ToCID(id: BigNumber): CID {
  const bytes = hex2Bytes(id._hex.padEnd(66, "0").slice(2));
  const digest = MultihashDigest.create(sha256.code, bytes);
  return CID.createV1(dagCbor.code, digest);
}

export class Tag {
  readonly bytes: Uint8Array;

  constructor(
    readonly chainId: number,
    readonly contractAddress: Address,
    readonly minterAddress: Address,
    readonly minterNonce: number
  ) {
    this.bytes = this.toBytes();
  }

  private toBytes(): Uint8Array {
    const tag = Buffer.alloc(80);

    tag.writeUint32BE(0x65766d01);
    tag.write(this.chainId.toString(16).padStart(64, "0"), 4, 32, "hex");
    // OPTIMIZE: Use buffer directly.
    tag.write(this.contractAddress.toString().slice(2), 36, 20, "hex");
    // OPTIMIZE: Ditto.
    tag.write(this.minterAddress.toString().slice(2), 56, 20, "hex");
    tag.writeUInt32BE(this.minterNonce, 76);

    return new Uint8Array(tag);
  }
}
