// ui/info-card.js
let clickTimeout = null;

export function initInfoCard(petData) {
  const container = document.getElementById("pet-container");
  const card = document.getElementById("info-card");

  container.addEventListener("click", () => {
    // Debounce to avoid conflict with drag
    if (clickTimeout) clearTimeout(clickTimeout);
    clickTimeout = setTimeout(() => {
      if (!card.classList.contains("hidden")) return;
      card.innerHTML = buildCardHtml(petData);
      card.classList.remove("hidden");
    }, 200);
  });

  card.addEventListener("click", () => {
    card.classList.add("hidden");
  });
}

function buildCardHtml(pet) {
  const b = pet.bones;
  const s = pet.soul;
  const ed = b.bazi.elementDistribution;
  return `
    <h2>${s.emoji} ${s.name} <small style="color:#888">${s.nameEn}</small></h2>
    <p style="color:#aaa">${s.species} (${s.speciesEn}) · <strong>${b.rarity}</strong></p>
    <hr style="border-color:#333;margin:8px 0">
    <div class="stat">五行: <span>木${ed.wood} 火${ed.fire} 土${ed.earth} 金${ed.metal} 水${ed.water} (${b.dominantElement})</span></div>
    <div class="stat">MBTI: <span>${b.mbti}</span> ${b.mbtiDescription}</div>
    <div class="stat">命牌: <span>${b.tarot.name}${b.tarot.upright ? " 正位" : " 逆位"}</span> — ${b.tarot.trait}</div>
    <div class="stat">八字: <span style="font-family:monospace">${b.bazi.fullString}</span></div>
    <hr style="border-color:#333;margin:8px 0">
    <p style="color:#ccc;line-height:1.5">${s.description}</p>
    <p style="color:#555;margin-top:12px;font-size:10px">点击任意处关闭</p>
  `;
}
