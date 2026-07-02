// identity — a secp256k1 keypair minted IN THE BROWSER, wire-compatible with
// filespace's node-crypto verifier. Users own what they sign; the private key
// never leaves the device.
//
// Compatibility contract (proven by test/crypto.test.js):
//   - publicKey  = hex of the SPKI DER encoding of the EC secp256k1 public key
//                  (the exact format node's createPublicKey().export() produces)
//   - signature  = DER-encoded ECDSA over SHA-256(message), hex
//                  (what node's createVerify('SHA256').verify() expects)
//
// Pure module: no storage, no DOM — runs identically in node tests and browsers.

import { secp256k1 } from '@noble/curves/secp256k1';

// SPKI header for an uncompressed secp256k1 point: SEQUENCE { AlgorithmIdentifier
// { ecPublicKey, secp256k1 }, BIT STRING { 00, 04||X||Y } } — a fixed prefix.
const SPKI_PREFIX = '3056301006072a8648ce3d020106052b8104000a034200';

const bytesToHex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const utf8 = (s) => new TextEncoder().encode(s);

async function sha256(message) {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', utf8(message));
  return new Uint8Array(digest);
}

export function identityFromPrivateHex(privateKey) {
  const point = secp256k1.getPublicKey(privateKey, false); // uncompressed, 65 bytes
  return {
    privateKey,
    publicKey: SPKI_PREFIX + bytesToHex(point),
    async sign(message) {
      const hash = await sha256(typeof message === 'string' ? message : JSON.stringify(message));
      return secp256k1.sign(hash, privateKey).toDERHex();
    },
  };
}

export function newIdentity() {
  return identityFromPrivateHex(bytesToHex(secp256k1.utils.randomPrivateKey()));
}

export const shortKey = (pk) => (pk ? `${pk.slice(-12, -4)}…` : 'anon');
