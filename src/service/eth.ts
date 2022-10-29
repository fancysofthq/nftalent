import { ethers } from "ethers";
import { ref, ShallowRef } from "vue";
import Account from "./eth/Account";
import IPNFTRedeemable from "./eth/contract/IPNFTRedeemable";

export const PROVIDER_KEY = "eth.wallet.provider";

export const account: ShallowRef<Account | undefined> = ref();
export let ipnftRedeemable: IPNFTRedeemable;

export async function login() {
  if (!window.ethereum || !window.ethereum.isConnected())
    throw "Ethereum not connected";

  // TODO: Allow to select different wallet providers?
  const provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  window.localStorage.setItem(PROVIDER_KEY, "generic");

  await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!window.ethereum.selectedAddress)
    throw "Did not select an Ethereum address";

  account.value = new Account(window.ethereum.selectedAddress);

  // TODO: Detect network change.
  // See https://docs.ethers.io/v5/concepts/best-practices/
  //

  // ipnftRedeemable = new IPNFTRedeemable(
  //   import.meta.env.VITE_IPNFTREDEEMABLE_ADDRESS,
  //   provider.getSigner()
  // );
}

export async function logout() {
  window.localStorage.removeItem(PROVIDER_KEY);
  account.value = undefined;
}
