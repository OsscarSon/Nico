const message = new TextEncoder().encode(
  "Nico teaching example: inventory = 12",
);
const otherMessage = new TextEncoder().encode(
  "Nico teaching example: inventory = 11",
);

export async function verifySignature() {
  const subtle = globalThis.crypto.subtle;
  const key = await subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign", "verify"],
  );
  const algorithm = { name: "ECDSA", hash: "SHA-256" };
  const signature = await subtle.sign(algorithm, key.privateKey, message);
  return {
    byteCount: signature.byteLength,
    original: await subtle.verify(algorithm, key.publicKey, signature, message),
    changed: await subtle.verify(
      algorithm,
      key.publicKey,
      signature,
      otherMessage,
    ),
  };
}

export async function authenticatedPair() {
  const subtle = globalThis.crypto.subtle;
  const key = await subtle.generateKey(
    { name: "AES-GCM", length: 128 },
    false,
    ["encrypt", "decrypt"],
  );
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const aad = new TextEncoder().encode("synthetic inventory v1");
  const parameters = { name: "AES-GCM", iv, additionalData: aad };
  const encrypted = await subtle.encrypt(parameters, key, message);
  const recovered = new Uint8Array(
    await subtle.decrypt(parameters, key, encrypted),
  );
  let rejectsModified = false;
  try {
    await subtle.decrypt(
      { ...parameters, additionalData: otherMessage },
      key,
      encrypted,
    );
  } catch (error) {
    if (!(error instanceof DOMException) || error.name !== "OperationError")
      throw error;
    rejectsModified = true;
  }
  return {
    nonceSize: iv.length,
    ciphertextSize: encrypted.byteLength,
    match:
      recovered.length === message.length &&
      recovered.every((byte, i) => byte === message[i]),
    rejectsModified,
  };
}
