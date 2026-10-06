export const POCKETS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
export const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const pocketColor = n => n === 0 ? "green" : RED_NUMBERS.has(n) ? "red" : "black";

const TAU = Math.PI * 2;
const STEP = TAU / 37;
const randomBetween = (min, max) => min + Math.random() * (max - min);
const wrapAngle = value => ((value % TAU) + TAU) % TAU;

export class RoulettePhysics {
  constructor(profile = {}) {
    this.profile = {
      friction: profile.friction ?? 0.18,
      airResistance: profile.airResistance ?? 0.035,
      restitution: profile.restitution ?? 0.57,
      deflectorStrength: profile.deflectorStrength ?? 1,
      weight: profile.weight ?? 1,
    };
    this.reset();
  }

  reset() {
    this.elapsed = 0;
    this.rotorAngle = randomBetween(-0.08, 0.08);
    this.rotorSpeed = randomBetween(0.48, 0.72);
    this.ballAngle = randomBetween(0, Math.PI * 2);
    this.ballSpeed = -randomBetween(7.8, 9.2) / Math.sqrt(this.profile.weight);
    this.radius = 0.91;
    this.height = 0.7;
    this.verticalSpeed = 0;
    this.radialKick = 0;
    this.lastDeflector = Math.floor(this.ballAngle / (Math.PI / 4));
    this.hits = 0;
    this.phase = "orbiting";
    this.settledNumber = null;
    this.settledAngle = null;
    this.events = [];
    this.reducedMotion = false;
  }

  update(deltaSeconds) {
    const dt = Math.min(Math.max(deltaSeconds, 0), 0.05);
    if (!dt || this.phase === "settled") return;
    const substeps = Math.max(1, Math.ceil(dt / 0.012));
    const step = dt / substeps;
    for (let i = 0; i < substeps; i++) this.integrate(step);
    this.events = this.events.slice(-8);
  }

  integrate(dt) {
    this.elapsed += dt;
    const t = this.elapsed;
    const { friction, airResistance, restitution, deflectorStrength } = this.profile;

    this.rotorSpeed = Math.max(0.11, this.rotorSpeed - dt * 0.045);
    this.rotorAngle += this.rotorSpeed * dt;

    const drag = friction * (t < 3.2 ? 0.2 : 0.1) + airResistance * Math.abs(this.ballSpeed);
    this.ballSpeed += Math.sign(-this.ballSpeed) * drag * dt;
    if (Math.abs(this.ballSpeed) < 0.5) this.ballSpeed = Math.sign(this.ballSpeed || -1) * 0.5;
    this.ballAngle += this.ballSpeed * dt;

    const sector = Math.floor(wrapAngle(this.ballAngle) / (Math.PI / 4));
    if (sector !== this.lastDeflector && t > 2.7 && t < 6.7) {
      this.lastDeflector = sector;
      this.hits += 1;
      const kick = randomBetween(-0.11, 0.15) * restitution * deflectorStrength;
      this.radialKick += kick;
      this.ballSpeed += randomBetween(-0.48, 0.38) * deflectorStrength;
      this.events.push({ angle: this.ballAngle, strength: Math.min(1, 0.35 + Math.abs(kick) * 3), time: t });
      this.phase = "deflecting";
    }

    if (t < 2.7) {
      this.phase = "orbiting";
      this.radius = 0.91 + Math.sin(t * 3.4) * 0.008;
      this.height = 0.7 - t * 0.025;
    } else if (t < 5.4) {
      this.phase = "deflecting";
      const progress = (t - 2.7) / 2.7;
      this.radialKick *= Math.exp(-dt * 3.1);
      this.radius = 0.89 - progress * 0.25 + this.radialKick;
      this.height = 0.62 - progress * 0.17 + Math.abs(this.radialKick) * 0.24;
    } else if (t < 7.5) {
      this.phase = "bouncing";
      this.ballSpeed += (this.rotorSpeed - this.ballSpeed) * Math.min(1, dt * 0.3);
      this.verticalSpeed -= 2.4 * dt;
      this.height += this.verticalSpeed * dt;
      if (this.height < 0.12) {
        this.height = 0.12;
        this.verticalSpeed = Math.abs(this.verticalSpeed) * restitution * randomBetween(0.48, 0.82);
        this.ballSpeed += randomBetween(-0.34, 0.34) * deflectorStrength;
        this.hits += 1;
        this.events.push({ angle: this.ballAngle, strength: Math.min(1, Math.abs(this.verticalSpeed)), time: t });
      }
      this.radius = 0.64 - Math.min(0.23, (t - 5.4) * 0.11) + Math.abs(this.height - 0.12) * 0.13;
    } else {
      if (!this.settledAngle) {
        const index = this.closestPocketIndex();
        this.settledNumber = POCKETS[index];
        this.settledAngle = -Math.PI / 2 + (index + 0.5) * STEP;
      }
      this.phase = t < 8.45 ? "settling" : "settled";
      const settling = Math.min(1, (t - 7.5) / 0.9);
      const target = this.rotorAngle + this.settledAngle;
      const difference = Math.atan2(Math.sin(target - this.ballAngle), Math.cos(target - this.ballAngle));
      this.ballAngle += difference * Math.min(1, dt * (1.6 + settling * 5.5));
      this.ballSpeed += (this.rotorSpeed - this.ballSpeed) * Math.min(1, dt * (1.8 + settling * 3));
      this.radius += (0.36 - this.radius) * Math.min(1, dt * 2.6);
      this.height = 0.12 + Math.exp(-(t - 7.5) * 3.8) * Math.abs(Math.sin((t - 7.5) * 24)) * 0.065;
    }
  }

  closestPocketIndex() {
    const relative = wrapAngle(this.ballAngle - this.rotorAngle + Math.PI / 2);
    return Math.floor(relative / STEP) % 37;
  }

  snapshot() {
    return {
      angle: this.ballAngle,
      rotor: this.rotorAngle,
      radius: this.radius,
      height: this.height,
      phase: this.phase,
      elapsed: this.elapsed,
      hits: this.hits,
      events: this.events,
      result: this.settledNumber,
    };
  }
}