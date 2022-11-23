import { IpnftRedeemable as BaseType } from "@/../lib/ipnft/waffle/types/IpnftRedeemable";
import { abi } from "@/../lib/ipnft/waffle/IPNFT1155.json";
import { BigNumber, BigNumberish, BytesLike, ethers, Signer } from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import Account from "../Account";
import { EventDB } from "../event-db";
import { Transfer } from "./IERC1155";
import * as IPNFT from "./IPNFT";
import { AddressZero } from "@ethersproject/constants";

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
    token: IPNFT.Token,
    amount: BigNumberish,
    finalize: boolean,
    expiredAt: Date | undefined,
    data: BytesLike
  ) {
    return await this._contract.mint(
      to.toString(),
      token.id,
      amount,
      finalize,
      expiredAt ? Math.round(expiredAt.valueOf() / 1000) : 0,
      data
    );
  }

  async safeTransferFrom(
    from: Account,
    to: Account,
    token: IPNFT.Token,
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

  async balanceOf(account: Account, token: IPNFT.Token): Promise<BigNumber> {
    return await this._contract.balanceOf(account.address, token.id);
  }

  async totalSupply(token: IPNFT.Token): Promise<BigNumber> {
    return await this._contract.totalSupply(token.id);
  }

  async isFinalized(token: IPNFT.Token): Promise<boolean> {
    return await this._contract.isFinalized(token.id);
  }

  async expiredAt(token: IPNFT.Token): Promise<Date | null> {
    const raw = (await this._contract.expiredAt(token.id)).toNumber();
    if (raw === 0) return null;
    else return new Date(raw * 1000);
  }

  private async _syncTransferSingle(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "IPNFT1155.Transfer",
      ["IPNFT1155.Transfer", "latestFetchedEventBlock", "IPNFT"],
      untilBlock,
      this._contract,
      this._contract.filters.TransferSingle(null, null, null, null, null),
      (e: ethers.Event): Transfer[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,
          subIndex: 0,

          from: (e.args!.from as string).toLowerCase(),
          to: (e.args!.to as string).toLowerCase(),
          id: (e.args!.id as BigNumber)._hex,
          value: (e.args!.value as BigNumber).toBigInt(),
        },
      ],
      async (
        e: Transfer
      ): Promise<{ expiredAt?: Date; isFinalized?: boolean } | undefined> => {
        if (e.from == AddressZero) {
          const token = new IPNFT.Token(
            IPNFT.uint256ToCID(BigNumber.from(e.id))
          );

          let expiredAt, isFinalized;

          await Promise.all([
            this.expiredAt(token).then((_expiredAt) => {
              expiredAt = _expiredAt;
            }),
            this.isFinalized(token).then((_isFinalized) => {
              isFinalized = _isFinalized;
            }),
          ]);

          return { expiredAt, isFinalized };
        }
      },
      async (tx, e: Transfer, iter) => {
        if (iter) {
          const tokenObj = await tx.objectStore("IPNFT").get(e.id);
          if (!tokenObj) throw new Error("IPNFT not found with id " + e.id);

          tokenObj.ipnft1155ExpiredAt = iter.expiredAt;
          tokenObj.ipnft1155IsFinalized = iter.isFinalized;

          await tx.objectStore("IPNFT").put(tokenObj);
        }
      }
    );
  }

  private async _syncTransferBatch(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "IPNFT1155.Transfer",
      ["IPNFT1155.Transfer", "latestFetchedEventBlock", "IPNFT"],
      untilBlock,
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
      async (
        e: Transfer
      ): Promise<
        { expiredAt: Date | null; isFinalized: boolean } | undefined
      > => {
        if (e.from == AddressZero) {
          const token = new IPNFT.Token(
            IPNFT.uint256ToCID(BigNumber.from(e.id))
          );

          let expiredAt: Date | null, isFinalized: boolean;

          await Promise.all([
            this.expiredAt(token).then((_expiredAt) => {
              expiredAt = _expiredAt;
            }),
            this.isFinalized(token).then((_isFinalized) => {
              isFinalized = _isFinalized;
            }),
          ]);

          return { expiredAt: expiredAt!, isFinalized: isFinalized! };
        }
      },
      async (tx, e: Transfer, iter) => {
        if (iter) {
          const tokenObj = await tx.objectStore("IPNFT").get(e.id);
          if (!tokenObj) throw new Error("IPNFT not found with id " + e.id);

          tokenObj.ipnft1155ExpiredAt = iter.expiredAt;
          tokenObj.ipnft1155IsFinalized = iter.isFinalized;

          await tx.objectStore("IPNFT").put(tokenObj);
        }
      }
    );
  }
}
