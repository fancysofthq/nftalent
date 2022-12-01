import { OpenStore as BaseType } from "@/../lib/metabazaar/waffle/types/OpenStore";
import { abi } from "@/../lib/metabazaar/waffle/OpenStore.json";
import {
  BigNumber,
  BigNumberish,
  BytesLike,
  ContractTransaction,
  ethers,
  Signer,
} from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import { Token as ERC1155Token } from "./IERC1155";
import { EventDB } from "../event-db";
import { app } from "../../eth";
import { EventBase } from "./common";
import { type NFT } from "./NFT";
import { Address } from "../Address";

export class ListingConfig {
  constructor(
    readonly seller: Address,
    readonly app: Address,
    readonly price: BigNumberish
  ) {}

  toBytes(): BytesLike {
    return ethers.utils.defaultAbiCoder.encode(
      ["address", "address", "uint256"],
      [this.seller.toString(), this.app.toString(), this.price]
    );
  }
}

export class Listing {
  static id(token: NFT, seller: Address): BytesLike {
    return ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "address", "address"],
        [token.contract.toString(), token.id, seller.toString(), app.toString()]
      )
    );
  }

  static idHex(token: NFT, seller: Address): string {
    return ethers.utils.hexlify(Listing.id(token, seller));
  }

  static fromRawEvent(e: any): Listing {
    return new Listing({
      token: new ERC1155Token(
        new Address(e.args!.token.contract_ as string),
        e.args!.token.id as BigNumber
      ),
      seller: new Address(e.args!.seller as string),
      app: new Address(e.args!.app as string),
      price: e.args!.price as BigNumber,
      stockSize: e.args!.stockSize as BigNumber,
      blockNumber: e.blockNumber as number,
    });
  }

  static fromDBEvent(e: List): Listing {
    return new Listing({
      token: {
        contract: new Address(e.token.contract),
        id: BigNumber.from(e.token.id),
      },
      seller: new Address(e.seller),
      app: app,
      price: BigNumber.from(0),
      stockSize: BigNumber.from(0),
      blockNumber: e.blockNumber,
    });
  }

  id: BytesLike;
  token: NFT;
  seller: Address;
  app: Address;
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
    seller: Address;
    app: Address;
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
    contract: string;
    id: string;
  };
  seller: string;
  appAddress: string;
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
    contract: string;
    id: string;
  };
  appAddress: string;
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
    contract: string;
    id: string;
  };
  appAddress: string;
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
 *     uint256 profit
 * );
 * ```
 */
export type Purchase = EventBase & {
  token: {
    contract: string;
    id: string;
  };
  listingId: string;
  buyer: string;
  amount: BigInt;
  income: BigInt;
  royaltyAddress: string;
  royaltyValue: BigInt;
  appAddress: string;
  appFee: BigInt;
  profit: BigInt;
};

export default class OpenStore {
  readonly contract: BaseType;

  constructor(
    public readonly address: Address,
    providerOrSigner: Provider | Signer
  ) {
    this.contract = new BaseType(address.toString(), abi, providerOrSigner);
  }

  sync(edb: EventDB, untilBlock: number) {
    this._syncList(edb, untilBlock);
    this._syncReplenish(edb, untilBlock);
    this._syncWithdraw(edb, untilBlock);
    this._syncPurchase(edb, untilBlock);
  }

  /**
   * Fetch listings by account. It'd include initial price and stock size.
   */
  async listingsByAccount(account: Address): Promise<Listing[]> {
    const filter = this.contract.filters.List(
      null,
      account.toString(),
      app.toString()
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
        new Address(listing.token.contract_),
        listing.token.id
      ),
      seller: new Address(listing.seller),
      app: new Address(listing.app),
      price: listing.price,
      stockSize: listing.stockSize,
    });
  }

  async appEnabled(): Promise<boolean> {
    return this.contract.isAppEnabled(app.toString());
  }

  async appActive(): Promise<boolean> {
    return this.contract.isAppActive(app.toString());
  }

  async sellerApproved(seller: Address): Promise<boolean> {
    return this.contract.isSellerApproved(app.toString(), seller.toString());
  }

  async findPrimaryListing(token: NFT): Promise<Listing | undefined> {
    const listingId = await this.contract.primaryListingId(
      app.toString(),
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

  private async _syncList(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "OpenStore.List",
      ["OpenStore.List", "latestFetchedEventBlock"],
      untilBlock,
      this.contract,
      this.contract.filters.List(null, null, app.toString()),
      (e: ethers.Event): List[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          token: {
            contract: (e.args!.token.contract_ as string).toLowerCase(),
            id: (e.args!.token.id as BigNumber)._hex,
          },
          seller: (e.args!.seller as string).toLowerCase(),
          appAddress: (e.args!.appAddress as string).toLowerCase(),
          listingId: Listing.idHex(
            new ERC1155Token(
              new Address(e.args!.token.contract_),
              e.args!.token.id
            ),
            new Address(e.args!.seller as string)
          ),
        },
      ]
    );
  }

  private async _syncReplenish(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "OpenStore.Replenish",
      ["OpenStore.Replenish", "latestFetchedEventBlock"],
      untilBlock,
      this.contract,
      this.contract.filters.Replenish(null, app.toString(), null, null, null),
      (e: ethers.Event): Replenish[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          token: {
            contract: (e.args!.token.contract_ as string).toLowerCase(),
            id: (e.args!.token.id as BigNumber)._hex,
          },
          listingId: (e.args!.listingId as string).toLowerCase(),
          appAddress: (e.args!.appAddress as string).toLowerCase(),
          price: (e.args!.price as BigNumber).toBigInt(),
          amount: (e.args!.amount as BigNumber).toBigInt(),
        },
      ]
    );
  }

  private async _syncWithdraw(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "OpenStore.Withdraw",
      ["OpenStore.Withdraw", "latestFetchedEventBlock"],
      untilBlock,
      this.contract,
      this.contract.filters.Withdraw(null, app.toString(), null, null, null),
      (e: ethers.Event): Withdraw[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          token: {
            contract: (e.args!.token.contract_ as string).toLowerCase(),
            id: (e.args!.token.id as BigNumber)._hex,
          },
          appAddress: (e.args!.appAddress as string).toLowerCase(),
          listingId: (e.args!.listingId as string).toLowerCase(),
          to: (e.args!.to as string).toLowerCase(),
          amount: (e.args!.amount as BigNumber).toBigInt(),
        },
      ]
    );
  }

  private _syncPurchase(edb: EventDB, untilBlock: number) {
    edb.syncEvents(
      "OpenStore.Purchase",
      ["OpenStore.Purchase", "latestFetchedEventBlock"],
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
        app.toString(),
        null,
        null
      ),
      (e: ethers.Event): Purchase[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          token: {
            contract: (e.args!.token.contract_ as string).toLowerCase(),
            id: (e.args!.token.id as BigNumber)._hex,
          },
          listingId: (e.args!.listingId as string).toLowerCase(),
          buyer: e.args!.buyer.toLowerCase(),
          amount: BigInt(e.args!.amount._hex),
          income: BigInt(e.args!.income._hex),
          royaltyAddress: e.args!.royaltyAddress.toLowerCase(),
          royaltyValue: BigInt(e.args!.royaltyValue._hex),
          appAddress: e.args!.appAddress.toLowerCase(),
          appFee: BigInt(e.args!.appFee._hex),
          profit: BigInt(e.args!.profit._hex),
        },
      ]
    );
  }
}
