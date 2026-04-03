// ui/tarot.js

const ARCANA = [
  { id: 0,  name: "The Fool",         emoji: "🃏", up: "New beginnings",     rev: "Recklessness",      upR: "Leap -- the net appears.",       revR: "Look before you leap." },
  { id: 1,  name: "The Magician",     emoji: "🎩", up: "Willpower",          rev: "Deception",          upR: "You have all you need.",          revR: "Check your blind spots." },
  { id: 2,  name: "High Priestess",   emoji: "🌙", up: "Inner wisdom",       rev: "Hidden secrets",     upR: "Trust the quiet voice.",          revR: "What are you not saying?" },
  { id: 3,  name: "The Empress",      emoji: "🌿", up: "Abundance",          rev: "Stagnation",         upR: "Let it grow naturally.",           revR: "Unblock the creative flow." },
  { id: 4,  name: "The Emperor",      emoji: "👑", up: "Authority",           rev: "Rigidity",           upR: "Structure breeds freedom.",        revR: "Loosen the grip a little." },
  { id: 5,  name: "The Hierophant",   emoji: "📜", up: "Guidance",            rev: "Dogma",              upR: "Seek a worthy teacher.",           revR: "Question the old rules." },
  { id: 6,  name: "The Lovers",       emoji: "💞", up: "Harmony",             rev: "Indecision",         upR: "Choose with your whole heart.",    revR: "Align values before acting." },
  { id: 7,  name: "The Chariot",      emoji: "⚡", up: "Victory",             rev: "Loss of control",    upR: "Charge forward with focus.",       revR: "Slow down to steer true." },
  { id: 8,  name: "Strength",         emoji: "🦁", up: "Courage",             rev: "Self-doubt",         upR: "Gentle will moves mountains.",     revR: "You are stronger than this." },
  { id: 9,  name: "The Hermit",       emoji: "🕯", up: "Introspection",      rev: "Isolation",          upR: "Solitude holds the answer.",       revR: "Come back to the world." },
  { id: 10, name: "Wheel of Fortune", emoji: "🎡", up: "Turning point",      rev: "Bad luck",           upR: "The cycle is turning now.",        revR: "This too shall pass." },
  { id: 11, name: "Justice",          emoji: "⚖", up: "Fairness",            rev: "Injustice",          upR: "Truth will be your shield.",       revR: "Rebalance what's off." },
  { id: 12, name: "The Hanged Man",   emoji: "🙃", up: "New perspective",    rev: "Stalling",           upR: "Surrender to see clearly.",        revR: "Stop waiting -- decide." },
  { id: 13, name: "Death",            emoji: "🌑", up: "Transformation",     rev: "Resisting change",   upR: "Let the old self go.",             revR: "What are you clinging to?" },
  { id: 14, name: "Temperance",       emoji: "🌊", up: "Balance",             rev: "Excess",             upR: "Patience is the secret.",          revR: "Find the middle ground." },
  { id: 15, name: "The Devil",        emoji: "🔗", up: "Breaking free",      rev: "Addiction",           upR: "Name the chain to break it.",     revR: "The cage door is open." },
  { id: 16, name: "The Tower",        emoji: "⛈", up: "Revelation",          rev: "Disaster",           upR: "Rebuild from the rubble.",         revR: "Brace -- storm incoming." },
  { id: 17, name: "The Star",         emoji: "⭐", up: "Hope",                rev: "Despair",            upR: "Follow the faintest light.",       revR: "Hope is still there." },
  { id: 18, name: "The Moon",         emoji: "🌕", up: "Mystery",             rev: "Illusion",           upR: "Trust your dreams tonight.",       revR: "Not all shadows are real." },
  { id: 19, name: "The Sun",          emoji: "☀", up: "Joy & vitality",      rev: "Burnout",            upR: "Bask in it -- you earned it.",     revR: "Rest before you shine." },
  { id: 20, name: "Judgement",        emoji: "🔔", up: "Awakening",           rev: "Avoidance",          upR: "Answer the inner calling.",        revR: "Face what you've deferred." },
  { id: 21, name: "The World",        emoji: "🌍", up: "Completion",          rev: "Unfinished",         upR: "A chapter closes in peace.",       revR: "One last push remains." },
];

const ROMAN = ["0","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI"];

function center(s, w) {
  const len = [...s].length;
  const left = Math.floor((w - len) / 2);
  const right = w - len - left;
  return " ".repeat(Math.max(0, left)) + s + " ".repeat(Math.max(0, right));
}

function wrap(text, w) {
  const words = text.split(" ");
  const out = [];
  let cur = "";
  for (const word of words) {
    if (cur && cur.length + 1 + word.length > w) {
      out.push(center(cur, w));
      cur = word;
    } else {
      cur = cur ? cur + " " + word : word;
    }
  }
  if (cur) out.push(center(cur, w));
  return out;
}

export function drawTarotCard() {
  const card = ARCANA[Math.floor(Math.random() * ARCANA.length)];
  const upright = Math.random() > 0.5;
  const dir = upright ? "Upright" : "Reversed";
  const reading = upright ? card.upR : card.revR;
  const numeral = ROMAN[card.id];
  const W = 16;

  const h = "-".repeat(W);
  const border = "." + h + ".";
  const bot = "'" + h + "'";
  const sep = "|" + center("~", W) + "|";
  const blank = "|" + " ".repeat(W) + "|";

  const lines = [border, blank];
  lines.push("|" + center(card.emoji + " " + numeral, W) + "|");
  lines.push(blank);
  for (const nl of wrap(card.name, W)) lines.push("|" + nl + "|");
  lines.push("|" + center(dir, W) + "|");
  lines.push(sep);
  for (const rl of wrap(reading, W - 2)) lines.push("|" + center(rl.trim(), W) + "|");
  lines.push(blank, bot);

  return { card, upright, dir, reading, ascii: lines };
}
