import { MetaStore as BaseType } from "@/../lib/meta/waffle/types/MetaStore";
import { abi } from "@/../lib/meta/waffle/MetaStore.json";
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
import { EventBase } from "./common";
import { type NFT } from "./NFT";
import IPNFT1155 from "./IPNFT1155";

export class ListingConfig {
  seller: string;
  app: string;
  price: BigNumberish;

  constructor(seller: string, app: string, price: BigNumberish) {
    this.seller = seller;
    this.app = app;
    this.price = price;
  }

  toBytes(): BytesLike {
    return ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256"],
      [this.seller, this.app, this.price]
    );
  }
}

export class Listing {
  static id(token: NFT, seller: Account): BytesLike {
    return ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "address", "address"],
        [token.contract.address, token.id, seller.address, app.address]
      )
    );
  }

  static idHex(token: NFT, seller: Account): string {
    return ethers.utils.hexlify(Listing.id(token, seller));
  }

  static fromRawEvent(e: any): Listing {
    return new Listing({
      token: new ERC1155Token(
        new Account(e.args!.token.contract_ as string),
        e.args!.token.id as BigNumber
      ),
      seller: new Account(e.args!.seller as string),
      app,
      price: e.args!.price as BigNumber,
      stockSize: e.args!.stockSize as BigNumber,
      blockNumber: e.blockNumber as number,
    });
  }

  static fromDBEvent(e: List): Listing {
    return new Listing({
      token: {
        contract: IPNFT1155.account,
        id: BigNumber.from(e.token.id),
      },
      seller: new Account(e.seller),
      app: app,
      price: BigNumber.from(0),
      stockSize: BigNumber.from(0),
      blockNumber: e.blockNumber,
    });
  }

  id: BytesLike;
  token: NFT;
  seller: Account;
  app: Account;
  price: BigNumber;
  stockSize: BigNumber;

  /** The original listing's blockNumber. */
  blockNumber?: number;

  constructor({
    id,
    token,
    seller,
    app,
    price,
    stockSize,
    blockNumber,
  }: {
    id?: BytesLike;
    token: NFT;
    seller: Account;
    app: Account;
    price: BigNumber;
    stockSize: BigNumber;
    blockNumber?: number;
  }) {
    this.id = id || Listing.id(token, seller);
    this.token = token;
    this.seller = seller;
    this.app = app;
    this.price = price;
    this.stockSize = stockSize;
    this.blockNumber = blockNumber;
  }
}

/**
 * Emitted when a listing is created.
 *
 * Solidity mapping:
 *
 * ```solidity
 * event List(NFT token, address indexed seller, address indexed appAddress);
 * ```
 */
export type List = EventBase & {
  token: {
    // contract: string; // NOTE: The contract address is well-known
    id: string;
  };
  seller: string;
  // appAddress: string; // NOTE: It won't contain other app's listings anyway
  listingId: string; // NOTE: Generated
};

/**
 * Emitted when an existing listing is replenished, or created.
 *
 * Solidity mapping:
 *
 * ```solidity
 * event Replenish(
 *     NFT token, // ADHOC: Excessive information.
 *     address indexed appAddress,
 *     bytes32 indexed listingId,
 *     uint256 price,
 *     uint256 amount
 * );
 */
export type Replenish = EventBase & {
  token: {
    // contract: string; // NOTE: The contract address is well-known
    id: string;
  };
  // appAddress: string; // NOTE: It won't contain other app's listings anyway
  listingId: string;
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
 *     NFT token, // ADHOC: Excessive information.
 *     address indexed appAddress,
 *     bytes32 indexed listingId,
 *     address to,
 *     uint256 amount
 * );
 * ```
 */
export type Withdraw = EventBase & {
  token: {
    // contract: string; // NOTE: The contract address is well-known
    id: string;
  };
  // appAddress: string; // NOTE: It won't contain other app's listings anyway
  listingId: string;
  to: string;
  amount: BigInt;
};

/**
 * Emitted when a token is purchased.
 *
 * ```solidity
 * event Purchase(
 *     NFT token, // ADHOC: Excessive information.
 *     bytes32 indexed listingId,
 *     address indexed buyer,
 *     uint256 amount,
 *     uint256 income,
 *     address royaltyAddress,
 *     uint256 royaltyValue,
 *     address indexed appAddress,
 *     uint256 appFee,
 *     uint256 baseFee,
 *     uint256 profit
 * );
 * ```
 */
export type Purchase = EventBase & {
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
  baseFee: BigInt;
  profit: BigInt;
};

export default class MetaStore {
  static readonly account = new Account(
    import.meta.env.VITE_META_STORE_ADDRESS
  );

  readonly contract: BaseType;

  constructor(providerOrSigner: Provider | Signer) {
    this.contract = new BaseType(
      MetaStore.account.address,
      abi,
      providerOrSigner
    );
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
      account.address,
      app.address
    );

    return (await this.contract.queryFilter(filter))
      .reverse()
      .map((e: any) => Listing.fromRawEvent(e));
  }

  async getListing(listingId: BytesLike): Promise<Listing | undefined> {
    const listing = await this.contract.getListing(listingId);

    if (listing.seller === ethers.constants.AddressZero) {
      return undefined;
    }

    return new Listing({
      token: new ERC1155Token(
        new Account(listing.token.contract_),
        listing.token.id
      ),
      seller: new Account(listing.seller),
      app: new Account(listing.app),
      price: listing.price,
      stockSize: listing.stockSize,
    });
  }

  async appEnabled(): Promise<boolean> {
    return this.contract.isAppEnabled(app.address);
  }

  async appActive(): Promise<boolean> {
    return this.contract.isAppActive(app.address);
  }

  async sellerApproved(seller: Account): Promise<boolean> {
    return this.contract.isSellerApproved(app.address, seller.address);
  }

  async findPrimaryListing(token: NFT): Promise<Listing | undefined> {
    const listingId = await this.contract.primaryListingId(
      app.address,
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
      "MetaStore.List",
      ["MetaStore.List", "latestFetchedEventBlock"],
      untilBlock,
      this.contract,
      this.contract.filters.List(null, null, appAddress),
      (e: ethers.Event): List[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          token: { id: (e.args!.token.id as BigNumber)._hex },
          seller: (e.args!.seller as string).toLowerCase(),
          listingId: Listing.idHex(
            new ERC1155Token(
              new Account(e.args!.token.contract_),
              e.args!.token.id
            ),
            new Account(e.args!.seller as string)
          ),
        },
      ]
    );
  }

  private async _syncReplenish(
    edb: EventDB,
    appAddress: string,
    untilBlock: number
  ) {
    await edb.syncEvents(
      "MetaStore.Replenish",
      ["MetaStore.Replenish", "latestFetchedEventBlock"],
      untilBlock,
      this.contract,
      this.contract.filters.Replenish(null, appAddress, null, null, null),
      (e: ethers.Event): Replenish[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          token: {
            id: (e.args!.token.id as BigNumber)._hex,
          },
          listingId: (e.args!.listingId as string).toLowerCase(),
          price: (e.args!.price as BigNumber).toBigInt(),
          amount: (e.args!.amount as BigNumber).toBigInt(),
        },
      ]
    );
  }

  private async _syncWithdraw(
    edb: EventDB,
    appAddress: string,
    untilBlock: number
  ) {
    await edb.syncEvents(
      "MetaStore.Withdraw",
      ["MetaStore.Withdraw", "latestFetchedEventBlock"],
      untilBlock,
      this.contract,
      this.contract.filters.Withdraw(null, appAddress, null, null, null),
      (e: ethers.Event): Withdraw[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          token: {
            id: (e.args!.token.id as BigNumber)._hex,
          },
          listingId: (e.args!.listingId as string).toLowerCase(),
          to: (e.args!.to as string).toLowerCase(),
          amount: (e.args!.amount as BigNumber).toBigInt(),
        },
      ]
    );
  }

  private _syncPurchase(edb: EventDB, appAddress: string, untilBlock: number) {
    edb.syncEvents(
      "MetaStore.Purchase",
      ["MetaStore.Purchase", "latestFetchedEventBlock"],
      untilBlock,
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
        null,
        null
      ),
      (e: ethers.Event): Purchase[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          token: {
            id: (e.args!.token.id as BigNumber)._hex,
          },
          listingId: (e.args!.listingId as string).toLowerCase(),
          buyer: e.args!.buyer.toLowerCase(),
          amount: BigInt(e.args!.amount._hex),
          income: BigInt(e.args!.income._hex),
          royaltyAddress: e.args!.royaltyAddress.toLowerCase(),
          royaltyValue: BigInt(e.args!.royaltyValue._hex),
          appFee: BigInt(e.args!.appFee._hex),
          baseFee: BigInt(e.args!.baseFee._hex),
          profit: BigInt(e.args!.profit._hex),
        },
      ]
    );
  }
}
