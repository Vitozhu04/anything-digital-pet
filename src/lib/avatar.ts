type Element = "wood" | "fire" | "earth" | "metal" | "water";

export type SpeciesInfo = {
  name: string;
  nameEn: string;
  emoji: string;
  ascii: string[];
  color: string; // tailwind text color class
};

export const ELEMENT_SPECIES: Record<Element, SpeciesInfo> = {
  wood: {
    name: "六角恐龙", nameEn: "Axolotl", emoji: "🦎",
    color: "text-green-400",
    ascii: [
      "  \\\\  . .  //  ",
      "   \\\\(° °)//   ",
      "    ( \\_/ )     ",
      "   / |   | \\    ",
      "  ~  ~   ~  ~   ",
    ],
  },
  fire: {
    name: "耳廓狐", nameEn: "Fennec", emoji: "🦊",
    color: "text-orange-400",
    ascii: [
      "   /\\     /\\   ",
      "  / .\\___/. \\  ",
      "  \\  ^ _ ^  /  ",
      "   \\ /   \\ /   ",
      "    \\_) (_/    ",
    ],
  },
  earth: {
    name: "水豚", nameEn: "Capybara", emoji: "🫎",
    color: "text-yellow-400",
    ascii: [
      "    .-------.   ",
      "   / o    o  \\  ",
      "  |    __     | ",
      "  |   /  \\    | ",
      "   \\_/~~~~\\_/  ",
    ],
  },
  metal: {
    name: "独角鲸", nameEn: "Narwhal", emoji: "🐋",
    color: "text-slate-300",
    ascii: [
      "         /      ",
      "    .---/       ",
      "   / o     \\    ",
      "  |         >   ",
      "   \\_______/    ",
    ],
  },
  water: {
    name: "水熊虫", nameEn: "Tardigrade", emoji: "🐻",
    color: "text-blue-400",
    ascii: [
      "  _(\\_/)_       ",
      " / (o.o) \\      ",
      "( /_   _\\ )     ",
      " \\/ | | \\/      ",
      "   _| |_        ",
    ],
  },
};

/**
 * Returns DiceBear URL as fallback, plus the ASCII art for primary display.
 */
export function getDiceBearUrl(element: Element, seed: string): string {
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodedSeed}&size=200`;
}

export function getAsciiArt(element: Element): string[] {
  return ELEMENT_SPECIES[element].ascii;
}

export function getAvatarSeed(name: string, timestampMs: number): string {
  return `${name}:${timestampMs}`;
}
