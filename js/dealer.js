const LINES = {
  ready: "Place your wagers, if you please.",
  noMoreBets: "No more bets. The wheel is in motion.",
  deflecting: "The ivory dances on the frets...",
  settle: "And the winning number is...",
};

export class Dealer {
  constructor(portrait, caption) {
    this.portrait = portrait;
    this.caption = caption;
  }

  speak(line) {
    this.caption.textContent = line;
  }

  announce(key) {
    this.speak(LINES[key] || LINES.ready);
  }

  work(active) {
    this.portrait.classList.toggle("is-working", active);
  }

  result(number, color) {
    this.portrait.classList.add("is-working");
    this.speak(`${number} ${color}. Please collect your winnings.`);
    window.setTimeout(() => this.portrait.classList.remove("is-working"), 2100);
  }
}