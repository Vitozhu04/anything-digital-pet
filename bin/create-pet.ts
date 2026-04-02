#!/usr/bin/env tsx
/**
 * Standalone CLI to generate a pet — no server needed.
 *
 * Usage:
 *   pnpm create-pet "Your project description here"
 *   pnpm create-pet   # reads README.md from cwd
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

// Load .env.local for API keys
const envPath = resolve(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
}

import { createPet } from "../engine/create";
import { join } from "path";

async function main() {
  const cwd = process.cwd();
  let context = process.argv[2];

  // If no argument, try to read README.md
  if (!context) {
    const readmePath = join(cwd, "README.md");
    if (existsSync(readmePath)) {
      context = readFileSync(readmePath, "utf-8").slice(0, 500);
      console.log("📖 Read context from README.md");
    } else {
      console.log("Usage: npx ts-node bin/create-pet.ts \"project description\"");
      console.log("  Or run in a directory with README.md");
      process.exit(1);
    }
  }

  console.log("🔮 Divining your pet...\n");

  const pet = await createPet("cli", context, {
    ei: "I", sn: "N", tf: "T", jp: "P",
  });

  // Print the pet
  console.log(pet.soul.asciiArt.join("\n"));
  console.log(`\n${pet.soul.emoji} ${pet.soul.name} (${pet.soul.nameEn})`);
  console.log(`${pet.bones.rarity} · ${pet.soul.species} · ${pet.bones.mbti} · ${pet.bones.tarot.name}${pet.bones.tarot.upright ? " 正位" : " 逆位"}`);
  console.log(`\n${pet.soul.description}\n`);

  // Save to .pet/
  const petDir = join(cwd, ".pet");
  mkdirSync(petDir, { recursive: true });
  const filePath = join(petDir, `${pet.soul.name}.json`);
  writeFileSync(filePath, JSON.stringify(pet, null, 2));
  console.log(`💾 Saved to ${filePath}`);
  console.log(`\n🖥️  Run desktop pet: cd ${__dirname}/.. && pnpm desktop`);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
