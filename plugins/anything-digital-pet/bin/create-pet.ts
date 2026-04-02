#!/usr/bin/env tsx
/**
 * Outputs the deterministic "bones" data (BaZi + Tarot + MBTI) as JSON to stdout.
 * The LLM (Claude itself) generates the "soul" (species, name, ASCII art) in the skill.
 * No external API key needed.
 *
 * Usage:
 *   tsx bin/create-pet.ts "project description" --mbti INTJ
 *   tsx bin/create-pet.ts "project description"  # defaults to INTP
 */

import { buildBones } from "../engine/create";

const args = process.argv.slice(2).filter(a => !a.startsWith("--"));
const mbtiFlag = process.argv.findIndex(a => a === "--mbti");
const mbtiVal = mbtiFlag !== -1 ? process.argv[mbtiFlag + 1] : null;

const context = args[0];
if (!context) {
  console.error("Usage: tsx bin/create-pet.ts \"project description\" [--mbti INTJ]");
  process.exit(1);
}

function parseMbti(s: string) {
  const u = s.toUpperCase();
  return {
    ei: (u[0] === "E" ? "E" : "I") as "E" | "I",
    sn: (u[1] === "S" ? "S" : "N") as "S" | "N",
    tf: (u[2] === "T" ? "T" : "F") as "T" | "F",
    jp: (u[3] === "J" ? "J" : "P") as "J" | "P",
  };
}

const mbti = mbtiVal ? parseMbti(mbtiVal) : { ei: "I" as const, sn: "N" as const, tf: "T" as const, jp: "P" as const };
const bones = buildBones(context, mbti);

// Output bones as JSON — Claude generates the soul part in the skill
console.log(JSON.stringify(bones, null, 2));
