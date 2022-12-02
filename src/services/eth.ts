import { ethers } from "ethers";
import { ref, ShallowRef } from "vue";
import Account from "@/models/Account";
import IPFTRedeemable from "./eth/contract/IPFTRedeemable";
import OpenStore from "./eth/contract/OpenStore";
import Persona from "./eth/contract/Persona";
import edb from "./eth/event-db";
import { Address } from "./eth/Address";

const PROVIDER_KEY = "eth.wallet.provider";

export const provider = ref<ethers.providers.Web3Provider | undefined>();
export const account: ShallowRef<Account | undefined> = ref();

export const app = new Address(import.meta.env.VITE_APP_ADDRESS);

export let ipftRedeemable: IPFTRedeemable;
export let openStore: OpenStore;
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

  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: import.meta.env.VITE_CHAIN_ID }],
  });

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
    console.debug("Syncing events until block", untilBlock);

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
