const KEYMAP = {
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  jump: ['KeyZ', 'KeyJ', 'Space'],
  shoot: ['KeyX', 'KeyK'],
  dash: ['KeyC', 'KeyL', 'ShiftLeft', 'ShiftRight'],
  prev: ['KeyA', 'KeyQ'],
  next: ['KeyS', 'KeyE'],
  pause: ['Enter', 'KeyP'],
  skip: ['Escape'],
};

const keys = new Set();
addEventListener('keydown', (e) => {
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  keys.add(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

function pad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const p of pads) if (p) return p;
  return null;
}

export const input = {
  cur: {},
  prev: {},
  touch: {}, // preenchido por touch.js
  touchMode: false,
  // rótulo de tecla para textos de ajuda: no celular mostra o botão correspondente
  label(k) {
    return this.touchMode ? { 'Z': 'PULO', 'ENTER': 'PAUSA', 'Z/ENTER': 'PULO' }[k] || k : k;
  },
  update() {
    this.prev = this.cur;
    const cur = {};
    for (const a in KEYMAP) cur[a] = KEYMAP[a].some((k) => keys.has(k));
    const p = pad();
    if (p) {
      const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
      const ax = p.axes[0] || 0;
      const ay = p.axes[1] || 0;
      cur.left ||= ax < -0.5 || b(14);
      cur.right ||= ax > 0.5 || b(15);
      cur.up ||= ay < -0.5 || b(12);
      cur.down ||= ay > 0.5 || b(13);
      cur.jump ||= b(0);
      cur.shoot ||= b(2);
      cur.dash ||= b(1) || b(7);
      cur.prev ||= b(4);
      cur.next ||= b(5);
      cur.pause ||= b(9);
    }
    for (const a in this.touch) if (this.touch[a]) cur[a] = true;
    this.cur = cur;
  },
  held(a) {
    return !!this.cur[a];
  },
  pressed(a) {
    return !!this.cur[a] && !this.prev[a];
  },
  released(a) {
    return !this.cur[a] && !!this.prev[a];
  },
  confirm() {
    return this.pressed('jump') || this.pressed('shoot') || this.pressed('pause');
  },
};
