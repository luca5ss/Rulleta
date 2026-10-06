import { RED_NUMBERS } from "./physics.js";

export const BETS = {
  straight: { label: "Straight", profit: 35, min: 1 },
  split: { label: "Split", profit: 17, min: 2 },
  street: { label: "Street", profit: 11, min: 3 },
  corner: { label: "Corner", profit: 8, min: 4 },
  sixline: { label: "Six line", profit: 5, min: 6 },
  dozen: { label: "Dozen", profit: 2 },
  column: { label: "Column", profit: 2 },
  red: { label: "Red", profit: 1 },
  black: { label: "Black", profit: 1 },
  even: { label: "Even", profit: 1 },
  odd: { label: "Odd", profit: 1 },
  low: { label: "1–18", profit: 1 },
  high: { label: "19–36", profit: 1 },
};

export function isValidInsideBet(type, numbers) {
  if (!BETS[type] || numbers.length !== BETS[type].min) return false;
  const unique = new Set(numbers);
  if (unique.size !== numbers.length) return false;
  if (type === "straight") return true;
  if (numbers.includes(0)) return false;
  const sorted = [...numbers].sort((a, b) => a - b);
  if (type === "split") {
    const [a, b] = sorted;
    return Math.abs(a-b) === 3 || (Math.floor((a-1)/3) === Math.floor((b-1)/3) && b-a === 1);
  }
  if (type === "street") return sorted[0] % 3 === 1 && sorted[1] === sorted[0]+1 && sorted[2] === sorted[0]+2;
  if (type === "corner") {
    const a=sorted[0];
    return a % 3 !== 0 && sorted[1] === a+1 && sorted[2] === a+3 && sorted[3] === a+4;
  }
  if (type === "sixline") {
    const a=sorted[0];
    return a % 6 === 1 && sorted.join(",") === [a,a+1,a+2,a+3,a+4,a+5].join(",");
  }
  return false;
}

export function outsideBet(type, attribute) {
  const rules = {
    dozen: n => n > 0 && Math.ceil(n/12) === Number(attribute),
    column: n => n > 0 && (n-1)%3 === Number(attribute),
    red: n => RED_NUMBERS.has(n),
    black: n => n > 0 && !RED_NUMBERS.has(n),
    even: n => n > 0 && n%2 === 0,
    odd: n => n%2 === 1,
    low: n => n >= 1 && n <= 18,
    high: n => n >= 19 && n <= 36,
  };
  return { type, label: BETS[type].label + (attribute ? ` ${attribute}` : ""), attribute: attribute ?? null, numbers: null, wins: rules[type] };
}

export function insideBet(type, numbers) {
  return { type, label: BETS[type].label + " " + numbers.join("/").replaceAll("/", "–"), numbers: [...numbers], wins: number => numbers.includes(number) };
}

export function payoutFor(bet, number, stake) {
  const descriptor = BETS[bet.type];
  if (!descriptor || !bet.wins(number)) return 0;
  return stake * (descriptor.profit + 1);
}