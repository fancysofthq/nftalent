import { IpftRedeemable as BaseType } from "@/../lib/ipft/waffle/types/IpftRedeemable";
import { abi } from "@/../lib/ipft/waffle/IPFTRedeemable.json";
import {
  BigNumber,
  BigNumberish,
  BytesLike,
  ContractTransaction,
  ethers,
  Signer,
} from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import { EventDB } from "../event-db";
import * as IERC1155 from "./IERC1155";
import { Address } from "../Address";
import { CID } from "multiformats/cid";
import { Uint8 } from "@/util";
import { EventBase } from "./common";
import { keccak256 } from "@multiformats/sha3";

/**
 * Emitted when an IPFT authorship is {claim}ed.
 *
 * ```solidity
 * event Claim(
 *     address operator,
 *     address indexed author,
 *     uint256 id,
 *     uint32 codec
 * );
 * ```
 */
export type Claim = EventBase & {
  operator: string;
  author: string;
  id: string;
  codec: number;
};

export function fromClaim(event: ethers.Event): Claim {
  return {
    transactionHash: event.transactionHash,
    blockNumber: event.blockNumber,
    logIndex: event.logIndex,

    operator: (event.args!.operator as string).toLowerCase(),
    author: (event.args!.author as string).toLowerCase(),
    id: (event.args!.id as BigNumber)._hex,
    codec: event.args!.codec as number,
  };
}

export default class IPFTRedeemable {
  private readonly _contract: BaseType;

  constructor(
    public readonly address: Address,
    providerOrSigner: Provider | Signer
  ) {
    this._contract = new BaseType(address.toString(), abi, providerOrSigner);
  }

  sync(edb: EventDB, untilBlock: number) {
    this._syncTransferSingle(edb, untilBlock);
    this._syncTransferBatch(edb, untilBlock);
    this._syncClaim(edb, untilBlock);
  }

  async claimMint(
    author: Address,
    cid: CID,
    content: Uint8Array,
    tagOffset: number,
    royalty: Uint8,
    to: Address,
    amount: BigNumberish,
    finalize: boolean,
    expiredAt: Date,
    data: BytesLike
  ): Promise<ContractTransaction> {
    if (cid.multihash.code !== keccak256.code)
      throw new Error("Invalid CID multihash code: " + cid.multihash.code);

    return await this._contract.claimMint(
      cid.multihash.digest,
      {
        author: author.toString(),
        content,
        tagOffset,
        codec: cid.code,
        royalty: royalty.value,
      },
      to.toString(),
      amount,
      finalize,
      expiredAt.valueOf() / 1000,
      data
    );
  }

  async safeTransferFrom(
    from: Address,
    to: Address,
    cid: CID,
    amount: BigNumberish,
    data: BytesLike = []
  ) {
    return await this._contract.safeTransferFrom(
      from.toString(),
      to.toString(),
      cid.multihash.digest,
      amount,
      data
    );
  }

  async codec(id: BigNumberish): Promise<number> {
    return await this._contract.codec(id);
  }

  async author(cid: CID): Promise<Address> {
    return new Address(await this._contract.author(cid.multihash.digest));
  }

  async authorNonce(author: Address): Promise<number> {
    return await this._contract.authorNonce(author.toString());
  }

  async royalty(cid: CID): Promise<Uint8> {
    return new Uint8(await this._contract.royalty(cid.multihash.digest));
  }

  async royaltyNumber(cid: CID): Promise<number> {
    return await this.royalty(cid).then((r) => r.value / Uint8.max.value);
  }

  async balanceOf(account: Address, cid: CID): Promise<BigNumber> {
    return await this._contract.balanceOf(
      account.toString(),
      cid.multihash.digest
    );
  }

  async totalSupply(cid: CID): Promise<BigNumber> {
    return await this._contract.totalSupply(cid.multihash.digest);
  }

  async isFinalized(cid: CID): Promise<boolean> {
    return await this._contract.isFinalized(cid.multihash.digest);
  }

  async expiredAt(cid: CID): Promise<Date> {
    const raw = (
      await this._contract.expiredAt(cid.multihash.digest)
    ).toNumber();

    return new Date(raw * 1000);
  }

  async exists(cid: CID): Promise<boolean> {
    return await this._contract.exists(cid.multihash.digest);
  }

  private async _syncTransferSingle(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "IPFTRedeemable.Transfer",
      ["IPFTRedeemable.Transfer", "latestFetchedEventBlock"],
      untilBlock,
      this._contract,
      this._contract.filters.TransferSingle(null, null, null, null, null),
      (e: ethers.Event): IERC1155.Transfer[] => [IERC1155.fromTransferSingle(e)]
    );
  }

  private async _syncTransferBatch(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "IPFTRedeemable.Transfer",
      ["IPFTRedeemable.Transfer", "latestFetchedEventBlock"],
      untilBlock,
      this._contract,
      this._contract.filters.TransferBatch(null, null, null, null, null),
      (e: any): IERC1155.Transfer[] => IERC1155.fromTransferBatch(e)
    );
  }

  private async _syncClaim(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "IPFTRedeemable.Claim",
      ["IPFTRedeemable.Claim", "latestFetchedEventBlock"],
      untilBlock,
      this._contract,
      this._contract.filters.Claim(null, null, null, null),
      (e: any): Claim[] => [fromClaim(e)]
    );
  }
}
