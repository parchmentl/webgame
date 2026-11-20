(function () {
  let ctx = null, master = null, noiseBuf = null;
  let muted = localStorage.getItem('moleMuted') === '1';

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function noise(c) {
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function tone(f0, f1, dur, type, peak, delay) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(dur, type, f0, f1, peak, delay) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + (delay || 0);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noise(c);
    f.type = type; f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  window.Sfx = {
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      localStorage.setItem('moleMuted', m ? '1' : '0');
      if (master) master.gain.value = m ? 0 : 0.5;
      if (!m) ac();
    },
    unlock() { ac(); },
    hit(mult) { tone(170 + mult * 40, 60, 0.12, 'triangle', 0.5); hiss(0.07, 'highpass', 1800, 0, 0.22); },
    gold() { tone(880, 0, 0.09, 'sine', 0.3); tone(1174, 0, 0.09, 'sine', 0.3, 0.07); tone(1568, 0, 0.16, 'sine', 0.32, 0.14); hiss(0.2, 'highpass', 5000, 0, 0.1, 0.14); },
    bomb() { hiss(0.42, 'lowpass', 3200, 90, 0.65); tone(130, 38, 0.36, 'sawtooth', 0.5); },
    miss() { tone(120, 70, 0.09, 'square', 0.16); },
    pop() { tone(300, 520, 0.06, 'sine', 0.07); },
    tick() { tone(1250, 0, 0.045, 'square', 0.12); },
    start() { tone(523, 0, 0.1, 'triangle', 0.3); tone(659, 0, 0.1, 'triangle', 0.3, 0.09); tone(784, 0, 0.18, 'triangle', 0.32, 0.18); },
    over() { tone(392, 0, 0.16, 'triangle', 0.3); tone(330, 0, 0.16, 'triangle', 0.3, 0.15); tone(262, 0, 0.3, 'triangle', 0.32, 0.3); },
    record() { tone(523, 0, 0.11, 'square', 0.2); tone(659, 0, 0.11, 'square', 0.2, 0.1); tone(784, 0, 0.11, 'square', 0.2, 0.2); tone(1046, 0, 0.3, 'square', 0.22, 0.3); },
    ui() { tone(700, 0, 0.05, 'sine', 0.14); }
  };
})();