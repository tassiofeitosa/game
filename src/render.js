import { W, H, T, mulberry32 } from './util.js';
import { WEAPONS } from './weapons.js';
import { BOSSES } from './bosses.js';

const FONT = '"Courier New", Courier, monospace';

export function text(ctx, str, x, y, color = '#fff', size = 8, align = 'left', shadow = true) {
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = align;
  if (shadow) {
    ctx.fillStyle = '#000';
    ctx.fillText(str, Math.round(x) + 1, Math.round(y) + 1);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, Math.round(x), Math.round(y));
}

const R = (ctx, c, x, y, w, h) => {
  ctx.fillStyle = c;
  ctx.fillRect(x, y, w, h);
};

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

// ---------- herói ----------
export function drawHero(ctx, p, camX, t) {
  if (p.inv > 0 && p.hurtT <= 0 && Math.floor(p.inv / 3) % 2 === 0) return;
  const w = WEAPONS[p.weapon];
  const main = w.color;
  const dark = shade(main, 0.6);
  const light = w.light;
  ctx.save();
  ctx.translate(Math.round(p.x - camX + p.w / 2), Math.round(p.y));
  ctx.scale(p.face, 1);

  let legA = 0;
  let legB = 0;
  let armY = 11;
  let bob = 0;
  if (!p.onGround) {
    legA = -2;
    legB = 1;
  } else if (p.dashT > 0) {
    legA = -3;
    legB = 2;
  } else if (p.moving) {
    const f = Math.floor(p.animT / 5) % 4;
    legA = [0, -3, 0, 3][f];
    legB = -legA;
    bob = f % 2 === 0 ? 0 : -1;
  }
  const lean = p.dashT > 0 ? 2 : 0;

  // pernas
  R(ctx, dark, -5 + legA, 15 + bob, 4, 7);
  R(ctx, '#223', -6 + legA, 20 + bob, 5, 2);
  R(ctx, main, 1 + legB, 15 + bob, 4, 7);
  R(ctx, light, 1 + legB, 20 + bob, 5, 2);
  // braço de trás
  R(ctx, dark, -6 + lean, armY - 1 + bob, 3, 5);
  // torso
  R(ctx, main, -5 + lean, 8 + bob, 10, 8);
  R(ctx, light, -3 + lean, 9 + bob, 6, 3);
  R(ctx, dark, -5 + lean, 15 + bob, 10, 1);
  // cabeça
  R(ctx, main, -5 + lean, 0 + bob, 10, 8);
  R(ctx, light, -1 + lean, -2 + bob, 3, 3);
  R(ctx, dark, -6 + lean, 3 + bob, 2, 3);
  R(ctx, '#0b1a2b', 0 + lean, 2 + bob, 6, 4);
  R(ctx, p.hurtT > 0 ? '#ff6060' : '#7ff6ff', 1 + lean, 3 + bob, 4, 2);
  // braço-canhão
  if (p.shootAnim > 0 || p.charge > 12) {
    R(ctx, dark, 1 + lean, armY - 1 + bob, 7, 5);
    R(ctx, light, 7 + lean, armY + bob, 2, 3);
  } else {
    R(ctx, main, 2 + lean, armY + bob, 3, 5);
    R(ctx, dark, 2 + lean, armY + 4 + bob, 3, 2);
  }
  ctx.restore();

  // aura de carga
  if (p.weapon === 0 && p.charge > 30) {
    const lvl2 = p.charge >= 100;
    const flick = Math.floor(t / 2) % 2 === 0;
    ctx.strokeStyle = lvl2 ? (flick ? '#fff' : '#ffec6a') : flick ? '#a8d0ff' : '#3a7bff';
    ctx.lineWidth = 1;
    const cx = Math.round(p.x - camX + p.w / 2);
    ctx.strokeRect(cx - 9, Math.round(p.y) - 3, 18, 28);
    if (lvl2) ctx.strokeRect(cx - 12, Math.round(p.y) - 6, 24, 34);
  }
  // escudo de direitos
  if (p.shield > 0) {
    const cx = p.x - camX + p.w / 2;
    const cy = p.y + 11;
    const blink = p.shield < 60 && Math.floor(t / 3) % 2 === 0;
    if (!blink)
      for (let i = 0; i < 3; i++) {
        const a = t / 12 + (i * Math.PI * 2) / 3;
        const ox = cx + Math.cos(a) * 20;
        const oy = cy + Math.sin(a) * 20;
        R(ctx, '#2fbf7a', Math.round(ox) - 4, Math.round(oy) - 5, 8, 10);
        R(ctx, '#b4f5d6', Math.round(ox) - 3, Math.round(oy) - 4, 3, 8);
      }
  }
}

export function shieldOrbs(p, t) {
  if (p.shield <= 0) return [];
  const cx = p.x + p.w / 2;
  const cy = p.y + 11;
  const out = [];
  for (let i = 0; i < 3; i++) {
    const a = t / 12 + (i * Math.PI * 2) / 3;
    out.push({ x: cx + Math.cos(a) * 20 - 4, y: cy + Math.sin(a) * 20 - 5, w: 8, h: 10 });
  }
  return out;
}

// ---------- inimigos ----------
export function drawEnemy(ctx, e, camX, t, revealed) {
  if (e.dead) return;
  const x = Math.round(e.x - camX);
  const y = Math.round(e.y);
  const flash = e.flash > 0;
  ctx.save();
  if (e.freeze > 0) ctx.globalAlpha = 0.85;
  if (e.type === 'decoy') {
    ctx.globalAlpha = revealed ? 0.45 : 1;
    drawBossBody(ctx, e.bossId, x + e.w / 2, y, e.dir, t, 1, flash);
    if (revealed) text(ctx, 'FALSO', x + e.w / 2, y - 10, '#ff6adf', 8, 'center');
    ctx.restore();
    return;
  }
  const c = (a, b) => (flash ? '#fff' : e.freeze > 0 ? b : a);
  if (e.type === 'walker') {
    R(ctx, c('#6a6a78', '#9ad'), x + 1, y + 4, 12, 9);
    R(ctx, c('#f2a020', '#cef'), x, y, 14, 5);
    R(ctx, c('#f2a020', '#cef'), x - 1, y + 4, 16, 2);
    R(ctx, '#ff3030', x + (e.dir > 0 ? 8 : 3), y + 7, 3, 2);
    const s = Math.floor(e.t / 8) % 2;
    R(ctx, '#333', x + 2 + s, y + 12, 4, 2);
    R(ctx, '#333', x + 8 - s, y + 12, 4, 2);
    R(ctx, '#ffd700', x + 5, y + 9, 4, 2);
  } else if (e.type === 'turret') {
    R(ctx, c('#555566', '#9ad'), x, y + 8, 14, 6);
    R(ctx, c('#f2c230', '#cef'), x + 2, y + 2, 10, 8);
    R(ctx, '#222', x + (e.dir > 0 ? 8 : -2), y + 5, 8, 3);
    text(ctx, '$', x + 7, y + 3, '#7a5a00', 8, 'center', false);
  } else if (e.type === 'flyer') {
    const f = Math.floor(t / 3) % 2;
    R(ctx, c('#b02a2a', '#9ad'), x + 1, y + 2, 12, 7);
    R(ctx, c('#ddd', '#fff'), x - 2, y + (f ? 0 : 1), 5, 2);
    R(ctx, c('#ddd', '#fff'), x + 11, y + (f ? 0 : 1), 5, 2);
    R(ctx, '#fff', x + 5, y + 4, 4, 3);
    R(ctx, '#000', x + (e.dir > 0 ? 7 : 5), y + 5, 2, 2);
  }
  ctx.restore();
}

// ---------- chefes ----------
export function drawBossBody(ctx, id, cx, y, face, t, scale = 1, flash = false, telegraph = 0) {
  const pal = BOSSES[id].pal;
  const body = flash ? '#fff' : pal.body;
  const trim = flash ? '#fff' : pal.trim;
  const dark = flash ? '#fff' : pal.dark;
  const skin = flash ? '#fff' : pal.skin;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(y));
  ctx.scale(face * scale, scale);
  if (telegraph && Math.floor(t / 2) % 2 === 0) ctx.globalAlpha = 0.6;
  // pernas e capa
  R(ctx, dark, -7, 22, 6, 8);
  R(ctx, dark, 1, 22, 6, 8);
  R(ctx, trim, -8, 28, 8, 2);
  R(ctx, trim, 0, 28, 8, 2);
  R(ctx, body, -9, 10, 18, 14);
  R(ctx, dark, -9, 22, 18, 2);
  R(ctx, trim, -2, 12, 4, 10);
  // cabeça
  R(ctx, skin, -5, 1, 10, 9);
  R(ctx, '#111', 1, 4, 2, 2);
  R(ctx, '#111', -3, 4, 2, 2);
  R(ctx, dark, -4, 8, 8, 1);
  // braço
  R(ctx, body, 7, 12, 5, 7);
  R(ctx, skin, 10, 18, 4, 3);

  if (id === 'lobbyist') {
    R(ctx, '#111', -7, -1, 14, 3); // cartola
    R(ctx, '#111', -5, -8, 10, 8);
    R(ctx, trim, -5, -3, 10, 2);
    R(ctx, '#7a4a20', 10, 20, 8, 6); // maleta
    R(ctx, trim, 13, 19, 2, 2);
    text(ctx, '$', 14, 21, '#ffd700', 6, 'center', false);
  } else if (id === 'disinfo') {
    R(ctx, trim, -6, -4, 12, 6); // antena de cabelo
    R(ctx, body, -2, -9, 4, 6);
    R(ctx, trim, -1, -12, 2, 3);
    R(ctx, '#223', 6, 12, 7, 6); // microfone/tela
    R(ctx, Math.floor(t / 4) % 2 ? '#7ff0ff' : '#ff6adf', 7, 13, 5, 4);
  } else if (id === 'grileiro') {
    R(ctx, '#c9a060', -9, 0, 18, 2); // chapéu de palha
    R(ctx, '#c9a060', -5, -5, 10, 6);
    R(ctx, '#7a5020', -5, -1, 10, 1);
    R(ctx, trim, 9, 4, 2, 22); // cerca de arame
    for (let i = 0; i < 4; i++) R(ctx, '#ccc', 8, 6 + i * 5, 6, 1);
  } else if (id === 'judge') {
    R(ctx, '#eee', -7, -3, 14, 6); // peruca
    R(ctx, '#eee', -8, 2, 3, 6);
    R(ctx, '#eee', 5, 2, 3, 6);
    R(ctx, '#6a4a20', 12, 8, 2, 12); // martelo
    R(ctx, '#6a4a20', 9, 6, 8, 4);
    R(ctx, trim, 0, 14, 4, 3);
  } else if (id === 'midas') {
    R(ctx, trim, -6, -4, 12, 5); // coroa
    R(ctx, trim, -6, -7, 2, 3);
    R(ctx, trim, -1, -8, 2, 4);
    R(ctx, trim, 4, -7, 2, 3);
    R(ctx, '#e03030', -1, -2, 2, 2);
    R(ctx, trim, -9, 10, 18, 2); // ombreiras douradas
    R(ctx, trim, -11, 9, 4, 6);
    R(ctx, trim, 7, 9, 4, 6);
    text(ctx, '$', 0, 15, '#6b4a08', 8, 'center', false);
  }
  ctx.restore();
}

export function drawBoss(ctx, b, camX, t) {
  if (b.dead) return;
  ctx.save();
  ctx.globalAlpha = b.alpha;
  drawBossBody(ctx, b.id, Math.round(b.x - camX + b.w / 2), Math.round(b.y), b.face, t, 1, b.flash > 0, b.telegraph);
  ctx.restore();
  if (b.stun > 0) for (let i = 0; i < 3; i++) R(ctx, '#ffe', Math.round(b.x - camX + 4 + i * 6 + Math.sin(t / 4 + i) * 2), Math.round(b.y - 8), 3, 3);
}

// ---------- projéteis, itens e efeitos ----------
export function drawProj(ctx, p, camX, t) {
  const x = Math.round(p.x - camX);
  const y = Math.round(p.y);
  ctx.save();
  if (p.friendly) {
    if (p.kind === 'buster') {
      const cx = x + p.w / 2;
      const cy = y + p.h / 2;
      if (p.level > 0) {
        ctx.globalAlpha = 0.35;
        R(ctx, p.color, x - Math.sign(p.vx) * 8, y + 2, p.w, p.h - 4);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(cx, cy, p.w / 2, 0, 7);
      ctx.fill();
      ctx.fillStyle = p.level === 2 && Math.floor(t / 2) % 2 ? '#ffec6a' : p.light;
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1.5, p.w / 3), 0, 7);
      ctx.fill();
    } else {
      R(ctx, p.color, x, y, p.w, p.h);
      R(ctx, p.light, x + 1, y + 1, Math.max(1, p.w - 3), Math.max(1, p.h - 3));
      if (p.kind === 'homing') R(ctx, p.light, x - Math.round(p.vx * 2), y - Math.round(p.vy * 2), 3, 3);
    }
  } else if (p.kind === 'wave') {
    R(ctx, p.color, x, y, p.w, p.h);
    R(ctx, '#fff', x + 2, y + 2, p.w - 4, p.h - 4);
  } else {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x + p.w / 2, y + p.h / 2, p.w / 2 + 1, 0, 7);
    ctx.fill();
    ctx.fillStyle = p.kind === 'coin' ? '#a07000' : '#fff';
    ctx.beginPath();
    ctx.arc(x + p.w / 2, y + p.h / 2, p.w / 4, 0, 7);
    ctx.fill();
  }
  ctx.restore();
}

export function drawPickup(ctx, k, camX, t) {
  const x = Math.round(k.x - camX);
  const y = Math.round(k.y + Math.sin(k.t / 10) * 1.5);
  if (k.life < 120 && Math.floor(t / 3) % 2 === 0) return;
  if (k.kind === 'hp') {
    R(ctx, '#fff', x, y, 10, 12);
    R(ctx, '#bbb', x + 1, y + 1, 8, 1);
    R(ctx, '#2fbf4a', x + 2, y + 6, 2, 2);
    R(ctx, '#2fbf4a', x + 4, y + 7, 2, 2);
    R(ctx, '#2fbf4a', x + 6, y + 4, 2, 4);
    R(ctx, '#2a6df4', x + 2, y + 2, 6, 1);
  } else {
    R(ctx, '#f2c230', x + 1, y + 1, 8, 10);
    R(ctx, '#fff', x + 3, y + 3, 4, 6);
    R(ctx, '#f2c230', x + 4, y + 4, 2, 4);
  }
}

export function drawFx(ctx, world, camX) {
  for (const f of world.fx) {
    if (f.type === 'ring') {
      ctx.strokeStyle = f.color;
      ctx.globalAlpha = Math.max(0, 1 - f.r / f.max);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x - camX, f.y, f.r, 0, 7);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (f.type === 'wave') {
      ctx.globalAlpha = Math.max(0, 0.5 * (1 - f.r / f.max));
      ctx.fillStyle = f.color;
      ctx.fillRect(Math.round(f.x - camX - f.r), 0, Math.round(f.r * 2), H);
      ctx.globalAlpha = 1;
    } else if (f.type === 'flash') {
      ctx.globalAlpha = Math.max(0, f.a);
      ctx.fillStyle = f.color;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }
  for (const p of world.parts) {
    ctx.globalAlpha = Math.min(1, p.life / (p.max * 0.5));
    R(ctx, p.color, Math.round(p.x - camX), Math.round(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// ---------- cenário ----------
export function makeBackground(cfg, widthPx) {
  const rng = mulberry32(cfg.seed * 7 + 1);
  const layers = [];
  for (const [par, minH, maxH, minW, maxW] of [
    [0.2, 70, 150, 24, 50],
    [0.45, 50, 120, 30, 60],
  ]) {
    const arr = [];
    let x = -20;
    while (x < widthPx * par + W + 80) {
      const w = minW + Math.floor(rng() * (maxW - minW));
      arr.push({ x, w, h: minH + Math.floor(rng() * (maxH - minH)), seed: Math.floor(rng() * 1000) });
      x += w + Math.floor(rng() * 6);
    }
    layers.push({ par, arr });
  }
  return { layers, signs: ['CONSÓRCIO ÁUREO', 'LUCRO É LIBERDADE*', '*PARA POUCOS', 'COMPRE SEU VOTO™', 'O POVO É CUSTO'] };
}

export function drawBackground(ctx, bg, cfg, camX, t) {
  const th = cfg.theme;
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, th.skyTop);
  grd.addColorStop(1, th.skyBot);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  // sol/lua
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(250, 50, 22, 0, 7);
  ctx.fill();

  bg.layers.forEach((layer, li) => {
    const off = camX * layer.par;
    for (const b of layer.arr) {
      const x = Math.round(b.x - off);
      if (x > W || x + b.w < 0) continue;
      const col = li === 0 ? th.far : th.near;
      const top = H - 40 - b.h;
      R(ctx, col, x, top, b.w, b.h + 40);
      R(ctx, shade(col, 1.25), x, top, b.w, 2);
      // janelas
      for (let wy = top + 6; wy < H - 44; wy += 8)
        for (let wx = x + 4; wx < x + b.w - 4; wx += 7) {
          const lit = ((wx * 7 + wy * 13 + b.seed) % 11) < 4;
          if (lit) R(ctx, th.accent, wx, wy, 3, 4);
          else R(ctx, shade(col, 0.7), wx, wy, 3, 4);
        }
      decorate(ctx, cfg.prop, b, x, top, li, t);
    }
  });

  // outdoors do Consórcio na camada próxima
  const par = 0.65;
  const span = 460;
  const first = Math.floor((camX * par) / span);
  for (let i = first; i < first + 3; i++) {
    const sx = Math.round(i * span + 180 - camX * par);
    const label = bg.signs[((i % bg.signs.length) + bg.signs.length) % bg.signs.length];
    R(ctx, '#222', sx + 14, 150, 3, 60);
    R(ctx, '#222', sx + 130, 150, 3, 60);
    R(ctx, '#111', sx, 118, 150, 34);
    R(ctx, '#f2c230', sx + 2, 120, 146, 30);
    R(ctx, '#111', sx + 4, 122, 142, 26);
    text(ctx, label, sx + 75, 130, '#f2c230', 8, 'center');
  }
}

function decorate(ctx, prop, b, x, top, li, t) {
  if (prop === 'glass') {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(x + 4, top + 20);
    ctx.lineTo(x + 14, top + 20);
    ctx.lineTo(x + 4, top + 50);
    ctx.fill();
  } else if (prop === 'tv') {
    if (b.seed % 3 === 0) {
      R(ctx, '#111', x + 2, top + 6, b.w - 4, 16);
      R(ctx, Math.floor(t / 20 + b.seed) % 2 ? '#ff6adf' : '#7ff0ff', x + 4, top + 8, b.w - 8, 12);
      for (let i = 0; i < 12; i += 2) R(ctx, 'rgba(0,0,0,0.25)', x + 4, top + 8 + i, b.w - 8, 1);
    }
  } else if (prop === 'factory') {
    if (b.seed % 2 === 0) {
      R(ctx, '#2a1a0a', x + b.w - 10, top - 22, 7, 22);
      ctx.fillStyle = 'rgba(200,200,200,0.35)';
      for (let i = 0; i < 3; i++) {
        const sy = top - 26 - ((t / 2 + i * 14) % 42);
        ctx.beginPath();
        ctx.arc(x + b.w - 6 + Math.sin((t + i * 20) / 20) * 4, sy, 4 + i, 0, 7);
        ctx.fill();
      }
    }
  } else if (prop === 'court') {
    for (let cx = x + 3; cx < x + b.w - 4; cx += 8) R(ctx, 'rgba(255,255,255,0.2)', cx, top + 4, 3, b.h);
    R(ctx, 'rgba(255,255,255,0.25)', x - 2, top - 3, b.w + 4, 3);
  } else if (prop === 'fort') {
    R(ctx, '#f2c230', x + b.w / 2 - 1, top - 12, 2, 12);
    R(ctx, '#e03030', x + b.w / 2 + 1, top - 12, 5, 3);
  }
}

export function drawLevel(ctx, level, cfg, camX, t) {
  const th = cfg.theme;
  const x0 = Math.floor(camX / T);
  const x1 = x0 + Math.ceil(W / T) + 1;
  for (let ty = 0; ty < level.h; ty++)
    for (let tx = x0; tx <= x1; tx++) {
      const ch = level.get(tx, ty);
      if (ch === '.') continue;
      const x = Math.round(tx * T - camX);
      const y = ty * T;
      if (ch === '#') {
        const open = !level.solid(tx, ty - 1);
        R(ctx, th.tile, x, y, T, T);
        R(ctx, th.tileDark, x, y + T - 1, T, 1);
        R(ctx, th.tileDark, x + T - 1, y, 1, T);
        R(ctx, shade(th.tile, 1.12), x + 1, y + 1, 6, 6);
        R(ctx, shade(th.tile, 0.9), x + 8, y + 8, 6, 6);
        if (open) {
          R(ctx, th.tileTop, x, y, T, 3);
          R(ctx, shade(th.tileTop, 0.8), x, y + 3, T, 1);
        }
      } else if (ch === 'D') {
        R(ctx, '#2a2a34', x, y, T, T);
        R(ctx, '#f2c230', x + 1, y, 3, T);
        R(ctx, '#f2c230', x + 12, y, 3, T);
        R(ctx, '#888', x + 5, y + 6, 6, 4);
      } else if (ch === '=') {
        R(ctx, th.tileTop, x, y, T, 4);
        R(ctx, th.tileDark, x, y + 4, T, 2);
      } else if (ch === 'h' && level.revealed > 0) {
        const fl = level.revealed < 60 && Math.floor(t / 3) % 2 === 0;
        if (!fl) {
          R(ctx, '#e6c4ff', x, y, T, 4);
          R(ctx, '#a557e8', x, y + 4, T, 3);
        }
      } else if (ch === '^') {
        ctx.fillStyle = '#ccd';
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.moveTo(x + i * 8, y + T);
          ctx.lineTo(x + i * 8 + 4, y + 6);
          ctx.lineTo(x + i * 8 + 8, y + T);
          ctx.fill();
        }
        R(ctx, '#e04040', x, y + 14, T, 2);
      }
    }
}

// ---------- HUD ----------
export function drawBar(ctx, x, y, value, max, color, label) {
  R(ctx, '#000', x - 1, y - 1, 8, max * 2 + 2);
  R(ctx, '#223', x, y, 6, max * 2);
  for (let i = 0; i < max; i++) {
    if (i < Math.ceil(value)) R(ctx, color, x + 1, y + (max - 1 - i) * 2, 4, 1);
  }
  R(ctx, '#fff', x, y - 1, 6, 1);
  if (label) text(ctx, label, x + 3, y + max * 2 + 3, '#fff', 6, 'center');
}

export function drawHUD(ctx, world, t) {
  const p = world.player;
  drawBar(ctx, 8, 10, p.hp, p.maxHp, '#7bff7b', 'HP');
  if (p.weapon > 0) drawBar(ctx, 20, 10, p.energy[p.weapon], 28, WEAPONS[p.weapon].color, '');
  // nome da arma
  text(ctx, WEAPONS[p.weapon].name, 8, 226, WEAPONS[p.weapon].light, 6, 'left');
  if (p.unlocked.length > 1) text(ctx, 'A/S TROCA', 312, 232, '#aaa', 6, 'right');
  const b = world.boss;
  if (b && world.bossBar > 0) {
    drawBar(ctx, W - 14, 10, Math.min(b.hp, (world.bossBar / 60) * b.maxHp), b.maxHp, '#ff5050', '');
    text(ctx, 'CHEFE', W - 11, 10 + b.maxHp * 2 + 3, '#fff', 6, 'center');
  }
}
