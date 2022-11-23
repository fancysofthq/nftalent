import { BigNumber, ethers } from "ethers";
import { Ipnft721 as BaseType } from "@/../lib/ipnft/waffle/types/Ipnft721";
import { abi } from "@/../lib/ipnft/waffle/IPNFT721.json";
import { ContractTransaction, Signer } from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import Account from "../Account";
import { indexOfMulti, Uint8 } from "@/util";
import { Buffer } from "buffer";
import { EventDB } from "../event-db";
import { Transfer } from "./IERC721";
import * as IPNFT from "./IPNFT";
import * as Block from "multiformats/block";
import { AddressZero } from "@ethersproject/constants";

export default class IPNFT721 {
  static readonly account = new Account(import.meta.env.VITE_IPNFT721_ADDRESS);
  private readonly _contract: BaseType;

  constructor(providerOrSigner: Provider | Signer) {
    this._contract = new BaseType(
      IPNFT721.account.address,
      abi,
      providerOrSigner
    );
  }

  sync(edb: EventDB, untilBlock: number) {
    this._syncTransfer(edb, untilBlock);
  }

  async mint(
    to: Account,
    content: Block.Block<unknown>,
    tag: IPNFT.Tag,
    royalty: Uint8
  ): Promise<ContractTransaction> {
    const tagOffset = indexOfMulti(content.bytes, tag.bytes);
    if (tagOffset === -1) throw "IPNFT tag not found in root";

    console.debug(Buffer.from(content.bytes).toString("hex"), tagOffset);

    return await this._contract.mint(
      to.toString(),
      content.cid.multihash.digest,
      content.bytes,
      tagOffset,
      royalty.value
    );
  }

  async minterNonce(minter: Account): Promise<number> {
    return await this._contract.minterNonce(minter.toString());
  }

  async isApprovedForAll(owner: Account, operator: Account): Promise<boolean> {
    return await this._contract.isApprovedForAll(
      owner.toString(),
      operator.toString()
    );
  }

  async setApprovalForAll(operator: Account, approved: boolean) {
    return await this._contract.setApprovalForAll(
      operator.toString(),
      approved
    );
  }

  async ownerOf(token: IPNFT.Token): Promise<Account> {
    return new Account(await this._contract.ownerOf(token.id));
  }

  async tokenUri(token: IPNFT.Token): Promise<URL> {
    return new URL(await this._contract.tokenURI(token.id));
  }

  async royalty(token: IPNFT.Token): Promise<Uint8> {
    return new Uint8(await this._contract.royalty(token.id));
  }

  async royaltyNumber(token: IPNFT.Token): Promise<number> {
    return await this.royalty(token).then((r) => r.value / Uint8.max.value);
  }

  private async _syncTransfer(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "IPNFT721.Transfer",
      ["IPNFT721.Transfer", "latestFetchedEventBlock", "IPNFT"],
      untilBlock,
      this._contract,
      this._contract.filters.Transfer(null, null, null),
      (e: ethers.Event): Transfer[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          from: (e.args!.from as string).toLowerCase(),
          to: (e.args!.to as string).toLowerCase(),
          tokenId: (e.args!.tokenId as BigNumber)._hex,
        },
      ],
      undefined,
      async (tx, e: Transfer) => {
        if (e.from === AddressZero) {
          await tx.objectStore("IPNFT").put({
            id: e.tokenId,
            currentOwner: e.to,
            ipnft721MintEvent: [e.blockNumber, e.logIndex],
          });
        }
      }
    );
  }
}
