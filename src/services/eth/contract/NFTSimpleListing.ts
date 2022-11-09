import { NftSimpleListing as BaseType } from "./abi/types/NftSimpleListing";
import { abi } from "./abi/NFTSimpleListing.json";
import {
  BigNumber,
  BigNumberish,
  BytesLike,
  ContractTransaction,
  ethers,
  Signer,
} from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import Account from "../Account";
import { Token as ERC1155Token } from "./IERC1155";
import { EventDB } from "../event-db";
import { app } from "../../eth";
import IPNFT1155 from "./IPNFT1155";

export class ListingConfig {
  price: BigNumberish;
  app: string;

  constructor(price: BigNumberish, app: string) {
    this.price = price;
    this.app = app;
  }

  toBytes(): BytesLike {
    return ethers.utils.defaultAbiCoder.encode(
      ["address", "uint256"],
      [this.app.toString(), this.price]
    );
  }
}

export class Listing {
  static id(token: ERC1155Token, seller: Account): BytesLike {
    console.debug(
      "Listing.id",
      token.contract.address,
      seller.address,
      app.address
    );
    return ethers.utils.solidityKeccak256(
      ["address", "uint256", "address", "address"],
      [token.contract.address, token.id, seller.address, app.address]
    );
  }

  id: BytesLike;
  token: ERC1155Token;
  seller: Account;
  app: Account;
  price: BigNumber;
  stockSize: BigNumber;

  /** The original listing's block. */
  block?: number;

  constructor(
    id: BytesLike,
    token: ERC1155Token,
    seller: Account,
    app: Account,
    price: BigNumber,
    stockSize: BigNumber,
    block?: number
  ) {
    this.id = id;
    this.token = token;
    this.seller = seller;
    this.app = app;
    this.price = price;
    this.stockSize = stockSize;
    this.block = block;
  }
}

/**
 * Emitted when a listing is created.
 *
 * Solidity mapping:
 *
 * ```solidity
 * event List(
 *     address operator,
 *     NFT indexed token,
 *     address indexed seller,
 *     address indexed appAddress,
 *     bytes32 listingId,
 *     uint256 price,
 *     uint256 stockSize
 * );
 * ```
 */
export type List = {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;

  operator: string;
  token: {
    // contract: string; // NOTE: The contract address is well-known
    id: string;
  };
  seller: string;
  // appAddress: string; // NOTE: It won't contain other app's listings anyway
  listingId: string;
  price: BigInt;
  stockSize: BigInt;
};

/**
 * Emitted when an existing listing is replenished, or created.
 *
 * Solidity mapping:
 *
 * ```solidity
 * event Replenish(
 *     NFT token,
 *     address indexed appAddress,
 *     bytes32 indexed listingId,
 *     address operator,
 *     uint256 price,
 *     uint256 amount
 * );
 */
export type Replenish = {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;

  token: {
    // contract: string; // NOTE: The contract address is well-known
    id: string;
  };
  // appAddress: string; // NOTE: It won't contain other app's listings anyway
  listingId: string;
  operator: string;
  price: BigInt;
  amount: BigInt;
};

/**
 * Emitted when a token is withdrawn from a listing.
 *
 * Solidity mapping:
 *
 * ```solidity
 * event Withdraw(
 *     NFT token,
 *     address indexed appAddress,
 *     bytes32 indexed listingId,
 *     address to,
 *     uint256 amount
 * );
 * ```
 */
export type Withdraw = {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;

  token: {
    // contract: string; // NOTE: The contract address is well-known
    id: string;
  };
  // appAddress: string; // NOTE: It won't contain other app's listings anyway
  listingId: string;
  operator: string;
  to: string;
  amount: BigInt;
};

/**
 * Emitted when a token is purchased.
 *
 * ```solidity
 * event Purchase(
 *     NFT token,
 *     bytes32 indexed listingId,
 *     address indexed buyer,
 *     uint256 amount,
 *     uint256 income,
 *     address royaltyAddress,
 *     uint256 royaltyValue,
 *     address indexed appAddress,
 *     uint256 appFee,
 *     uint256 profit
 * );
 * ```
 */
export type Purchase = {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;

  token: {
    // contract: string; // NOTE: The contract address is well-known
    id: string;
  };
  listingId: string;
  buyer: string;
  amount: BigInt;
  income: BigInt;
  royaltyAddress: string;
  royaltyValue: BigInt;
  // appAddress: string; // NOTE: It won't contain other app's listings anyway
  appFee: BigInt;
  profit: BigInt;
};

export default class NFTSimpleListing {
  static readonly account = new Account(
    import.meta.env.VITE_NFT_SIMPLE_LISTING_ADDRESS
  );

  readonly contract: BaseType;

  constructor(providerOrSigner: Provider | Signer) {
    this.contract = new BaseType(
      NFTSimpleListing.account.address,
      abi,
      providerOrSigner
    );
  }

  get address(): string {
    return NFTSimpleListing.account.address;
  }

  sync(edb: EventDB, appAddress: string, untilBlock: number) {
    this._syncList(edb, appAddress, untilBlock);
    this._syncReplenish(edb, appAddress, untilBlock);
    this._syncWithdraw(edb, appAddress, untilBlock);
    this._syncPurchase(edb, appAddress, untilBlock);
  }

  /**
   * Fetch listings by account. It'd include initial price and stock size.
   */
  async listingsByAccount(account: Account): Promise<Listing[]> {
    const filter = this.contract.filters.List(
      null,
      null,
      account.address,
      app.address,
      null,
      null,
      null
    );

    const mapping = (e: any) =>
      new Listing(
        e.args!.listingId as string,
        new ERC1155Token(
          new Account(e.args!.token.contract_ as string),
          e.args!.token.id as BigNumber
        ),
        new Account(e.args!.seller as string),
        app,
        e.args!.price as BigNumber,
        e.args!.stockSize as BigNumber,
        e.blockNumber
      );

    return (await this.contract.queryFilter(filter)).reverse().map(mapping);
  }

  async getListing(listingId: BytesLike): Promise<Listing | undefined> {
    const listing = await this.contract.getListing(listingId);

    if (listing.seller === ethers.constants.AddressZero) {
      return undefined;
    }

    return new Listing(
      listingId,
      new ERC1155Token(new Account(listing.token.contract_), listing.token.id),
      new Account(listing.seller),
      new Account(listing.app),
      listing.price,
      listing.stockSize
    );
  }

  async findPrimaryListing(token: ERC1155Token): Promise<Listing | undefined> {
    const listingId = await this.contract.primaryListingId(
      token.contract.toString(),
      token.id
    );

    if (listingId === ethers.constants.HashZero) {
      return undefined;
    }

    return await this.getListing(listingId);
  }

  /**
   * Purchase tokens from a listing.
   * @param listingId
   * @param amount of tokens to purchase
   * @param value in wei
   * @returns Receipt
   */
  async purchase(
    listingId: BytesLike,
    amount: BigNumberish,
    value: BigNumberish
  ): Promise<ContractTransaction> {
    return await this.contract.purchase(listingId, amount, { value });
  }

  private async _syncList(
    edb: EventDB,
    appAddress: string,
    untilBlock: number
  ) {
    await edb.syncEvents(
      "NFTSimpleListing.List",
      this.contract,
      this.contract.filters.List(
        null,
        null,
        null,
        appAddress,
        null,
        null,
        null
      ),
      (e: any): List => ({
        transactionHash: e.transactionHash,
        blockNumber: e.blockNumber,
        logIndex: e.logIndex,

        operator: (e.args!.operator as string).toLowerCase(),
        token: { id: (e.args!.token.id as BigNumber)._hex },
        seller: (e.args!.seller as string).toLowerCase(),
        listingId: (e.args!.listingId as string).toLowerCase(),
        price: (e.args!.price as BigNumber).toBigInt(),
        stockSize: (e.args!.stockSize as BigNumber).toBigInt(),
      }),
      untilBlock
    );
  }

  private async _syncReplenish(
    edb: EventDB,
    appAddress: string,
    untilBlock: number
  ) {
    await edb.syncEvents(
      "NFTSimpleListing.Replenish",
      this.contract,
      this.contract.filters.Replenish(null, appAddress, null, null, null, null),
      (e: any): Replenish => ({
        transactionHash: e.transactionHash,
        blockNumber: e.blockNumber,
        logIndex: e.logIndex,

        token: {
          id: (e.args!.token.id as BigNumber)._hex,
        },
        listingId: (e.args!.listingId as string).toLowerCase(),
        operator: (e.args!.operator as string).toLowerCase(),
        price: (e.args!.price as BigNumber).toBigInt(),
        amount: (e.args!.amount as BigNumber).toBigInt(),
      }),
      untilBlock
    );
  }

  private async _syncWithdraw(
    edb: EventDB,
    appAddress: string,
    untilBlock: number
  ) {
    await edb.syncEvents(
      "NFTSimpleListing.Withdraw",
      this.contract,
      this.contract.filters.Withdraw(null, appAddress, null, null, null, null),
      (e: any): Withdraw => ({
        transactionHash: e.transactionHash,
        blockNumber: e.blockNumber,
        logIndex: e.logIndex,

        token: {
          id: (e.args!.token.id as BigNumber)._hex,
        },
        listingId: (e.args!.listingId as string).toLowerCase(),
        operator: (e.args!.operator as string).toLowerCase(),
        to: (e.args!.to as string).toLowerCase(),
        amount: (e.args!.amount as BigNumber).toBigInt(),
      }),
      untilBlock
    );
  }

  private _syncPurchase(edb: EventDB, appAddress: string, untilBlock: number) {
    edb.syncEvents(
      "NFTSimpleListing.Purchase",
      this.contract,
      this.contract.filters.Purchase(
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        appAddress,
        null,
        null
      ),
      (e: any): Purchase => ({
        transactionHash: e.transactionHash,
        blockNumber: e.blockNumber,
        logIndex: e.logIndex,

        token: {
          id: (e.args!.token.id as BigNumber)._hex,
        },
        listingId: e.args!.listingId._hex,
        buyer: e.args!.buyer.toLowerCase(),
        amount: BigInt(e.args!.amount._hex),
        income: BigInt(e.args!.income._hex),
        royaltyAddress: e.args!.royaltyAddress.toLowerCase(),
        royaltyValue: BigInt(e.args!.royaltyValue._hex),
        appFee: BigInt(e.args!.appFee._hex),
        profit: BigInt(e.args!.profit._hex),
      }),
      untilBlock
    );
  }
}
