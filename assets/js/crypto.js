/* WOLFPACK newsletter — issue encryption.
 * Classic script: exposes window.WP.crypto.
 *
 * File format (issues/<id>.enc):
 *   bytes 0-3   "WPK1"            magic + format version
 *   bytes 4-19  salt (16 bytes)   random, PBKDF2
 *   bytes 20-31 iv   (12 bytes)   random, AES-GCM
 *   bytes 32-   AES-256-GCM ciphertext of the UTF-8 JSON bundle (tag appended)
 *
 * Key = PBKDF2-SHA256(passphrase, salt, 600 000 iterations, 256 bits).
 * The repo and the public URL only ever hold these bytes. Anyone can download
 * them, so the passphrase must be long: short numeric PINs are crackable offline.
 */
(function () {
  "use strict";
  const WP = (window.WP = window.WP || {});

  const MAGIC = [0x57, 0x50, 0x4b, 0x31]; // "WPK1"
  const ITERATIONS = 600000;
  const MIN_PASSPHRASE = 10;
  const SALT_LEN = 16;
  const IV_LEN = 12;

  const subtle = (window.crypto && window.crypto.subtle) || null;

  function available() {
    return !!subtle;
  }

  async function deriveKey(passphrase, salt) {
    const base = await subtle.importKey("raw", new TextEncoder().encode(passphrase.normalize("NFKC")), "PBKDF2", false, ["deriveKey"]);
    return subtle.deriveKey(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  function checkPassphrase(p) {
    if (typeof p !== "string" || p.length < MIN_PASSPHRASE) {
      throw new Error(`Passphrase must be at least ${MIN_PASSPHRASE} characters.`);
    }
    if (/^\d+$/.test(p)) throw new Error("Passphrase cannot be digits only.");
  }

  /** obj -> Uint8Array */
  async function encryptBundle(obj, passphrase) {
    if (!available()) throw new Error("WebCrypto is not available in this browser.");
    checkPassphrase(passphrase);
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const key = await deriveKey(passphrase, salt);
    const plain = new TextEncoder().encode(JSON.stringify(obj));
    const ct = new Uint8Array(await subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
    const out = new Uint8Array(4 + SALT_LEN + IV_LEN + ct.length);
    out.set(MAGIC, 0);
    out.set(salt, 4);
    out.set(iv, 4 + SALT_LEN);
    out.set(ct, 4 + SALT_LEN + IV_LEN);
    return out;
  }

  /** Uint8Array|ArrayBuffer -> obj. Throws Error("WRONG_PIN") on bad passphrase. */
  async function decryptBundle(bytes, passphrase) {
    if (!available()) throw new Error("WebCrypto is not available in this browser.");
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (u8.length < 4 + SALT_LEN + IV_LEN + 16 || !MAGIC.every((b, i) => u8[i] === b)) {
      throw new Error("NOT_A_BUNDLE");
    }
    const salt = u8.slice(4, 4 + SALT_LEN);
    const iv = u8.slice(4 + SALT_LEN, 4 + SALT_LEN + IV_LEN);
    const ct = u8.slice(4 + SALT_LEN + IV_LEN);
    const key = await deriveKey(passphrase || "", salt);
    let plain;
    try {
      plain = await subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    } catch (_) {
      throw new Error("WRONG_PIN");
    }
    return JSON.parse(new TextDecoder().decode(plain));
  }

  WP.crypto = { available, encryptBundle, decryptBundle, checkPassphrase, MIN_PASSPHRASE, ITERATIONS };
})();
