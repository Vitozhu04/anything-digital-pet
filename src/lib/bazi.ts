// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require("lunar-javascript");

export type BaZiPillar = { celestial: string; terrestrial: string };

export type ElementDistribution = {
  wood: number;
  fire: number;
  earth: number;
  metal: number;
  water: number;
};

export type BaZiResult = {
  year: BaZiPillar;
  month: BaZiPillar;
  day: BaZiPillar;
  hour: BaZiPillar;
  fullString: string;
  elementDistribution: ElementDistribution;
};

const STEM_ELEMENT: Record<string, keyof ElementDistribution> = {
  甲: "wood",
  乙: "wood",
  丙: "fire",
  丁: "fire",
  戊: "earth",
  己: "earth",
  庚: "metal",
  辛: "metal",
  壬: "water",
  癸: "water",
};

const BRANCH_ELEMENT: Record<string, keyof ElementDistribution> = {
  子: "water",
  丑: "earth",
  寅: "wood",
  卯: "wood",
  辰: "earth",
  巳: "fire",
  午: "fire",
  未: "earth",
  申: "metal",
  酉: "metal",
  戌: "earth",
  亥: "water",
};

export function calculateBaZiFromDate(
  date: Date = new Date()
): BaZiResult {
  const solar = Solar.fromYmdHms(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    0
  );
  const eightChar = solar.getLunar().getEightChar();

  const yearStr: string = eightChar.getYear();
  const monthStr: string = eightChar.getMonth();
  const dayStr: string = eightChar.getDay();
  const hourStr: string = eightChar.getTime();

  const pillars: readonly BaZiPillar[] = [
    { celestial: yearStr[0], terrestrial: yearStr[1] },
    { celestial: monthStr[0], terrestrial: monthStr[1] },
    { celestial: dayStr[0], terrestrial: dayStr[1] },
    { celestial: hourStr[0], terrestrial: hourStr[1] },
  ];

  const dist: ElementDistribution = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };
  for (const p of pillars) {
    const s = STEM_ELEMENT[p.celestial];
    if (s) dist[s]++;
    const b = BRANCH_ELEMENT[p.terrestrial];
    if (b) dist[b]++;
  }

  return {
    year: pillars[0],
    month: pillars[1],
    day: pillars[2],
    hour: pillars[3],
    fullString: `${yearStr} ${monthStr} ${dayStr} ${hourStr}`,
    elementDistribution: dist,
  };
}

/** Returns the element with the highest count. Ties broken by order: wood > fire > earth > metal > water */
export function getDominantElement(
  dist: ElementDistribution
): keyof ElementDistribution {
  const order: readonly (keyof ElementDistribution)[] = [
    "wood",
    "fire",
    "earth",
    "metal",
    "water",
  ];
  return order.reduce((max, el) => (dist[el] > dist[max] ? el : max), order[0]);
}
