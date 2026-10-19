import { W, wrapText } from './util.js';
import { input } from './input.js';
import { sfx } from './audio.js';
import { text, drawBossBody } from './render.js';

export const INTRO = [
  'NOVA ÁGORA, ANO 2187. A cidade onde, por séculos, o povo decidiu o seu próprio destino.',
  'Mas o CONSÓRCIO ÁUREO comprou juízes, jornais e fábricas. Agora quer cancelar as eleições e transformar a Assembleia em propriedade privada.',
  'Enquanto isso, os mais ricos engordam suas fortunas, e o povo paga a conta: fome, aluguéis impossíveis e salários que não chegam ao fim do mês.',
  'Só resta DEMO, androide criado pela Assembleia do Povo para defender o voto e a Constituição.',
  'Os tenentes do Consórcio sequestraram os valores que sustentam a democracia. Recupere cada um deles... e derrube o BARÃO MIDAS!',
].map((t) => ({ who: 'NARRADOR', text: t }));

export const BOSS_INTRO = {
  lobbyist: [
    { who: 'LOBISTA', text: 'Leis são mercadoria, pequeno androide. Eu as compro por atacado e vendo ao melhor lance!' },
    { who: 'DEMO', text: 'Uma lei que só serve a quem paga não é lei, é privilégio. Vou devolver a voz ao povo!' },
  ],
  disinfo: [
    { who: 'DUQUESA', text: 'Uma mentira repetida mil vezes vira verdade, querido. E eu transmito em todos os canais.' },
    { who: 'DEMO', text: 'O povo merece informação, não propaganda. Sua transmissão acaba aqui!' },
  ],
  grileiro: [
    { who: 'GRILEIRO', text: 'Esta terra é minha porque eu a cerquei. Os camponeses? Já foram expulsos.' },
    { who: 'DEMO', text: 'A terra pertence a quem nela trabalha. Eu a devolvo ao povo!' },
  ],
  judge: [
    { who: 'JUÍZA', text: 'A balança da justiça pesa mais para quem paga mais. Que sentença você esperava de mim?' },
    { who: 'DEMO', text: 'Justiça é igual para todos. O seu julgamento termina hoje!' },
  ],
  midas: [
    { who: 'MIDAS', text: 'Tudo que eu toco vira ouro, e tudo que o povo toca vira dívida. Serei dono da sua democracia!' },
    { who: 'DEMO', text: 'O poder nasce do povo e a ele pertence. Com a voz de todos, eu detenho você!' },
  ],
};

export const BOSS_OUTRO = {
  midas: [
    { who: 'MIDAS', text: 'Impossível... meu ouro... meu poder... Como um simples androide...' },
    { who: 'DEMO', text: 'Não estou sozinho. Nenhuma riqueza vale mais que a vontade do povo.' },
  ],
};

export const ENDING = [
  { who: 'NARRADOR', text: 'Com o Consórcio derrubado, as urnas foram protegidas e a Assembleia do Povo reabriu suas portas.' },
  { who: 'NARRADOR', text: 'Os juízes voltaram a responder à Constituição, a imprensa voltou a informar e a terra voltou a quem trabalha.' },
  { who: 'NARRADOR', text: 'DEMO sabe que a democracia não se conquista uma só vez. Ela é cuidada todos os dias, por todos nós.' },
];

const SPEAKERS = {
  DEMO: { color: '#7fd8ff', face: '#3a7bff' },
  MIDAS: { color: '#f2c230', boss: 'midas' },
  LOBISTA: { color: '#e8c860', boss: 'lobbyist' },
  DUQUESA: { color: '#ff6adf', boss: 'disinfo' },
  GRILEIRO: { color: '#b0d050', boss: 'grileiro' },
  JUÍZA: { color: '#f2d36a', boss: 'judge' },
  NARRADOR: { color: '#fff' },
};

function portrait(ctx, who, x, y) {
  ctx.fillStyle = '#000';
  ctx.fillRect(x - 1, y - 1, 38, 38);
  ctx.fillStyle = '#1b1b30';
  ctx.fillRect(x, y, 36, 36);
  const s = SPEAKERS[who];
  if (!s) return;
  if (s.boss) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, 36, 36);
    ctx.clip();
    drawBossBody(ctx, s.boss, x + 18, y + 12, 1, 0, 1.5);
    ctx.restore();
  } else if (s.face) {
    ctx.fillStyle = s.face;
    ctx.fillRect(x + 8, y + 4, 20, 22);
    ctx.fillStyle = '#9cc3ff';
    ctx.fillRect(x + 14, y + 1, 8, 5);
    ctx.fillStyle = '#0b1a2b';
    ctx.fillRect(x + 12, y + 10, 16, 9);
    ctx.fillStyle = '#7ff6ff';
    ctx.fillRect(x + 14, y + 12, 12, 4);
    ctx.fillStyle = '#2a5ac0';
    ctx.fillRect(x + 6, y + 26, 24, 10);
  }
}

// caixa de diálogo estilo SNES com texto letra a letra
export class DialogBox {
  constructor(lines, onDone) {
    this.lines = lines;
    this.onDone = onDone;
    this.i = 0;
    this.chars = 0;
    this.done = false;
    this.t = 0;
  }

  update() {
    if (this.done) return;
    this.t++;
    const full = this.lines[this.i].text.length;
    if (this.chars < full) {
      this.chars = Math.min(full, this.chars + 1.2);
      if (this.t % 3 === 0) sfx.text();
    }
    if (input.pressed('skip')) {
      this.finish();
      return;
    }
    if (input.confirm()) {
      if (this.chars < full) this.chars = full;
      else {
        this.i++;
        this.chars = 0;
        if (this.i >= this.lines.length) this.finish();
      }
    }
  }

  finish() {
    this.done = true;
    if (this.onDone) this.onDone();
  }

  // narration: caixa central; top: caixa no alto da tela (não cobre o chão durante a luta)
  draw(ctx, narration = false, top = false) {
    if (this.done) return;
    const line = this.lines[this.i];
    const who = line.who;
    const hasFace = who !== 'NARRADOR';
    const bx = top ? 34 : 8;
    const bw = W - bx - 8;
    const by = narration ? 84 : top ? 8 : 168;
    const bh = narration ? 76 : 64;
    ctx.fillStyle = 'rgba(0,0,20,0.9)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    const tx = hasFace ? bx + 52 : bx + 10;
    if (hasFace) portrait(ctx, who, bx + 8, by + 14);
    if (hasFace) text(ctx, who, tx, by + 5, (SPEAKERS[who] || {}).color || '#fff', 8);
    const shown = line.text.slice(0, Math.floor(this.chars));
    ctx.font = 'bold 8px "Courier New", monospace';
    const rows = wrapText(ctx, line.text, bw - (tx - bx) - 8);
    const wrapShown = [];
    let used = 0;
    for (const r of rows) {
      const take = Math.max(0, Math.min(r.length + 1, shown.length - used));
      wrapShown.push(r.slice(0, take));
      used += r.length + 1;
    }
    wrapShown.forEach((r, k) => text(ctx, r, tx, by + (hasFace ? 18 : 10) + k * 11, '#fff', 8, 'left', false));
    if (this.chars >= line.text.length && Math.floor(this.t / 20) % 2 === 0) text(ctx, '▼', bx + bw - 14, by + bh - 12, '#fff', 8);
  }
}
