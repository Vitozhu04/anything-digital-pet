type Element = "wood" | "fire" | "earth" | "metal" | "water";

export type SpeciesInfo = {
  name: string;
  nameEn: string;
  emoji: string;
  diceBearStyle: string;
};

export const ELEMENT_SPECIES: Record<Element, SpeciesInfo> = {
  wood:  { name: "苍龙",     nameEn: "Dragon",  emoji: "🐉", diceBearStyle: "lorelei" },
  fire:  { name: "烈焰狐",   nameEn: "Fox",     emoji: "🦊", diceBearStyle: "adventurer" },
  earth: { name: "土灵熊",   nameEn: "Bear",    emoji: "🐻", diceBearStyle: "avataaars" },
  metal: { name: "铁甲兽",   nameEn: "Mech",    emoji: "🤖", diceBearStyle: "bottts" },
  water: { name: "深渊章鱼", nameEn: "Octopus", emoji: "🐙", diceBearStyle: "fun-emoji" },
};

export function getDiceBearUrl(element: Element, seed: string): string {
  const { diceBearStyle } = ELEMENT_SPECIES[element];
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/9.x/${diceBearStyle}/svg?seed=${encodedSeed}&size=200`;
}

export function getAvatarSeed(name: string, timestampMs: number): string {
  return `${name}:${timestampMs}`;
}
