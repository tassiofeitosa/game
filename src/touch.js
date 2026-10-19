import { input } from './input.js';

// Controles de toque: direcional deslizante à esquerda, botões de ação à direita.
// O markup e o CSS são criados aqui para valer em qualquer página que carregue o jogo.
const CSS = `
#touch { display: none; user-select: none; -webkit-user-select: none; touch-action: none; -webkit-touch-callout: none;
  width: 100%; box-sizing: border-box; padding: 6px 14px calc(10px + env(safe-area-inset-bottom, 0px));
  grid-template-columns: 1fr 1fr; grid-template-areas: "mid mid" "pad act"; gap: 10px; font-family: "Courier New", monospace; }
body.touch-on #touch { display: grid; }
body.touch-on p { display: none; }
#touch .mid { grid-area: mid; display: flex; justify-content: center; gap: 10px; }
#touch .pad { grid-area: pad; position: relative; width: 150px; height: 150px; justify-self: start; border-radius: 50%;
  background: rgba(255,255,255,.08); border: 2px solid rgba(255,255,255,.25); }
#touch .pad b { position: absolute; color: rgba(255,255,255,.55); font-size: 20px; line-height: 1; pointer-events: none; }
#touch .pad .l { left: 12px; top: 64px; } #touch .pad .r { right: 12px; top: 64px; }
#touch .pad .u { left: 66px; top: 12px; } #touch .pad .d { left: 66px; bottom: 12px; }
#touch .pad .knob { position: absolute; left: 55px; top: 55px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,.3); pointer-events: none; }
#touch .act { grid-area: act; position: relative; width: 170px; height: 150px; justify-self: end; }
#touch button { font: bold 13px "Courier New", monospace; color: #fff; background: rgba(255,255,255,.14); border: 2px solid rgba(255,255,255,.4);
  border-radius: 50%; padding: 0; touch-action: none; -webkit-tap-highlight-color: transparent; }
#touch button.on { background: rgba(242,194,48,.55); border-color: #f2c230; }
#touch .act button { position: absolute; width: 68px; height: 68px; }
#touch .act [data-a="jump"] { right: 0; bottom: 0; width: 76px; height: 76px; }
#touch .act [data-a="shoot"] { left: 0; bottom: 18px; }
#touch .act [data-a="dash"] { right: 22px; top: 0; width: 60px; height: 60px; }
#touch .mid button { border-radius: 14px; padding: 8px 12px; min-width: 64px; }
@media (orientation: landscape) and (max-height: 520px) {
  body.touch-on { padding: 0 !important; }
  body.touch-on canvas { width: min(100vw, calc(100vh * 4 / 3)) !important; }
  #touch { position: fixed; inset: 0; pointer-events: none; padding: 0 14px calc(8px + env(safe-area-inset-bottom, 0px));
    grid-template-rows: auto 1fr; grid-template-areas: "mid mid" "pad act"; align-items: end; }
  #touch > * { pointer-events: auto; }
  #touch .mid { align-self: start; padding-top: 6px; opacity: .8; }
  #touch .pad { width: 130px; height: 130px; } #touch .pad .l { top: 54px; } #touch .pad .r { top: 54px; }
  #touch .pad .u, #touch .pad .d { left: 56px; } #touch .pad .knob { left: 45px; top: 45px; }
  #touch .act { width: 150px; height: 130px; }
  #touch .act button { width: 58px; height: 58px; } #touch .act [data-a="jump"] { width: 66px; height: 66px; }
  #touch .act [data-a="dash"] { width: 52px; height: 52px; }
}`;

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export function initTouch() {
  const style = el('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const root = el('div');
  root.id = 'touch';
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="mid">
      <button data-a="prev">◀ ARMA</button><button data-a="pause">PAUSA</button><button data-a="next">ARMA ▶</button>
    </div>
    <div class="pad"><b class="l">◀</b><b class="r">▶</b><b class="u">▲</b><b class="d">▼</b><i class="knob"></i></div>
    <div class="act">
      <button data-a="dash">DASH</button><button data-a="shoot">TIRO</button><button data-a="jump">PULO</button>
    </div>`;
  document.body.appendChild(root);
  root.addEventListener('contextmenu', (e) => e.preventDefault());

  const show = () => {
    document.body.classList.add('touch-on');
    input.touchMode = true;
  };
  if (matchMedia('(pointer: coarse)').matches) show();
  else addEventListener('touchstart', show, { once: true, passive: true });

  // botões: vários dedos ao mesmo tempo, cada ponteiro guarda o botão que apertou
  const holders = {};
  const set = (a, id, on) => {
    const s = (holders[a] ||= new Set());
    if (on) s.add(id);
    else s.delete(id);
    input.touch[a] = s.size > 0;
    const b = root.querySelector(`button[data-a="${a}"]`);
    if (b) b.classList.toggle('on', s.size > 0);
  };
  root.querySelectorAll('button[data-a]').forEach((b) => {
    const a = b.dataset.a;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      set(a, e.pointerId, true);
    });
    const up = (e) => set(a, e.pointerId, false);
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('lostpointercapture', up);
  });

  // direcional analógico: o dedo pode deslizar entre as direções
  const pad = root.querySelector('.pad');
  const knob = pad.querySelector('.knob');
  const dirs = ['left', 'right', 'up', 'down'];
  const setDirs = (state) => dirs.forEach((d) => (input.touch[d] = !!state[d]));
  const track = (e) => {
    const r = pad.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    setDirs({ left: dx < -0.25, right: dx > 0.25, up: dy < -0.45, down: dy > 0.45 });
    const m = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, m);
    knob.style.transform = `translate(${(dx / m) * k * 38}px, ${(dy / m) * k * 38}px)`;
  };
  const release = () => {
    setDirs({});
    knob.style.transform = '';
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pad.setPointerCapture(e.pointerId);
    track(e);
  });
  pad.addEventListener('pointermove', (e) => {
    if (pad.hasPointerCapture(e.pointerId)) track(e);
  });
  pad.addEventListener('pointerup', release);
  pad.addEventListener('pointercancel', release);
  pad.addEventListener('lostpointercapture', release);

  // evita zoom/rolagem por gestos sobre o jogo
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
}
