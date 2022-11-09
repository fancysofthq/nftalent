import { createRouter, createWebHashHistory } from "vue-router";
import Home from "./views/Home.vue";
import Settings from "./views/Settings.vue";
import Mint from "./views/Mint.vue";
import Profile from "./views/Profile.vue";
import Token from "./views/Token.vue";
import Account from "./services/eth/Account";
import { CID } from "multiformats";
import { base32 } from "multiformats/bases/base32";

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/settings", component: Settings },
    { path: "/mint", component: Mint },
    {
      path: "/:cid(baf[0-7a-zA-Z]{56})",
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
