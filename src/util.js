export const W = 320;
export const H = 240;
export const T = 16;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const approach = (v, t, s) => (v < t ? Math.min(v + s, t) : Math.max(v - s, t));
export const overlap = (a, b) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function wrapText(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem('demo-save') || 'null');
    if (s && Array.isArray(s.beaten)) return s;
  } catch (e) {}
  return { beaten: [] };
}

export function writeSave(save) {
  try {
    localStorage.setItem('demo-save', JSON.stringify(save));
  } catch (e) {}
}
