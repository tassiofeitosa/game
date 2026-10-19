import { T, mulberry32, clamp } from './util.js';

export const STAGE_IDS = ['lobbyist', 'disinfo', 'grileiro', 'judge'];

// Cada fase tem um tema, uma semente e "taxas" que controlam o gerador.
export const STAGES = {
  lobbyist: {
    id: 'lobbyist',
    name: 'TORRE DE VIDRO',
    boss: 'lobbyist',
    seed: 11,
    len: 130,
    enemy: 0.55,
    fly: 0.25,
    spike: 8,
    tower: 8,
    longgap: 0,
    hidden: false,
    prop: 'glass',
    theme: {
      skyTop: '#0b1840', skyBot: '#3f78b8', far: '#1b3a74', near: '#2b5a9c', tile: '#4a6fa5',
      tileTop: '#9fd0ff', tileDark: '#2c4670', accent: '#7fd8ff',
    },
  },
  disinfo: {
    id: 'disinfo',
    name: 'ESTÚDIO DA MENTIRA',
    boss: 'disinfo',
    seed: 23,
    len: 130,
    enemy: 0.6,
    fly: 0.35,
    spike: 8,
    tower: 6,
    longgap: 14,
    hidden: true,
    prop: 'tv',
    theme: {
      skyTop: '#240a38', skyBot: '#8a2f86', far: '#3d1458', near: '#5c2380', tile: '#6e3b8e',
      tileTop: '#ee9bff', tileDark: '#3b1c52', accent: '#ff6adf',
    },
  },
  grileiro: {
    id: 'grileiro',
    name: 'FAZENDA-FÁBRICA',
    boss: 'grileiro',
    seed: 37,
    len: 140,
    enemy: 0.7,
    fly: 0.15,
    spike: 16,
    tower: 6,
    longgap: 0,
    hidden: false,
    prop: 'factory',
    theme: {
      skyTop: '#2a1a0a', skyBot: '#b4753a', far: '#4a3018', near: '#6b4a24', tile: '#7a5a34',
      tileTop: '#9bd05a', tileDark: '#42301a', accent: '#ffb347',
    },
  },
  judge: {
    id: 'judge',
    name: 'TRIBUNAL DOURADO',
    boss: 'judge',
    seed: 53,
    len: 140,
    enemy: 0.6,
    fly: 0.3,
    spike: 10,
    tower: 14,
    longgap: 0,
    hidden: false,
    prop: 'court',
    theme: {
      skyTop: '#2a2236', skyBot: '#c9a96a', far: '#5b4d6a', near: '#8a7a5a', tile: '#b9a67a',
      tileTop: '#fff0c0', tileDark: '#7a6a48', accent: '#ffe08a',
    },
  },
  fortress: {
    id: 'fortress',
    name: 'FORTALEZA DO CONSÓRCIO',
    boss: 'midas',
    seed: 71,
    len: 150,
    enemy: 0.75,
    fly: 0.3,
    spike: 14,
    tower: 10,
    longgap: 10,
    hidden: true,
    prop: 'fort',
    theme: {
      skyTop: '#0a0a10', skyBot: '#3a2a10', far: '#1a1a24', near: '#2c2418', tile: '#3c3a46',
      tileTop: '#f2c230', tileDark: '#1c1a24', accent: '#f2c230',
    },
  },
};

const R = 15;
const BOSS_W = 20;

// Gera o mapa em colunas de tiles. Garantias: saltos <= 3 tiles, degraus <= 2 tiles,
// torres sempre escaláveis com wall jump e piso plano antes da sala do chefe.
export function generate(cfg) {
  const rng = mulberry32(cfg.seed);
  const rnd = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const total = 12 + cfg.len + 80 + BOSS_W;
  const g = Array.from({ length: R }, () => Array(total).fill('.'));
  const enemies = [];
  const pickups = [];
  let gy = 12;
  let x = 0;

  const ground = (x0, n) => {
    for (let c = x0; c < x0 + n; c++) for (let r = gy; r < R; r++) g[r][c] = '#';
  };
  const addEnemy = (type, col, row) => enemies.push({ type, x: col * T, y: row * T });
  const spawnOnGround = (x0, n) => {
    if (n < 5 || rng() > Math.min(0.95, cfg.enemy * 1.35)) return;
    const col = x0 + rnd(2, n - 3);
    const kind = rng() < 0.55 ? 'walker' : 'turret';
    addEnemy(kind, col, gy - 1);
    if (rng() < cfg.fly) addEnemy('flyer', x0 + 1, gy - rnd(4, 6));
  };

  ground(0, 12);
  x = 12;
  const start = { x: 3 * T, y: 12 * T - 22 };
  let checkpoint = null;

  while (x < 12 + cfg.len) {
    if (!checkpoint && x >= 12 + cfg.len / 2) {
      ground(x, 8);
      checkpoint = { x: (x + 4) * T, y: gy * T - 22 };
      pickups.push({ kind: 'hp', x: (x + 5) * T, y: (gy - 1) * T });
      x += 8;
      continue;
    }
    const weights = [
      ['flat', 34],
      ['gap', 20],
      ['step', 22],
      ['spikes', cfg.spike],
      ['tower', gy >= 11 ? cfg.tower : 0],
      ['longgap', cfg.longgap],
    ];
    let roll = rng() * weights.reduce((s, w) => s + w[1], 0);
    let seg = 'flat';
    for (const [name, wt] of weights) {
      if (roll < wt) {
        seg = name;
        break;
      }
      roll -= wt;
    }

    if (seg === 'flat') {
      const n = rnd(6, 10);
      ground(x, n);
      spawnOnGround(x, n);
      if (rng() < 0.12) pickups.push({ kind: rng() < 0.5 ? 'hp' : 'en', x: (x + 3) * T, y: (gy - 1) * T });
      x += n;
    } else if (seg === 'gap') {
      const gw = rnd(2, 3);
      if (rng() < 0.3) pickups.push({ kind: 'hp', x: (x + 1) * T, y: (gy - 3) * T });
      x += gw;
      const n = rnd(4, 6);
      ground(x, n);
      spawnOnGround(x, n);
      x += n;
    } else if (seg === 'step') {
      const d = [-2, -1, 1, 2][rnd(0, 3)];
      const ny = clamp(gy + d, 8, 12);
      if (ny === gy) continue;
      gy = ny;
      const n = rnd(5, 8);
      ground(x, n);
      spawnOnGround(x, n);
      x += n;
    } else if (seg === 'spikes') {
      const n = rnd(7, 9);
      ground(x, n);
      const sx = x + rnd(3, n - 4);
      g[gy - 1][sx] = '^';
      g[gy - 1][sx + 1] = '^';
      x += n;
    } else if (seg === 'tower') {
      // parede de 6 tiles: só passa com wall jumps repetidos (pular na parede e voltar a ela)
      const n = 9;
      ground(x, n);
      for (let k = 1; k <= 6; k++) {
        g[gy - k][x + 3] = '#';
        g[gy - k][x + 4] = '#';
      }
      pickups.push({ kind: rng() < 0.5 ? 'hp' : 'en', x: (x + 3) * T + 4, y: (gy - 7) * T });
      if (rng() < cfg.enemy) addEnemy('flyer', x + 6, gy - 5);
      x += n;
    } else if (seg === 'longgap') {
      // 6 tiles de vão com plataforma no meio (oculta nas fases com 'hidden'); dash-jump atravessa direto
      const plat = cfg.hidden ? 'h' : '=';
      g[gy][x + 2] = plat;
      g[gy][x + 3] = plat;
      pickups.push({ kind: 'en', x: (x + 2) * T + 4, y: (gy - 2) * T });
      x += 6;
      ground(x, 5);
      x += 5;
    }
  }

  // desce/sobe até o piso 12 e prepara a aproximação do chefe
  while (gy !== 12) {
    gy += gy < 12 ? 1 : -1;
    ground(x, 4);
    x += 4;
  }
  ground(x, 8);
  pickups.push({ kind: 'hp', x: (x + 4) * T, y: (gy - 1) * T });
  x += 8;

  // sala do chefe
  const bossCol = x;
  ground(bossCol, BOSS_W);
  for (let c = bossCol; c < bossCol + BOSS_W; c++) {
    g[0][c] = '#';
    g[1][c] = '#';
  }
  for (let r = 0; r < R; r++) g[r][bossCol + BOSS_W - 1] = '#';

  const cols = bossCol + BOSS_W;
  return {
    rows: g.map((r) => r.slice(0, cols).join('')),
    enemies,
    pickups,
    start,
    checkpoint: checkpoint || start,
    bossCol,
    bossX: bossCol * T,
    bossSpawn: { x: (bossCol + 15) * T, y: 12 * T - 30 },
  };
}
