import { ethers } from "ethers";
import { ref, ShallowRef } from "vue";
import * as Account from "@/models/Account";
import IPNFT721 from "./eth/contract/IPNFT721";
import IPNFT1155 from "./eth/contract/IPNFT1155";
import MetaStore from "./eth/contract/MetaStore";
import Persona from "./eth/contract/Persona";
import edb from "./eth/event-db";
import { Address } from "./eth/Address";

const PROVIDER_KEY = "eth.wallet.provider";

export const provider = ref<ethers.providers.Web3Provider | undefined>();
export const account: ShallowRef<Account.default | undefined> = ref();

export const app = new Address(import.meta.env.VITE_APP_ADDRESS);

export let ipnft721: IPNFT721;
export let ipnft1155: IPNFT1155;
export let metaStore: MetaStore;
export let persona: Persona;

export async function tryLogin() {
  const storedProvider = window.localStorage.getItem(PROVIDER_KEY);
  if (storedProvider) login();
}

export async function login() {
  if (!window.ethereum || !window.ethereum.isConnected())
    throw "Ethereum not connected";

  // TODO: Allow to select different wallet providers?
  provider.value = new ethers.providers.Web3Provider(window.ethereum, "any");
  window.localStorage.setItem(PROVIDER_KEY, "generic");

  await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!window.ethereum.selectedAddress)
    throw "Did not select an Ethereum address";

  account.value = Account.getOrCreateFromAddress(
    window.ethereum.selectedAddress
  );
  account.value.resolve();

  // TODO: Detect network change.
  // See https://docs.ethers.io/v5/concepts/best-practices/
  //

  ipnft721 = new IPNFT721(provider.value.getSigner());
  ipnft1155 = new IPNFT1155(provider.value.getSigner());
  metaStore = new MetaStore(provider.value.getSigner());
  persona = new Persona(provider.value.getSigner());

  provider.value.getBlockNumber().then((untilBlock) => {
    console.debug("Syncing events until block", untilBlock);

    ipnft721.sync(edb, untilBlock);
    ipnft1155.sync(edb, untilBlock);
    metaStore.sync(edb, untilBlock);
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
