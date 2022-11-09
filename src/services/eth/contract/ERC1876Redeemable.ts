import { Erc1876Redeemable as BaseType } from "./abi/types/Erc1876Redeemable";
import { abi } from "./abi/ERC1876Redeemable.json";
import { BigNumber, BigNumberish, ContractTransaction, Signer } from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import {
  Token as ERC1155Token,
  type Metadata as IERC1155Metadata,
} from "./IERC1155";
import { Token as ERC721Token } from "./IERC721";
import { EventDB } from "../event-db";
import Account from "../Account";

export type Metadata = IERC1155Metadata & {
  $schema: "well-known://nftime/0.1";
  properties: {
    tags: string[];
    /** In milliseconds. */
    duration: number;
    expiresAt: Date;
  };
};

/**
 * ```solidity
 * event Qualify(address operator, uint256 indexed tokenId);
 * ```
 */
export type Qualify = {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;

  operator: string;
  tokenId: string;
};

/**
 * ```solidity
 * event RedeemSingle(
 *     address operator,
 *     address indexed redeemer,
 *     uint256 indexed tokenId,
 *     uint256 amount
 * );
 *
 * event RedeemBatch(
 *     address operator,
 *     address indexed redeemer,
 *     uint256[] indexed tokenIds,
 *     uint256[] amounts
 * );
 * ```
 */
export type Redeem = {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;
  subIndex: number; // NOTE: Would always be 0 for RedeemSingle

  operator: string;
  redeemer: string;
  tokenId: string;
  amount: BigInt;
};

export default class ERC1876Redeemable {
  static readonly account = new Account(
    import.meta.env.VITE_ERC1876_REDEEMABLE_ADDRESS
  );

  private readonly _contract: BaseType;

  constructor(providerOrSigner: Provider | Signer) {
    this._contract = new BaseType(
      ERC1876Redeemable.account.address,
      abi,
      providerOrSigner
    );
  }

  get account() {
    return ERC1876Redeemable.account;
  }

  get address() {
    return ERC1876Redeemable.account.address;
  }

  sync(edb: EventDB, untilBlock: number) {
    this._syncQualify(edb, untilBlock);
    this._syncRedeemSingle(edb, untilBlock);
    this._syncRedeemBatch(edb, untilBlock);
  }

  async qualify(
    tokenId: BigNumberish,
    matureSince: Date,
    expiredAt: Date
  ): Promise<ContractTransaction> {
    return this._contract.qualify(
      tokenId,
      (matureSince.valueOf() / 1000).toFixed(0),
      (expiredAt.valueOf() / 1000).toFixed(0)
    );
  }

  async matureSince(tokenId: BigNumberish): Promise<Date> {
    return new Date(
      (await this._contract.matureSince(tokenId)).toNumber() * 1000
    );
  }

  async expiredAt(tokenId: BigNumberish): Promise<Date> {
    return new Date(
      (await this._contract.expiredAt(tokenId)).toNumber() * 1000
    );
  }

  private async _syncQualify(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "ERC1876Redeemable.Qualify",
      this._contract,
      this._contract.filters.Qualify(null, null),
      (e: any): Qualify => ({
        transactionHash: e.transactionHash,
        blockNumber: e.blockNumber,
        logIndex: e.logIndex,

        operator: (e.args!.operator as string).toLowerCase(),
        tokenId: (e.args!.tokenId as BigNumber)._hex,
      }),
      untilBlock
    );
  }

  private async _syncRedeemSingle(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "ERC1876Redeemable.Redeem",
      this._contract,
      this._contract.filters.RedeemSingle(null, null, null, null),
      (e: any): Redeem => ({
        transactionHash: e.transactionHash,
        blockNumber: e.blockNumber,
        logIndex: e.logIndex,
        subIndex: 0,

        operator: (e.args!.operator as string).toLowerCase(),
        redeemer: (e.args!.redeemer as string).toLowerCase(),
        tokenId: (e.args!.tokenId as BigNumber)._hex,
        amount: (e.args!.amount as BigNumber).toBigInt(),
      }),
      untilBlock
    );
  }

  private async _syncRedeemBatch(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "ERC1876Redeemable.Redeem",
      this._contract,
      this._contract.filters.RedeemBatch(null, null, null, null),
      (e: any): Redeem[] =>
        (e.args!.tokenIds as BigNumber[]).map((id, i) => ({
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,
          subIndex: i,

          operator: (e.args!.operator as string).toLowerCase(),
          redeemer: (e.args!.redeemer as string).toLowerCase(),
          tokenId: (e.args!.tokenIds[i] as BigNumber)._hex,
          amount: (e.args!.amounts[i] as BigNumber).toBigInt(),
        })),
      untilBlock
    );
  }
}
