export class SalonSound {
  constructor() {
    this.context = null;
    this.enabled = false;
    this.ambience = null;
    this.master = null;
    this.pianoTimer = null;
  }

  async toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      if (this.master && this.context) this.master.gain.setTargetAtTime(0, this.context.currentTime, .15);
      window.clearTimeout(this.pianoTimer);
      this.pianoTimer = null;
      return this.enabled;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      this.enabled = false;
      return false;
    }
    this.context ||= new AudioContext();
    await this.context.resume();
    this.master ||= this.context.createGain();
    this.master.gain.setTargetAtTime(.2, this.context.currentTime, .2);
    this.master.connect(this.context.destination);
    if (!this.ambience) this.createAmbience();
    else this.master.gain.setTargetAtTime(.2, this.context.currentTime, .2);
    this.startPianoLoop();
    return this.enabled;
  }

  createAmbience() {
    const ctx = this.context;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * .045;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    const gain = ctx.createGain();
    gain.gain.value = .32;
    noise.connect(filter).connect(gain).connect(this.master);
    noise.start();
    this.ambience = noise;
  }

  startPianoLoop() {
    if (this.pianoTimer) return;
    const phrases = [[261.63, 329.63, 392], [220, 261.63, 329.63], [196, 246.94, 293.66], [233.08, 293.66, 349.23]];
    const playPhrase = () => {
      if (!this.enabled) return;
      const notes = phrases[Math.floor(Math.random() * phrases.length)];
      notes.forEach((note, index) => this.tone(note, 1.9 + index * .2, "sine", .009, -note * .025));
      this.pianoTimer = window.setTimeout(playPhrase, 7800 + Math.random() * 5000);
    };
    this.pianoTimer = window.setTimeout(playPhrase, 2200);
  }

  tone(frequency, duration, type = "sine", gainValue = .08, slide = 0) {
    if (!this.enabled || !this.context) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + slide), now + duration);
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  spin() {
    this.tone(210, 2.8, "triangle", .065, -125);
    this.tone(84, 2.5, "sine", .035, 38);
  }

  impact(strength = .5) {
    this.tone(820 + strength * 300, .075, "triangle", .018 + strength * .025, -440);
  }

  chip() {
    this.tone(1250, .05, "sine", .025, -500);
    this.tone(1760, .045, "triangle", .012, -900);
  }

  settle() {
    this.tone(690, .3, "sine", .055, -180);
  }
}