import { createRouter, createWebHashHistory } from "vue-router";
import Home from "./view/Home.vue";
import Settings from "./view/Settings.vue";
import Mint from "./view/Mint.vue";
import Profile from "./view/Profile.vue";
import Token from "./view/Token.vue";
import Account from "./service/eth/Account";
import ERC1155Token from "./service/eth/contract/ERC1155Token";
import { BigNumber } from "ethers";

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/settings", component: Settings },
    { path: "/mint", component: Mint },
    {
      path: "/token/:id",
      component: Token,
      meta: { name: "Token" },
      props: (route) => ({
        token: new ERC1155Token(
          new Account(import.meta.env.VITE_IPNFTREDEEMABLE_ADDRESS),
          BigNumber.from(route.params.id)
        ),
      }),
    },
    {
      path: "/:address",
      component: Profile,
      meta: { name: "Profile" },
      props: (route) => ({
        account: new Account(route.params.address as string),
      }),
    },
  ],
});
