let ctx = null;
let master = null;

export function initAudio() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {
    ctx = null;
  }
}

function tone(freq, dur, type = 'square', vol = 0.07, slide = 0, delay = 0) {
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  } catch (e) {}
}

function noise(dur, vol = 0.1, delay = 0) {
  if (!ctx) return;
  try {
    const t0 = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = ctx.createBufferSource();
    const g = ctx.createGain();
    s.buffer = buf;
    g.gain.value = vol;
    s.connect(g);
    g.connect(master);
    s.start(t0);
  } catch (e) {}
}

export const sfx = {
  shoot: () => tone(880, 0.08, 'square', 0.05, -500),
  shoot2: () => tone(500, 0.18, 'sawtooth', 0.07, 700),
  shoot3: () => {
    tone(300, 0.35, 'sawtooth', 0.08, 900);
    tone(450, 0.35, 'square', 0.05, 900);
  },
  charge: () => tone(300, 0.1, 'triangle', 0.05, 300),
  jump: () => tone(300, 0.12, 'square', 0.04, 250),
  land: () => tone(120, 0.05, 'triangle', 0.05),
  dash: () => noise(0.18, 0.06),
  hit: () => tone(220, 0.07, 'square', 0.05, -100),
  crit: () => {
    tone(600, 0.1, 'square', 0.07, -300);
    tone(900, 0.12, 'square', 0.05, -400, 0.04);
  },
  hurt: () => tone(400, 0.3, 'sawtooth', 0.09, -300),
  boom: () => {
    noise(0.35, 0.15);
    tone(120, 0.3, 'square', 0.06, -60);
  },
  bigboom: () => {
    noise(0.8, 0.2);
    tone(90, 0.7, 'sawtooth', 0.08, -50);
  },
  pickup: () => {
    tone(700, 0.08, 'square', 0.05);
    tone(1000, 0.1, 'square', 0.05, 0, 0.07);
  },
  select: () => tone(600, 0.06, 'square', 0.05),
  confirm: () => {
    tone(500, 0.08, 'square', 0.05);
    tone(800, 0.12, 'square', 0.05, 0, 0.08);
  },
  deny: () => tone(150, 0.12, 'square', 0.05),
  text: () => tone(520, 0.03, 'square', 0.02),
  voice: () => {
    tone(180, 0.6, 'sawtooth', 0.09, 300);
    tone(360, 0.6, 'square', 0.05, 500);
  },
  shield: () => tone(400, 0.25, 'triangle', 0.07, 400),
  pulse: () => tone(800, 0.4, 'sine', 0.08, -600),
  win: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'square', 0.06, 0, i * 0.13)),
};

// música de fundo bem simples (sequenciador de arpejos)
const SONGS = {
  title: { bpm: 100, bass: [0, 0, 7, 5], lead: [12, 15, 19, 15, 17, 14, 12, 14], root: 45 },
  stage: { bpm: 150, bass: [0, 0, 3, 5, 0, 0, 7, 5], lead: [12, 15, 12, 19, 17, 15, 12, 10], root: 40 },
  boss: { bpm: 175, bass: [0, 1, 0, 1, 3, 1, 5, 1], lead: [12, 13, 12, 15, 12, 13, 17, 15], root: 38 },
  win: { bpm: 90, bass: [0, 5, 7, 0], lead: [12, 16, 19, 24, 19, 16, 19, 12], root: 48 },
};
let song = null;
let songName = '';
let timer = null;
let step = 0;
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export function playSong(name) {
  if (name === songName) return;
  songName = name;
  song = SONGS[name] || null;
  step = 0;
  clearTimeout(timer);
  if (song) tick();
}

function tick() {
  if (!song) return;
  if (ctx && ctx.state === 'running') {
    const b = song.bass[step % song.bass.length];
    const l = song.lead[step % song.lead.length];
    tone(midi(song.root + b), 0.16, 'triangle', 0.05);
    if (step % 2 === 0) tone(midi(song.root + 12 + l), 0.12, 'square', 0.018);
    else tone(midi(song.root + 12 + l + 7), 0.08, 'square', 0.01);
  }
  step++;
  timer = setTimeout(tick, 30000 / song.bpm);
}
