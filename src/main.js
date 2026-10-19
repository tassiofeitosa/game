import { W, H, loadSave, writeSave } from './util.js';
import { input } from './input.js';
import { initAudio } from './audio.js';
import { StageScene } from './stage.js';
import { TitleScene, LearnedScene, EndingScene } from './scenes.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const SCALE = canvas.width / W;

class Game {
  constructor() {
    this.save = loadSave();
    this.scene = null;
    this.pending = null;
    this.fade = 0;
    this.fadeDir = 0;
    this.go(new TitleScene(this), true);
  }

  persist() {
    writeSave(this.save);
  }

  go(scene, instant = false) {
    if (instant) {
      this.scene = scene;
      return;
    }
    this.pending = scene;
    this.fadeDir = 1;
  }

  startStage(id) {
    this.go(new StageScene(this, id));
  }

  learned(bossId) {
    this.go(new LearnedScene(this, bossId));
  }

  finishGame() {
    this.go(new EndingScene(this));
  }

  update() {
    if (input.cur.left || input.cur.right || input.cur.jump || input.cur.shoot || input.cur.pause) initAudio();
    if (this.fadeDir === 1) {
      this.fade += 0.08;
      if (this.fade >= 1) {
        this.fade = 1;
        this.scene = this.pending;
        this.pending = null;
        this.fadeDir = -1;
      }
      return;
    }
    if (this.fadeDir === -1) {
      this.fade -= 0.08;
      if (this.fade <= 0) {
        this.fade = 0;
        this.fadeDir = 0;
      }
    }
    this.scene.update();
  }

  draw(ctx) {
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    this.scene.draw(ctx);
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fade})`;
      ctx.fillRect(0, 0, W, H);
    }
  }
}

const game = new Game();
window.game = game;
window.__input = input;

const STEP = 1000 / 60;
let last = performance.now();
let acc = 0;
function frame(now) {
  acc += Math.min(100, now - last);
  last = now;
  while (acc >= STEP) {
    input.update();
    game.update();
    acc -= STEP;
  }
  game.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
