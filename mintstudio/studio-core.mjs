// BTX Mint Studio — pure client logic (no DOM, no network, no secrets). Runs unchanged in the browser and
// under bun for tests. The ONE hard requirement: canonicalize() here must be byte-identical to the worker's
// (btx-apps apps/web/src/lib/relics/bza1-mint.ts canonicalize), because the mint request is bound to the
// signing address by nonce = sha256('btx-mintstudio-v1\n' + canonicalize(spec_core)). If the two disagree by
// a single byte, the worker's mandatory nonce assertion fails closed and nothing mints. Keep them in sync.

export const NONCE_PREFIX = "btx-mintstudio-v1\n";
export const REQUEST_KIND = "btx-mintstudio-request";

/* ── canonical serialization (verbatim from bza1-mint.ts) ─────────────────── */
export function canonicalize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new Error("canonical metadata numbers must be safe integers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  if (typeof value !== "object") throw new Error("canonical value must be JSON data");
  const keys = Object.keys(value).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`);
  return `{${parts.join(",")}}`;
}

/* ── hex + hashing ────────────────────────────────────────────────────────── */
export function toHex(bytes) {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}
export function fromHex(hex) {
  const clean = (hex || "").toLowerCase().replace(/[^0-9a-f]/g, "");
  const out = new Uint8Array(clean.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}
export async function sha256Hex(strOrBytes) {
  const bytes = typeof strOrBytes === "string" ? new TextEncoder().encode(strOrBytes) : strOrBytes;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(new Uint8Array(digest));
}

/* ── collection id: ASCII tag packed big-endian into a u64 ────────────────── */
export function collId(tag) {
  let v = 0n;
  const b = new TextEncoder().encode(String(tag).slice(0, 8).padEnd(8, "\0"));
  for (const x of b) v = (v << 8n) | BigInt(x);
  return v;
}
export function collIdHex(tag) {
  return collId(tag).toString(16).padStart(16, "0");
}

/* ── on-chain MINT payload (mirrors encodeMint + opReturnScript) ──────────── */
// Layout: magic(4) ver(1) op(1) collection_id(u64 BE) item_id(u32 BE) flags(1) meta_hash(32) schema(1) = 52.
export function encodeMintPayloadHex({ collectionId, itemId, soulbound, metaHashHex, schema }) {
  const meta = fromHex(metaHashHex);
  if (meta.length !== 32) throw new Error("metaHash must be 32 bytes (64 hex)");
  if (!Number.isInteger(itemId) || itemId < 0 || itemId > 0xffffffff) throw new Error("itemId out of u32 range");
  if (!Number.isInteger(schema) || schema < 0 || schema > 0xff) throw new Error("schema out of u8 range");
  const buf = new Uint8Array(52);
  const view = new DataView(buf.buffer);
  buf.set([0x42, 0x5a, 0x41, 0x31], 0); // "BZA1"
  buf[4] = 0x00; // version
  buf[5] = 0x01; // OP_MINT
  view.setBigUint64(6, BigInt(collectionId));
  view.setUint32(14, itemId);
  buf[18] = soulbound ? 0x01 : 0x00;
  buf.set(meta, 19);
  buf[51] = schema;
  return toHex(buf);
}
export function opReturnScriptHex(payloadHex) {
  const p = fromHex(payloadHex);
  const usesPushdata1 = p.length > 75;
  const script = new Uint8Array((usesPushdata1 ? 3 : 2) + p.length);
  script[0] = 0x6a;
  if (usesPushdata1) { script[1] = 0x4c; script[2] = p.length; script.set(p, 3); }
  else { script[1] = p.length; script.set(p, 2); }
  return toHex(script);
}

/* ── record IPFS CID from a 32-byte commitment (raw CIDv1, sha2-256) ──────── */
const CID_BASE32 = "abcdefghijklmnopqrstuvwxyz234567";
export function recordCidFromCommitment(commitmentHex) {
  const digest = fromHex(commitmentHex);
  if (digest.length !== 32) return null;
  const bytes = [0x01, 0x55, 0x12, 0x20, ...digest];
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8;
    while (bits >= 5) { out += CID_BASE32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += CID_BASE32[(value << (5 - bits)) & 31];
  return "b" + out;
}

/* ── spec_core: the exact object the nonce binds (studio + worker must agree) ── */
// options in: { collectionSlug, collectionName, item(number|null), schema(0|1), soulbound(bool),
//               imageCid(string), glyphHex(string 64), traits(array), name(string), chestSat(int) }
export function buildSpecCore(o) {
  const schema = o.schema === 1 ? 1 : 0;
  const soulbound = !!o.soulbound;
  // soulbound coins can never be opened → the chest is forced to the dust floor (0 extra).
  const chestSat = soulbound ? 0 : Math.max(0, Math.floor(Number(o.chestSat) || 0));
  const spec = {
    collection: {
      id_hex: collIdHex(o.collectionSlug),
      slug: String(o.collectionSlug || ""),
      name: String(o.collectionName || o.collectionSlug || ""),
    },
    item: o.item == null || o.item === "" ? null : Math.floor(Number(o.item)),
    schema,
    flags: { soulbound },
    art: schema === 1
      ? { image_cid: "", glyph_hex: String(o.glyphHex || "").toLowerCase() }
      : { image_cid: String(o.imageCid || ""), glyph_hex: "" },
    traits: Array.isArray(o.traits) ? o.traits : [],
    name: String(o.name || ""),
    chest_sat: chestSat,
  };
  return spec;
}

export async function nonceForSpec(specCore) {
  return sha256Hex(NONCE_PREFIX + canonicalize(specCore));
}

/** Basic client-side validation of a spec_core (the worker re-validates authoritatively). */
export function validateSpecCore(s) {
  const errs = [];
  if (!s.collection?.slug || !/^[\x20-\x7e]{1,8}$/.test(s.collection.slug)) errs.push("collection slug: 1–8 ASCII chars");
  if (s.schema !== 0 && s.schema !== 1) errs.push("schema must be 0 or 1");
  if (s.item != null && (!Number.isInteger(s.item) || s.item < 0 || s.item > 0xffffffff)) errs.push("item out of u32 range");
  if (s.schema === 0) {
    if (!s.art.image_cid) errs.push("schema 0 needs an image CID");
    if (s.art.glyph_hex) errs.push("schema 0 must not carry a glyph");
    if (!s.name) errs.push("name is required");
  } else {
    if (!/^[0-9a-f]{64}$/.test(s.art.glyph_hex)) errs.push("schema 1 needs a 64-hex glyph (16×16)");
    if (s.art.image_cid) errs.push("schema 1 must not carry an image CID");
  }
  if (!Number.isInteger(s.chest_sat) || s.chest_sat < 0) errs.push("chest_sat must be a non-negative integer");
  if (s.flags.soulbound && s.chest_sat > 0) errs.push("a soulbound artifact cannot carry a chest");
  return errs;
}

/** Assemble the copyable mint request the worker consumes. proof = the frozen qID v1 sign-in bundle. */
export function buildMintRequest(specCore, qidProof) {
  return { v: 1, kind: REQUEST_KIND, spec_core: specCore, qid_proof: qidProof };
}
