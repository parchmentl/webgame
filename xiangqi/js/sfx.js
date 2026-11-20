(function () {
  let ac = null, master = null;
  let muted = localStorage.getItem('xiangqiMuted') === '1';
  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, delay) {
    const c = ctx(); if (!c || muted) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol || .3, t + .008);
    g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + .02);
  }
  function noise(dur, freq, vol, delay) {
    const c = ctx(); if (!c || muted) return;
    const t = c.currentTime + (delay || 0);
    const n = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, n, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 1.2;
    const g = c.createGain(); g.gain.value = vol || .3;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t);
  }
  const Sfx = {
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      localStorage.setItem('xiangqiMuted', m ? '1' : '0');
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    unlock() { ctx(); },
    place() { noise(.06, 900, .35); tone(210, .09, 'triangle', .25); },
    capture() { noise(.1, 500, .5); tone(140, .16, 'square', .22); tone(90, .2, 'sine', .3, .02); },
    check() { tone(660, .1, 'square', .2); tone(880, .14, 'square', .2, .1); },
    select() { tone(520, .05, 'sine', .12); },
    undo() { tone(360, .08, 'triangle', .2); tone(260, .1, 'triangle', .18, .07); },
    hint() { tone(740, .07, 'sine', .18); tone(980, .09, 'sine', .16, .08); },
    ui() { tone(440, .05, 'sine', .12); },
    start() { tone(392, .1, 'triangle', .22); tone(523, .12, 'triangle', .22, .09); tone(659, .16, 'triangle', .22, .18); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .22, 'triangle', .26, i * .12)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, .24, 'sawtooth', .16, i * .13)); },
    draw() { tone(440, .18, 'sine', .2); tone(440, .22, 'sine', .18, .2); }
  };
  window.Sfx = Sfx;
})();