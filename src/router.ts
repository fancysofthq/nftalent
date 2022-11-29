import { createRouter, createWebHashHistory } from "vue-router";
import { CID } from "multiformats";
import { base32 } from "multiformats/bases/base32";
import IPNFT from "./models/IPNFT";
import Account from "./models/Account";

const Home = () => import("./views/Home.vue");
const Settings = () => import("./views/Settings.vue");
const Mint = () => import("./views/Mint.vue");
const Profile = () => import("./views/Profile.vue");
const Token = () => import("./views/Token.vue");
const Explore = () => import("./views/Explore.vue");

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
        ipnft: IPNFT.getOrCreate(CID.parse(route.params.cid as string, base32)),
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
