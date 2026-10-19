import { T } from './util.js';

// '#' sólido, 'D' porta do chefe, '=' plataforma de mão única,
// 'h' plataforma oculta (só existe após a Detecção de Privilégios), '^' espinhos
export class Level {
  constructor(def) {
    this.rows = def.rows.map((r) => r.split(''));
    this.h = this.rows.length;
    this.w = this.rows[0].length;
    this.bossCol = def.bossCol;
    this.revealed = 0;
  }

  get(tx, ty) {
    if (tx < 0 || tx >= this.w) return '#';
    if (ty < 0 || ty >= this.h) return '.';
    return this.rows[ty][tx];
  }

  set(tx, ty, c) {
    if (tx >= 0 && tx < this.w && ty >= 0 && ty < this.h) this.rows[ty][tx] = c;
  }

  solid(tx, ty) {
    const c = this.get(tx, ty);
    return c === '#' || c === 'D';
  }

  oneWay(c) {
    return c === '=' || (c === 'h' && this.revealed > 0);
  }

  rectSolid(x, y, w, h) {
    const x0 = Math.floor(x / T);
    const x1 = Math.floor((x + w - 0.001) / T);
    const y0 = Math.floor(y / T);
    const y1 = Math.floor((y + h - 0.001) / T);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solid(tx, ty)) return true;
    return false;
  }

  hazard(b) {
    const x0 = Math.floor((b.x + 2) / T);
    const x1 = Math.floor((b.x + b.w - 3) / T);
    const y0 = Math.floor((b.y + 4) / T);
    const y1 = Math.floor((b.y + b.h - 1) / T);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++)
        if (this.get(tx, ty) === '^' && b.y + b.h > ty * T + 8) return true;
    return false;
  }

  moveX(b, dx) {
    b.x += dx;
    if (dx === 0) return false;
    const y0 = Math.floor(b.y / T);
    const y1 = Math.floor((b.y + b.h - 0.001) / T);
    const x0 = Math.floor(b.x / T);
    const x1 = Math.floor((b.x + b.w - 0.001) / T);
    if (dx > 0) {
      for (let tx = x0; tx <= x1; tx++)
        for (let ty = y0; ty <= y1; ty++)
          if (this.solid(tx, ty)) {
            b.x = tx * T - b.w;
            return true;
          }
    } else {
      for (let tx = x1; tx >= x0; tx--)
        for (let ty = y0; ty <= y1; ty++)
          if (this.solid(tx, ty)) {
            b.x = (tx + 1) * T;
            return true;
          }
    }
    return false;
  }

  // retorna 'floor', 'ceil' ou null
  moveY(b, dy) {
    const prevBottom = b.y + b.h;
    b.y += dy;
    if (dy === 0) return null;
    const x0 = Math.floor(b.x / T);
    const x1 = Math.floor((b.x + b.w - 0.001) / T);
    const y0 = Math.floor(b.y / T);
    const y1 = Math.floor((b.y + b.h - 0.001) / T);
    if (dy > 0) {
      for (let ty = y0; ty <= y1; ty++)
        for (let tx = x0; tx <= x1; tx++) {
          const c = this.get(tx, ty);
          if (this.solid(tx, ty) || (this.oneWay(c) && prevBottom <= ty * T + 0.01)) {
            b.y = ty * T - b.h;
            return 'floor';
          }
        }
    } else {
      for (let ty = y1; ty >= y0; ty--)
        for (let tx = x0; tx <= x1; tx++)
          if (this.solid(tx, ty)) {
            b.y = (ty + 1) * T;
            return 'ceil';
          }
    }
    return null;
  }
}
