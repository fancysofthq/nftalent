import { createRouter, createWebHashHistory } from "vue-router";
import Home from "./view/Home.vue";
import Settings from "./view/Settings.vue";
import Mint from "./view/Mint.vue";
import Profile from "./view/Profile.vue";
import Token from "./view/Token.vue";
import Account from "./service/eth/Account";
import ERC1155Token from "./service/eth/contract/ERC1155Token";
import { BigNumber } from "ethers";
import { CID } from "multiformats";
import { base32 } from "multiformats/bases/base32";

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/settings", component: Settings },
    { path: "/mint", component: Mint },
    {
      path: "/:cid(bafy[0-7a-zA-Z]{55})",
      component: Token,
      meta: { name: "Token" },
      props: (route) => ({
        cid: CID.parse(route.params.cid as string, base32),
      }),
    },
    {
      path: "/:address(0x[0-9a-fA-F]{40})",
      component: Profile,
      meta: { name: "Profile" },
      props: (route) => ({
        account: new Account(route.params.address as string),
      }),
    },
  ],
});
