export const BALLS = [
  { id: "ivory", name: "Ivory", rarity: "House standard", price: 0, color: "#e7d8b6", physics: { weight: 1, friction: .18, restitution: .57, deflectorStrength: 1 }, description: "Balanced · even-tempered" },
  { id: "gold", name: "Gilt Aureate", rarity: "The connoisseur's choice", price: 800, color: "linear-gradient(135deg,#fff1ad,#b47a2b 46%,#f2d275)", physics: { weight: 1.15, friction: .2, restitution: .51, deflectorStrength: .92 }, description: "Heavy · deliberate rebounds" },
  { id: "diamond", name: "Brilliant", rarity: "Faceted rock crystal", price: 1600, color: "linear-gradient(135deg,#fff,#9bc6d0 43%,#f4fcff)", physics: { weight: .78, friction: .15, restitution: .72, deflectorStrength: 1.16 }, description: "Light · lively deflections" },
  { id: "ruby", name: "Ruby Nocturne", rarity: "Natural corundum", price: 2400, color: "linear-gradient(135deg,#f36b59,#871b24 50%,#eeb7a3)", physics: { weight: 1.05, friction: .22, restitution: .66, deflectorStrength: 1.08 }, description: "True-weight · spirited" },
  { id: "emerald", name: "Emerald Court", rarity: "Colombian beryl", price: 3200, color: "linear-gradient(135deg,#9ee0a0,#11613f 52%,#71b681)", physics: { weight: .92, friction: .13, restitution: .64, deflectorStrength: .95 }, description: "Silken roll · measured bounce" },
  { id: "sapphire", name: "Blue Salon", rarity: "Kashmir sapphire", price: 4500, color: "linear-gradient(135deg,#9ac9ff,#173e7c 52%,#6d9cda)", physics: { weight: 1.2, friction: .24, restitution: .48, deflectorStrength: 1.2 }, description: "Substantial · forceful ricochet" },
  { id: "obsidian", name: "Royal Obsidian", rarity: "The private reserve", price: 7000, color: "linear-gradient(135deg,#8e8981,#171412 48%,#c0a46b)", physics: { weight: 1.08, friction: .11, restitution: .79, deflectorStrength: 1.3 }, description: "Dark glass · wild and swift" },
];

export class BallCollection {
  constructor(saved = {}) {
    this.owned = new Set(["ivory", ...(saved.owned || [])]);
    this.equipped = this.owned.has(saved.equipped) ? saved.equipped : "ivory";
  }

  get active() {
    return BALLS.find(ball => ball.id === this.equipped) || BALLS[0];
  }

  has(id) {
    return this.owned.has(id);
  }

  purchase(id, balance) {
    const item = BALLS.find(ball => ball.id === id);
    if (!item) return { ok: false, reason: "That entry is absent from the catalogue." };
    if (this.has(id)) {
      this.equipped = id;
      return { ok: true, price: 0, equipped: true };
    }
    if (balance < item.price) return { ok: false, reason: "Your purse is not quite sufficient for this acquisition." };
    this.owned.add(id);
    this.equipped = id;
    return { ok: true, price: item.price, equipped: true };
  }

  serialize() {
    return { owned: [...this.owned], equipped: this.equipped };
  }
}

export function renderShop(container, collection, balance) {
  container.replaceChildren();
  for (const ball of BALLS) {
    const owned = collection.has(ball.id);
    const equipped = collection.equipped === ball.id;
    const card = document.createElement("article");
    card.className = `upgrade-card${owned ? " owned" : ""}${equipped ? " equipped active-ball" : ""}`;
    card.innerHTML = `<div class="upgrade-swatch" style="background:${ball.color}"></div><div class="upgrade-name"></div><div class="upgrade-physics"></div><div class="upgrade-price"></div><button class="upgrade-buy" type="button"></button>`;
    card.querySelector(".upgrade-name").textContent = ball.name;
    card.querySelector(".upgrade-physics").textContent = ball.description;
    card.querySelector(".upgrade-price").textContent = ball.price ? `F ${ball.price.toLocaleString()} · ${ball.rarity}` : ball.rarity;
    const button = card.querySelector("button");
    button.dataset.ball = ball.id;
    if (equipped) {
      button.textContent = "IN PLAY";
      button.disabled = true;
    } else if (owned) {
      button.textContent = "EQUIP";
    } else {
      button.textContent = `ACQUIRE · F ${ball.price.toLocaleString()}`;
      button.disabled = balance < ball.price;
    }
    container.append(card);
  }
}