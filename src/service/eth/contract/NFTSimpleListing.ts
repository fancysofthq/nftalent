import { NftSimpleListing as BaseType } from "./abi/types/NftSimpleListing";
import { abi } from "./abi/NFTSimpleListing.json";
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
import ERC1155Token, { type Metadata as ERC1155Metadata } from "./ERC1155Token";
import db, { findEvent, syncEvents } from "../event-db";
import { Uint8 } from "@/util";

export class ListingConfig {
  price: BigNumber;
  app: Account;
  appPremium: Uint8;

  constructor(price: BigNumber, app: Account, appPremium: Uint8) {
    this.price = price;
    this.app = app;
    this.appPremium = appPremium;
  }

  toBytes(): BytesLike {
    return ethers.utils.defaultAbiCoder.encode(
      ["uint256", "address", "uint8"],
      [this.price, this.app.toString(), this.appPremium.value]
    );
  }
}

export class Listing {
  id: BigNumber;
  seller: Account;
  token: ERC1155Token;
  stockSize: BigNumber;
  config: ListingConfig;
  block?: number;

  constructor(
    id: BigNumber,
    seller: Account,
    token: ERC1155Token,
    stockSize: BigNumber,
    config: ListingConfig,
    block?: number
  ) {
    this.id = id;
    this.seller = seller;
    this.token = token;
    this.stockSize = stockSize;
    this.config = config;
    this.block = block;
  }
}

/**
 * Solidity mapping:
 *
 * ```solidity
 * event List(
 *     uint256 listingId,
 *     address indexed seller,
 *     address indexed app,
 *     uint8 appPremium
 * );
 * ```
 */
export type ListEvent = {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;

  listingId: string; // NOTE: [^1]
  token: {
    // contract: string; // NOTE: The contract address is well-known
    id: string;
  };
  seller: string;
  // app: string; // NOTE: It won't contain other app's listings anyway
  appPremium: number;
};

export function isListEvent(event: any): event is ListEvent {
  return "seller" in event;
}

/**
 * Solidity mapping:
 *
 * ```solidity
 * event Purchase(
 *     address indexed buyer,
 *     uint256 indexed listingId,
 *     uint256 income,
 *     address royaltyAddress,
 *     uint256 royaltyValue,
 *     address indexed appAddress,
 *     uint256 appPremium,
 *     uint256 profit
 * );
 * ```
 */
export type PurchaseEvent = {
  transactionHash: string;
  blockNumber: number;
  logIndex: number;

  buyer: string;
  listingId: string; // NOTE: [^1]
  token: {
    // contract: string; // NOTE: The contract address is well-known
    id: string;
  };
  amount: BigInt;
  income: BigInt;
  royaltyAddress: string;
  royaltyValue: BigInt;
  // appAddress: string; // NOTE: It won't contain other app's listings anyway
  appPremium: BigInt;
  profit: BigInt;
};

export function isPurchaseEvent(event: any): event is PurchaseEvent {
  return "buyer" in event;
}

export default class NFTSimpleListing {
  readonly contract: BaseType;
  readonly account: Account;

  constructor(address: string, providerOrSigner: Provider | Signer) {
    this.contract = new BaseType(address, abi, providerOrSigner);
    this.account = new Account(address);
  }

  sync(untilBlock: number) {
    this.syncListEvents(untilBlock);
    this.syncPurchaseEvents(untilBlock);
  }

  private syncListEvents(untilBlock: number) {
    const listFilter = this.contract.filters.List(
      null,
      null,
      null,
      import.meta.env.VITE_ADDR_APP.toLowerCase(),
      null
    );

    const listMapping = (e: any): ListEvent => ({
      transactionHash: e.transactionHash,
      blockNumber: e.blockNumber,
      logIndex: e.logIndex,

      listingId: e.args!.listingId._hex,
      token: { id: e.args!.token.id._hex },
      seller: e.args!.seller.toLowerCase(),
      appPremium: e.args!.appPremium,
    });

    syncEvents(
      "NFTSimpleListing.List",
      this.contract,
      listFilter,
      listMapping,
      untilBlock
    ).then(() => {
      this.contract.on(listFilter, async (...data) => {
        const e = data[data.length - 1];

        await db.put("NFTSimpleListing.List", listMapping(e));

        await db.put(
          "latestFetchedEventBlock",
          e.blockNumber,
          "NFTSimpleListing.List"
        );
      });
    });
  }

  private syncPurchaseEvents(untilBlock: number) {
    const purchaseFilter = this.contract.filters.Purchase(
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      import.meta.env.VITE_ADDR_APP.toLowerCase(),
      null,
      null
    );

    const purchaseMapping = (e: any): PurchaseEvent => ({
      transactionHash: e.transactionHash,
      blockNumber: e.blockNumber,
      logIndex: e.logIndex,

      buyer: e.args!.buyer.toLowerCase(),
      listingId: e.args!.listingId._hex,
      token: {
        id: e.args!.token.id._hex,
      },
      amount: BigInt(e.args!.amount._hex),
      income: BigInt(e.args!.income._hex),
      royaltyAddress: e.args!.royaltyAddress.toLowerCase(),
      royaltyValue: BigInt(e.args!.royaltyValue._hex),
      appPremium: BigInt(e.args!.appPremium._hex),
      profit: BigInt(e.args!.profit._hex),
    });

    syncEvents(
      "NFTSimpleListing.Purchase",
      this.contract,
      purchaseFilter,
      purchaseMapping,
      untilBlock
    ).then(() => {
      this.contract.on(purchaseFilter, async (...data) => {
        const e = data[data.length - 1];

        await db.put("NFTSimpleListing.Purchase", purchaseMapping(e));

        await db.put(
          "latestFetchedEventBlock",
          e.blockNumber,
          "NFTSimpleListing.Purchase"
        );
      });
    });
  }

  async getListing(listingId: BigNumber): Promise<Listing | null> {
    const listing = await this.contract.getListing(listingId);

    if (listing.seller === ethers.constants.AddressZero) {
      return null;
    }

    return new Listing(
      listingId,
      new Account(listing.seller),
      new ERC1155Token(new Account(listing.token.contract_), listing.token.id),
      listing.stockSize,
      new ListingConfig(
        listing.config.price,
        new Account(listing.config.app),
        new Uint8(listing.config.appPremium)
      ),
      (
        await findEvent(
          "NFTSimpleListing.List",
          "listingId",
          listingId._hex,
          "nextunique"
        )
      )?.blockNumber
    );
  }

  async findPrimaryListing(token: ERC1155Token): Promise<Listing | null> {
    const listingId = await this.contract.primaryListingId(
      token.contract.toString(),
      token.id
    );

    if (listingId.eq(0)) {
      return null;
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
    listingId: BigNumber,
    amount: BigNumber,
    value: BigNumber
  ): Promise<ContractTransaction> {
    return await this.contract.purchase(listingId, amount, { value });
  }
}
