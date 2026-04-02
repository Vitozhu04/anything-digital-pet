"use client";
import { useSearchParams } from "next/navigation";
import type { Pet } from "@/types/pet";

const RARITY_STYLES: Record<string, { bg: string; border: string; badge: string; glow: string }> = {
  common:    { bg: "from-gray-800 to-gray-900",   border: "border-gray-600",   badge: "bg-gray-600",   glow: "shadow-gray-500/10" },
  uncommon:  { bg: "from-green-950 to-gray-900",  border: "border-green-600",  badge: "bg-green-600",  glow: "shadow-green-500/20" },
  rare:      { bg: "from-blue-950 to-gray-900",   border: "border-blue-500",   badge: "bg-blue-500",   glow: "shadow-blue-500/25" },
  epic:      { bg: "from-purple-950 to-gray-900", border: "border-purple-500", badge: "bg-purple-500", glow: "shadow-purple-500/30" },
  legendary: { bg: "from-amber-950 to-gray-900",  border: "border-amber-400",  badge: "bg-amber-400 text-black", glow: "shadow-amber-400/40" },
};

const ELEMENT_COLORS: Record<string, string> = {
  wood: "text-green-400", fire: "text-orange-400",
  earth: "text-yellow-400", metal: "text-slate-300", water: "text-blue-400",
};

const ASCII_ART: Record<string, string[]> = {
  wood: [
    "  \\\\  . .  //  ",
    "   \\\\(° °)//   ",
    "    ( \\_/ )     ",
    "   / |   | \\    ",
    "  ~  ~   ~  ~   ",
  ],
  fire: [
    "   /\\     /\\   ",
    "  / .\\___/. \\  ",
    "  \\  ^ _ ^  /  ",
    "   \\ /   \\ /   ",
    "    \\_) (_/    ",
  ],
  earth: [
    "    .-------.   ",
    "   / o    o  \\  ",
    "  |    __     | ",
    "  |   /  \\    | ",
    "   \\_/~~~~\\_/  ",
  ],
  metal: [
    "         /      ",
    "    .---/       ",
    "   / o     \\    ",
    "  |         >   ",
    "   \\_______/    ",
  ],
  water: [
    "  _(\\_/)_       ",
    " / (o.o) \\      ",
    "( /_   _\\ )     ",
    " \\/ | | \\/      ",
    "   _| |_        ",
  ],
};

export default function PetCardClient() {
  const params = useSearchParams();
  const raw = params.get("data");

  if (!raw) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-gray-400">
        No pet data provided.
      </div>
    );
  }

  let pet: Pet;
  try {
    const std = raw.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(std);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    pet = JSON.parse(json);
  } catch {
    return <div className="text-red-400 p-8">Invalid pet data.</div>;
  }

  const rStyle = RARITY_STYLES[pet.bones.rarity] ?? RARITY_STYLES.common;
  const elColor = ELEMENT_COLORS[pet.bones.dominantElement] ?? "text-white";
  const asciiLines = ASCII_ART[pet.bones.dominantElement] ?? ASCII_ART.water;

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className={`w-full max-w-md rounded-2xl bg-gradient-to-b ${rStyle.bg} border ${rStyle.border} shadow-2xl ${rStyle.glow} overflow-hidden`}>

        {/* ASCII Art Avatar */}
        <div className="pt-8 pb-2 text-center">
          <pre className={`inline-block text-base leading-snug font-mono ${elColor}`}>
            {asciiLines.join("\n")}
          </pre>
        </div>

        {/* Name & Species */}
        <div className="pb-5 text-center border-b border-white/10">
          <h1 className="text-3xl font-bold text-white">{pet.soul.name}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {pet.soul.nameEn} · {pet.soul.species} {pet.soul.emoji}
          </p>
          <span className={`inline-block mt-3 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-widest ${rStyle.badge}`}>
            {pet.bones.rarity}
          </span>
        </div>

        {/* Stats */}
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 w-14 shrink-0">五行</span>
            <span className={`font-semibold ${elColor}`}>
              木{pet.bones.bazi.elementDistribution.wood} 火{pet.bones.bazi.elementDistribution.fire} 土{pet.bones.bazi.elementDistribution.earth} 金{pet.bones.bazi.elementDistribution.metal} 水{pet.bones.bazi.elementDistribution.water}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 w-14 shrink-0">MBTI</span>
            <span className="text-white font-semibold">{pet.bones.mbti}</span>
            <span className="text-gray-500 text-xs truncate">{pet.bones.mbtiDescription}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 w-14 shrink-0">命牌</span>
            <span className="text-white">
              {pet.bones.tarot.name}{pet.bones.tarot.upright ? " 正位" : " 逆位"}
            </span>
            <span className="text-gray-500 text-xs">— {pet.bones.tarot.trait}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 w-14 shrink-0">八字</span>
            <span className="text-gray-300 font-mono text-xs">{pet.bones.bazi.fullString}</span>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 pb-4">
          <p className="text-gray-300 text-sm leading-relaxed border-t border-white/10 pt-4">
            {pet.soul.description}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-xs text-gray-600 flex justify-between">
          <span>创建于 {new Date(pet.meta.createdAt).toLocaleDateString("zh-CN")}</span>
          <span>anything-digital-pet</span>
        </div>
      </div>
    </div>
  );
}
