export function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function notNull<T>(object: T | undefined): T {
  return object!;
}
