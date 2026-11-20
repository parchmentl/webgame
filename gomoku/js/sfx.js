(function () {
  let ctx = null, master = null, noiseBuf = null;
  let muted = localStorage.getItem('gomokuMuted') === '1';
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
  function tone(f0, f1, dur, type, peak, delay) {
    const c = ac(); if (!c || muted) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function click(dur, freq, peak, delay) {
    const c = ac(); if (!c || muted) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t = c.currentTime + (delay || 0);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf;
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }
  window.Sfx = {
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      localStorage.setItem('gomokuMuted', m ? '1' : '0');
      if (master) master.gain.value = m ? 0 : 0.5;
      if (!m) ac();
    },
    place(who) { click(0.06, who === 1 ? 900 : 1300, 0.4); tone(who === 1 ? 190 : 260, 70, 0.08, 'triangle', 0.3); },
    win() { tone(523, 0, 0.12, 'triangle', 0.3); tone(659, 0, 0.12, 'triangle', 0.3, 0.11); tone(784, 0, 0.12, 'triangle', 0.3, 0.22); tone(1046, 0, 0.34, 'triangle', 0.32, 0.33); },
    lose() { tone(330, 0, 0.18, 'triangle', 0.3); tone(262, 0, 0.18, 'triangle', 0.3, 0.17); tone(196, 0, 0.36, 'triangle', 0.32, 0.34); },
    draw() { tone(440, 0, 0.16, 'sine', 0.28); tone(440, 0, 0.24, 'sine', 0.28, 0.2); },
    undo() { tone(500, 300, 0.09, 'sine', 0.22); },
    hint() { tone(880, 1320, 0.12, 'sine', 0.22); },
    ui() { tone(700, 0, 0.05, 'sine', 0.14); },
    start() { tone(392, 0, 0.1, 'triangle', 0.28); tone(523, 0, 0.16, 'triangle', 0.3, 0.1); }
  };
})();