import { createRouter, createWebHashHistory } from "vue-router";
import Home from "./views/Home.vue";
import Settings from "./views/Settings.vue";
import Mint from "./views/Mint.vue";
import Profile from "./views/Profile.vue";
import Token from "./views/Token.vue";
import { CID } from "multiformats";
import { base32 } from "multiformats/bases/base32";
import { getOrCreate as getOrCreateIPNFT } from "./models/IPNFT";
import * as Account from "./models/Account";
import Explore from "./views/Explore.vue";

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/settings", component: Settings },
    { path: "/mint", component: Mint },
    { path: "/explore", component: Explore },
    {
      path: "/:cid(baf[0-7a-zA-Z]{56})",
      component: Token,
      meta: { name: "Token" },
      props: (route) => ({
        ipnft: getOrCreateIPNFT(CID.parse(route.params.cid as string, base32)),
      }),
    },
    {
      path: "/:name(\\w+\\.eth)",
      component: Profile,
      meta: { name: "Profile" },
      props: (route) => ({
        account: Account.getOrCreateFromEnsName(route.params.name as string),
      }),
    },
    {
      path: "/:address(0x[0-9a-fA-F]{40})",
      component: Profile,
      meta: { name: "Profile" },
      props: (route) => ({
        account: Account.getOrCreateFromAddress(route.params.address as string),
      }),
    },
  ],
});
