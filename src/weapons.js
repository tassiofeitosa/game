import { Proj } from './entities.js';
import { sfx } from './audio.js';

// índice 0 = buster; 1..4 = habilidades conquistadas dos chefes
export const WEAPONS = [
  {
    id: 'buster', name: 'BUSTER DA VOZ POPULAR', color: '#3a7bff', light: '#a8d0ff', cost: 0,
    desc: 'Segure X para carregar o tiro.',
  },
  {
    id: 'class', name: 'CONSCIÊNCIA DE CLASSE', color: '#e5473a', light: '#ffb8a8', cost: 2,
    desc: 'Entender que quem trabalha tem interesses em comum, e que unidos somos mais fortes que o dinheiro de poucos. O tiro se divide em três e cresce ao atravessar adversários.',
  },
  {
    id: 'privilege', name: 'DETECÇÃO DE PRIVILÉGIOS', color: '#a557e8', light: '#e6c4ff', cost: 3,
    desc: 'Enxergar quem joga com vantagem escondida. Revela plataformas ocultas, desmascara clones e dispara um tiro teleguiado contra quem mais se protege.',
  },
  {
    id: 'shield', name: 'ESCUDO DOS DIREITOS', color: '#2fbf7a', light: '#b4f5d6', cost: 5,
    desc: 'Direitos fundamentais que nenhum poder pode retirar. Cria um escudo que bloqueia ataques e fere quem encosta nele.',
  },
  {
    id: 'voice', name: 'VOZ COLETIVA', color: '#f2c230', light: '#fff2a8', cost: 7,
    desc: 'Quando o povo fala junto, até os poderosos param. Uma onda atinge a tela toda e paralisa os adversários.',
  },
];

export const WEAPON_INDEX = Object.fromEntries(WEAPONS.map((w, i) => [w.id, i]));

// tiro comum do buster; level 0, 1 ou 2 (carregado)
export function fireBuster(world, p, level) {
  const dir = p.shotDir();
  const x = p.x + p.w / 2 + dir * 9;
  const y = p.y + 11;
  const sizes = [4, 9, 15];
  const s = sizes[level];
  world.projs.push(
    new Proj({
      x: x - s / 2, y: y - s / 2, w: s, h: s, vx: dir * (3.6 + level * 0.4), dmg: [1, 3, 6][level],
      pierce: level === 2, color: WEAPONS[0].color, light: WEAPONS[0].light, kind: 'buster', level, weapon: 'buster', life: 90,
    })
  );
  [sfx.shoot, sfx.shoot2, sfx.shoot3][level]();
  p.shootAnim = 14;
}

// retorna true se a habilidade foi usada
export function useSpecial(world, p) {
  const w = WEAPONS[p.weapon];
  if (p.energy[p.weapon] < w.cost) {
    sfx.deny();
    return false;
  }
  const dir = p.shotDir();
  const x = p.x + p.w / 2 + dir * 9;
  const y = p.y + 11;
  p.energy[p.weapon] -= w.cost;
  p.shootAnim = 14;
  const base = { color: w.color, light: w.light, weapon: w.id };

  if (w.id === 'class') {
    world.projs.push(
      new Proj({ ...base, x: x - 4, y: y - 4, w: 8, h: 8, vx: dir * 3.2, dmg: 2, pierce: true, kind: 'class', life: 120, grow: true })
    );
    sfx.shoot2();
  } else if (w.id === 'privilege') {
    world.level.revealed = 420;
    world.fx.push({ type: 'ring', x: p.x + p.w / 2, y: p.y + 11, r: 4, max: 220, color: w.light });
    const target = world.mostProtected();
    world.projs.push(
      new Proj({
        ...base, x: x - 3, y: y - 3, w: 7, h: 7, vx: dir * 2, vy: -0.5, dmg: 4, kind: 'homing', life: 200,
        target, ang: dir > 0 ? 0 : Math.PI,
      })
    );
    sfx.pulse();
  } else if (w.id === 'shield') {
    p.shield = 300;
    sfx.shield();
  } else if (w.id === 'voice') {
    world.voiceWave();
    sfx.voice();
  }
  return true;
}
