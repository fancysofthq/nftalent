export type Response = {
  address: string;
  name: string | null;
  displayName: string | null;
  avatar: string | null;
};

/**
 * @param address case-insensitive, starting with `0x`, or a name ending with `.eth`.
 */
export async function resolve(address: string): Promise<Response> {
  return await (
    await fetch(`https://api.ensideas.com/ens/resolve/${address}`)
  ).json();
}
