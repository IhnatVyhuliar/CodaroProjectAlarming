/** Secure store is unavailable in tests — the token layer falls back to memory. */
export async function isAvailableAsync(): Promise<boolean> {
  return false;
}

export async function getItemAsync(): Promise<string | null> {
  return null;
}

export async function setItemAsync(): Promise<void> {
  return undefined;
}

export async function deleteItemAsync(): Promise<void> {
  return undefined;
}
