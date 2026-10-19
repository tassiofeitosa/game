import { T } from './util.js';

export class Proj {
  constructor(o) {
    this.x = o.x;
    this.y = o.y;
    this.w = o.w || 6;
    this.h = o.h || 6;
    this.vx = o.vx || 0;
    this.vy = o.vy || 0;
    this.dmg = o.dmg || 1;
    this.friendly = o.friendly !== false;
    this.pierce = !!o.pierce;
    this.color = o.color || '#fff';
    this.light = o.light || '#fff';
    this.kind = o.kind || 'shot';
    this.weapon = o.weapon || null;
    this.level = o.level || 0;
    this.grav = o.grav || 0;
    this.life = o.life || 120;
    this.ignoreWalls = !!o.ignoreWalls;
    this.grow = !!o.grow;
    this.target = o.target || null;
    this.ang = o.ang || 0;
    this.split = !!o.split;
    this.hit = new Set();
    this.age = 0;
    this.dead = false;
  }

  update(world) {
    this.age++;
    if (--this.life <= 0) this.dead = true;
    if (this.grav) this.vy += this.grav;

    if (this.kind === 'homing' && this.age > 6) {
      const t = this.target;
      if (t && !t.dead && t.hp > 0) {
        const want = Math.atan2(t.y + t.h / 2 - (this.y + 3), t.x + t.w / 2 - (this.x + 3));
        let d = want - this.ang;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.ang += Math.max(-0.14, Math.min(0.14, d));
      }
      const sp = 2.8;
      this.vx = Math.cos(this.ang) * sp;
      this.vy = Math.sin(this.ang) * sp;
    }

    // a Consciência de Classe se divide em três depois de um instante
    if (this.kind === 'class' && !this.split && this.age === 16) {
      this.dead = true;
      for (const vy of [-1.3, 0, 1.3])
        world.projs.push(
          new Proj({
            x: this.x, y: this.y, w: this.w, h: this.h, vx: this.vx, vy, dmg: this.dmg, pierce: true, color: this.color,
            light: this.light, kind: 'class', weapon: 'class', life: 70, grow: true, split: true,
          })
        );
    }

    this.x += this.vx;
    this.y += this.vy;

    const cam = world.cam.x;
    if (this.x < cam - 40 || this.x > cam + 360 || this.y > 270 || this.y < -40) this.dead = true;
    if (!this.ignoreWalls && world.level.rectSolid(this.x, this.y, this.w, this.h)) {
      this.dead = true;
      world.spark(this.x + this.w / 2, this.y + this.h / 2, this.color);
    }
  }
}

export class Particle {
  constructor(x, y, vx, vy, life, color, size = 2, grav = 0.05) {
    Object.assign(this, { x, y, vx, vy, life, max: life, color, size, grav });
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.grav;
    this.life--;
  }
}

// itens: 'hp' (Cédula de Voto) e 'en' (energia da habilidade atual)
export class Pickup {
  constructor(kind, x, y, drop = false) {
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.w = 10;
    this.h = 12;
    this.vy = drop ? -2 : 0;
    this.life = drop ? 600 : Infinity;
    this.dead = false;
    this.t = 0;
  }
  update(world) {
    this.t++;
    if (this.life !== Infinity) {
      this.vy = Math.min(this.vy + 0.15, 3);
      world.level.moveY(this, this.vy);
      if (world.level.rectSolid(this.x, this.y + 1, this.w, this.h)) this.vy = 0;
      if (--this.life <= 0) this.dead = true;
    }
    if (this.y > 260) this.dead = true;
  }
}
