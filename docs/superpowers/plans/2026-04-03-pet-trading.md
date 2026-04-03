# Pet Trading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a decentralized pet trading marketplace — users can browse, trade, and gift pets via Cloudflare Worker (signaling/listings) + WebRTC (direct connection) + Ed25519 (digital signatures).

**Architecture:** Rust handles identity (Ed25519 key pair), inventory (file CRUD on `~/.pets/`), and Worker API calls. JavaScript handles WebRTC (native browser API in WebView) and trade UI. Tauri IPC bridges the two layers. Cloudflare Worker stores listings, relays WebRTC signals, and archives trade records.

**Tech Stack:** Tauri 2 (Rust), ed25519-dalek, reqwest, WebRTC (browser API), Cloudflare Workers + KV, vanilla JS

**Spec:** `docs/superpowers/specs/2026-04-03-pet-trading-design.md`

---

## File Structure

### Rust (src-tauri/src/)

| File | Responsibility |
|------|---------------|
| `identity.rs` (new) | Ed25519 key pair generation, loading, signing, verification |
| `inventory.rs` (new) | `~/.pets/` CRUD: list, add, remove, get active, set active, migration from `.pet/` |
| `market.rs` (new) | HTTP client for Worker API: listings, signaling, trade records |
| `trade.rs` (new) | Trade protocol: sign/verify trade records, ownership transfer |
| `lib.rs` (modify) | Register new Tauri commands, update `load_pet` to use inventory |
| `tray.rs` (modify) | Add Inventory/Market/Gift menu items, open new windows |

### JavaScript (ui/)

| File | Responsibility |
|------|---------------|
| `inventory.html` + `inventory.js` (new) | Inventory window: grid of owned pets, activate, list for trade/gift |
| `market.html` + `market.js` (new) | Market window: browse listings, initiate trade, WebRTC signaling |
| `trade-dialog.js` (new) | Trade confirmation popup: show both pets, accept/reject |
| `webrtc.js` (new) | WebRTC connection setup, data channel for pet exchange |

### Cloudflare Worker (worker/)

| File | Responsibility |
|------|---------------|
| `index.ts` (new) | API routes: /listings, /signal, /trades |
| `wrangler.toml` (new) | Worker config + KV namespace binding |

### TypeScript (engine/)

| File | Responsibility |
|------|---------------|
| `types.ts` (modify) | Pet v2.0 → v2.1: add `id`, `ownership` fields |

### CLI (bin/)

| File | Responsibility |
|------|---------------|
| `pet-cli.ts` (new) | Commands: inventory, market, export, verify |

---

## Task 1: Identity System (Rust)

**Files:**
- Create: `src-tauri/src/identity.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add dependencies to Cargo.toml**

Add `ed25519-dalek`, `rand`, `base64`, and `uuid` to `src-tauri/Cargo.toml`:

```toml
ed25519-dalek = { version = "2", features = ["rand_core"] }
rand = "0.8"
base64 = "0.22"
uuid = { version = "1", features = ["v4"] }
```

- [ ] **Step 2: Create identity.rs with key generation and persistence**

Create `src-tauri/src/identity.rs`:

```rust
use ed25519_dalek::{SigningKey, VerifyingKey, Signer, Verifier, Signature};
use rand::rngs::OsRng;
use base64::{Engine as _, engine::general_purpose::STANDARD as B64};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Identity {
    #[serde(rename = "publicKey")]
    pub public_key: String,
    #[serde(rename = "privateKey")]
    pub private_key: String,
    pub nickname: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

fn pets_dir() -> PathBuf {
    dirs::home_dir().expect("no home dir").join(".pets")
}

fn identity_path() -> PathBuf {
    pets_dir().join("identity.json")
}

pub fn ensure_identity() -> Result<Identity, String> {
    let path = identity_path();
    if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    } else {
        let identity = generate_identity()?;
        save_identity(&identity)?;
        Ok(identity)
    }
}

fn generate_identity() -> Result<Identity, String> {
    let signing_key = SigningKey::generate(&mut OsRng);
    let verifying_key = signing_key.verifying_key();

    Ok(Identity {
        public_key: B64.encode(verifying_key.as_bytes()),
        private_key: B64.encode(signing_key.to_bytes()),
        nickname: "Pet Owner".to_string(),
        created_at: chrono::Utc::now().to_rfc3339(),
    })
}

fn save_identity(identity: &Identity) -> Result<(), String> {
    let dir = pets_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let content = serde_json::to_string_pretty(identity).map_err(|e| e.to_string())?;
    fs::write(identity_path(), content).map_err(|e| e.to_string())
}

pub fn sign_data(data: &[u8]) -> Result<String, String> {
    let identity = ensure_identity()?;
    let key_bytes = B64.decode(&identity.private_key).map_err(|e| e.to_string())?;
    let key_array: [u8; 32] = key_bytes.try_into().map_err(|_| "invalid key length")?;
    let signing_key = SigningKey::from_bytes(&key_array);
    let signature = signing_key.sign(data);
    Ok(B64.encode(signature.to_bytes()))
}

pub fn verify_signature(public_key_b64: &str, data: &[u8], signature_b64: &str) -> Result<bool, String> {
    let key_bytes = B64.decode(public_key_b64).map_err(|e| e.to_string())?;
    let key_array: [u8; 32] = key_bytes.try_into().map_err(|_| "invalid key length")?;
    let verifying_key = VerifyingKey::from_bytes(&key_array).map_err(|e| e.to_string())?;

    let sig_bytes = B64.decode(signature_b64).map_err(|e| e.to_string())?;
    let sig_array: [u8; 64] = sig_bytes.try_into().map_err(|_| "invalid signature length")?;
    let signature = Signature::from_bytes(&sig_array);

    Ok(verifying_key.verify(data, &signature).is_ok())
}
```

- [ ] **Step 3: Add chrono dependency**

Add to `Cargo.toml`:

```toml
chrono = "0.4"
```

- [ ] **Step 4: Register module in lib.rs**

Add `mod identity;` at the top of `src-tauri/src/lib.rs`:

```rust
mod identity;
mod server;
mod tray;
```

- [ ] **Step 5: Build and verify**

Run: `cd src-tauri && cargo check`
Expected: compiles with no errors

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/identity.rs src-tauri/Cargo.toml src-tauri/src/lib.rs
git commit -m "feat(trade): add Ed25519 identity system"
```

---

## Task 2: Pet Schema v2.1 (TypeScript)

**Files:**
- Modify: `engine/types.ts`
- Create: `engine/__tests__/types.test.ts`

- [ ] **Step 1: Write test for v2.1 schema**

Create `engine/__tests__/types.test.ts`:

```typescript
import { PetSchema, PetV21Schema } from "../types";

describe("PetV21Schema", () => {
  const validPetV21 = {
    version: "2.1" as const,
    id: "abc123",
    meta: {
      createdAt: "2026-04-02T00:00:00Z",
      source: "cli" as const,
      projectContext: "test context",
    },
    bones: {
      bazi: {
        year: { celestial: "甲", terrestrial: "子" },
        month: { celestial: "乙", terrestrial: "丑" },
        day: { celestial: "丙", terrestrial: "寅" },
        hour: { celestial: "丁", terrestrial: "卯" },
        fullString: "甲子 乙丑 丙寅 丁卯",
        elementDistribution: { wood: 3, fire: 2, earth: 1, metal: 1, water: 1 },
      },
      dominantElement: "wood" as const,
      mbti: "INTJ",
      mbtiDescription: "战略大师",
      tarot: { id: 1, name: "魔术师", upright: true, trait: "创造力", meaning: "开始" },
      rarity: "R" as const,
    },
    soul: {
      species: "水豚",
      speciesEn: "Capybara",
      emoji: "🦫",
      name: "豚豚",
      nameEn: "TunTun",
      asciiArt: ["  (°▽°)  ", " /|   |\\", "  |   |  ", " / \\ / \\", "           "],
      description: "A chill capybara",
      systemPrompt: "You are a capybara.",
    },
    ownership: {
      creatorPublicKey: "dGVzdA==",
      currentOwnerPublicKey: "dGVzdA==",
      signature: "dGVzdA==",
      transferHistory: [],
    },
  };

  it("parses valid v2.1 pet", () => {
    const result = PetV21Schema.parse(validPetV21);
    expect(result.version).toBe("2.1");
    expect(result.id).toBe("abc123");
    expect(result.ownership.creatorPublicKey).toBe("dGVzdA==");
  });

  it("requires ownership field", () => {
    const { ownership, ...noOwnership } = validPetV21;
    expect(() => PetV21Schema.parse(noOwnership)).toThrow();
  });

  it("v2.0 schema still works for existing pets", () => {
    const v20 = {
      version: "2.0" as const,
      meta: validPetV21.meta,
      bones: validPetV21.bones,
      soul: validPetV21.soul,
    };
    const result = PetSchema.parse(v20);
    expect(result.version).toBe("2.0");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- --testPathPattern types.test`
Expected: FAIL — `PetV21Schema` is not exported

- [ ] **Step 3: Add v2.1 schema to types.ts**

Add to end of `engine/types.ts` (before existing exports):

```typescript
export const OwnershipSchema = z.object({
  creatorPublicKey: z.string(),
  currentOwnerPublicKey: z.string(),
  signature: z.string(),
  transferHistory: z.array(
    z.object({
      from: z.string(),
      to: z.string(),
      timestamp: z.string(),
      fromSignature: z.string(),
      toSignature: z.string(),
    })
  ),
});

export const PetV21Schema = z.object({
  version: z.literal("2.1"),
  id: z.string(),
  meta: z.object({
    createdAt: z.string(),
    source: z.enum(["link", "cli"]),
    sourceUrl: z.string().optional(),
    projectContext: z.string(),
  }),
  bones: PetBonesSchema,
  soul: PetSoulSchema,
  ownership: OwnershipSchema,
});

export type PetV21 = z.infer<typeof PetV21Schema>;
export type Ownership = z.infer<typeof OwnershipSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- --testPathPattern types.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add engine/types.ts engine/__tests__/types.test.ts
git commit -m "feat(trade): add Pet v2.1 schema with ownership"
```

---

## Task 3: Inventory Management (Rust)

**Files:**
- Create: `src-tauri/src/inventory.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Create inventory.rs**

Create `src-tauri/src/inventory.rs`:

```rust
use serde_json::Value;
use std::fs;
use std::path::PathBuf;

fn pets_dir() -> PathBuf {
    dirs::home_dir().expect("no home dir").join(".pets")
}

fn inventory_dir() -> PathBuf {
    pets_dir().join("inventory")
}

fn active_path() -> PathBuf {
    pets_dir().join("active.txt")
}

pub fn ensure_dirs() -> Result<(), String> {
    fs::create_dir_all(inventory_dir()).map_err(|e| e.to_string())
}

pub fn list_pets() -> Result<Vec<Value>, String> {
    ensure_dirs()?;
    let dir = inventory_dir();
    let mut pets = Vec::new();

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "json") {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            if let Ok(pet) = serde_json::from_str::<Value>(&content) {
                pets.push(pet);
            }
        }
    }
    Ok(pets)
}

pub fn get_pet(pet_id: &str) -> Result<Value, String> {
    let path = inventory_dir().join(format!("{}.json", pet_id));
    if !path.exists() {
        return Err(format!("Pet {} not found", pet_id));
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn add_pet(pet: &Value) -> Result<(), String> {
    ensure_dirs()?;
    let pet_id = pet["id"].as_str().ok_or("pet has no id")?;
    let path = inventory_dir().join(format!("{}.json", pet_id));
    let content = serde_json::to_string_pretty(pet).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

pub fn remove_pet(pet_id: &str) -> Result<Value, String> {
    let pet = get_pet(pet_id)?;
    let path = inventory_dir().join(format!("{}.json", pet_id));
    fs::remove_file(path).map_err(|e| e.to_string())?;

    // If this was the active pet, clear active
    if get_active_id().ok().as_deref() == Some(pet_id) {
        let _ = fs::remove_file(active_path());
    }
    Ok(pet)
}

pub fn get_active_id() -> Result<String, String> {
    let path = active_path();
    if !path.exists() {
        // Default to first pet in inventory
        let pets = list_pets()?;
        if let Some(first) = pets.first() {
            if let Some(id) = first["id"].as_str() {
                set_active(id)?;
                return Ok(id.to_string());
            }
        }
        return Err("No pets in inventory".to_string());
    }
    fs::read_to_string(path).map(|s| s.trim().to_string()).map_err(|e| e.to_string())
}

pub fn set_active(pet_id: &str) -> Result<(), String> {
    // Verify pet exists
    let _ = get_pet(pet_id)?;
    ensure_dirs()?;
    fs::write(active_path(), pet_id).map_err(|e| e.to_string())
}

pub fn load_active_pet() -> Result<Value, String> {
    let pet_id = get_active_id()?;
    get_pet(&pet_id)
}

/// Migrate .pet/<name>.json from a directory into ~/.pets/inventory/
/// Called once on startup for backwards compatibility.
pub fn migrate_from_dot_pet(search_dir: &PathBuf) -> Result<u32, String> {
    let dot_pet = search_dir.join(".pet");
    if !dot_pet.exists() {
        return Ok(0);
    }

    ensure_dirs()?;
    let mut count = 0u32;

    let entries = fs::read_dir(&dot_pet).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().is_some_and(|ext| ext == "json") {
            let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            if let Ok(mut pet) = serde_json::from_str::<Value>(&content) {
                // Skip if already v2.1
                if pet["version"].as_str() == Some("2.1") {
                    continue;
                }

                // Generate a pet ID from content hash
                let hash = simple_hash(&content);
                let pet_id = format!("{:06x}", hash & 0xFFFFFF);

                // Upgrade to v2.1 shell (ownership will be signed on first load)
                pet["version"] = serde_json::json!("2.1");
                pet["id"] = serde_json::json!(pet_id);
                pet["ownership"] = serde_json::json!({
                    "creatorPublicKey": "",
                    "currentOwnerPublicKey": "",
                    "signature": "",
                    "transferHistory": []
                });

                add_pet(&pet)?;
                count += 1;
            }
        }
    }
    Ok(count)
}

fn simple_hash(s: &str) -> u32 {
    let mut hash: u32 = 0x811c9dc5;
    for byte in s.bytes() {
        hash ^= byte as u32;
        hash = hash.wrapping_mul(0x01000193);
    }
    hash
}
```

- [ ] **Step 2: Register module and add Tauri commands in lib.rs**

Update `src-tauri/src/lib.rs`:

```rust
mod identity;
mod inventory;
mod server;
mod tray;

use std::sync::mpsc;
use tauri::{Emitter, Manager};

#[tauri::command]
fn load_pet() -> Result<serde_json::Value, String> {
    // Try new inventory first
    if let Ok(pet) = inventory::load_active_pet() {
        return Ok(pet);
    }

    // Fallback: migrate from .pet/ directories
    let search_dirs = build_search_dirs();
    for dir in &search_dirs {
        let _ = inventory::migrate_from_dot_pet(dir);
    }

    // Try again after migration
    inventory::load_active_pet()
}

#[tauri::command]
fn list_inventory() -> Result<Vec<serde_json::Value>, String> {
    inventory::list_pets()
}

#[tauri::command]
fn set_active_pet(pet_id: String) -> Result<(), String> {
    inventory::set_active(&pet_id)
}

#[tauri::command]
fn get_identity() -> Result<identity::Identity, String> {
    identity::ensure_identity()
}

#[tauri::command]
fn sign_trade_data(data: String) -> Result<String, String> {
    identity::sign_data(data.as_bytes())
}

#[tauri::command]
fn verify_trade_signature(public_key: String, data: String, signature: String) -> Result<bool, String> {
    identity::verify_signature(&public_key, data.as_bytes(), &signature)
}

#[tauri::command]
fn add_pet_to_inventory(pet: serde_json::Value) -> Result<(), String> {
    inventory::add_pet(&pet)
}

#[tauri::command]
fn remove_pet_from_inventory(pet_id: String) -> Result<serde_json::Value, String> {
    inventory::remove_pet(&pet_id)
}
```

Update the `invoke_handler` in the `run()` function:

```rust
.invoke_handler(tauri::generate_handler![
    load_pet,
    list_inventory,
    set_active_pet,
    get_identity,
    sign_trade_data,
    verify_trade_signature,
    add_pet_to_inventory,
    remove_pet_from_inventory,
])
```

- [ ] **Step 3: Keep existing build_search_dirs and load_first_pet**

Keep the existing `build_search_dirs()` and `load_first_pet()` functions in `lib.rs` — they are still used by migration. Remove the old standalone `load_pet` search logic and replace with the new version shown above.

- [ ] **Step 4: Build and verify**

Run: `cd src-tauri && cargo check`
Expected: compiles with no errors

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/inventory.rs src-tauri/src/lib.rs
git commit -m "feat(trade): add inventory management and migration"
```

---

## Task 4: Cloudflare Worker

**Files:**
- Create: `worker/index.ts`
- Create: `worker/wrangler.toml`
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`

- [ ] **Step 1: Create worker/package.json**

```json
{
  "name": "pet-trading-worker",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy"
  },
  "devDependencies": {
    "wrangler": "^4"
  }
}
```

- [ ] **Step 2: Create worker/wrangler.toml**

```toml
name = "pet-trading"
main = "index.ts"
compatibility_date = "2026-04-01"

[[kv_namespaces]]
binding = "KV"
id = "TBD_AFTER_CREATE"
```

Note: KV namespace ID is set after running `wrangler kv:namespace create KV`. For local dev, wrangler uses a local emulator automatically.

- [ ] **Step 3: Create worker/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true
  }
}
```

Add `@cloudflare/workers-types` to devDependencies in `worker/package.json`:

```json
"devDependencies": {
  "@cloudflare/workers-types": "^4",
  "wrangler": "^4"
}
```

- [ ] **Step 4: Create worker/index.ts**

```typescript
interface Env {
  KV: KVNamespace;
}

interface Listing {
  id: string;
  type: "trade" | "gift";
  pet: {
    id: string;
    name: string;
    species: string;
    emoji: string;
    rarity: string;
    asciiArt: string[];
    ownership: { currentOwnerPublicKey: string };
  };
  wantDescription?: string;
  ownerPublicKey: string;
  ownerNickname: string;
  signature: string;
  createdAt: string;
  expiresAt: string;
}

interface SignalMessage {
  from: string;
  to: string;
  payload: unknown;
  createdAt: string;
}

interface TradeRecord {
  tradeId: string;
  type: "trade" | "gift";
  petA: { id: string; name: string; rarity: string };
  petB: { id: string; name: string; rarity: string } | null;
  from: string;
  to: string;
  fromSignature: string;
  toSignature: string;
  timestamp: string;
}

const LISTING_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const SIGNAL_TTL = 60; // 60 seconds

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // --- Listings ---
    if (path === "/listings" && request.method === "GET") {
      return handleListListings(env, url);
    }
    if (path === "/listings" && request.method === "POST") {
      return handleCreateListing(request, env);
    }
    if (path.startsWith("/listings/") && request.method === "DELETE") {
      const id = path.split("/")[2];
      return handleDeleteListing(id, request, env);
    }

    // --- Signaling ---
    if (path === "/signal" && request.method === "POST") {
      return handlePostSignal(request, env);
    }
    if (path === "/signal" && request.method === "GET") {
      return handleGetSignal(url, env);
    }

    // --- Trade Records ---
    if (path === "/trades" && request.method === "POST") {
      return handlePostTrade(request, env);
    }
    if (path === "/trades" && request.method === "GET") {
      return handleGetTrades(url, env);
    }

    return json({ error: "not found" }, 404);
  },
};

// --- Listings handlers ---

async function handleListListings(env: Env, url: URL): Promise<Response> {
  const rarity = url.searchParams.get("rarity");
  const type = url.searchParams.get("type");

  const listResult = await env.KV.list({ prefix: "listing:" });
  const listings: Listing[] = [];

  for (const key of listResult.keys) {
    const val = await env.KV.get<Listing>(key.name, "json");
    if (!val) continue;
    if (rarity && val.pet.rarity !== rarity) continue;
    if (type && val.type !== type) continue;
    listings.push(val);
  }

  return json({ listings });
}

async function handleCreateListing(request: Request, env: Env): Promise<Response> {
  const listing = await request.json<Listing>();
  const id = crypto.randomUUID().slice(0, 8);
  listing.id = id;
  listing.createdAt = new Date().toISOString();
  listing.expiresAt = new Date(Date.now() + LISTING_TTL * 1000).toISOString();

  await env.KV.put(`listing:${id}`, JSON.stringify(listing), { expirationTtl: LISTING_TTL });
  return json({ id, listing }, 201);
}

async function handleDeleteListing(id: string, request: Request, env: Env): Promise<Response> {
  const body = await request.json<{ ownerPublicKey: string }>();
  const existing = await env.KV.get<Listing>(`listing:${id}`, "json");
  if (!existing) return json({ error: "not found" }, 404);
  if (existing.ownerPublicKey !== body.ownerPublicKey) {
    return json({ error: "unauthorized" }, 403);
  }
  await env.KV.delete(`listing:${id}`);
  return json({ ok: true });
}

// --- Signaling handlers ---

async function handlePostSignal(request: Request, env: Env): Promise<Response> {
  const msg = await request.json<SignalMessage>();
  msg.createdAt = new Date().toISOString();
  const key = `signal:${msg.to}:${Date.now()}`;
  await env.KV.put(key, JSON.stringify(msg), { expirationTtl: SIGNAL_TTL });
  return json({ ok: true });
}

async function handleGetSignal(url: URL, env: Env): Promise<Response> {
  const pubkey = url.searchParams.get("for");
  if (!pubkey) return json({ error: "missing 'for' param" }, 400);

  const listResult = await env.KV.list({ prefix: `signal:${pubkey}:` });
  const messages: SignalMessage[] = [];

  for (const key of listResult.keys) {
    const val = await env.KV.get<SignalMessage>(key.name, "json");
    if (val) {
      messages.push(val);
      await env.KV.delete(key.name); // consume once
    }
  }

  return json({ messages });
}

// --- Trade record handlers ---

async function handlePostTrade(request: Request, env: Env): Promise<Response> {
  const trade = await request.json<TradeRecord>();
  await env.KV.put(`trade:${trade.tradeId}`, JSON.stringify(trade));

  // Also index by pet ID for ownership chain lookups
  const petAHistory = await env.KV.get<string[]>(`pet-trades:${trade.petA.id}`, "json") || [];
  petAHistory.push(trade.tradeId);
  await env.KV.put(`pet-trades:${trade.petA.id}`, JSON.stringify(petAHistory));

  if (trade.petB) {
    const petBHistory = await env.KV.get<string[]>(`pet-trades:${trade.petB.id}`, "json") || [];
    petBHistory.push(trade.tradeId);
    await env.KV.put(`pet-trades:${trade.petB.id}`, JSON.stringify(petBHistory));
  }

  return json({ ok: true }, 201);
}

async function handleGetTrades(url: URL, env: Env): Promise<Response> {
  const petId = url.searchParams.get("petId");
  const pubkey = url.searchParams.get("pubkey");

  if (petId) {
    const tradeIds = await env.KV.get<string[]>(`pet-trades:${petId}`, "json") || [];
    const trades: TradeRecord[] = [];
    for (const id of tradeIds) {
      const trade = await env.KV.get<TradeRecord>(`trade:${id}`, "json");
      if (trade) trades.push(trade);
    }
    return json({ trades });
  }

  if (pubkey) {
    const listResult = await env.KV.list({ prefix: "trade:" });
    const trades: TradeRecord[] = [];
    for (const key of listResult.keys) {
      const trade = await env.KV.get<TradeRecord>(key.name, "json");
      if (trade && (trade.from === pubkey || trade.to === pubkey)) {
        trades.push(trade);
      }
    }
    return json({ trades });
  }

  return json({ error: "provide petId or pubkey param" }, 400);
}
```

- [ ] **Step 5: Install deps and test locally**

```bash
cd worker && npm install && npm run dev
```

Test with curl:

```bash
# Create listing
curl -X POST http://localhost:8787/listings \
  -H 'Content-Type: application/json' \
  -d '{"type":"gift","pet":{"id":"abc","name":"豚豚","species":"水豚","emoji":"🦫","rarity":"SSR","asciiArt":["(°▽°)"],"ownership":{"currentOwnerPublicKey":"key1"}},"ownerPublicKey":"key1","ownerNickname":"test","signature":"sig"}'

# List listings
curl http://localhost:8787/listings
```

Expected: 201 response with listing ID, then GET returns the listing.

- [ ] **Step 6: Commit**

```bash
git add worker/
git commit -m "feat(trade): add Cloudflare Worker for listings, signaling, trade records"
```

---

## Task 5: Market Client (Rust)

**Files:**
- Create: `src-tauri/src/market.rs`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Add reqwest to Cargo.toml**

```toml
reqwest = { version = "0.12", features = ["json", "rustls-tls"], default-features = false }
tokio = { version = "1", features = ["full"] }
```

- [ ] **Step 2: Create market.rs**

Create `src-tauri/src/market.rs`:

```rust
use serde::{Deserialize, Serialize};
use serde_json::Value;

const WORKER_URL: &str = "https://pet-trading.<YOUR_SUBDOMAIN>.workers.dev";

// For local dev, override with env var
fn base_url() -> String {
    std::env::var("PET_WORKER_URL").unwrap_or_else(|_| WORKER_URL.to_string())
}

#[derive(Debug, Serialize)]
pub struct CreateListingRequest {
    #[serde(rename = "type")]
    pub listing_type: String,
    pub pet: Value,
    #[serde(rename = "wantDescription")]
    pub want_description: Option<String>,
    #[serde(rename = "ownerPublicKey")]
    pub owner_public_key: String,
    #[serde(rename = "ownerNickname")]
    pub owner_nickname: String,
    pub signature: String,
}

#[derive(Debug, Deserialize)]
pub struct ListingsResponse {
    pub listings: Vec<Value>,
}

#[derive(Debug, Serialize)]
pub struct SignalMessage {
    pub from: String,
    pub to: String,
    pub payload: Value,
}

pub async fn fetch_listings(rarity: Option<&str>, listing_type: Option<&str>) -> Result<Vec<Value>, String> {
    let mut url = format!("{}/listings", base_url());
    let mut params = vec![];
    if let Some(r) = rarity { params.push(format!("rarity={}", r)); }
    if let Some(t) = listing_type { params.push(format!("type={}", t)); }
    if !params.is_empty() { url = format!("{}?{}", url, params.join("&")); }

    let resp: ListingsResponse = reqwest::get(&url)
        .await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    Ok(resp.listings)
}

pub async fn create_listing(req: CreateListingRequest) -> Result<Value, String> {
    let client = reqwest::Client::new();
    let resp = client.post(format!("{}/listings", base_url()))
        .json(&req)
        .send().await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    Ok(resp)
}

pub async fn delete_listing(listing_id: &str, owner_public_key: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    client.delete(format!("{}/listings/{}", base_url(), listing_id))
        .json(&serde_json::json!({ "ownerPublicKey": owner_public_key }))
        .send().await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn post_signal(msg: SignalMessage) -> Result<(), String> {
    let client = reqwest::Client::new();
    client.post(format!("{}/signal", base_url()))
        .json(&msg)
        .send().await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn poll_signals(public_key: &str) -> Result<Vec<Value>, String> {
    let url = format!("{}/signal?for={}", base_url(), public_key);
    let resp: Value = reqwest::get(&url)
        .await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    let messages = resp["messages"].as_array().cloned().unwrap_or_default();
    Ok(messages)
}

pub async fn post_trade_record(trade: Value) -> Result<(), String> {
    let client = reqwest::Client::new();
    client.post(format!("{}/trades", base_url()))
        .json(&trade)
        .send().await.map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn get_pet_trades(pet_id: &str) -> Result<Vec<Value>, String> {
    let url = format!("{}/trades?petId={}", base_url(), pet_id);
    let resp: Value = reqwest::get(&url)
        .await.map_err(|e| e.to_string())?
        .json().await.map_err(|e| e.to_string())?;
    let trades = resp["trades"].as_array().cloned().unwrap_or_default();
    Ok(trades)
}
```

- [ ] **Step 3: Add Tauri commands for market in lib.rs**

Add to `src-tauri/src/lib.rs`:

```rust
mod market;

#[tauri::command]
async fn fetch_market_listings(rarity: Option<String>, listing_type: Option<String>) -> Result<Vec<serde_json::Value>, String> {
    market::fetch_listings(rarity.as_deref(), listing_type.as_deref()).await
}

#[tauri::command]
async fn create_market_listing(listing_type: String, pet: serde_json::Value, want_description: Option<String>) -> Result<serde_json::Value, String> {
    let identity = identity::ensure_identity()?;
    let listing_data = serde_json::to_string(&pet).map_err(|e| e.to_string())?;
    let signature = identity::sign_data(listing_data.as_bytes())?;

    market::create_listing(market::CreateListingRequest {
        listing_type,
        pet,
        want_description,
        owner_public_key: identity.public_key,
        owner_nickname: identity.nickname,
        signature,
    }).await
}

#[tauri::command]
async fn delete_market_listing(listing_id: String) -> Result<(), String> {
    let identity = identity::ensure_identity()?;
    market::delete_listing(&listing_id, &identity.public_key).await
}

#[tauri::command]
async fn send_signal(to: String, payload: serde_json::Value) -> Result<(), String> {
    let identity = identity::ensure_identity()?;
    market::post_signal(market::SignalMessage {
        from: identity.public_key,
        to,
        payload,
    }).await
}

#[tauri::command]
async fn poll_signals() -> Result<Vec<serde_json::Value>, String> {
    let identity = identity::ensure_identity()?;
    market::poll_signals(&identity.public_key).await
}
```

Update `invoke_handler` to include these new commands:

```rust
.invoke_handler(tauri::generate_handler![
    load_pet,
    list_inventory,
    set_active_pet,
    get_identity,
    sign_trade_data,
    verify_trade_signature,
    add_pet_to_inventory,
    remove_pet_from_inventory,
    fetch_market_listings,
    create_market_listing,
    delete_market_listing,
    send_signal,
    poll_signals,
])
```

- [ ] **Step 4: Build and verify**

Run: `cd src-tauri && cargo check`
Expected: compiles with no errors

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/market.rs src-tauri/src/lib.rs src-tauri/Cargo.toml
git commit -m "feat(trade): add market client for Worker API"
```

---

## Task 6: WebRTC Module (JavaScript)

**Files:**
- Create: `ui/webrtc.js`

- [ ] **Step 1: Create ui/webrtc.js**

This uses the browser's built-in WebRTC API (available in Tauri's WebView):

```javascript
// ui/webrtc.js
// WebRTC peer connection management using browser-native API.
// Signaling goes through Tauri commands → Worker.

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

let peerConnection = null;
let dataChannel = null;
let onMessageCallback = null;
let onConnectedCallback = null;
let onDisconnectedCallback = null;

export function onMessage(cb) { onMessageCallback = cb; }
export function onConnected(cb) { onConnectedCallback = cb; }
export function onDisconnected(cb) { onDisconnectedCallback = cb; }

export async function createOffer(targetPubkey) {
  peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  dataChannel = peerConnection.createDataChannel("pet-trade");
  setupDataChannel(dataChannel);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      window.__TAURI__.core.invoke("send_signal", {
        to: targetPubkey,
        payload: { type: "ice-candidate", candidate: event.candidate },
      });
    }
  };

  peerConnection.onconnectionstatechange = () => {
    if (peerConnection.connectionState === "connected" && onConnectedCallback) {
      onConnectedCallback();
    }
    if (peerConnection.connectionState === "disconnected" && onDisconnectedCallback) {
      onDisconnectedCallback();
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  await window.__TAURI__.core.invoke("send_signal", {
    to: targetPubkey,
    payload: { type: "offer", sdp: offer },
  });

  return peerConnection;
}

export async function handleSignalMessage(msg) {
  const { type, sdp, candidate } = msg.payload;

  if (type === "offer") {
    peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    peerConnection.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannel(dataChannel);
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        window.__TAURI__.core.invoke("send_signal", {
          to: msg.from,
          payload: { type: "ice-candidate", candidate: event.candidate },
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected" && onConnectedCallback) {
        onConnectedCallback();
      }
      if (peerConnection.connectionState === "disconnected" && onDisconnectedCallback) {
        onDisconnectedCallback();
      }
    };

    await peerConnection.setRemoteDescription(sdp);
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await window.__TAURI__.core.invoke("send_signal", {
      to: msg.from,
      payload: { type: "answer", sdp: answer },
    });
  }

  if (type === "answer") {
    await peerConnection.setRemoteDescription(sdp);
  }

  if (type === "ice-candidate" && candidate) {
    await peerConnection.addIceCandidate(candidate);
  }
}

export function sendData(data) {
  if (dataChannel && dataChannel.readyState === "open") {
    dataChannel.send(JSON.stringify(data));
  }
}

export function disconnect() {
  if (dataChannel) dataChannel.close();
  if (peerConnection) peerConnection.close();
  dataChannel = null;
  peerConnection = null;
}

function setupDataChannel(channel) {
  channel.onmessage = (event) => {
    if (onMessageCallback) {
      onMessageCallback(JSON.parse(event.data));
    }
  };
  channel.onopen = () => {
    if (onConnectedCallback) onConnectedCallback();
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add ui/webrtc.js
git commit -m "feat(trade): add WebRTC module for peer-to-peer connection"
```

---

## Task 7: Trade Protocol (JavaScript)

**Files:**
- Create: `ui/trade-protocol.js`

- [ ] **Step 1: Create ui/trade-protocol.js**

```javascript
// ui/trade-protocol.js
// Trade/gift protocol over WebRTC data channel.
// Signing/verification delegated to Rust via Tauri IPC.

import { sendData, onMessage } from "./webrtc.js";

let tradeState = "idle"; // idle | proposed | accepted | committed | complete
let currentTrade = null;
let resolveTradePromise = null;

// Callbacks for UI
let onTradeRequestReceived = null;
let onTradeComplete = null;
let onTradeError = null;

export function setOnTradeRequest(cb) { onTradeRequestReceived = cb; }
export function setOnTradeComplete(cb) { onTradeComplete = cb; }
export function setOnTradeError(cb) { onTradeError = cb; }

export function initTradeProtocol() {
  onMessage(handleTradeMessage);
}

// --- Initiator side ---

export async function proposeTrade(myPet, theirPetId, type = "trade") {
  const identity = await window.__TAURI__.core.invoke("get_identity");

  currentTrade = {
    tradeId: crypto.randomUUID(),
    type,
    myPet,
    theirPetId,
    myPublicKey: identity.publicKey,
  };
  tradeState = "proposed";

  sendData({
    action: "trade-request",
    tradeId: currentTrade.tradeId,
    type,
    offeredPet: {
      id: myPet.id,
      name: myPet.soul.name,
      species: myPet.soul.species,
      emoji: myPet.soul.emoji,
      rarity: myPet.bones.rarity,
      asciiArt: myPet.soul.asciiArt,
    },
    wantedPetId: theirPetId,
    fromPublicKey: identity.publicKey,
  });

  return new Promise((resolve, reject) => {
    resolveTradePromise = { resolve, reject };
    setTimeout(() => {
      if (tradeState === "proposed") {
        tradeState = "idle";
        reject(new Error("Trade request timed out"));
      }
    }, 30000);
  });
}

// --- Responder side ---

export function acceptTrade(tradeId) {
  if (tradeState !== "pending-response" || currentTrade?.tradeId !== tradeId) return;
  tradeState = "accepted";
  sendData({ action: "trade-accept", tradeId });
}

export function rejectTrade(tradeId) {
  if (currentTrade?.tradeId !== tradeId) return;
  tradeState = "idle";
  sendData({ action: "trade-reject", tradeId });
  currentTrade = null;
}

// --- Message handler ---

async function handleTradeMessage(msg) {
  switch (msg.action) {
    case "trade-request":
      await handleTradeRequest(msg);
      break;
    case "trade-accept":
      await handleTradeAccepted(msg);
      break;
    case "trade-reject":
      handleTradeRejected(msg);
      break;
    case "trade-commit":
      await handleTradeCommit(msg);
      break;
    case "trade-complete":
      await handleTradeComplete(msg);
      break;
  }
}

async function handleTradeRequest(msg) {
  // Verify the offered pet's signature
  const valid = await window.__TAURI__.core.invoke("verify_trade_signature", {
    publicKey: msg.fromPublicKey,
    data: JSON.stringify(msg.offeredPet),
    signature: msg.offeredPet.signature || "",
  });

  currentTrade = {
    tradeId: msg.tradeId,
    type: msg.type,
    theirPet: msg.offeredPet,
    wantedPetId: msg.wantedPetId,
    theirPublicKey: msg.fromPublicKey,
    signatureValid: valid,
  };
  tradeState = "pending-response";

  if (onTradeRequestReceived) {
    onTradeRequestReceived(currentTrade);
  }
}

async function handleTradeAccepted(msg) {
  if (tradeState !== "proposed" || currentTrade?.tradeId !== msg.tradeId) return;

  // Sign the trade record
  const tradeRecord = {
    tradeId: currentTrade.tradeId,
    type: currentTrade.type,
    petA: { id: currentTrade.myPet.id, name: currentTrade.myPet.soul.name, rarity: currentTrade.myPet.bones.rarity },
    petB: currentTrade.theirPetId ? { id: currentTrade.theirPetId } : null,
    from: currentTrade.myPublicKey,
    timestamp: new Date().toISOString(),
  };

  const signature = await window.__TAURI__.core.invoke("sign_trade_data", {
    data: JSON.stringify(tradeRecord),
  });

  tradeState = "committed";
  sendData({
    action: "trade-commit",
    tradeId: currentTrade.tradeId,
    tradeRecord,
    fromSignature: signature,
    fullPet: currentTrade.myPet, // send the full pet data
  });
}

async function handleTradeCommit(msg) {
  if (currentTrade?.tradeId !== msg.tradeId) return;

  // Sign our side of the trade record
  const signature = await window.__TAURI__.core.invoke("sign_trade_data", {
    data: JSON.stringify(msg.tradeRecord),
  });

  // Get my pet to send
  let myFullPet = null;
  if (currentTrade.wantedPetId) {
    const pets = await window.__TAURI__.core.invoke("list_inventory");
    myFullPet = pets.find(p => p.id === currentTrade.wantedPetId);
  }

  // Execute: remove my pet, add theirs
  if (currentTrade.wantedPetId) {
    await window.__TAURI__.core.invoke("remove_pet_from_inventory", { petId: currentTrade.wantedPetId });
  }
  await window.__TAURI__.core.invoke("add_pet_to_inventory", { pet: msg.fullPet });

  tradeState = "complete";
  sendData({
    action: "trade-complete",
    tradeId: currentTrade.tradeId,
    toSignature: signature,
    fullPet: myFullPet,
  });

  if (onTradeComplete) onTradeComplete(currentTrade);
  currentTrade = null;
  tradeState = "idle";
}

async function handleTradeComplete(msg) {
  if (currentTrade?.tradeId !== msg.tradeId) return;

  // Execute: remove my pet, add theirs
  await window.__TAURI__.core.invoke("remove_pet_from_inventory", { petId: currentTrade.myPet.id });
  if (msg.fullPet) {
    await window.__TAURI__.core.invoke("add_pet_to_inventory", { pet: msg.fullPet });
  }

  if (resolveTradePromise) resolveTradePromise.resolve(currentTrade);
  if (onTradeComplete) onTradeComplete(currentTrade);
  currentTrade = null;
  tradeState = "idle";
}

function handleTradeRejected(msg) {
  if (resolveTradePromise) resolveTradePromise.reject(new Error("Trade rejected"));
  currentTrade = null;
  tradeState = "idle";
}
```

- [ ] **Step 2: Commit**

```bash
git add ui/trade-protocol.js
git commit -m "feat(trade): add trade/gift protocol over WebRTC data channel"
```

---

## Task 8: Tray Menu & Multi-Window (Rust + Tauri Config)

**Files:**
- Modify: `src-tauri/src/tray.rs`
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Update tray.rs with new menu items**

Replace `src-tauri/src/tray.rs`:

```rust
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Manager, WebviewUrl, WebviewWindowBuilder,
};

pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let inventory = MenuItem::with_id(app, "inventory", "📦 Inventory", true, None::<&str>)?;
    let market = MenuItem::with_id(app, "market", "🔄 Market", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let show = MenuItem::with_id(app, "show", "Show Pet", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&inventory, &market, &separator, &show, &quit])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Anything Digital Pet")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "inventory" => {
                open_window(app, "inventory", "Inventory", "inventory.html", 400.0, 500.0);
            }
            "market" => {
                open_window(app, "market", "Market", "market.html", 600.0, 500.0);
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

fn open_window(app: &tauri::AppHandle, label: &str, title: &str, url: &str, width: f64, height: f64) {
    if let Some(window) = app.get_webview_window(label) {
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let _ = WebviewWindowBuilder::new(app, label, WebviewUrl::App(url.into()))
            .title(title)
            .inner_size(width, height)
            .resizable(true)
            .build();
    }
}
```

- [ ] **Step 2: Build and verify**

Run: `cd src-tauri && cargo check`
Expected: compiles with no errors

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/tray.rs
git commit -m "feat(trade): add inventory and market to tray menu"
```

---

## Task 9: Inventory UI

**Files:**
- Create: `ui/inventory.html`
- Create: `ui/inventory.js`

- [ ] **Step 1: Create ui/inventory.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inventory</title>
  <link rel="stylesheet" href="style.css">
  <style>
    html, body { background: #1a1a2e; height: 100%; }
    body { display: block; padding: 16px; overflow-y: auto; color: #e0e0e0; }

    h1 { font-size: 14px; margin-bottom: 12px; opacity: 0.7; }

    .pet-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
      gap: 10px;
    }

    .pet-card {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 10px;
      text-align: center;
      cursor: pointer;
      transition: border-color 0.2s;
    }
    .pet-card:hover { border-color: rgba(255,255,255,0.3); }
    .pet-card.active { border-color: #60a5fa; box-shadow: 0 0 8px rgba(96,165,250,0.3); }

    .pet-card pre {
      font-size: 10px;
      line-height: 1.15;
      margin-bottom: 6px;
    }
    .pet-card .name { font-size: 11px; font-weight: bold; }
    .pet-card .rarity { font-size: 9px; opacity: 0.6; margin-top: 2px; }

    .actions { margin-top: 8px; display: flex; gap: 4px; justify-content: center; }
    .actions button {
      font-size: 9px;
      padding: 3px 8px;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 6px;
      background: rgba(255,255,255,0.05);
      color: #e0e0e0;
      cursor: pointer;
    }
    .actions button:hover { background: rgba(255,255,255,0.12); }

    .empty { text-align: center; opacity: 0.4; margin-top: 40px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>MY PETS</h1>
  <div id="pet-grid" class="pet-grid"></div>
  <div id="empty" class="empty hidden">No pets yet. Run /create-pet to get started.</div>
  <script src="inventory.js" type="module"></script>
</body>
</html>
```

- [ ] **Step 2: Create ui/inventory.js**

```javascript
// ui/inventory.js

const RARITY_LABELS = { N: "N 🔵", R: "R 🟣", SR: "SR 🌟", SSR: "SSR ✨" };

let activePetId = null;

async function init() {
  const pets = await window.__TAURI__.core.invoke("list_inventory");

  if (pets.length === 0) {
    document.getElementById("empty").classList.remove("hidden");
    return;
  }

  // Get active pet ID
  try {
    const activePet = await window.__TAURI__.core.invoke("load_pet");
    activePetId = activePet?.id;
  } catch { /* no active pet */ }

  renderGrid(pets);
}

function renderGrid(pets) {
  const grid = document.getElementById("pet-grid");
  grid.innerHTML = "";

  for (const pet of pets) {
    const card = document.createElement("div");
    card.className = "pet-card" + (pet.id === activePetId ? " active" : "");

    const rarity = pet.bones?.rarity || "N";
    const name = pet.soul?.name || "???";
    const art = (pet.soul?.asciiArt || []).join("\n");

    card.innerHTML = `
      <pre class="rarity-${rarity}">${escapeHtml(art)}</pre>
      <div class="name rarity-${rarity}">${escapeHtml(name)}</div>
      <div class="rarity">${RARITY_LABELS[rarity] || rarity}</div>
      <div class="actions">
        <button data-action="activate" data-id="${pet.id}"${pet.id === activePetId ? " disabled" : ""}>Activate</button>
        <button data-action="trade" data-id="${pet.id}">Trade</button>
        <button data-action="gift" data-id="${pet.id}">Gift</button>
      </div>
    `;

    grid.appendChild(card);
  }

  grid.addEventListener("click", handleAction);
}

async function handleAction(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const petId = btn.dataset.id;

  if (action === "activate") {
    await window.__TAURI__.core.invoke("set_active_pet", { petId });
    activePetId = petId;
    const pets = await window.__TAURI__.core.invoke("list_inventory");
    renderGrid(pets);
  }

  if (action === "trade" || action === "gift") {
    const pet = await window.__TAURI__.core.invoke("list_inventory")
      .then(pets => pets.find(p => p.id === petId));
    if (!pet) return;

    await window.__TAURI__.core.invoke("create_market_listing", {
      listingType: action,
      pet: {
        id: pet.id,
        name: pet.soul.name,
        species: pet.soul.species,
        emoji: pet.soul.emoji,
        rarity: pet.bones.rarity,
        asciiArt: pet.soul.asciiArt,
        ownership: pet.ownership,
      },
      wantDescription: action === "trade" ? prompt("What do you want in return?") : null,
    });

    btn.textContent = "Listed!";
    btn.disabled = true;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

init();
```

- [ ] **Step 3: Verify both files load in browser**

Run: `python3 -m http.server 1420 --directory ui` and open `http://localhost:1420/inventory.html`
Expected: page renders with "No pets yet" message (no Tauri commands available outside desktop app)

- [ ] **Step 4: Commit**

```bash
git add ui/inventory.html ui/inventory.js
git commit -m "feat(trade): add inventory UI window"
```

---

## Task 10: Market UI

**Files:**
- Create: `ui/market.html`
- Create: `ui/market.js`

- [ ] **Step 1: Create ui/market.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Market</title>
  <link rel="stylesheet" href="style.css">
  <style>
    html, body { background: #1a1a2e; height: 100%; }
    body { display: block; padding: 16px; overflow-y: auto; color: #e0e0e0; }

    .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    h1 { font-size: 14px; opacity: 0.7; }
    .filters { display: flex; gap: 6px; }
    .filters select {
      font-size: 10px; padding: 3px 6px;
      background: rgba(255,255,255,0.08); color: #e0e0e0;
      border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;
    }

    .listing {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .listing pre { font-size: 10px; line-height: 1.15; min-width: 80px; }
    .listing-info { flex: 1; }
    .listing-info .name { font-size: 12px; font-weight: bold; }
    .listing-info .meta { font-size: 10px; opacity: 0.5; margin-top: 2px; }
    .listing-info .want { font-size: 10px; opacity: 0.7; margin-top: 4px; font-style: italic; }
    .listing .type-badge {
      font-size: 9px; padding: 2px 6px; border-radius: 4px;
      background: rgba(96,165,250,0.2); color: #60a5fa;
    }
    .listing .type-badge.gift { background: rgba(251,191,36,0.2); color: #fbbf24; }

    .listing button {
      font-size: 10px; padding: 5px 12px;
      border: 1px solid rgba(255,255,255,0.15); border-radius: 6px;
      background: rgba(96,165,250,0.15); color: #60a5fa;
      cursor: pointer; white-space: nowrap;
    }
    .listing button:hover { background: rgba(96,165,250,0.25); }

    .status { text-align: center; opacity: 0.4; margin-top: 40px; font-size: 12px; }

    /* Trade dialog overlay */
    .trade-dialog {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;
      z-index: 100;
    }
    .trade-dialog.hidden { display: none; }
    .trade-dialog-content {
      background: #1a1a2e; border: 1px solid rgba(255,255,255,0.15);
      border-radius: 12px; padding: 20px; max-width: 350px; text-align: center;
    }
    .trade-pets { display: flex; align-items: center; justify-content: center; gap: 16px; margin: 16px 0; }
    .trade-pets .arrow { font-size: 20px; opacity: 0.5; }
    .trade-dialog .actions { display: flex; gap: 8px; justify-content: center; margin-top: 16px; }
    .trade-dialog button { font-size: 11px; padding: 6px 16px; border-radius: 6px; cursor: pointer; border: none; }
    .btn-accept { background: #22c55e; color: white; }
    .btn-reject { background: rgba(255,255,255,0.1); color: #e0e0e0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>MARKET</h1>
    <div class="filters">
      <select id="filter-type">
        <option value="">All</option>
        <option value="trade">Trade</option>
        <option value="gift">Gift</option>
      </select>
      <select id="filter-rarity">
        <option value="">Any Rarity</option>
        <option value="SSR">SSR</option>
        <option value="SR">SR</option>
        <option value="R">R</option>
        <option value="N">N</option>
      </select>
    </div>
  </div>

  <div id="listings"></div>
  <div id="status" class="status">Loading...</div>

  <div id="trade-dialog" class="trade-dialog hidden">
    <div class="trade-dialog-content">
      <div id="dialog-title"></div>
      <div class="trade-pets">
        <div id="dialog-their-pet"></div>
        <div class="arrow">⇄</div>
        <div id="dialog-my-pet"></div>
      </div>
      <div id="dialog-verify"></div>
      <div class="actions">
        <button class="btn-accept" id="btn-accept">Accept</button>
        <button class="btn-reject" id="btn-reject">Reject</button>
      </div>
    </div>
  </div>

  <script src="market.js" type="module"></script>
</body>
</html>
```

- [ ] **Step 2: Create ui/market.js**

```javascript
// ui/market.js

import { createOffer, handleSignalMessage, onMessage, onConnected, disconnect } from "./webrtc.js";
import { initTradeProtocol, proposeTrade, acceptTrade, rejectTrade, setOnTradeRequest, setOnTradeComplete } from "./trade-protocol.js";

const RARITY_LABELS = { N: "N 🔵", R: "R 🟣", SR: "SR 🌟", SSR: "SSR ✨" };

let pollInterval = null;

async function init() {
  initTradeProtocol();
  setupFilters();
  setupTradeCallbacks();
  await loadListings();
  startSignalPolling();
}

async function loadListings() {
  const type = document.getElementById("filter-type").value || undefined;
  const rarity = document.getElementById("filter-rarity").value || undefined;

  try {
    const listings = await window.__TAURI__.core.invoke("fetch_market_listings", {
      listingType: type,
      rarity,
    });
    renderListings(listings);
  } catch (e) {
    document.getElementById("status").textContent = "Failed to load market.";
  }
}

function renderListings(listings) {
  const container = document.getElementById("listings");
  const status = document.getElementById("status");

  if (listings.length === 0) {
    container.innerHTML = "";
    status.textContent = "No listings yet.";
    status.classList.remove("hidden");
    return;
  }

  status.classList.add("hidden");
  container.innerHTML = listings.map(listing => {
    const pet = listing.pet;
    const art = (pet.asciiArt || []).join("\n");
    const isGift = listing.type === "gift";
    const badgeClass = isGift ? "type-badge gift" : "type-badge";
    const badgeText = isGift ? "🎁 Gift" : "🔄 Trade";
    const buttonText = isGift ? "I want it!" : "Propose Trade";

    return `
      <div class="listing">
        <pre class="rarity-${pet.rarity}">${escapeHtml(art)}</pre>
        <div class="listing-info">
          <div class="name rarity-${pet.rarity}">${escapeHtml(pet.name)} ${pet.emoji}</div>
          <div class="meta">${escapeHtml(pet.species)} · ${RARITY_LABELS[pet.rarity] || pet.rarity} · by ${escapeHtml(listing.ownerNickname)}</div>
          ${listing.wantDescription ? `<div class="want">"${escapeHtml(listing.wantDescription)}"</div>` : ""}
        </div>
        <span class="${badgeClass}">${badgeText}</span>
        <button data-pubkey="${listing.ownerPublicKey}" data-pet-id="${pet.id}" data-type="${listing.type}">
          ${buttonText}
        </button>
      </div>
    `;
  }).join("");

  container.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => handleInitiateTrade(btn.dataset));
  });
}

async function handleInitiateTrade({ pubkey, petId, type }) {
  // Connect via WebRTC
  await createOffer(pubkey);

  onConnected(async () => {
    if (type === "gift") {
      // For gifts, just send acceptance (no pet offered in return)
      await proposeTrade(null, petId, "gift");
    } else {
      // For trades, let user pick a pet from inventory
      const pets = await window.__TAURI__.core.invoke("list_inventory");
      if (pets.length === 0) {
        alert("You have no pets to trade!");
        disconnect();
        return;
      }
      // For MVP: use the first pet. Future: show a picker.
      const myPet = pets[0];
      await proposeTrade(myPet, petId, "trade");
    }
  });
}

function setupTradeCallbacks() {
  setOnTradeRequest((trade) => {
    showTradeDialog(trade);
  });

  setOnTradeComplete(() => {
    hideTradeDialog();
    loadListings();
  });
}

function showTradeDialog(trade) {
  const dialog = document.getElementById("trade-dialog");
  dialog.classList.remove("hidden");

  document.getElementById("dialog-title").textContent =
    `${trade.theirPublicKey.slice(0, 8)}... wants to trade`;

  document.getElementById("dialog-their-pet").innerHTML =
    `<pre>${escapeHtml(trade.theirPet.asciiArt?.join("\n") || "???")}</pre>
     <div>${escapeHtml(trade.theirPet.name)} ${trade.theirPet.rarity}</div>`;

  document.getElementById("dialog-verify").textContent =
    trade.signatureValid ? "✅ Signature valid" : "⚠️ Could not verify";

  document.getElementById("btn-accept").onclick = () => {
    acceptTrade(trade.tradeId);
    hideTradeDialog();
  };
  document.getElementById("btn-reject").onclick = () => {
    rejectTrade(trade.tradeId);
    hideTradeDialog();
  };
}

function hideTradeDialog() {
  document.getElementById("trade-dialog").classList.add("hidden");
}

function setupFilters() {
  document.getElementById("filter-type").addEventListener("change", loadListings);
  document.getElementById("filter-rarity").addEventListener("change", loadListings);
}

async function startSignalPolling() {
  pollInterval = setInterval(async () => {
    const messages = await window.__TAURI__.core.invoke("poll_signals");
    for (const msg of messages) {
      await handleSignalMessage(msg);
    }
  }, 2000);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

init();
```

- [ ] **Step 3: Commit**

```bash
git add ui/market.html ui/market.js
git commit -m "feat(trade): add market UI with listing browser and trade dialog"
```

---

## Task 11: CLI Commands

**Files:**
- Create: `bin/pet-cli.ts`

- [ ] **Step 1: Create bin/pet-cli.ts**

```typescript
#!/usr/bin/env tsx
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

const PETS_DIR = join(homedir(), ".pets");
const INVENTORY_DIR = join(PETS_DIR, "inventory");
const ACTIVE_PATH = join(PETS_DIR, "active.txt");
const WORKER_URL = process.env.PET_WORKER_URL || "https://pet-trading.YOUR_SUBDOMAIN.workers.dev";

const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case "inventory":
      return handleInventory();
    case "market":
      return handleMarket();
    case "export":
      return handleExport(args[0]);
    case "verify":
      return handleVerify(args[0]);
    default:
      console.log("Usage: pet <command>\n");
      console.log("Commands:");
      console.log("  inventory                   List all pets in your backpack");
      console.log("  inventory --set-active <id>  Set active desktop pet");
      console.log("  market                       Browse current market listings");
      console.log("  export <petId>               Export pet JSON to stdout");
      console.log("  verify <petId>               Verify pet signature and ownership chain");
  }
}

function handleInventory() {
  if (args[0] === "--set-active" && args[1]) {
    const petPath = join(INVENTORY_DIR, `${args[1]}.json`);
    if (!existsSync(petPath)) {
      console.error(`Pet ${args[1]} not found in inventory.`);
      process.exit(1);
    }
    require("fs").writeFileSync(ACTIVE_PATH, args[1]);
    console.log(`Active pet set to ${args[1]}`);
    return;
  }

  if (!existsSync(INVENTORY_DIR)) {
    console.log("No inventory found. Run /create-pet first.");
    return;
  }

  const files = readdirSync(INVENTORY_DIR).filter(f => f.endsWith(".json"));
  if (files.length === 0) {
    console.log("No pets in inventory.");
    return;
  }

  const activeId = existsSync(ACTIVE_PATH) ? readFileSync(ACTIVE_PATH, "utf-8").trim() : null;

  console.log(`\n  🎒 Inventory (${files.length} pets)\n`);
  for (const file of files) {
    const pet = JSON.parse(readFileSync(join(INVENTORY_DIR, file), "utf-8"));
    const isActive = pet.id === activeId;
    const marker = isActive ? " ← active" : "";
    console.log(`  ${pet.id}  ${pet.soul?.name || "???"}  ${pet.soul?.species || ""}  ${pet.bones?.rarity || "?"}${marker}`);
    if (pet.soul?.asciiArt) {
      for (const line of pet.soul.asciiArt) {
        console.log(`         ${line}`);
      }
    }
    console.log();
  }
}

async function handleMarket() {
  try {
    const resp = await fetch(`${WORKER_URL}/listings`);
    const { listings } = await resp.json() as { listings: Array<Record<string, unknown>> };

    if (listings.length === 0) {
      console.log("No listings on the market.");
      return;
    }

    console.log(`\n  🏪 Market (${listings.length} listings)\n`);
    for (const l of listings) {
      const pet = l.pet as Record<string, unknown>;
      const type = l.type === "gift" ? "🎁 Gift" : "🔄 Trade";
      console.log(`  ${type}  ${(pet as Record<string, unknown>).name}  ${(pet as Record<string, unknown>).rarity}  by ${l.ownerNickname}`);
      if (l.wantDescription) console.log(`         Wants: ${l.wantDescription}`);
      console.log();
    }
  } catch {
    console.error("Failed to connect to market. Is the worker running?");
  }
}

function handleExport(petId: string) {
  if (!petId) {
    console.error("Usage: pet export <petId>");
    process.exit(1);
  }
  const petPath = join(INVENTORY_DIR, `${petId}.json`);
  if (!existsSync(petPath)) {
    console.error(`Pet ${petId} not found.`);
    process.exit(1);
  }
  console.log(readFileSync(petPath, "utf-8"));
}

function handleVerify(petId: string) {
  if (!petId) {
    console.error("Usage: pet verify <petId>");
    process.exit(1);
  }
  const petPath = join(INVENTORY_DIR, `${petId}.json`);
  if (!existsSync(petPath)) {
    console.error(`Pet ${petId} not found.`);
    process.exit(1);
  }
  const pet = JSON.parse(readFileSync(petPath, "utf-8"));

  console.log(`\n  🔍 Verifying ${pet.soul?.name || petId}\n`);
  console.log(`  ID:       ${pet.id}`);
  console.log(`  Version:  ${pet.version}`);
  console.log(`  Creator:  ${pet.ownership?.creatorPublicKey?.slice(0, 16) || "unknown"}...`);
  console.log(`  Owner:    ${pet.ownership?.currentOwnerPublicKey?.slice(0, 16) || "unknown"}...`);
  console.log(`  Sig:      ${pet.ownership?.signature ? "present" : "missing"}`);

  const history = pet.ownership?.transferHistory || [];
  if (history.length > 0) {
    console.log(`\n  📜 Transfer History (${history.length} transfers)\n`);
    for (const t of history) {
      console.log(`  ${t.timestamp}  ${t.from.slice(0, 8)}... → ${t.to.slice(0, 8)}...`);
    }
  } else {
    console.log("\n  No transfers — original owner.");
  }
}

main();
```

- [ ] **Step 2: Add script to package.json**

Add to root `package.json` scripts:

```json
"pet": "tsx bin/pet-cli.ts"
```

- [ ] **Step 3: Test CLI**

Run: `pnpm pet inventory`
Expected: "No inventory found" or lists existing pets

Run: `pnpm pet`
Expected: prints usage help

- [ ] **Step 4: Commit**

```bash
git add bin/pet-cli.ts package.json
git commit -m "feat(trade): add CLI for inventory, market, export, verify"
```

---

## Task 12: Integration & Smoke Test

**Files:**
- Modify: `src-tauri/src/lib.rs` (final wiring)

- [ ] **Step 1: Ensure identity is created on startup**

In `src-tauri/src/lib.rs`, add identity initialization in the `setup` closure:

```rust
.setup(|app| {
    // Initialize identity on first launch
    let _ = identity::ensure_identity();

    // Migrate any existing .pet/ directories
    let search_dirs = build_search_dirs();
    for dir in &search_dirs {
        let _ = inventory::migrate_from_dot_pet(dir);
    }

    // Clear window background + remove native shadow
    let window = app.get_webview_window("main").unwrap();
    let _ = window.set_background_color(Some(tauri::window::Color(0, 0, 0, 0)));
    let _ = window.set_shadow(false);

    tray::setup_tray(app)?;

    let handle = app.handle().clone();
    std::thread::spawn(move || {
        while let Ok(event) = rx.recv() {
            let _ = handle.emit("pet-event", &event);
        }
    });
    Ok(())
})
```

- [ ] **Step 2: Build full Tauri app**

Run: `cd src-tauri && cargo build`
Expected: compiles with no errors

- [ ] **Step 3: Run desktop app and verify**

Run: `pnpm desktop`
Expected:
- Desktop pet loads (from `~/.pets/` if migrated, or shows "No pet found")
- Tray menu shows Inventory and Market items
- Clicking Inventory opens a new window
- Clicking Market opens a new window

- [ ] **Step 4: Run TypeScript tests**

Run: `pnpm test`
Expected: all tests pass including new `types.test.ts`

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(trade): integrate identity, inventory, and migration on startup"
```
