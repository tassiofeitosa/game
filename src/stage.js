import { W, H, T, overlap, clamp } from './util.js';
import { input } from './input.js';
import { sfx, playSong } from './audio.js';
import { Level } from './level.js';
import { STAGES, generate } from './stages.js';
import { Player } from './player.js';
import { Enemy } from './enemies.js';
import { Boss, BOSSES } from './bosses.js';
import { Particle, Pickup } from './entities.js';
import { WEAPONS, WEAPON_INDEX } from './weapons.js';
import { DialogBox, BOSS_INTRO } from './story.js';
import {
  text, drawHero, drawEnemy, drawBoss, drawProj, drawPickup, drawFx, drawBackground, drawLevel, drawHUD,
  makeBackground, shieldOrbs,
} from './render.js';

// Cena de jogo de uma fase: percurso, sala do chefe e fim de fase
export class StageScene {
  constructor(game, id) {
    this.game = game;
    this.id = id;
    this.cfg = STAGES[id];
    this.def = generate(this.cfg);
    this.bg = makeBackground(this.cfg, this.def.rows[0].length * T);
    this.checkpoint = this.def.start;
    this.helpT = 260;
    this.titleT = 150;
    this.reset(this.def.start);
    playSong('stage');
  }

  reset(spawn) {
    const old = this.player;
    this.level = new Level(this.def);
    this.player = new Player(spawn.x, spawn.y);
    this.player.unlocked = [0, ...this.game.save.beaten.map((b) => WEAPON_INDEX[BOSSES[b].weapon]).filter((i) => i)];
    this.player.unlocked.sort((a, b) => a - b);
    if (old) this.player.energy = old.energy.slice();
    this.player.energy = this.player.energy.map((e, i) => (i === 0 ? 0 : Math.max(e, 14)));
    this.enemies = this.def.enemies.map((e) => new Enemy(e.type, e.x, e.y));
    this.pickups = this.def.pickups.map((p) => new Pickup(p.kind, p.x, p.y));
    this.projs = [];
    this.eprojs = [];
    this.parts = [];
    this.fx = [];
    this.cam = { x: clamp(spawn.x - 140, 0, this.level.w * T - W), shake: 0 };
    this.boss = null;
    this.bossBar = 0;
    this.dialog = null;
    this.locked = false;
    this.time = 0;
    this.state = 'ready';
    this.stateT = 50;
    playSong('stage');
  }

  // ---------- utilidades usadas por armas e chefes ----------
  shake(n) {
    this.cam.shake = Math.max(this.cam.shake, n);
  }

  spark(x, y, color) {
    for (let i = 0; i < 4; i++)
      this.parts.push(new Particle(x, y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, 14, color, 2, 0));
  }

  boom(x, y, n = 12, colors = ['#fff', '#ffd040', '#ff7020']) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 7;
      const s = 0.5 + Math.random() * 2.2;
      this.parts.push(
        new Particle(x, y, Math.cos(a) * s, Math.sin(a) * s, 25 + Math.random() * 15, colors[i % colors.length], 2 + (i % 2), 0.02)
      );
    }
    sfx.boom();
  }

  mostProtected() {
    let best = null;
    const onScreen = (e) => e.x > this.cam.x - 10 && e.x < this.cam.x + W + 10;
    if (this.boss && this.boss.active && !this.boss.dead) return this.boss;
    for (const e of this.enemies) if (!e.dead && e.type !== 'decoy' && onScreen(e) && (!best || e.hp > best.hp)) best = e;
    return best;
  }

  voiceWave() {
    const p = this.player;
    this.fx.push({ type: 'wave', x: p.x + p.w / 2, y: p.y, r: 4, max: 340, color: '#f2c230' });
    this.fx.push({ type: 'flash', a: 0.5, color: '#fff2a8' });
    this.shake(5);
    const onScreen = (e) => e.x + e.w > this.cam.x && e.x < this.cam.x + W;
    for (const e of this.enemies)
      if (!e.dead && onScreen(e)) {
        e.hurt(2);
        e.freeze = 160;
      }
    this.eprojs = this.eprojs.filter((q) => !onScreen(q));
    const b = this.boss;
    if (b && b.active && !b.dead) {
      b.hurt(3, 'voice');
      b.stun = b.id === 'midas' ? 50 : 90;
    }
  }

  killEnemy(e) {
    this.boom(e.x + e.w / 2, e.y + e.h / 2, e.poof ? 6 : 12);
    if (e.poof || e.type === 'decoy') return;
    const r = Math.random();
    if (r < 0.16) this.pickups.push(new Pickup('hp', e.x + 2, e.y, true));
    else if (r < 0.3 && this.player.weapon > 0) this.pickups.push(new Pickup('en', e.x + 2, e.y, true));
  }

  // ---------- laço principal ----------
  update() {
    const p = this.player;
    this.time++;
    if (this.helpT > 0) this.helpT--;
    if (this.titleT > 0) this.titleT--;

    if (this.state === 'pause') {
      if (input.pressed('pause')) this.state = this.prevState;
      return;
    }
    if ((this.state === 'play' || this.state === 'boss') && input.pressed('pause')) {
      this.prevState = this.state;
      this.state = 'pause';
      return;
    }

    if (this.state === 'ready') {
      if (--this.stateT <= 0) this.state = 'play';
      return;
    }
    if (this.state === 'dead') {
      this.tickEffects();
      if (--this.stateT <= 0) this.reset(this.checkpoint);
      return;
    }
    if (this.state === 'bossIntro') {
      this.updateBossIntro();
    } else if (this.state === 'bossDying') {
      this.updateBossDying();
      return;
    } else if (this.state === 'ending') {
      this.tickEffects();
      return;
    }

    this.tick();

    if (p.dead && this.state !== 'dead') {
      this.state = 'dead';
      this.stateT = 100;
      this.boom(p.x + p.w / 2, p.y + 10, 24, ['#fff', '#7fd8ff', '#3a7bff']);
      sfx.bigboom();
      playSong('');
    }
  }

  tickEffects() {
    for (const q of this.parts) q.update();
    this.parts = this.parts.filter((q) => q.life > 0);
    for (const f of this.fx) {
      if (f.type === 'flash') f.a -= 0.04;
      else f.r += 4;
    }
    this.fx = this.fx.filter((f) => (f.type === 'flash' ? f.a > 0 : f.r < f.max));
    if (this.cam.shake > 0) this.cam.shake -= 0.4;
  }

  tick() {
    const p = this.player;
    const L = this.level;
    if (L.revealed > 0) L.revealed--;
    this.locked = this.state === 'bossIntro';
    if (!p.dead) p.update(this);
    else p.vy = Math.min(p.vy + 0.28, 6);

    for (const e of this.enemies) e.update(this);
    if (this.boss) this.boss.update(this);
    for (const q of this.projs) q.update(this);
    for (const q of this.eprojs) q.update(this);
    for (const k of this.pickups) k.update(this);
    this.collide();
    this.tickEffects();

    this.projs = this.projs.filter((q) => !q.dead);
    this.eprojs = this.eprojs.filter((q) => !q.dead);
    this.pickups = this.pickups.filter((k) => !k.dead);
    for (const e of this.enemies) if (e.dead && !e.counted) {
      e.counted = true;
      this.killEnemy(e);
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    // checkpoint e gatilho do chefe
    if (!p.dead && p.onGround && p.x >= this.def.checkpoint.x && p.x < this.def.bossX - 8) this.checkpoint = this.def.checkpoint;
    if (this.state === 'play' && !p.dead && p.x > this.def.bossX + 28 && p.onGround) this.startBossIntro();

    // câmera
    const maxX = L.w * T - W;
    if (this.state === 'bossIntro' || this.state === 'boss') {
      this.cam.x += clamp(maxX - this.cam.x, -4, 4);
    } else {
      const target = clamp(p.x + p.w / 2 - W / 2 + p.face * 18, 0, maxX);
      this.cam.x += (target - this.cam.x) * 0.15;
    }
    this.cam.x = clamp(this.cam.x, 0, maxX);
    if (this.bossBar > 0 && this.bossBar < 60 && this.state === 'boss') this.bossBar++;

    if (this.boss && this.boss.dead && this.state === 'boss') this.beginBossDeath();
  }

  collide() {
    const p = this.player;
    const orbs = shieldOrbs(p, this.time);

    // tiros do jogador
    for (const q of this.projs) {
      if (q.dead) continue;
      for (const e of this.enemies) {
        if (e.dead || q.hit.has(e) || !overlap(q, e)) continue;
        if (e.type === 'decoy') {
          e.hurt(5);
          q.hit.add(e);
          if (!q.pierce) q.dead = true;
          continue;
        }
        e.hurt(q.dmg);
        q.hit.add(e);
        if (q.grow) {
          q.dmg = Math.min(6, q.dmg + 1);
          q.w += 2;
          q.h += 2;
        }
        if (!q.pierce) q.dead = true;
        if (q.dead) break;
      }
      const b = this.boss;
      if (!q.dead && b && b.active && !b.dead && !q.hit.has(b) && overlap(q, b)) {
        if (b.hurt(q.dmg, q.weapon)) {
          q.hit.add(b);
          if (!q.pierce || q.kind === 'buster') q.dead = true;
        }
      }
    }

    // tiros inimigos
    for (const q of this.eprojs) {
      if (q.dead) continue;
      if (orbs.some((o) => overlap(o, q))) {
        q.dead = true;
        this.spark(q.x, q.y, '#b4f5d6');
        sfx.hit();
        continue;
      }
      if (!p.dead && overlap({ x: p.x + 1, y: p.y + 1, w: p.w - 2, h: p.h - 2 }, q)) {
        if (p.hurt(q.dmg, q.x + q.w / 2) && q.kind !== 'wave') q.dead = true;
      }
    }

    // contato com inimigos e escudo
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.hitCd === 0 && orbs.some((o) => overlap(o, e))) {
        e.hurt(e.type === 'decoy' ? 5 : 2);
        e.hitCd = 14;
      }
      if (!p.dead && e.freeze === 0 && overlap({ x: p.x + 1, y: p.y + 1, w: p.w - 2, h: p.h - 2 }, e)) p.hurt(e.dmg, e.x + e.w / 2);
    }
    const b = this.boss;
    if (b && b.active && !b.dead) {
      if (b.hitCd > 0) b.hitCd--;
      if (!b.hitCd && orbs.some((o) => overlap(o, b))) {
        b.hurt(1, 'shield');
        b.hitCd = 18;
      }
      if (!p.dead && b.stun === 0 && b.alpha > 0.7 && overlap({ x: p.x + 1, y: p.y + 1, w: p.w - 2, h: p.h - 2 }, b))
        p.hurt(b.dmg, b.x + b.w / 2);
    }

    // itens
    for (const k of this.pickups)
      if (!k.dead && !p.dead && overlap(p, k)) {
        k.dead = true;
        sfx.pickup();
        if (k.kind === 'hp') p.hp = Math.min(p.maxHp, p.hp + 4);
        else for (let i = 1; i < p.energy.length; i++) p.energy[i] = Math.min(28, p.energy[i] + (i === p.weapon ? 8 : 3));
      }
  }

  // ---------- chefe ----------
  startBossIntro() {
    const L = this.level;
    this.state = 'bossIntro';
    for (let ty = 2; ty <= 11; ty++) L.set(this.def.bossCol, ty, 'D');
    sfx.boom();
    this.shake(4);
    this.enemies = this.enemies.filter((e) => e.x < this.def.bossX - 40);
    this.eprojs = [];
    this.boss = new Boss(this.cfg.boss, this.def.bossSpawn.x, this.def.bossSpawn.y);
    this.boss.face = -1;
    this.bossBar = 0;
    this.introLines = BOSS_INTRO[this.cfg.boss];
    this.dialog = null;
    this.introT = 0;
    playSong('boss');
  }

  updateBossIntro() {
    this.introT++;
    // espera a câmera chegar na sala antes de iniciar o diálogo
    const maxX = this.level.w * T - W;
    if (!this.dialog && Math.abs(this.cam.x - maxX) < 1 && this.player.onGround && this.introT > 20) {
      this.dialog = new DialogBox(this.introLines, () => {
        this.dialog = null;
        this.state = 'boss';
        this.boss.active = true;
        this.bossBar = 1;
      });
    }
    if (this.dialog) this.dialog.update();
  }

  beginBossDeath() {
    this.state = 'bossDying';
    this.stateT = 130;
    this.eprojs = [];
    this.enemies = [];
    sfx.bigboom();
    playSong('');
  }

  updateBossDying() {
    const b = this.boss;
    this.stateT--;
    this.tickEffects();
    this.locked = true;
    this.player.update(this);
    if (this.stateT % 6 === 0) {
      this.boom(b.x + Math.random() * b.w, b.y + Math.random() * b.h, 8, ['#fff', '#ffd040', b.cfg.pal.body]);
      this.shake(3);
    }
    if (this.stateT === 20) this.fx.push({ type: 'flash', a: 1, color: '#fff' });
    if (this.stateT <= 0) this.finishStage();
  }

  finishStage() {
    const id = this.cfg.boss;
    if (id === 'midas') {
      this.state = 'ending';
      this.game.finishGame();
      return;
    }
    if (!this.game.save.beaten.includes(id)) this.game.save.beaten.push(id);
    this.game.persist();
    this.game.learned(id);
  }

  // ---------- desenho ----------
  draw(ctx) {
    const cam = this.cam;
    const camX = Math.round(cam.x);
    const sh = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake * 2 : 0;
    ctx.save();
    ctx.translate(Math.round(sh), Math.round(sh * 0.5));
    drawBackground(ctx, this.bg, this.cfg, camX, this.time);
    drawLevel(ctx, this.level, this.cfg, camX, this.time);
    for (const k of this.pickups) drawPickup(ctx, k, camX, this.time);
    const rev = this.level.revealed > 0;
    for (const e of this.enemies) drawEnemy(ctx, e, camX, this.time, rev);
    if (this.boss) drawBoss(ctx, this.boss, camX, this.time);
    if (this.state !== 'dead' || this.stateT > 90) drawHero(ctx, this.player, camX, this.time);
    for (const q of this.projs) drawProj(ctx, q, camX, this.time);
    for (const q of this.eprojs) drawProj(ctx, q, camX, this.time);
    drawFx(ctx, this, camX);
    ctx.restore();

    drawHUD(ctx, this, this.time);

    if (this.state === 'ready' && Math.floor(this.time / 6) % 2 === 0) text(ctx, 'PRONTO', W / 2, 100, '#fff', 12, 'center');
    if (this.titleT > 0 && this.state !== 'dead') {
      ctx.globalAlpha = Math.min(1, this.titleT / 30);
      text(ctx, 'NOVA ÁGORA', W / 2, 40, '#ccc', 8, 'center');
      text(ctx, this.cfg.name, W / 2, 52, '#fff', 12, 'center');
      ctx.globalAlpha = 1;
    }
    if (this.helpT > 0 && this.state === 'play') {
      ctx.globalAlpha = Math.min(1, this.helpT / 40);
      text(ctx, 'SETAS: mover   Z: pular   X: atirar (segure p/ carregar)', W / 2, 196, '#fff', 7, 'center');
      text(ctx, 'C: dash   pule na parede para escalar (wall jump)', W / 2, 207, '#fff', 7, 'center');
      ctx.globalAlpha = 1;
    }
    if (this.dialog) this.dialog.draw(ctx, false, true);
    if (this.state === 'dead' && this.stateT < 70) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.8, (70 - this.stateT) / 40)})`;
      ctx.fillRect(0, 0, W, H);
      text(ctx, 'A LUTA CONTINUA...', W / 2, 108, '#fff', 12, 'center');
    }
    if (this.state === 'pause') {
      ctx.fillStyle = 'rgba(0,0,20,0.8)';
      ctx.fillRect(0, 0, W, H);
      text(ctx, 'PAUSA', W / 2, 40, '#fff', 14, 'center');
      this.player.unlocked.forEach((wi, k) => {
        const w = WEAPONS[wi];
        text(ctx, w.name, 40, 80 + k * 16, wi === this.player.weapon ? w.light : '#888', 8);
        if (wi > 0) text(ctx, `${Math.ceil(this.player.energy[wi])}/28`, 280, 80 + k * 16, w.light, 8, 'right');
      });
      text(ctx, 'ENTER: continuar', W / 2, 200, '#aaa', 8, 'center');
    }
  }
}
