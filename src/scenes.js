import { W, H, wrapText } from './util.js';
import { input } from './input.js';
import { sfx, playSong, initAudio } from './audio.js';
import { text, drawBossBody, drawHero } from './render.js';
import { BOSSES } from './bosses.js';
import { STAGES, STAGE_IDS } from './stages.js';
import { WEAPONS, WEAPON_INDEX } from './weapons.js';
import { DialogBox, INTRO, ENDING, BOSS_OUTRO } from './story.js';
import { Player } from './player.js';

function cityBackdrop(ctx, t, tint = '#0b1030') {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, tint);
  g.addColorStop(1, '#3a2a50');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.5 * Math.abs(Math.sin(t / 40 + i))})`;
    ctx.fillRect((i * 83) % W, (i * 47) % 110, 1, 1);
  }
  for (let i = 0; i < 12; i++) {
    const h = 50 + ((i * 53) % 90);
    const x = i * 28 - ((t * 0.1) % 28);
    ctx.fillStyle = '#14122a';
    ctx.fillRect(x, H - h, 24, h);
    for (let y = H - h + 6; y < H - 4; y += 9)
      for (let xx = x + 3; xx < x + 21; xx += 6) {
        ctx.fillStyle = (xx * 3 + y * 7 + i) % 5 < 2 ? '#f2c230' : '#2a2850';
        ctx.fillRect(xx, y, 3, 4);
      }
  }
}

// ---------- título ----------
export class TitleScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.sel = 0;
    playSong('title');
  }
  items() {
    return this.game.save.beaten.length ? ['CONTINUAR', 'NOVO JOGO'] : ['NOVO JOGO'];
  }
  update() {
    this.t++;
    const items = this.items();
    if (input.pressed('down') || input.pressed('up')) {
      this.sel = (this.sel + 1) % items.length;
      sfx.select();
    }
    if (input.confirm()) {
      initAudio();
      sfx.confirm();
      const it = items[this.sel];
      if (it === 'NOVO JOGO') {
        this.game.save.beaten = [];
        this.game.persist();
        this.game.go(new CutsceneScene(this.game, INTRO, () => new StageSelectScene(this.game)));
      } else this.game.go(new StageSelectScene(this.game));
    }
  }
  draw(ctx) {
    cityBackdrop(ctx, this.t);
    text(ctx, 'DEMO', W / 2, 36, '#7fd8ff', 40, 'center');
    text(ctx, 'O HERÓI DA DEMOCRACIA', W / 2, 84, '#f2c230', 12, 'center');
    const p = new Player(W / 2 - 6, 118);
    p.onGround = true;
    p.animT = this.t;
    p.moving = false;
    drawHero(ctx, p, 0, this.t);
    this.items().forEach((it, i) => {
      const c = i === this.sel ? '#fff' : '#888';
      text(ctx, (i === this.sel && Math.floor(this.t / 15) % 2 === 0 ? '> ' : '  ') + it, W / 2, 160 + i * 14, c, 10, 'center');
    });
    text(ctx, input.label('Z/ENTER') + ': confirmar', W / 2, 212, '#aaa', 7, 'center');
    text(ctx, 'Uma história fictícia sobre o poder do povo', W / 2, 224, '#777', 7, 'center');
  }
}

// ---------- cena narrada ----------
export class CutsceneScene {
  constructor(game, lines, next, song = 'title') {
    this.game = game;
    this.t = 0;
    this.next = next;
    this.dialog = new DialogBox(lines, () => game.go(next()));
    playSong(song);
  }
  update() {
    this.t++;
    this.dialog.update();
  }
  draw(ctx) {
    cityBackdrop(ctx, this.t);
    this.dialog.draw(ctx, true);
  }
}

// ---------- seleção de fase ----------
const CELLS = [
  { id: 'lobbyist', gx: 0, gy: 0 },
  { id: 'disinfo', gx: 2, gy: 0 },
  { id: 'fortress', gx: 1, gy: 1 },
  { id: 'grileiro', gx: 0, gy: 2 },
  { id: 'judge', gx: 2, gy: 2 },
];

export class StageSelectScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.sel = 0;
    playSong('title');
  }
  unlockedFortress() {
    return STAGE_IDS.every((s) => this.game.save.beaten.includes(STAGES[s].boss));
  }
  update() {
    this.t++;
    const dirs = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    for (const d in dirs) {
      if (!input.pressed(d)) continue;
      const cur = CELLS[this.sel];
      let best = -1;
      let bestD = 1e9;
      CELLS.forEach((c, i) => {
        const dx = c.gx - cur.gx;
        const dy = c.gy - cur.gy;
        if (i === this.sel || dx * dirs[d][0] + dy * dirs[d][1] <= 0) return;
        const dist = dx * dx + dy * dy;
        if (dist < bestD) {
          bestD = dist;
          best = i;
        }
      });
      if (best >= 0) {
        this.sel = best;
        sfx.select();
      }
    }
    if (input.confirm()) {
      const c = CELLS[this.sel];
      if (c.id === 'fortress' && !this.unlockedFortress()) {
        sfx.deny();
        return;
      }
      sfx.confirm();
      this.game.startStage(c.id);
    }
  }
  draw(ctx) {
    cityBackdrop(ctx, this.t, '#10183a');
    text(ctx, 'ESCOLHA A MISSÃO', W / 2, 8, '#fff', 12, 'center');
    const beaten = this.game.save.beaten;
    CELLS.forEach((c, i) => {
      const x = 22 + c.gx * 100;
      const y = 28 + c.gy * 48;
      const st = STAGES[c.id];
      const sel = i === this.sel;
      const done = beaten.includes(st.boss);
      ctx.fillStyle = sel ? (Math.floor(this.t / 8) % 2 ? '#fff' : '#f2c230') : '#000';
      ctx.fillRect(x - 2, y - 2, 84, 44);
      const th = st.theme;
      const g = ctx.createLinearGradient(0, y, 0, y + 40);
      g.addColorStop(0, th.skyTop);
      g.addColorStop(1, th.skyBot);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 80, 40);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, 80, 40);
      ctx.clip();
      drawBossBody(ctx, st.boss, x + 40, y + 6, 1, this.t, 1.0, false);
      ctx.restore();
      if (c.id === 'fortress' && !this.unlockedFortress()) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(x, y, 80, 40);
        text(ctx, 'BLOQUEADA', x + 40, y + 16, '#f66', 8, 'center');
      }
      if (done) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(x, y, 80, 40);
        text(ctx, 'VENCIDO', x + 40, y + 16, '#7bff7b', 8, 'center');
      }
    });
    const c = CELLS[this.sel];
    const st = STAGES[c.id];
    const b = BOSSES[st.boss];
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(8, 172, W - 16, 60);
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(8.5, 172.5, W - 17, 59);
    text(ctx, st.name, 14, 177, '#f2c230', 8);
    text(ctx, `${b.name} — ${b.title}`, 14, 188, '#fff', 7);
    if (b.weapon) text(ctx, 'HABILIDADE: ' + WEAPONS[WEAPON_INDEX[b.weapon]].name, 14, 200, WEAPONS[WEAPON_INDEX[b.weapon]].light, 7);
    else text(ctx, 'O ÚLTIMO TENENTE DO CONSÓRCIO ÁUREO', 14, 200, '#f66', 7);
    text(ctx, `FRACO CONTRA: ${WEAPONS[WEAPON_INDEX[b.weak]].name}`, 14, 211, '#aaa', 7);
    text(ctx, input.label('Z') + ': ENTRAR', W - 14, 220, '#fff', 7, 'right');
  }
}

// ---------- habilidade adquirida ----------
export class LearnedScene {
  constructor(game, bossId) {
    this.game = game;
    this.bossId = bossId;
    this.w = WEAPONS[WEAPON_INDEX[BOSSES[bossId].weapon]];
    this.t = 0;
    playSong('win');
    sfx.win();
  }
  update() {
    this.t++;
    if (this.t > 60 && input.confirm()) this.game.go(new StageSelectScene(this.game));
  }
  draw(ctx) {
    cityBackdrop(ctx, this.t, '#101830');
    text(ctx, 'HABILIDADE ADQUIRIDA!', W / 2, 24, '#fff', 12, 'center');
    const p = new Player(W / 2 - 6, 70);
    p.onGround = true;
    p.weapon = WEAPON_INDEX[this.w.id];
    drawHero(ctx, p, 0, this.t);
    text(ctx, this.w.name, W / 2, 104, this.w.light, 12, 'center');
    ctx.font = 'bold 8px "Courier New", monospace';
    wrapText(ctx, this.w.desc, 280).forEach((l, i) => text(ctx, l, W / 2, 128 + i * 12, '#fff', 8, 'center'));
    if (this.t > 60 && Math.floor(this.t / 20) % 2 === 0) text(ctx, input.label('Z') + ': CONTINUAR', W / 2, 214, '#aaa', 8, 'center');
  }
}

// ---------- final ----------
export class EndingScene {
  constructor(game) {
    this.game = game;
    this.t = 0;
    this.phase = 0;
    this.dialog = new DialogBox([...BOSS_OUTRO.midas, ...ENDING], () => {
      this.phase = 1;
      this.t = 0;
    });
    playSong('win');
    sfx.win();
  }
  update() {
    this.t++;
    if (this.phase === 0) this.dialog.update();
    else if (this.t > 120 && input.confirm()) this.game.go(new TitleScene(this.game));
  }
  draw(ctx) {
    cityBackdrop(ctx, this.t, '#2a1a50');
    if (this.phase === 0) this.dialog.draw(ctx, true);
    else {
      text(ctx, 'FIM', W / 2, 50, '#f2c230', 40, 'center');
      text(ctx, 'O PODER VOLTOU AO POVO', W / 2, 110, '#fff', 12, 'center');
      text(ctx, 'A democracia se defende todos os dias.', W / 2, 140, '#7fd8ff', 8, 'center');
      text(ctx, 'Obrigado por jogar!', W / 2, 160, '#aaa', 8, 'center');
      if (this.t > 120 && Math.floor(this.t / 20) % 2 === 0) text(ctx, input.label('Z') + ': VOLTAR AO TÍTULO', W / 2, 210, '#fff', 8, 'center');
    }
  }
}
