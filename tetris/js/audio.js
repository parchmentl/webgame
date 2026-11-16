'use strict';
/* 俄罗斯方块 · WebAudio 合成音效 */

const Snd = {
  ctx: null, master: null, muted: localStorage.getItem('tetrisMuted') === '1',
  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  setMuted(m) {
    this.muted = m;
    localStorage.setItem('tetrisMuted', m ? '1' : '0');
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  },
  tone(f0, f1, dur, type, vol, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur, vol, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + delay;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = vol;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1800;
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t);
  },
  move() { this.tone(320, 320, 0.04, 'square', 0.12); },
  rotate() { this.tone(480, 620, 0.06, 'triangle', 0.2); },
  hold() { this.tone(400, 700, 0.09, 'sine', 0.25); },
  hard() { this.noise(0.12, 0.3); this.tone(180, 60, 0.12, 'square', 0.25); },
  lock() { this.tone(140, 90, 0.08, 'square', 0.2); },
  clear(n) {
    const base = [523, 659, 784, 1046];
    for (let i = 0; i < n + 1; i++) this.tone(base[Math.min(i, 3)], base[Math.min(i, 3)], 0.12, 'triangle', 0.28, i * 0.06);
    this.noise(0.15, 0.15);
  },
  tetris() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, f, 0.22, 'sawtooth', 0.16, i * 0.07));
    this.noise(0.3, 0.2);
  },
  spin() { this.tone(700, 1400, 0.18, 'sine', 0.25); this.tone(1400, 900, 0.14, 'sine', 0.18, 0.16); },
  level() { [440, 554, 659, 880].forEach((f, i) => this.tone(f, f, 0.14, 'triangle', 0.25, i * 0.08)); },
  pc() { [659, 784, 988, 1318, 1568].forEach((f, i) => this.tone(f, f, 0.3, 'sine', 0.2, i * 0.09)); },
  over() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, f * 0.9, 0.3, 'sawtooth', 0.18, i * 0.16)); },
  pause() { this.tone(600, 400, 0.1, 'sine', 0.2); },
  ui() { this.tone(500, 500, 0.05, 'triangle', 0.18); }
};