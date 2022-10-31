import { ethers } from "ethers";
import { computed, ref, ShallowRef } from "vue";
import Account from "./eth/Account";
import NFTSimpleListing from "./eth/contract/NFTSimpleListing";
import NFTime from "./eth/contract/NFTime";

export const PROVIDER_KEY = "eth.wallet.provider";

export const account: ShallowRef<Account | undefined> = ref();
export const nftimeAddress = import.meta.env.VITE_ADDR_NFTIME;
export let nftime: NFTime;
export let nftSimpleListing: NFTSimpleListing;
export const app = new Account(import.meta.env.VITE_ADDR_APP);
export const provider = ref<ethers.providers.Web3Provider | undefined>();

export async function login() {
  if (!window.ethereum || !window.ethereum.isConnected())
    throw "Ethereum not connected";

  // TODO: Allow to select different wallet providers?
  provider.value = new ethers.providers.Web3Provider(window.ethereum, "any");
  window.localStorage.setItem(PROVIDER_KEY, "generic");

  await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!window.ethereum.selectedAddress)
    throw "Did not select an Ethereum address";

  account.value = new Account(window.ethereum.selectedAddress);

  // TODO: Detect network change.
  // See https://docs.ethers.io/v5/concepts/best-practices/
  //

  nftime = new NFTime(nftimeAddress, provider.value.getSigner());
  nftSimpleListing = new NFTSimpleListing(
    import.meta.env.VITE_ADDR_NFT_SIMPLE_LISTING,
    provider.value.getSigner()
  );

  provider.value.getBlockNumber().then((untilBlock) => {
    console.debug("Syncing events until block", untilBlock);
    nftime.sync(untilBlock);
    nftSimpleListing.sync(untilBlock);
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
