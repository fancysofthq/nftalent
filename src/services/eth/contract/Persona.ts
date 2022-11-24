import { BigNumber, ethers } from "ethers";
import { Persona as BaseType } from "@/../lib/meta/waffle/types/Persona";
import { abi } from "@/../lib/meta/waffle/Persona.json";
import { Signer } from "ethers";
import { Provider } from "@ethersproject/abstract-provider";
import AccountModel from "../Account";
import { EventDB, Account as DbAccount } from "../event-db";
import { EventBase } from "./common";
import { NFT } from "./NFT";
import { invalidatePfpCache } from "@/components/shared/PFP.vue";

export type SetBasicPfp = EventBase & {
  account: string;
  contractAddress: string;
  tokenId: string;
};

export type SetBasicBgp = EventBase & {
  account: string;
  contractAddress: string;
  tokenId: string;
};

export type SetBasicPfa = EventBase & {
  account: string;
  pfa: string;
};

export type SetBasicMetadata = EventBase & {
  account: string;
  metadata: Uint8Array;
};

export type SetAppPfp = EventBase & {
  account: string;
  app: string;
  contractAddress: string;
  tokenId: string;
};

export type SetAppBgp = EventBase & {
  account: string;
  app: string;
  contractAddress: string;
  tokenId: string;
};

export type SetAppPfa = EventBase & {
  account: string;
  app: string;
  pfa: string;
};

export type SetAppMetadata = EventBase & {
  account: string;
  app: string;
  metadata: Uint8Array;
};

export default class Persona {
  static readonly account = new AccountModel(
    import.meta.env.VITE_PERSONA_ADDRESS
  );
  private readonly _contract: BaseType;

  constructor(providerOrSigner: Provider | Signer) {
    this._contract = new BaseType(
      Persona.account.address,
      abi,
      providerOrSigner
    );
  }

  sync(edb: EventDB, untilBlock: number, app: string) {
    this._syncBasicPfp(edb, untilBlock);
    this._syncBasicBgp(edb, untilBlock);
    this._syncBasicPfa(edb, untilBlock);
    this._syncBasicMetadata(edb, untilBlock);
    this._syncAppPfp(edb, untilBlock, app);
    this._syncAppBgp(edb, untilBlock, app);
    this._syncAppPfa(edb, untilBlock, app);
    this._syncAppMetadata(edb, untilBlock, app);
  }

  async setPfp(token: NFT) {
    return this._contract.setBasicPfp(token.contract.address, token.id);
  }

  async setPfa(pfa: string) {
    return this._contract.setBasicPfa(pfa);
  }

  private async _syncBasicPfp(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "Persona.SetBasicPfp",
      ["Persona.SetBasicPfp", "latestFetchedEventBlock", "Account"],
      untilBlock,
      this._contract,
      this._contract.filters.SetBasicPfp(null, null, null),
      (e: ethers.Event): SetBasicPfp[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          account: (e.args!.account as string).toLowerCase(),
          contractAddress: (e.args!.contractAddress as string).toLowerCase(),
          tokenId: (e.args!.tokenId as BigNumber)._hex,
        },
      ],
      undefined,
      async (tx, e: SetBasicPfp) => {
        let account = await tx.objectStore("Account").get(e.account);

        account ||= {
          address: e.account,
          personas: { apps: {} },
        } as DbAccount;

        (account.personas.basic ||= {}).pfp = {
          contractAddress: e.contractAddress,
          tokenId: e.tokenId,
        };

        await tx.objectStore("Account").put(account);
        invalidatePfpCache(e.account);
      }
    );
  }

  private async _syncBasicBgp(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "Persona.SetBasicBgp",
      ["Persona.SetBasicBgp", "latestFetchedEventBlock", "Account"],
      untilBlock,
      this._contract,
      this._contract.filters.SetBasicBgp(null, null, null),
      (e: ethers.Event): SetBasicBgp[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          account: (e.args!.account as string).toLowerCase(),
          contractAddress: (e.args!.contractAddress as string).toLowerCase(),
          tokenId: (e.args!.tokenId as BigNumber)._hex,
        },
      ],
      undefined,
      async (tx, e: SetBasicBgp) => {
        let account = await tx.objectStore("Account").get(e.account);

        account ||= {
          address: e.account,
          personas: { apps: {} },
        } as DbAccount;

        (account.personas.basic ||= {}).bgp = {
          contractAddress: e.contractAddress,
          tokenId: e.tokenId,
        };

        await tx.objectStore("Account").put(account);
      }
    );
  }

  private async _syncBasicPfa(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "Persona.SetBasicPfa",
      ["Persona.SetBasicPfa", "latestFetchedEventBlock", "Account"],
      untilBlock,
      this._contract,
      this._contract.filters.SetBasicPfa(null, null),
      (e: ethers.Event): SetBasicPfa[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          account: (e.args!.account as string).toLowerCase(),
          pfa: e.args!.pfa as string,
        },
      ],
      undefined,
      async (tx, e: SetBasicPfa) => {
        let account = await tx.objectStore("Account").get(e.account);

        account ||= {
          address: e.account,
          personas: { apps: {} },
        } as DbAccount;

        (account.personas.basic ||= {}).pfa = e.pfa;

        await tx.objectStore("Account").put(account);
      }
    );
  }

  private async _syncBasicMetadata(edb: EventDB, untilBlock: number) {
    await edb.syncEvents(
      "Persona.SetBasicMetadata",
      ["Persona.SetBasicMetadata", "latestFetchedEventBlock", "Account"],
      untilBlock,
      this._contract,
      this._contract.filters.SetBasicMetadata(null, null),
      (e: ethers.Event): SetBasicMetadata[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          account: (e.args!.account as string).toLowerCase(),
          metadata: e.args!.metadata as Uint8Array,
        },
      ],
      undefined,
      async (tx, e: SetBasicMetadata) => {
        let account = await tx.objectStore("Account").get(e.account);

        account ||= {
          address: e.account,
          personas: { apps: {} },
        } as DbAccount;

        (account.personas.basic ||= {}).metadata = e.metadata;

        await tx.objectStore("Account").put(account);
      }
    );
  }

  private async _syncAppPfp(edb: EventDB, untilBlock: number, app: string) {
    await edb.syncEvents(
      "Persona.SetAppPfp",
      ["Persona.SetAppPfp", "latestFetchedEventBlock", "Account"],
      untilBlock,
      this._contract,
      this._contract.filters.SetAppPfp(null, app, null, null),
      (e: ethers.Event): SetAppPfp[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          account: (e.args!.account as string).toLowerCase(),
          app: e.args!.app as string,
          contractAddress: (e.args!.contractAddress as string).toLowerCase(),
          tokenId: (e.args!.tokenId as BigNumber)._hex,
        },
      ],
      undefined,
      async (tx, e: SetAppPfp) => {
        let account = await tx.objectStore("Account").get(e.account);

        account ||= {
          address: e.account,
          personas: { apps: {} },
        } as DbAccount;

        (account.personas.apps[app] ||= {}).pfp = {
          contractAddress: e.contractAddress,
          tokenId: e.tokenId,
        };

        await tx.objectStore("Account").put(account);
      }
    );
  }

  private async _syncAppBgp(edb: EventDB, untilBlock: number, app: string) {
    await edb.syncEvents(
      "Persona.SetAppBgp",
      ["Persona.SetAppBgp", "latestFetchedEventBlock", "Account"],
      untilBlock,
      this._contract,
      this._contract.filters.SetAppBgp(null, app, null, null),
      (e: ethers.Event): SetAppBgp[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          account: (e.args!.account as string).toLowerCase(),
          app: e.args!.app as string,
          contractAddress: (e.args!.contractAddress as string).toLowerCase(),
          tokenId: (e.args!.tokenId as BigNumber)._hex,
        },
      ],
      undefined,
      async (tx, e: SetAppBgp) => {
        let account = await tx.objectStore("Account").get(e.account);

        account ||= {
          address: e.account,
          personas: { apps: {} },
        } as DbAccount;

        (account.personas.apps[app] ||= {}).bgp = {
          contractAddress: e.contractAddress,
          tokenId: e.tokenId,
        };

        await tx.objectStore("Account").put(account);
        invalidatePfpCache(e.account);
      }
    );
  }

  private async _syncAppPfa(edb: EventDB, untilBlock: number, app: string) {
    await edb.syncEvents(
      "Persona.SetAppPfa",
      ["Persona.SetAppPfa", "latestFetchedEventBlock", "Account"],
      untilBlock,
      this._contract,
      this._contract.filters.SetAppPfa(null, app, null),
      (e: ethers.Event): SetAppPfa[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          account: (e.args!.account as string).toLowerCase(),
          app: e.args!.app as string,
          pfa: e.args!.pfa as string,
        },
      ],
      undefined,
      async (tx, e: SetAppPfa) => {
        let account = await tx.objectStore("Account").get(e.account);

        account ||= {
          address: e.account,
          personas: { apps: {} },
        } as DbAccount;

        (account.personas.apps[app] ||= {}).pfa = e.pfa;

        await tx.objectStore("Account").put(account);
      }
    );
  }

  private async _syncAppMetadata(
    edb: EventDB,
    untilBlock: number,
    app: string
  ) {
    await edb.syncEvents(
      "Persona.SetAppMetadata",
      ["Persona.SetAppMetadata", "latestFetchedEventBlock", "Account"],
      untilBlock,
      this._contract,
      this._contract.filters.SetAppMetadata(null, app, null),
      (e: ethers.Event): SetAppMetadata[] => [
        {
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          logIndex: e.logIndex,

          account: (e.args!.account as string).toLowerCase(),
          app: e.args!.app as string,
          metadata: e.args!.metadata as Uint8Array,
        },
      ],
      undefined,
      async (tx, e: SetAppMetadata) => {
        let account = await tx.objectStore("Account").get(e.account);

        account ||= {
          address: e.account,
          personas: { apps: {} },
        } as DbAccount;

        (account.personas.apps[app] ||= {}).metadata = e.metadata;

        await tx.objectStore("Account").put(account);
      }
    );
  }
}
