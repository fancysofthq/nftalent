import { Ipnft1155 as BaseType } from "./abi/types/Ipnft1155";
import { abi } from "./abi/IPNFT1155.json";
import { BigNumber, BigNumberish, BytesLike, Signer } from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import Account from "../Account";
import { EventDB } from "../event-db";
import { Transfer } from "./IERC1155";
import { Token } from "./IPNFT";

export default class IPNFT1155 {
  static readonly account = new Account(import.meta.env.VITE_IPNFT1155_ADDRESS);
  private readonly _contract: BaseType;

  constructor(providerOrSigner: Provider | Signer) {
    this._contract = new BaseType(
      IPNFT1155.account.address,
      abi,
      providerOrSigner
    );
  }

  sync(edb: EventDB, untilBlock: number) {
    this._syncTransferSingle(edb, untilBlock);
    this._syncTransferBatch(edb, untilBlock);
  }

  async mint(
    to: Account,
    token: Token,
    amount: BigNumberish,
    finalize: boolean,
    data: BytesLike
  ) {
    return await this._contract.mint(
      to.toString(),
      token.id,
      amount,
      finalize,
      data
    );
  }

  async safeTransferFrom(
    from: Account,
    to: Account,
    token: Token,
    amount: BigNumberish,
    data: BytesLike = []
  ) {
    return await this._contract.safeTransferFrom(
      from.toString(),
      to.toString(),
      token.id,
      amount,
      data
    );
  }

  async balanceOf(account: Account, token: Token): Promise<BigNumber> {
    return await this._contract.balanceOf(account.address, token.id);
  }

  async totalSupply(token: Token): Promise<BigNumber> {
    return await this._contract.totalSupply(token.id);
  }

  async finalized(token: Token): Promise<boolean> {
    return await this._contract.isFinalized(token.id);
  }

  private async _syncTransferSingle(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "IPNFT1155.Transfer",
      this._contract,
      this._contract.filters.TransferSingle(null, null, null, null, null),
      (e: any): Transfer => ({
        transactionHash: e.transactionHash,
        blockNumber: e.blockNumber,
        logIndex: e.logIndex,
        subIndex: 0,

        from: (e.args!.from as string).toLowerCase(),
        to: (e.args!.to as string).toLowerCase(),
        id: (e.args!.id as BigNumber)._hex,
        value: (e.args!.value as BigNumber).toBigInt(),
      }),
      untilBlock
    );
  }

  private async _syncTransferBatch(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "IPNFT1155.Transfer",
      this._contract,
      this._contract.filters.TransferBatch(null, null, null, null, null),
      (e: any): Transfer[] =>
        (e.args!.ids as BigNumber[]).map((id, i) => ({
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,
          subIndex: i,

          from: (e.args!.from as string).toLowerCase(),
          to: (e.args!.to as string).toLowerCase(),
          id: id._hex,
          value: (e.args!.values as BigNumber[])[i].toBigInt(),
        })),
      untilBlock
    );
  }
}
