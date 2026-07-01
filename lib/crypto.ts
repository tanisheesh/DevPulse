const ALG = "AES-GCM";

function b64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function bytesToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(hex.length / 2);
  const arr = new Uint8Array(buf);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}

async function getKey(): Promise<CryptoKey> {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY env var is not set");
  const keyBytes = b64ToBytes(raw).slice(0, 32);
  if (keyBytes.length < 32) throw new Error("TOKEN_ENCRYPTION_KEY is too short (must decode to ≥32 bytes for AES-256-GCM)");
  return crypto.subtle.importKey("raw", keyBytes, ALG, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: ALG, iv }, key, encoded);
  return `${bytesToHex(iv)}:${bytesToHex(new Uint8Array(ciphertext))}`;
}

export async function decryptToken(stored: string): Promise<string> {
  const colonIdx = stored.indexOf(":");
  if (colonIdx === -1) throw new Error("Malformed encrypted token: missing ':' separator");
  const ivHex = stored.slice(0, colonIdx);
  const ctHex = stored.slice(colonIdx + 1);
  if (!ivHex || !ctHex) throw new Error("Malformed encrypted token: empty iv or ciphertext");
  const key = await getKey();
  const plaintext = await crypto.subtle.decrypt(
    { name: ALG, iv: hexToBytes(ivHex) },
    key,
    hexToBytes(ctHex)
  );
  return new TextDecoder().decode(plaintext);
}
