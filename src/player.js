import { input } from './input.js';
import { sfx } from './audio.js';
import { fireBuster, useSpecial, WEAPONS } from './weapons.js';

const RUN = 1.5;
const DASH = 3.2;
const GRAV = 0.28;

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 12;
    this.h = 22;
    this.vx = 0;
    this.vy = 0;
    this.face = 1;
    this.hp = 16;
    this.maxHp = 16;
    this.onGround = false;
    this.wall = 0;
    this.sliding = false;
    this.dashT = 0;
    this.dashJump = false;
    this.wallKick = 0;
    this.coyote = 0;
    this.jumpBuf = 0;
    this.inv = 0;
    this.hurtT = 0;
    this.kb = 0;
    this.charge = 0;
    this.shootAnim = 0;
    this.dead = false;
    this.weapon = 0;
    this.unlocked = [0];
    this.energy = [0, 28, 28, 28, 28];
    this.shield = 0;
    this.animT = 0;
    this.moving = false;
  }

  shotDir() {
    return this.sliding ? -this.wall : this.face;
  }

  hurt(n, fromX) {
    if (this.inv > 0 || this.dead) return false;
    this.hp = Math.max(0, this.hp - n);
    this.inv = 90;
    this.hurtT = 18;
    this.vy = -2.4;
    this.kb = this.x + this.w / 2 < fromX ? -1 : 1;
    this.dashT = 0;
    this.dashJump = false;
    this.charge = 0;
    sfx.hurt();
    if (this.hp <= 0) this.dead = true;
    return true;
  }

  switchWeapon(dir) {
    const list = this.unlocked;
    const i = list.indexOf(this.weapon);
    this.weapon = list[(i + dir + list.length) % list.length];
    this.charge = 0;
    sfx.select();
  }

  update(world) {
    const L = world.level;
    this.animT++;
    if (this.inv > 0) this.inv--;
    if (this.shield > 0) this.shield--;
    if (this.shootAnim > 0) this.shootAnim--;
    if (this.dead) {
      this.vy = Math.min(this.vy + GRAV, 6);
      return;
    }

    const locked = this.hurtT > 0 || world.locked;
    if (this.hurtT > 0) this.hurtT--;
    const dir = locked ? 0 : (input.held('right') ? 1 : 0) - (input.held('left') ? 1 : 0);
    const wasGround = this.onGround;

    // contato com paredes
    this.wall = 0;
    if (!this.onGround) {
      if (L.rectSolid(this.x - 1, this.y + 4, 1, this.h - 8)) this.wall = -1;
      else if (L.rectSolid(this.x + this.w, this.y + 4, 1, this.h - 8)) this.wall = 1;
    }
    this.sliding = !this.onGround && this.wall !== 0 && dir === this.wall && this.vy > 0 && this.wallKick === 0;

    // dash
    if (!locked && input.pressed('dash') && this.onGround && this.dashT <= 0) {
      this.dashT = 28;
      sfx.dash();
    }

    // movimento horizontal
    if (this.hurtT > 0) {
      this.vx = this.kb * 1.0;
    } else if (this.wallKick > 0) {
      this.wallKick--;
    } else if (this.dashT > 0) {
      this.dashT--;
      if (dir && dir !== this.face) this.dashT = 0;
      this.vx = this.face * DASH;
      if (this.dashT === 0 && this.onGround) this.vx = 0;
    } else if (this.dashJump) {
      if (dir && dir !== this.face) {
        this.dashJump = false;
        this.vx = dir * RUN;
      } else this.vx = this.face * DASH;
    } else {
      this.vx = dir * RUN;
    }
    if (dir && this.dashT <= 0 && this.wallKick === 0 && this.hurtT === 0 && !this.sliding) this.face = dir;
    if (this.sliding) this.face = this.wall;
    this.moving = dir !== 0 && this.hurtT === 0;

    // pulo (com buffer e coyote time)
    if (this.onGround) this.coyote = 5;
    else if (this.coyote > 0) this.coyote--;
    if (!locked && input.pressed('jump')) this.jumpBuf = 6;
    else if (this.jumpBuf > 0) this.jumpBuf--;

    if (this.jumpBuf > 0 && !locked) {
      if (this.coyote > 0) {
        this.vy = -5.2;
        this.coyote = 0;
        this.jumpBuf = 0;
        if (this.dashT > 0) {
          this.dashJump = true;
          this.dashT = 0;
        }
        sfx.jump();
      } else if (this.wall !== 0) {
        this.vy = -5.0;
        this.wallKick = 8;
        this.vx = -this.wall * 2.2;
        this.face = -this.wall;
        this.jumpBuf = 0;
        this.dashJump = false;
        this.sliding = false;
        sfx.jump();
      }
    }
    if (!locked && !input.held('jump') && this.vy < -2 && this.wallKick === 0) this.vy = -2;

    // gravidade e deslizar na parede
    this.vy = Math.min(this.vy + GRAV, 6);
    if (this.sliding) this.vy = Math.min(this.vy, 0.9);

    // armas
    if (!locked) {
      if (input.pressed('prev') && this.unlocked.length > 1) this.switchWeapon(-1);
      if (input.pressed('next') && this.unlocked.length > 1) this.switchWeapon(1);
      if (this.weapon === 0) {
        if (input.pressed('shoot')) {
          fireBuster(world, this, 0);
          this.charge = 1;
        } else if (input.held('shoot') && this.charge > 0) {
          this.charge++;
          if (this.charge === 40 || this.charge === 100) sfx.charge();
        }
        if (input.released('shoot') && this.charge > 0) {
          if (this.charge >= 100) fireBuster(world, this, 2);
          else if (this.charge >= 40) fireBuster(world, this, 1);
          this.charge = 0;
        }
      } else if (input.pressed('shoot')) {
        useSpecial(world, this);
      }
    }

    // física
    if (L.moveX(this, this.vx)) {
      this.vx = 0;
      this.dashT = 0;
      this.dashJump = false;
    }
    const r = L.moveY(this, this.vy);
    this.onGround = r === 'floor';
    if (r) this.vy = 0;
    if (this.onGround) {
      this.dashJump = false;
      if (!wasGround) sfx.land();
    }

    // perigos
    if (L.hazard(this) && this.inv === 0) this.hurt(6, this.x + this.w / 2 + (this.face > 0 ? 1 : -1));
    if (this.y > L.h * 16 + 24) {
      this.hp = 0;
      this.dead = true;
      sfx.hurt();
    }
  }

  color() {
    return WEAPONS[this.weapon].color;
  }
}
