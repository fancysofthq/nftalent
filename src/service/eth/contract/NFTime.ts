import { NfTime as BaseType } from "./abi/types/NfTime";
import { abi } from "./abi/NFTime.json";
import {
  BigNumber,
  BytesLike,
  ContractTransaction,
  ethers,
  Signer,
} from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import { CID } from "multiformats";
import Account from "../Account";
import { type Metadata as ERC1155Metadata } from "./ERC1155Token";
import { findEvent, iterateEventIndex, syncEvents } from "../event-db";
import { hex2Bytes, Uint8 } from "@/util";
import { AddressZero } from "@ethersproject/constants";
import { sha256 } from "multiformats/hashes/sha2";
import * as dagCbor from "@ipld/dag-cbor";
import * as MultihashDigest from "multiformats/hashes/digest";
import { Buffer } from "buffer";

export type Metadata = ERC1155Metadata & {
  $schema: "well-known://nftime/0.1";
  properties: {
    tags: string[];
    /** In milliseconds. */
    duration: number;
    expiresAt: Date;
  };
};

export function cid2Id(cid: CID): BigNumber {
  if (cid.multihash.size > 32) throw new Error("CID multihash is too big");
  if (cid.multihash.digest.every((b) => b == 0))
    throw new Error("CID multihash is all zeros");

  return BigNumber.from(cid.multihash.digest);
}

export function id2Cid(id: BigNumber): CID {
  const bytes = hex2Bytes(id._hex.padEnd(66, "0").slice(2));
  const digest = MultihashDigest.create(sha256.code, bytes);
  return CID.createV1(dagCbor.code, digest);
}

/**
 * Covers both `TransferSingle` & `TransferBatch` events.
 */
export type TransferEvent = {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  subIndex: number; // NOTE: Would always be 0 for TransferSingle

  from: string;
  to: string;
  token: {
    id: string; // NOTE: [^1]
  };
  value: BigInt;
};

export type BurnEvent = TransferEvent;

export function isBurnEvent(event: any): event is BurnEvent {
  return "to" in event && event.to == AddressZero;
}

export default class NFTime {
  readonly contract: BaseType;
  readonly account: Account;

  constructor(address: string, providerOrSigner: Provider | Signer) {
    this.contract = new BaseType(address, abi, providerOrSigner);
    this.account = new Account(address);
  }

  sync(untilBlock: number) {
    syncEvents(
      "NFTime.Transfer",
      this.contract,
      this.contract.filters.TransferSingle(null, null, null, null, null),
      (e) => ({
        transactionHash: e.transactionHash,
        blockNumber: e.blockNumber,
        logIndex: e.logIndex,
        subIndex: 0,
        from: e.args!.from.toLowerCase(),
        to: e.args!.to.toLowerCase(),
        token: {
          id: e.args!.id._hex,
        },
        value: BigInt(e.args!.value._hex),
      }),
      untilBlock
    );

    // TODO: Transfer batch.
  }

  async mint(
    to: Account,
    cid: CID,
    amount: BigNumber,
    expiredAt: Date,
    royalty: number,
    data: BytesLike = []
  ): Promise<ContractTransaction> {
    if (to.isZero()) throw new Error("to address is zero");

    return await this.contract.mint(
      to.toString(),
      cid2Id(cid),
      amount,
      expiredAt.getTime(),
      royalty,
      data
    );
  }

  async getToken(cid: CID): Promise<{
    minter: Account;
    expiredAt: Date;
    royalty: Uint8;
  }> {
    const res = await this.contract.index(cid2Id(cid));

    return {
      minter: new Account(res.minter),
      expiredAt: new Date(res.expiredAt.toNumber()),
      royalty: new Uint8(res.royalty),
    };
  }

  async balanceOf(account: Account, cid: CID): Promise<BigNumber> {
    return await this.contract.balanceOf(account.toString(), cid2Id(cid));
  }

  async royaltyInfo(
    cid: CID,
    salePrice: BigNumber
  ): Promise<{ royaltyAmount: BigNumber; receiver: string }> {
    const res = await this.contract.royaltyInfo(cid2Id(cid), salePrice);

    return {
      royaltyAmount: res.royaltyAmount,
      receiver: res.receiver,
    };
  }

  async findMintEvent(cid: CID): Promise<TransferEvent | undefined> {
    return await findEvent(
      "NFTime.Transfer",
      "fromId",
      [AddressZero, cid2Id(cid)._hex],
      "nextunique"
    );
  }

  async redeem(cid: CID, amount: BigNumber): Promise<ContractTransaction> {
    return await this.contract.redeem(cid2Id(cid), amount);
  }
}
