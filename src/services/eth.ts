import { BigNumber, ethers } from "ethers";
import { Ref, ref, ShallowRef } from "vue";
import Account from "@/models/Account";
import IPFTRedeemable from "./eth/contract/IPFTRedeemable";
import OpenStore from "./eth/contract/OpenStore";
import Persona from "./eth/contract/Persona";
import edb from "./eth/event-db";
import { Address } from "./eth/Address";
import { Deferred } from "@/util";

const PROVIDER_KEY = "eth.wallet.provider";

export const provider = ref<ethers.providers.Web3Provider | undefined>();
export const account: ShallowRef<Account | undefined> = ref();
export const balance: Ref<BigNumber | undefined> = ref();

export const app = new Address(import.meta.env.VITE_APP_ADDRESS);

export let ipftRedeemable: IPFTRedeemable;
export let openStore: OpenStore;
export let persona: Persona;

let ethPromise: Deferred<void> | undefined;

export async function tryLogin() {
  const storedProvider = window.localStorage.getItem(PROVIDER_KEY);
  if (storedProvider) login();
}

export async function login() {
  if (!window.ethereum) {
    console.debug("No ethereum provider found, adding listener");

    ethPromise = new Deferred();
    window.addEventListener(
      "ethereum#initialized",
      () => {
        ethPromise?.resolve();
      },
      {
        once: true,
      }
    );
  }

  await ethPromise?.promise;

  // TODO: Allow to select different wallet providers?
  provider.value = new ethers.providers.Web3Provider(window.ethereum, "any");

  const chain: AddEthereumChainParameter = JSON.parse(
    import.meta.env.VITE_CHAIN
  );

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chain.chainId }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      // TODO: Handle the add error.
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [chain],
      });
    } else {
      throw switchError;
    }
  }

  window.localStorage.setItem(PROVIDER_KEY, "generic");

  await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!window.ethereum.selectedAddress)
    throw "Did not select an Ethereum address";

  account.value = Account.getOrCreateFromAddress(
    window.ethereum.selectedAddress
  );
  account.value.resolve();

  provider.value.on("block", () => {
    provider
      .value!.getBalance(account.value!.address.value!.toString())
      .then((b) => {
        if (!balance.value || !b.eq(balance.value)) {
          balance.value = b;
          console.debug("Balance changed to", b.toString());
        }
      });
  });

  // TODO: Detect network change.
  // See https://docs.ethers.io/v5/concepts/best-practices/
  //

  ipftRedeemable = new IPFTRedeemable(
    new Address(import.meta.env.VITE_IPNFT_REDEEMABLE_ADDRESS),
    provider.value.getSigner()
  );

  openStore = new OpenStore(
    new Address(import.meta.env.VITE_OPEN_STORE_ADDRESS),
    provider.value.getSigner()
  );

  persona = new Persona(
    new Address(import.meta.env.VITE_PERSONA_ADDRESS),
    provider.value.getSigner()
  );

  provider.value.getBlockNumber().then((untilBlock) => {
    ipftRedeemable.sync(edb, untilBlock);
    openStore.sync(edb, untilBlock);
    persona.sync(edb, untilBlock, app);
  });

  fireOnConnectCallbacks();
}

export async function logout() {
  window.localStorage.removeItem(PROVIDER_KEY);
  account.value = undefined;
}

type OnConnectCallbackWrapper = {
  readonly callback: () => void;
  cancelled: boolean;
};

const onConnectCallbacks: OnConnectCallbackWrapper[] = [];

function fireOnConnectCallbacks() {
  let i = onConnectCallbacks.length;

  while (i--) {
    const obj = onConnectCallbacks[i];
    if (!obj.cancelled) obj.callback();
    onConnectCallbacks.splice(i, 1);
  }
}

/**
 * Fired upon successfull connection to Ethereum (all contracts ready).
 */
export function onConnect(callback: () => void): () => void {
  const obj: OnConnectCallbackWrapper = { callback, cancelled: false };

  const cancel = () => (obj.cancelled = true);
  onConnectCallbacks.push(obj);

  if (account.value) fireOnConnectCallbacks();

  return cancel;
}
