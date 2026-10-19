import { Proj } from './entities.js';
import { Enemy } from './enemies.js';
import { sfx } from './audio.js';

// weak = habilidade que causa 3x de dano; weapon = habilidade que o chefe concede
export const BOSSES = {
  lobbyist: {
    name: 'LORDE LOBISTA', title: 'O Comprador de Leis', weak: 'voice', weapon: 'class',
    pal: { body: '#2c4a96', trim: '#e8c860', skin: '#e8c9a0', dark: '#16254d' },
  },
  disinfo: {
    name: 'DUQUESA DA DESINFORMAÇÃO', title: 'A Rainha das Mentiras', weak: 'shield', weapon: 'privilege',
    pal: { body: '#b0307a', trim: '#7ff0ff', skin: '#f0d0c0', dark: '#58143c' },
  },
  grileiro: {
    name: 'CONDE GRILEIRO', title: 'O Dono das Terras Roubadas', weak: 'privilege', weapon: 'shield',
    pal: { body: '#6b8a2a', trim: '#e08a30', skin: '#d8a878', dark: '#33441a' },
  },
  judge: {
    name: 'JUÍZA COMPRADA', title: 'A Balança Viciada', weak: 'class', weapon: 'voice',
    pal: { body: '#3a3350', trim: '#f2d36a', skin: '#e8c9b0', dark: '#1c1828' },
  },
  midas: {
    name: 'BARÃO MIDAS', title: 'O Dono de Tudo', weak: 'voice', weapon: null,
    pal: { body: '#d9a620', trim: '#fff2a0', skin: '#e8c9a0', dark: '#6b4a08' },
  },
};

export class Boss {
  constructor(id, x, y) {
    this.id = id;
    this.cfg = BOSSES[id];
    this.x = x;
    this.y = y;
    this.w = 22;
    this.h = 30;
    this.vx = 0;
    this.vy = 0;
    this.hp = id === 'midas' ? 40 : 28;
    this.maxHp = this.hp;
    this.fly = id === 'judge';
    this.face = -1;
    this.mode = 'idle';
    this.t = 0;
    this.n = 0;
    this.active = false;
    this.dead = false;
    this.flash = 0;
    this.stun = 0;
    this.alpha = 1;
    this.onGround = false;
    this.hitWall = false;
    this.telegraph = 0;
    this.hoverY = 0;
    this.dmg = 4;
  }

  hurt(n, weaponId) {
    if (!this.active || this.dead || this.alpha < 0.7) return false;
    let m = 1;
    if (weaponId && weaponId !== 'buster') {
      if (weaponId === this.cfg.weak) m = 3;
      else if (this.id === 'midas') m = 2;
    }
    this.hp -= n * m;
    this.flash = 8;
    if (m > 1) sfx.crit();
    else sfx.hit();
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
    return true;
  }

  to(mode) {
    this.mode = mode;
    this.t = 0;
  }

  aimShot(world, speed = 1.9, spread = 0, dmg = 3, kind = 'orb') {
    const p = world.player;
    const cx = this.x + this.w / 2;
    const cy = this.y + 12;
    const a = Math.atan2(p.y + 10 - cy, p.x + p.w / 2 - cx) + spread;
    world.eprojs.push(
      new Proj({
        friendly: false, x: cx - 4, y: cy - 4, w: 8, h: 8, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg,
        color: this.cfg.pal.trim, light: '#fff', kind, life: 260,
      })
    );
    sfx.shoot();
  }

  wave(world, dir, speed = 2.2) {
    world.eprojs.push(
      new Proj({
        friendly: false, x: this.x + this.w / 2 - 6 + dir * 8, y: this.y + this.h - 8, w: 12, h: 8, vx: dir * speed, dmg: 3,
        color: this.cfg.pal.trim, light: '#fff', kind: 'wave', life: 220,
      })
    );
  }

  update(world) {
    if (this.dead) return;
    const p = world.player;
    const L = world.level;
    if (this.flash > 0) this.flash--;
    this.hitWall = false;
    if (this.active) {
      if (this.stun > 0) {
        this.stun--;
        this.vx = 0;
      } else this['ai_' + this.id](world, p, L);
    }
    if (!this.fly) this.vy = Math.min(this.vy + 0.28, 6);
    if (L.moveX(this, this.vx)) this.hitWall = true;
    const r = L.moveY(this, this.vy);
    this.onGround = r === 'floor';
    if (r) this.vy = 0;
    if (this.mode !== 'charge' && this.mode !== 'dash' && this.stun === 0)
      this.face = p.x + p.w / 2 > this.x + this.w / 2 ? 1 : -1;
  }

  // Lorde Lobista: pula sobre o jogador e chove moedas aos montes
  ai_lobbyist(world) {
    this.t++;
    if (this.mode === 'idle') {
      this.vx = 0;
      if (this.t > 40) this.to(this.n++ % 2 === 0 ? 'jump' : 'coins');
    } else if (this.mode === 'jump') {
      if (this.t === 1) {
        this.vy = -6.2;
        this.vx = this.face * 1.9;
      }
      if (this.onGround && this.t > 6) {
        this.vx = 0;
        world.shake(4);
        this.to('idle');
      }
    } else if (this.mode === 'coins') {
      this.vx = 0;
      if (this.t === 10 || this.t === 34 || this.t === 58) for (const s of [-0.28, 0, 0.28]) this.aimShot(world, 1.9, s);
      if (this.t > 85) this.to('idle');
    }
  }

  // Duquesa: some, reaparece, atira e cria clones falsos
  ai_disinfo(world, p) {
    this.t++;
    if (this.mode === 'idle') {
      this.vx = 0;
      this.alpha = 1;
      if (this.t > 30) this.to('fade');
    } else if (this.mode === 'fade') {
      this.alpha = Math.max(0, 1 - this.t / 16);
      if (this.t >= 20) {
        const bx = world.def.bossX;
        this.x = bx + 28 + Math.random() * (world.def.bossX + 320 - 28 - this.w - (bx + 28));
        this.y = world.def.bossSpawn.y;
        this.to('appear');
      }
    } else if (this.mode === 'appear') {
      this.alpha = Math.min(1, this.t / 14);
      if (this.t >= 16) {
        this.alpha = 1;
        this.to('shoot');
      }
    } else if (this.mode === 'shoot') {
      this.vx = 0;
      if (this.t === 12 || this.t === 28 || this.t === 44) this.aimShot(world, 2.0, 0, 3);
      if (this.t > 62) {
        this.n++;
        if (this.n % 3 === 0) {
          const bx = world.def.bossX;
          for (let i = 0; i < 2; i++) {
            const dx = bx + 40 + Math.random() * 220;
            world.enemies.push(new Enemy('decoy', dx, world.def.bossSpawn.y, { active: true, life: 420, bossId: this.id }));
          }
        }
        this.to('idle');
      }
    }
  }

  // Conde Grileiro: investida com a cerca e mísseis em arco
  ai_grileiro(world) {
    this.t++;
    if (this.mode === 'idle') {
      this.vx = 0;
      if (this.t > 35) this.to(this.n++ % 2 === 0 ? 'charge' : 'missiles');
    } else if (this.mode === 'charge') {
      if (this.t < 30) {
        this.telegraph = this.t;
        this.vx = 0;
      } else {
        if (this.t === 30) {
          this.telegraph = 0;
          this.vx = this.face * 3.6;
        }
        if (this.hitWall) {
          this.vx = 0;
          world.shake(6);
          this.to('recoil');
        }
      }
    } else if (this.mode === 'recoil') {
      this.vx = 0;
      if (this.t > 45) this.to('idle');
    } else if (this.mode === 'missiles') {
      this.vx = 0;
      if (this.t === 10 || this.t === 40) {
        const p = world.player;
        const dx = p.x - this.x;
        world.eprojs.push(
          new Proj({
            friendly: false, x: this.x + 8, y: this.y, w: 8, h: 8, vx: Math.max(-2.2, Math.min(2.2, dx / 70)), vy: -4.2,
            grav: 0.1, dmg: 3, color: '#e06020', light: '#ffd070', kind: 'missile', life: 240,
          })
        );
        sfx.shoot();
      }
      if (this.t > 75) this.to('idle');
    }
  }

  // Juíza: paira, golpeia com o martelo e causa ondas de choque no chão
  ai_judge(world, p) {
    this.t++;
    if (!this.hoverY) this.hoverY = this.y - 70;
    if (this.mode === 'idle') {
      this.vx = Math.sign(p.x - this.x) * Math.min(1.2, Math.abs(p.x - this.x) / 20);
      this.vy = (this.hoverY - this.y) * 0.08;
      if (this.t > 70) this.to(this.n++ % 2 === 0 ? 'gavel' : 'slam');
    } else if (this.mode === 'gavel') {
      this.vx = 0;
      this.vy = (this.hoverY - this.y) * 0.08;
      if (this.t === 10 || this.t === 26 || this.t === 42) this.aimShot(world, 2.0, 0, 3);
      if (this.t > 62) this.to('idle');
    } else if (this.mode === 'slam') {
      if (this.t < 22) {
        this.vx = 0;
        this.vy = -0.5;
        this.telegraph = this.t;
      } else if (this.t === 22) {
        this.telegraph = 0;
        this.vy = 5.5;
      } else if (this.onGround) {
        this.vy = 0;
        world.shake(7);
        sfx.boom();
        this.wave(world, 1);
        this.wave(world, -1);
        this.to('rise');
      }
    } else if (this.mode === 'rise') {
      this.vy = -2.2;
      if (this.y <= this.hoverY) {
        this.vy = 0;
        this.to('idle');
      }
    }
  }

  // Barão Midas: combina os golpes dos outros e fica mais agressivo com pouca vida
  ai_midas(world, p) {
    this.t++;
    const rage = this.hp < this.maxHp / 2;
    if (this.mode === 'idle') {
      this.vx = 0;
      if (this.t > (rage ? 22 : 38)) {
        const opts = ['dash', 'rain', 'fan', 'slam'].filter((m) => m !== this.last);
        this.last = opts[Math.floor(Math.random() * opts.length)];
        this.to(this.last);
      }
    } else if (this.mode === 'dash') {
      if (this.t < 22) {
        this.telegraph = this.t;
        this.vx = 0;
      } else {
        if (this.t === 22) {
          this.telegraph = 0;
          this.vx = this.face * (rage ? 4.4 : 3.8);
        }
        if (this.hitWall) {
          this.vx = 0;
          world.shake(6);
          this.to('recoil');
        }
      }
    } else if (this.mode === 'recoil') {
      this.vx = 0;
      if (this.t > (rage ? 25 : 40)) this.to('idle');
    } else if (this.mode === 'rain') {
      this.vx = 0;
      if (this.t % (rage ? 7 : 11) === 0 && this.t <= 110) {
        const bx = world.def.bossX;
        world.eprojs.push(
          new Proj({
            friendly: false, x: bx + 24 + Math.random() * 262, y: 12, w: 8, h: 8, vy: 1.4, grav: 0.04, dmg: 3,
            color: '#f2c230', light: '#fff2a0', kind: 'coin', life: 240,
          })
        );
      }
      if (this.t > 125) this.to('idle');
    } else if (this.mode === 'fan') {
      this.vx = 0;
      if (this.t === 10 || this.t === 32 || (rage && this.t === 54))
        for (const s of [-0.5, -0.25, 0, 0.25, 0.5]) this.aimShot(world, 1.9, s);
      if (this.t > 70) this.to('idle');
    } else if (this.mode === 'slam') {
      if (this.t === 1) {
        this.vy = -6.6;
        this.vx = this.face * 1.6;
      }
      if (this.onGround && this.t > 6) {
        this.vx = 0;
        world.shake(7);
        sfx.boom();
        this.wave(world, 1, rage ? 2.8 : 2.2);
        this.wave(world, -1, rage ? 2.8 : 2.2);
        this.to('idle');
      }
    }
  }
}
