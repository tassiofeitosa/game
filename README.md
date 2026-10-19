# DEMO — O Herói da Democracia

Jogo de ação e plataforma 2D no estilo **Mega Man X**, feito em JavaScript puro + `<canvas>`, sem dependências nem build. Todos os gráficos são desenhados por código e os sons são gerados com a Web Audio API.

## Como jogar

Os módulos ES exigem um servidor HTTP (abrir o arquivo direto não funciona):

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

Também funciona em qualquer hospedagem estática (ex.: GitHub Pages).

### Controles

| Ação | Teclado | Gamepad |
|---|---|---|
| Mover | Setas | direcional / analógico |
| Pular (segure para pular mais alto) | `Z` / `J` / Espaço | A |
| Atirar (segure para carregar) | `X` / `K` | X |
| Dash (no chão; pule durante o dash para um dash-jump) | `C` / `L` / Shift | B / RT |
| Trocar habilidade | `A` / `S` (ou `Q` / `E`) | LB / RB |
| Pausa | `Enter` / `P` | Start |
| Pular diálogo | `Esc` | |

**Wall jump:** pule na parede para escalar (pule, volte para a parede e pule de novo). **Wall slide:** segure a direção da parede enquanto cai.

## A história

Em **Nova Ágora**, o **Consórcio Áureo** comprou juízes, jornais e fábricas e quer cancelar as eleições, favorecendo os mais ricos às custas da pobreza do povo. **DEMO**, androide criado pela Assembleia do Povo, precisa recuperar os valores democráticos sequestrados pelos tenentes do Consórcio e derrubar o **Barão Midas**. Todo o universo, personagens e organizações são fictícios.

## Habilidades (como as armas roubadas dos chefes do Mega Man)

Escolha a ordem das quatro missões; cada chefe vencido concede uma habilidade, e cada chefe é fraco contra a de outro (dano 3x).

| Missão / Chefe | Habilidade obtida | Efeito | Chefe fraco contra |
|---|---|---|---|
| Torre de Vidro — Lorde Lobista | **Consciência de Classe** | tiro que se divide em 3 e cresce ao atravessar adversários | Voz Coletiva |
| Estúdio da Mentira — Duquesa da Desinformação | **Detecção de Privilégios** | revela plataformas ocultas e clones falsos; tiro teleguiado no alvo mais "protegido" | Escudo dos Direitos |
| Fazenda-Fábrica — Conde Grileiro | **Escudo dos Direitos Fundamentais** | escudo orbital que bloqueia tiros e fere quem encosta | Detecção de Privilégios |
| Tribunal Dourado — Juíza Comprada | **Voz Coletiva** | onda que atinge a tela toda e paralisa os adversários | Consciência de Classe |
| Fortaleza do Consórcio — Barão Midas | (chefe final, liberado após as 4 missões) | fraco contra todas, principalmente a Voz Coletiva | |

Itens: **Cédula de Voto** (recupera vida) e energia de habilidade, soltos por inimigos ou espalhados pelas fases. O progresso (chefes vencidos) é salvo no `localStorage`.

## Estrutura

- `index.html` — canvas e página
- `src/main.js` — laço de jogo com passo fixo de 60 FPS e transições
- `src/stage.js` — cena de jogo (colisões, câmera, sala do chefe)
- `src/player.js` — corrida, pulo variável, dash, wall slide/jump, buster carregável
- `src/weapons.js` — as 5 armas/habilidades
- `src/enemies.js`, `src/bosses.js` — inimigos comuns e chefes
- `src/stages.js` — temas e gerador das 5 fases (saltos, degraus, espinhos, paredes, vãos com plataformas ocultas)
- `src/level.js` — tilemap e colisão
- `src/render.js` — sprites procedurais, cenário com parallax, HUD
- `src/story.js`, `src/scenes.js` — diálogos, título, seleção de fase, final
- `src/input.js`, `src/audio.js` — teclado/gamepad, efeitos e música
