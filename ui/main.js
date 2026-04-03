// ui/main.js
import { initRenderer, setState } from "./renderer.js";
import { initDrag } from "./drag.js";
import { showBubble } from "./bubble.js";
import { initInteractions } from "./interact.js";

let petData = null;

async function init() {
  if (window.__TAURI__) {
    try {
      petData = await window.__TAURI__.core.invoke("load_pet");
    } catch {
      const el = document.getElementById("ascii-art");
      el.classList.remove("hidden");
      el.textContent = "No pet found.\nRun /create-pet";
      return;
    }
  }

  if (!petData) {
    const el = document.getElementById("ascii-art");
    el.classList.remove("hidden");
    el.textContent = "No pet found.\nRun /create-pet";
    return;
  }

  initRenderer(petData);
  initDrag();
  initInteractions();

  // Set English name label + info card toggle
  const nameEl = document.getElementById("pet-name");
  nameEl.textContent = petData.soul.nameEn || petData.soul.name;
  nameEl.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleInfoCard(petData);
  });

  // Agent events
  if (window.__TAURI__) {
    window.__TAURI__.event.listen("pet-event", (event) => {
      const { state, data } = event.payload;
      setState(state);
      if (data?.summary) showBubble(data.summary);
    });
  }
}

const TAROT_EN = {
  0:"The Fool",1:"The Magician",2:"The High Priestess",3:"The Empress",
  4:"The Emperor",5:"The Hierophant",6:"The Lovers",7:"The Chariot",
  8:"Strength",9:"The Hermit",10:"Wheel of Fortune",11:"Justice",
  12:"The Hanged Man",13:"Death",14:"Temperance",15:"The Devil",
  16:"The Tower",17:"The Star",18:"The Moon",19:"The Sun",
  20:"Judgement",21:"The World",
};

const MBTI_EN = {
  INTJ:"Architect",INTP:"Logician",ENTJ:"Commander",ENTP:"Debater",
  INFJ:"Advocate",INFP:"Mediator",ENFJ:"Protagonist",ENFP:"Campaigner",
  ISTJ:"Logistician",ISFJ:"Defender",ESTJ:"Executive",ESFJ:"Consul",
  ISTP:"Virtuoso",ISFP:"Adventurer",ESTP:"Entrepreneur",ESFP:"Entertainer",
};

const ELEMENT_EN = {
  wood:"Wood",fire:"Fire",earth:"Earth",metal:"Metal",water:"Water",
};

function toggleInfoCard(pet) {
  const card = document.getElementById("info-card");
  if (!card.classList.contains("hidden")) {
    card.classList.add("hidden");
    return;
  }

  const b = pet.bones;
  const s = pet.soul;
  const tarotName = TAROT_EN[b.tarot.id] || b.tarot.name;
  const tarotDir = b.tarot.upright ? "Upright" : "Reversed";
  const mbtiDesc = MBTI_EN[b.mbti] || b.mbtiDescription;
  const element = ELEMENT_EN[b.dominantElement] || b.dominantElement;
  const rarityColors = { N: "#67e8f9", R: "#c084fc", SR: "#fbbf24", SSR: "#f87171" };
  const rc = rarityColors[b.rarity] || "#67e8f9";

  card.innerHTML = [
    row("Species", `${s.emoji} ${s.speciesEn || s.species}`),
    row("Rarity", `<span style="color:${rc}">${b.rarity}</span>`),
    row("MBTI", `${b.mbti} · ${mbtiDesc}`),
    row("Tarot", `${tarotName} · ${tarotDir}`),
    row("Element", element),
    row("BaZi", b.bazi.fullString),
    `<div class="info-close">tap to close</div>`,
  ].join("");

  card.addEventListener("click", () => card.classList.add("hidden"), { once: true });
  card.classList.remove("hidden");
}

function row(label, value) {
  return `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${value}</span></div>`;
}

init();
