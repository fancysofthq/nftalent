import { createRouter, createWebHashHistory } from "vue-router";
import { CID } from "multiformats";
import { base32 } from "multiformats/bases/base32";
import Account from "./models/Account";

const Home = () => import("./views/Home.vue");
const Settings = () => import("./views/Settings.vue");
const Mint = () => import("./views/Mint.vue");
const Profile = () => import("./views/Profile.vue");
const ProfileFollowers = () => import("./views/Profile/Followers.vue");
const ProfileFollowees = () => import("./views/Profile/Followees.vue");
const IPFT = () => import("./views/IPFT.vue");
const Explore = () => import("./views/Explore.vue");

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", component: Home },
    { path: "/settings", component: Settings },
    { path: "/mint", component: Mint },
    { path: "/explore", component: Explore },
    {
      path: "/token/:cid(baf[0-7a-zA-Z]{56})",
      component: IPFT,
      meta: { name: "Token" },
      props: (route) => ({
        cid: CID.parse(route.params.cid as string, base32),
      }),
    },
    {
      path: "/:name(\\w+\\.eth|0x[0-9a-fA-F]{40})",
      component: Profile,
      meta: { name: "Profile" },
      props: (route) => {
        if ((route.params.name as string).endsWith(".eth")) {
          return {
            account: Account.getOrCreateFromEnsName(
              route.params.name as string
            ),
          };
        } else {
          return {
            account: Account.getOrCreateFromAddress(
              route.params.name as string
            ),
          };
        }
      },
    },
    {
      path: "/:name(\\w+\\.eth|0x[0-9a-fA-F]{40})/followers",
      component: ProfileFollowers,
      meta: { name: "Followers" },
      props: (route) => {
        if ((route.params.name as string).endsWith(".eth")) {
          return {
            account: Account.getOrCreateFromEnsName(
              route.params.name as string
            ),
          };
        } else {
          return {
            account: Account.getOrCreateFromAddress(
              route.params.name as string
            ),
          };
        }
      },
    },
    {
      path: "/:name(\\w+\\.eth|0x[0-9a-fA-F]{40})/followees",
      component: ProfileFollowees,
      meta: { name: "Followees" },
      props: (route) => {
        if ((route.params.name as string).endsWith(".eth")) {
          return {
            account: Account.getOrCreateFromEnsName(
              route.params.name as string
            ),
          };
        } else {
          return {
            account: Account.getOrCreateFromAddress(
              route.params.name as string
            ),
          };
        }
      },
    },
  ],
});
