import axios, { AxiosInstance, AxiosResponse } from "axios";
import Web3Token from "web3-token";
import * as eth from "./eth";
import { Address } from "./eth/Address";

const JWT_KEY = "api.jwt";

function jwtKeyFor(address: Address) {
  return `${JWT_KEY}.${address}`;
}

const nonAuthedClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

/**
 * @return {string} JWT
 */
export async function web3Auth(client: AxiosInstance): Promise<string> {
  const signer = eth.provider.value!.getSigner();

  const signature = await Web3Token.sign(
    async (msg: string) => await signer.signMessage(msg),
    "7d"
  );

  const response = await client.post("/v1/auth", null, {
    headers: {
      Authorization: `Web3-Token ${signature}`,
    },
  });

  if (response.status != 201) {
    console.error(response);
    throw new Error("Failed to authenticate");
  }

  const jwt = response.data;
  localStorage.setItem(jwtKeyFor(eth.account.value?.address.value!), jwt);

  return jwt;
}

export function removeAuth(address: Address) {
  localStorage.removeItem(jwtKeyFor(address));
}

export async function yieldAuthedClient(
  callback: (arg0: AxiosInstance) => Promise<AxiosResponse>,
  retryAttempts = 1
): Promise<AxiosResponse> {
  const client = axios.create({ baseURL: import.meta.env.VITE_API_URL });
  let response: AxiosResponse | undefined = undefined;

  while (retryAttempts > 0) {
    let jwt: string | null = localStorage.getItem(
      jwtKeyFor(eth.account.value?.address.value!)
    );
    if (!jwt) jwt = await web3Auth(client);
    if (!jwt) throw new Error("Failed to sign");

    client.defaults.headers.common["Authorization"] = `Bearer ${jwt}`;
    response = await callback(client);

    if (response!.status === 401) {
      localStorage.removeItem(jwtKeyFor(eth.account.value?.address.value!));
      retryAttempts--;
    }

    return response;
  }

  throw new Error("Retry attempts exceeded");
}

export async function isSubscribed(
  from?: Address,
  to?: Address
): Promise<boolean> {
  if (!from && !to) throw new Error("Must provide from or to");

  const response = await nonAuthedClient.get("/v1/subscriptions/", {
    params: {
      from: from?.toString(),
      to: to?.toString(),
    },
  });

  return response.status === 200;
}

export async function subscribe(
  from: Address,
  to: Address
): Promise<AxiosResponse> {
  return await yieldAuthedClient((client) =>
    client.post(`/v1/subscriptions/${from}/${to}`)
  );
}

export async function unsubscribe(
  from: Address,
  to: Address
): Promise<AxiosResponse> {
  return await yieldAuthedClient((client) =>
    client.delete(`/v1/subscriptions/${from}/${to}`)
  );
}

export async function getSubscribers(address: Address): Promise<Address[]> {
  return (
    await nonAuthedClient.get("/v1/subscriptions/", {
      params: {
        to: address.toString(),
      },
    })
  ).data.map((address: string) => new Address(address));
}

export async function getSubscriptions(address: Address): Promise<Address[]> {
  return (
    await nonAuthedClient.get("/v1/subscriptions/", {
      params: {
        from: address.toString(),
      },
    })
  ).data.map((address: string) => new Address(address));
}

export type Collection = {
  id: string;
  title: string;
  desc: string;
  addresses: Address[];
};

export async function getCollections(): Promise<Collection[]> {
  const response = await nonAuthedClient.get("/v1/collections/");

  return response.data.map(
    (c: { id: string; title: string; desc: string; addresses: string[] }) => ({
      id: c.id,
      title: c.title,
      desc: c.desc,
      addresses: c.addresses.map((a: string) => new Address(a)),
    })
  );
}
