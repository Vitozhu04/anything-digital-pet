#!/usr/bin/env tsx
/**
 * Standalone CLI to generate a pet — no server needed.
 *
 * Usage:
 *   tsx bin/create-pet.ts "Your project description"
 *   tsx bin/create-pet.ts "description" --mbti INTJ
 *   tsx bin/create-pet.ts   # reads README.md from cwd
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";

// Load .env.local for API keys (check plugin root and cwd)
for (const dir of [resolve(__dirname, ".."), process.cwd()]) {
  const envPath = join(dir, ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf-8").split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim();
      }
    }
  }
}

import { createPet } from "../engine/create";

type Dim = "E" | "I" | "S" | "N" | "T" | "F" | "J" | "P";

function parseMbti(s: string): { ei: "E"|"I"; sn: "S"|"N"; tf: "T"|"F"; jp: "J"|"P" } {
  const upper = s.toUpperCase();
  return {
    ei: (upper[0] === "E" ? "E" : "I") as "E"|"I",
    sn: (upper[1] === "S" ? "S" : "N") as "S"|"N",
    tf: (upper[2] === "T" ? "T" : "F") as "T"|"F",
    jp: (upper[3] === "J" ? "J" : "P") as "J"|"P",
  };
}

async function main() {
  const cwd = process.cwd();
  const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
  const mbtiFlag = process.argv.find(a => a.startsWith("--mbti"));
  const mbtiVal = mbtiFlag ? process.argv[process.argv.indexOf(mbtiFlag) + 1] : null;

  let context = args[0];

  // If no argument, try to read README.md
  if (!context) {
    const readmePath = join(cwd, "README.md");
    if (existsSync(readmePath)) {
      context = readFileSync(readmePath, "utf-8").slice(0, 500);
      console.log("📖 Read context from README.md");
    } else {
      console.log("Usage: tsx bin/create-pet.ts \"project description\"");
      console.log("       tsx bin/create-pet.ts --mbti INTJ \"description\"");
      console.log("  Or run in a directory with README.md");
      process.exit(1);
    }
  }

  const mbti = mbtiVal ? parseMbti(mbtiVal) : { ei: "I" as const, sn: "N" as const, tf: "T" as const, jp: "P" as const };

  console.log("🔮 Divining your pet...\n");

  const pet = await createPet("cli", context, mbti);

  // Print the pet
  console.log(pet.soul.asciiArt.join("\n"));
  console.log(`\n${pet.soul.emoji} ${pet.soul.name} (${pet.soul.nameEn})`);
  console.log(`${pet.bones.rarity} · ${pet.soul.species} · ${pet.bones.mbti} · ${pet.bones.tarot.name}${pet.bones.tarot.upright ? " 正位" : " 逆位"}`);
  console.log(`\n${pet.soul.description}\n`);

  // Save to .pet/ in cwd
  const petDir = join(cwd, ".pet");
  mkdirSync(petDir, { recursive: true });
  const filePath = join(petDir, `${pet.soul.name}.json`);
  writeFileSync(filePath, JSON.stringify(pet, null, 2));
  console.log(`💾 Saved to ${filePath}`);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
