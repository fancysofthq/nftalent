import { BigNumber } from "ethers";
import { CID } from "multiformats";
import { hex2Bytes } from "@/util";
import * as MultihashDigest from "multiformats/hashes/digest";
import { sha256 } from "multiformats/hashes/sha2";
import * as dagCbor from "@ipld/dag-cbor";
import { Token as ERC1155Token } from "./IERC1155";
import { Token as ERC721Token } from "./IERC721";
import IPNFT721 from "./IPNFT721";
import IPNFT1155 from "./IPNFT1155";
import { Buffer } from "buffer";

export class Token {
  cid: CID;

  constructor(cid: CID) {
    this.cid = cid;
  }

  get id(): BigNumber {
    return cidToUint256(this.cid);
  }

  toERC721Token(): ERC721Token {
    return new ERC721Token(IPNFT721.account, cidToUint256(this.cid));
  }

  toERC1155Token(): ERC1155Token {
    return new ERC1155Token(IPNFT1155.account, cidToUint256(this.cid));
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
  readonly chainId: number;
  readonly contractAddress: string;
  readonly minterAddress: string;
  readonly minterNonce: number;
  readonly bytes: Uint8Array;

  constructor(
    chainId: number,
    contractAddress: string,
    minterAddress: string,
    minterNonce: number
  ) {
    this.chainId = chainId;
    this.contractAddress = contractAddress;
    this.minterAddress = minterAddress;
    this.minterNonce = minterNonce;
    this.bytes = this.toBytes();
  }

  private toBytes(): Uint8Array {
    const tag = Buffer.alloc(80);

    tag.writeUint32BE(0x65766d01);
    tag.write(this.chainId.toString(16).padStart(64, "0"), 4, 32, "hex");
    tag.write(this.contractAddress.slice(2), 36, 20, "hex");
    tag.write(this.minterAddress.slice(2), 56, 20, "hex");
    tag.writeUInt32BE(this.minterNonce, 76);

    return new Uint8Array(tag);
  }
}
