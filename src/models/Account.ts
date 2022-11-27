import { Address } from "@/services/eth/Address";
import { computed, ComputedRef, markRaw, ref, type Ref } from "vue";
import { resolve as resolveENS } from "@/services/ensideas";

export default class Model {
  readonly address: Ref<Address | undefined>;
  readonly ensName: Ref<string | null | undefined>;

  readonly resolved = computed(() => {
    return this.address.value !== undefined && this.ensName.value !== undefined;
  });

  static fromAddress(address: Address | Uint8Array | Buffer | string): Model {
    if (!(address instanceof Address)) address = new Address(address);
    return new Model(ref(address), ref(undefined));
  }

  static fromENSName(ensName: string): Model {
    return new Model(ref(undefined), ref(ensName));
  }

  private constructor(
    address: Ref<Address | undefined>,
    ensName: Ref<string | undefined>
  ) {
    this.address = address;
    this.ensName = ensName;
  }

  equals(other: Model): boolean {
    return this.address.value?.equals(other.address.value) ?? false;
  }

  async resolve(): Promise<Model> {
    if (this.address.value && this.ensName.value === undefined) {
      this.ensName.value = (
        await resolveENS(this.address.value.toString())
      ).name;
    } else if (this.ensName.value && this.address.value === undefined) {
      this.address.value = new Address(
        (await resolveENS(this.ensName.value)).address
      );
    } else {
      throw new Error("Unresolvable account");
    }

    return this;
  }
}

const memoized = new Map<Address | string, Model>();

export function getOrCreateFromAddress(
  address: Address | Uint8Array | Buffer | string,
  resolve = false
): Model {
  if (!(address instanceof Address)) address = new Address(address);

  if (memoized.has(address)) {
    return memoized.get(address)!;
  }

  const token = markRaw(Model.fromAddress(address));
  memoized.set(address, token);

  if (resolve) token.resolve();
  return token;
}

export function getOrCreateFromEnsName(name: string, resolve = false): Model {
  if (memoized.has(name)) {
    return memoized.get(name)!;
  }

  const token = markRaw(Model.fromENSName(name));
  memoized.set(name, token);

  if (resolve) token.resolve();
  return token;
}
