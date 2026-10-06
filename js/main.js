import { RoulettePhysics, pocketColor } from "./physics.js";
import { WheelRenderer } from "./wheel.js";
import { BETS, insideBet, isValidInsideBet, outsideBet, payoutFor } from "./betting.js";
import { BallCollection, renderShop } from "./shop.js";
import { Dealer } from "./dealer.js";
import { SalonSound } from "./sound.js";

const STORE_KEY = "rulleta-salon-state-v1";
const DENOMINATIONS = [5, 25, 100, 500];
const formatMoney = amount => Math.max(0, Math.floor(amount)).toLocaleString("en-US");
const formatLabel = number => `${number} ${pocketColor(number)}`;
const parseSaved = () => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "{}"); }
  catch { return {}; }
};

const saved = parseSaved();
let balance = Number.isFinite(saved.balance) ? Math.max(0, saved.balance) : 2500;
let collection = new BallCollection(saved.collection);
let history = Array.isArray(saved.history) ? saved.history.slice(0, 12) : [];
let previousBets = Array.isArray(saved.previousBets) ? saved.previousBets : [];
let physicsTuning = saved.physics && typeof saved.physics === "object" ? saved.physics : {};
let currentChip = 5;
let minimum = 5;
let bets = [];
let selection = [];
let simulation = null;
let phase = "open";
let lastFrame = 0;
let finalized = false;
let toastTimer = 0;
let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const $ = selector => document.querySelector(selector);
const canvas = $("#wheel");
const renderer = new WheelRenderer(canvas);
const dealer = new Dealer($("#dealer"), $("#dealer-line"));
const sound = new SalonSound();
const grid = $("#number-grid");
const phaseLabel = $("#phase-label");
const phaseLight = $("#phase-light");
const spinButton = $("#spin");
const toast = $("#toast");
const reducedMotionInput = $("#reduced-motion");
reducedMotionInput.checked = reducedMotion;

for (let number = 1; number <= 36; number++) {
  const cell = document.createElement("button");
  cell.type = "button";
  cell.className = `number-cell ${pocketColor(number)}-cell`;
  cell.dataset.number = String(number);
  cell.style.gridColumn = String(Math.ceil(number / 3));
  cell.style.gridRow = String(3 - ((number - 1) % 3));
  cell.textContent = String(number);
  cell.setAttribute("aria-label", `${number}, ${pocketColor(number)}. Click to place a ${$("#bet-kind").value} bet.`);
  grid.append(cell);
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ balance, collection: collection.serialize(), history, previousBets, physics: physicsTuning }));
  } catch { showToast("Your private ledger could not be written to this browser."); }
}

function updateBalance() {
  $("#balance").textContent = formatMoney(balance);
  $("#shop-balance").textContent = `F ${formatMoney(balance)}`;
  renderShop($("#shop-grid"), collection, balance);
  save();
}

function setPhase(next, label) {
  phase = next;
  phaseLabel.textContent = label;
  phaseLight.classList.toggle("is-closed", next !== "open");
  phaseLight.parentElement.classList.toggle("is-closed", next !== "open");
  spinButton.disabled = next !== "open" || bets.length === 0;
  $("#table-status").textContent = next === "open" ? "TABLE OPEN" : next === "spinning" ? "NO MORE BETS" : "PAYOUTS IN PROGRESS";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function totalWager() {
  return bets.reduce((sum, bet) => sum + bet.stake, 0);
}

function updateBetDisplay() {
  $("#wager-total").textContent = `F ${formatMoney(totalWager())}`;
  $("#wager-count").textContent = bets.length ? `${bets.length} ${bets.length === 1 ? "wager" : "wagers"} on the cloth` : "No wagers placed";
  $("#repeat-bets").disabled = phase !== "open" || !previousBets.length || totalWager() > balance;
  $("#undo-bet").disabled = phase !== "open" || bets.length === 0;
  $("#clear-bets").disabled = phase !== "open" || bets.length === 0;
  spinButton.disabled = phase !== "open" || bets.length === 0;
  document.querySelectorAll(".number-cell, .bet-cell").forEach(cell => cell.classList.remove("selected"));
  document.querySelectorAll(".chip-marker").forEach(marker => marker.remove());
  for (const number of selection) {
    const cell = document.querySelector(`[data-number="${number}"]`);
    if (cell) cell.classList.add("selected");
  }
  const aggregate = new Map();
  for (const bet of bets) {
    if (bet.numbers) {
      for (const n of bet.numbers) aggregate.set(`number:${n}`, (aggregate.get(`number:${n}`) || 0) + bet.stake);
    } else {
      const selector = bet.attribute == null ? `[data-bet="${bet.type}"]` : `[data-bet="${bet.type}"][data-${bet.type}="${bet.attribute}"]`;
      aggregate.set(selector, (aggregate.get(selector) || 0) + bet.stake);
    }
  }
  for (const [key, amount] of aggregate) {
    const cell = key.startsWith("number:") ? document.querySelector(`[data-number="${key.split(":")[1]}"]`) : document.querySelector(key);
    if (!cell) continue;
    const marker = document.createElement("span");
    marker.className = `chip-marker${amount >= 100 ? " gold" : amount >= 25 ? " multi" : ""}`;
    marker.textContent = amount >= 1000 ? `${Math.round(amount / 1000)}k` : amount;
    marker.setAttribute("aria-hidden", "true");
    cell.append(marker);
  }
  updateBalance();
}

function showLastResult(entry) {
  const result = $("#last-result");
  result.replaceChildren();
  const number = document.createElement("span");
  number.className = `result-number ${entry.color}`;
  number.textContent = entry.number;
  const name = document.createElement("span");
  name.className = "result-name";
  name.textContent = entry.net > 0 ? `${entry.color} · F ${formatMoney(entry.net)} to the good` : entry.net < 0 ? `${entry.color} · F ${formatMoney(Math.abs(entry.net))} lost` : `${entry.color} · no wager returned`;
  result.append(number, name);
}

function renderHistory() {
  const row = $("#history");
  row.replaceChildren();
  for (const entry of history.slice(0, 12)) {
    const pill = document.createElement("span");
    pill.className = `history-pill ${entry.color}`;
    pill.textContent = entry.number;
    pill.title = `${formatLabel(entry.number)} · net F ${formatMoney(Math.abs(entry.net))}${entry.net < 0 ? " lost" : " returned"}`;
    row.append(pill);
  }
  const ledger = $("#ledger-list");
  ledger.replaceChildren();
  if (!history.length) {
    const empty = document.createElement("p");
    empty.className = "modal-intro";
    empty.textContent = "No turns are yet recorded in the ledger.";
    ledger.append(empty);
  }
  for (const entry of history) {
    const line = document.createElement("div");
    line.className = "ledger-item";
    line.innerHTML = `<span class="ledger-no ${entry.color}"></span><span></span><small></small><strong class="ledger-net"></strong>`;
    line.querySelector(".ledger-no").textContent = entry.number;
    line.querySelector("span:nth-child(2)").textContent = `${entry.color.toUpperCase()} · ${entry.date}`;
    line.querySelector("small").textContent = `${entry.bets} ${entry.bets === 1 ? "wager" : "wagers"}`;
    const net = line.querySelector(".ledger-net");
    net.textContent = `${entry.net >= 0 ? "+" : "−"}F ${formatMoney(Math.abs(entry.net))}`;
    if (entry.net < 0) net.classList.add("loss");
    ledger.append(line);
  }
  if (history[0]) showLastResult(history[0]);
}

function place(bet) {
  if (phase !== "open") return;
  if (currentChip < minimum) {
    showToast(`The house minimum is F ${minimum}.`);
    return;
  }
  if (balance < currentChip) {
    showToast("There are not enough francs in your purse for that chip.");
    return;
  }
  bets.push({ ...bet, id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, stake: currentChip });
  balance -= currentChip;
  selection = [];
  sound.chip();
  $("#bet-hint").textContent = `${bet.label} wager placed · F ${currentChip}. Place another or call for the spin.`;
  updateBetDisplay();
}

function selectNumber(number) {
  if (phase !== "open") return;
  const type = $("#bet-kind").value;
  if (type === "straight") {
    place(insideBet(type, [number]));
    return;
  }
  const required = BETS[type]?.min;
  if (!required) return;
  selection = selection.length >= required ? [number] : [...selection, number];
  if (selection.length === required) {
    if (isValidInsideBet(type, selection)) {
      place(insideBet(type, selection));
    } else {
      selection = [number];
      $("#bet-hint").textContent = `Those numbers do not form a legal ${BETS[type].label.toLowerCase()}. Begin a new selection.`;
      updateBetDisplay();
    }
  } else {
    $("#bet-hint").textContent = `${BETS[type].label}: choose ${required - selection.length} more adjacent ${required - selection.length === 1 ? "number" : "numbers"}.`;
    updateBetDisplay();
  }
}

function placeOutside(target) {
  if (phase !== "open") return;
  const type = target.dataset.bet;
  const attribute = target.dataset.dozen ?? target.dataset.column ?? null;
  place(outsideBet(type, attribute));
}

function refundBets(list) {
  balance += list.reduce((sum, bet) => sum + bet.stake, 0);
}

function clearBets() {
  if (phase !== "open" || !bets.length) return;
  refundBets(bets);
  bets = [];
  selection = [];
  $("#bet-hint").textContent = "All wagers returned to your purse.";
  updateBetDisplay();
}

function undoBet() {
  if (phase !== "open") return;
  if (selection.length) selection.pop();
  else {
    const bet = bets.pop();
    if (bet) balance += bet.stake;
  }
  $("#bet-hint").textContent = "Latest selection returned.";
  updateBetDisplay();
}

function repeatBets() {
  if (phase !== "open" || !previousBets.length) return;
  const cost = previousBets.reduce((sum, bet) => sum + bet.stake, 0);
  if (cost > balance) return showToast("Your purse cannot cover the previous hand.");
  bets = previousBets.map(bet => ({ ...bet, id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}` }));
  balance -= cost;
  selection = [];
  $("#bet-hint").textContent = `Your last hand has been laid again · F ${formatMoney(cost)}.`;
  sound.chip();
  updateBetDisplay();
}

function resolveBet(bet, number) {
  if (bet.numbers) return payoutFor(insideBet(bet.type, bet.numbers), number, bet.stake);
  return payoutFor(outsideBet(bet.type, bet.attribute), number, bet.stake);
}

function finishRound(number) {
  if (finalized) return;
  finalized = true;
  const staked = totalWager();
  let returned = 0;
  for (const bet of bets) returned += resolveBet(bet, number);
  balance += returned;
  const net = returned - staked;
  const entry = {
    number,
    color: pocketColor(number),
    net,
    bets: bets.length,
    date: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
  history = [entry, ...history].slice(0, 12);
  previousBets = bets.map(({ type, label, attribute, numbers, stake }) => ({ type, label, attribute, numbers, stake }));
  bets = [];
  selection = [];
  simulation = null;
  dealer.work(true);
  dealer.result(number, entry.color);
  setPhase("open", "PLACE YOUR BETS");
  $("#countdown").textContent = "";
  $("#bet-hint").textContent = net > 0 ? `A pleasing turn: F ${formatMoney(returned)} paid to your purse.` : net < 0 ? "The croupier gathers the losing stakes. Place your next hand." : "No stake on the winning number. The table is open.";
  showLastResult(entry);
  renderHistory();
  document.querySelectorAll(".winning-cell").forEach(cell => cell.classList.remove("winning-cell"));
  document.querySelector(`[data-number="${number}"]`)?.classList.add("winning-cell");
  if (reducedMotion) canvas.closest(".wheel-frame").classList.add("winner-flash");
  window.setTimeout(() => canvas.closest(".wheel-frame").classList.remove("winner-flash"), 800);
  updateBetDisplay();
  save();
}

function beginSpin() {
  if (phase !== "open" || !bets.length) {
    if (!bets.length) showToast("Place at least one wager before the wheel is set in motion.");
    return;
  }
  previousBets = bets.map(({ type, label, attribute, numbers, stake }) => ({ type, label, attribute, numbers, stake }));
  simulation = new RoulettePhysics({ ...collection.active.physics, ...physicsTuning });
  finalized = false;
  lastFrame = 0;
  animate.lastHits = 0;
  animate.saidSettle = false;
  document.querySelectorAll(".winning-cell").forEach(cell => cell.classList.remove("winning-cell"));
  dealer.work(true);
  dealer.announce("noMoreBets");
  setPhase("spinning", "BALL IN MOTION");
  $("#countdown").textContent = "";
  $("#bet-hint").textContent = "No more bets. The ball has left the dealer’s hand.";
  sound.spin();
  updateBetDisplay();
}

function animate(now) {
  const dt = lastFrame ? (now - lastFrame) / 1000 : 0;
  lastFrame = now;
  if (simulation) {
    simulation.update(dt);
    const snapshot = simulation.snapshot();
    renderer.draw(snapshot, now, reducedMotion, collection.active);
    if (snapshot.hits > (animate.lastHits || 0)) {
      sound.impact(.6);
      animate.lastHits = snapshot.hits;
      const stage = $(".stage");
      if (!reducedMotion) {
        stage.classList.remove("impact");
        void stage.offsetWidth;
        stage.classList.add("impact");
      }
    }
    if (snapshot.elapsed > 2.65 && snapshot.elapsed < 2.72) dealer.announce("noMoreBets");
    else if (snapshot.phase === "deflecting" && snapshot.elapsed > 3.5 && snapshot.hits > 0) dealer.announce("deflecting");
    if (snapshot.phase === "settling" && !animate.saidSettle) {
      animate.saidSettle = true;
      dealer.announce("settle");
      sound.settle();
    }
    if (snapshot.phase === "settled") {
      const number = snapshot.result;
      animate.lastHits = 0;
      animate.saidSettle = false;
      finishRound(number);
      renderer.draw({ ...snapshot, angle: snapshot.angle, phase: "settled" }, now, reducedMotion);
    }
  } else {
    const idle = now * .000012;
    renderer.draw({ angle: -Math.PI / 2, rotor: idle, radius: .91, height: .7, events: [] }, now, reducedMotion, collection.active);
  }
  requestAnimationFrame(animate);
}

function openModal(id) {
  const modal = document.getElementById(id);
  modal.hidden = false;
  modal.querySelector("button")?.focus();
  document.body.classList.add("modal-open");
  if (id === "shop-modal") renderShop($("#shop-grid"), collection, balance);
  if (id === "history-modal") renderHistory();
}

function closeModal(id) {
  document.getElementById(id).hidden = true;
  if (![...document.querySelectorAll(".modal-backdrop")].some(modal => !modal.hidden)) document.body.classList.remove("modal-open");
}

$("#felt-board").addEventListener("click", event => {
  const cell = event.target.closest("[data-number], [data-bet]");
  if (!cell) return;
  if (cell.dataset.number !== undefined) selectNumber(Number(cell.dataset.number));
  else placeOutside(cell);
});

document.querySelectorAll(".chip-select").forEach(button => button.addEventListener("click", () => {
  currentChip = Number(button.dataset.value);
  document.querySelectorAll(".chip-select").forEach(item => {
    const active = item === button;
    item.classList.toggle("active", active);
    item.setAttribute("aria-pressed", String(active));
  });
  $("#bet-hint").textContent = `F ${currentChip} chip selected.`;
}));

$("#bet-kind").addEventListener("change", event => {
  selection = [];
  const type = event.target.value;
  $("#bet-hint").textContent = type === "straight" ? "Select a number on the cloth for a straight-up wager." : `${BETS[type].label}: select ${BETS[type].min} adjacent numbers on the cloth.`;
  document.querySelectorAll(".number-cell").forEach(cell => cell.setAttribute("aria-label", `${cell.dataset.number}, ${pocketColor(Number(cell.dataset.number))}. Select for a ${BETS[type].label.toLowerCase()} bet.`));
  updateBetDisplay();
});

$("#spin").addEventListener("click", beginSpin);
$("#undo-bet").addEventListener("click", undoBet);
$("#clear-bets").addEventListener("click", clearBets);
$("#repeat-bets").addEventListener("click", repeatBets);
$("#shop-open").addEventListener("click", () => openModal("shop-modal"));
$("#history-toggle").addEventListener("click", () => openModal("history-modal"));
$("#settings-toggle").addEventListener("click", () => openModal("settings-modal"));
$("#rules-open").addEventListener("click", () => openModal("settings-modal"));

document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => closeModal(button.dataset.close)));
document.querySelectorAll(".modal-backdrop").forEach(modal => modal.addEventListener("click", event => {
  if (event.target === modal) closeModal(modal.id);
}));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") document.querySelectorAll(".modal-backdrop:not([hidden])").forEach(modal => closeModal(modal.id));
  if ((event.key === "Enter" || event.key === " ") && event.target.matches(".number-cell, .bet-cell") && event.target.dataset.number !== undefined) {
    event.preventDefault();
    selectNumber(Number(event.target.dataset.number));
  }
});

$("#shop-grid").addEventListener("click", event => {
  const button = event.target.closest("[data-ball]");
  if (!button) return;
  const result = collection.purchase(button.dataset.ball, balance);
  if (!result.ok) return showToast(result.reason);
  balance -= result.price;
  renderShop($("#shop-grid"), collection, balance);
  updateBalance();
  showToast(result.price ? `${collection.active.name} has been entered in your private collection.` : `${collection.active.name} is now on the wheel.`);
});

$("#sound-toggle").addEventListener("click", async event => {
  const enabled = await sound.toggle();
  event.currentTarget.classList.toggle("sound-on", enabled);
  event.currentTarget.setAttribute("aria-label", enabled ? "Disable salon sounds" : "Enable salon sounds");
  event.currentTarget.title = enabled ? "Disable salon sounds" : "Enable salon sounds";
  event.currentTarget.textContent = enabled ? "♫" : "♪";
});

$("#limits").addEventListener("change", event => {
  minimum = Number(event.target.value);
  $("#bet-hint").textContent = `Table minimum is now F ${minimum}.`;
});
reducedMotionInput.addEventListener("change", event => { reducedMotion = event.target.checked; });

const tuningControls = [
  { key: "friction", input: $("#friction-setting"), output: $("#friction-value"), initial: .18 },
  { key: "restitution", input: $("#restitution-setting"), output: $("#restitution-value"), initial: .57 },
  { key: "deflectorStrength", input: $("#deflector-setting"), output: $("#deflector-value"), initial: 1 },
];
for (const control of tuningControls) {
  const value = Number.isFinite(physicsTuning[control.key]) ? physicsTuning[control.key] : control.initial;
  control.input.value = String(value);
  physicsTuning[control.key] = Number(control.input.value);
  control.output.value = Number(control.input.value).toFixed(2);
  control.input.addEventListener("input", () => {
    physicsTuning[control.key] = Number(control.input.value);
    control.output.value = Number(control.input.value).toFixed(2);
    save();
  });
}

renderHistory();
updateBalance();
updateBetDisplay();
requestAnimationFrame(animate);