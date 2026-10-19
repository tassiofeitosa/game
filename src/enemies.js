import { Proj } from './entities.js';
import { sfx } from './audio.js';

const DEF = {
  walker: { w: 14, h: 14, hp: 3, dmg: 3 },
  turret: { w: 14, h: 14, hp: 4, dmg: 2 },
  flyer: { w: 14, h: 10, hp: 2, dmg: 2 },
  decoy: { w: 20, h: 30, hp: 1, dmg: 3 },
};

export class Enemy {
  constructor(type, x, y, extra = {}) {
    const d = DEF[type];
    this.type = type;
    this.x = x;
    this.y = y + (16 - d.h > 0 && type !== 'flyer' ? 16 - d.h : 0);
    this.w = d.w;
    this.h = d.h;
    this.hp = d.hp;
    this.maxHp = d.hp;
    this.dmg = d.dmg;
    this.vx = 0;
    this.vy = 0;
    this.dir = -1;
    this.t = Math.floor(Math.random() * 60);
    this.baseY = this.y;
    this.active = !!extra.active;
    this.freeze = 0;
    this.flash = 0;
    this.dead = false;
    this.hitCd = 0;
    this.life = extra.life || Infinity;
    this.bossId = extra.bossId || null;
  }

  hurt(n) {
    if (this.dead) return;
    this.hp -= n;
    this.flash = 6;
    if (this.hp <= 0) this.dead = true;
    else sfx.hit();
  }

  update(world) {
    if (this.dead) return;
    if (this.flash > 0) this.flash--;
    if (this.hitCd > 0) this.hitCd--;
    if (!this.active) {
      if (Math.abs(this.x - (world.cam.x + 160)) < 190) this.active = true;
      else return;
    }
    if (this.freeze > 0) {
      this.freeze--;
      return;
    }
    if (--this.life <= 0) {
      this.dead = true;
      this.poof = true;
      return;
    }
    this.t++;
    this['ai_' + this.type](world);
  }

  ai_walker(world) {
    const L = world.level;
    this.vy = Math.min(this.vy + 0.25, 5);
    const r = L.moveY(this, this.vy);
    const grounded = r === 'floor';
    if (r) this.vy = 0;
    if (!grounded) return;
    const hit = L.moveX(this, this.dir * 0.5);
    const frontX = this.dir > 0 ? this.x + this.w + 1 : this.x - 1;
    const ledge = !L.solid(Math.floor(frontX / 16), Math.floor((this.y + this.h + 1) / 16)) &&
      !L.oneWay(L.get(Math.floor(frontX / 16), Math.floor((this.y + this.h + 1) / 16)));
    if (hit || ledge) this.dir *= -1;
  }

  ai_turret(world) {
    const p = world.player;
    this.dir = p.x > this.x ? 1 : -1;
    const dx = Math.abs(p.x - this.x);
    if (dx < 170 && this.t % 100 === 60) {
      const ax = p.x + p.w / 2 - (this.x + this.w / 2);
      const ay = p.y + 8 - (this.y + 4);
      const m = Math.hypot(ax, ay) || 1;
      world.eprojs.push(
        new Proj({
          friendly: false, x: this.x + 4, y: this.y + 3, w: 6, h: 6, vx: (ax / m) * 1.6, vy: (ay / m) * 1.6, dmg: 2,
          color: '#ffb000', light: '#fff0a0', kind: 'orb', life: 200,
        })
      );
    }
  }

  ai_flyer(world) {
    const p = world.player;
    if (Math.abs(p.x - this.x) < 190) {
      this.x += Math.sign(p.x - this.x) * 0.75;
      this.dir = p.x > this.x ? 1 : -1;
    }
    this.y = this.baseY + Math.sin(this.t / 14) * 14;
    if (Math.abs(p.x - this.x) < 60 && this.baseY < p.y - 10) this.baseY += 0.35;
  }

  ai_decoy(world) {
    const p = world.player;
    this.dir = p.x > this.x ? 1 : -1;
    this.vy = Math.min(this.vy + 0.28, 6);
    const r = world.level.moveY(this, this.vy);
    if (r) this.vy = 0;
    world.level.moveX(this, this.dir * 1.0);
  }
}
