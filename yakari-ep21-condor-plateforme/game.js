"use strict";
/*
 * Yakari et le condor — version plateforme (façon Aladdin sur Mega Drive).
 * Moteur autonome : ce jeu n'utilise PAS yakari-engine/ (pensé pour la vue
 * de dessus). Tout est ici : physique, ennemis, arc et flèches, 6 niveaux.
 *
 * Règles voulues :
 *  - On peut perdre (3 cœurs) : à zéro cœur, on recommence au niveau 1.
 *  - Le jeu reste très facile : cœurs rechargés à chaque niveau, ennemis
 *    lents, sauts courts, réapparition au dernier endroit sûr en cas de chute.
 *  - L'arc arrive au niveau 3. Les flèches sont limitées : on ramasse des
 *    carquois (+3 flèches) dans les niveaux. Sans flèche, on ne tire plus.
 */

const TILE = 16, ROWS = 20, VIEW_W = 480, VIEW_H = 320;
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

/* ============================== Audio ============================== */

let audioCtx = null, soundOn = true;
function ac() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function tone(freq, dur, type = "sine", vol = 0.2, when = 0) {
  if (!soundOn) return;
  try {
    const a = ac(), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, a.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + when + dur);
    o.connect(g); g.connect(a.destination);
    o.start(a.currentTime + when); o.stop(a.currentTime + when + dur + 0.05);
  } catch (e) { /* audio indisponible : on joue sans son */ }
}
const sfx = {
  jump()   { tone(300, 0.1, "square", 0.1); tone(480, 0.1, "square", 0.07, 0.05); },
  pick()   { tone(660, 0.08, "triangle", 0.2); tone(880, 0.12, "triangle", 0.2, 0.07); },
  quiver() { tone(440, 0.09, "triangle", 0.2); tone(590, 0.09, "triangle", 0.2, 0.08); tone(740, 0.12, "triangle", 0.2, 0.16); },
  shoot()  { tone(900, 0.06, "sawtooth", 0.07); tone(600, 0.08, "sawtooth", 0.05, 0.03); },
  pouf()   { tone(220, 0.12, "triangle", 0.25); tone(130, 0.18, "triangle", 0.2, 0.05); },
  aie()    { tone(220, 0.15, "square", 0.15); tone(160, 0.25, "square", 0.12, 0.1); },
  empty()  { tone(180, 0.1, "square", 0.1); },
  cri()    { tone(520, 0.1, "sawtooth", 0.1); tone(650, 0.14, "sawtooth", 0.08, 0.09); },
  crack()  { tone(140, 0.12, "square", 0.25); tone(90, 0.2, "square", 0.2, 0.06); },
  splash() { tone(500, 0.3, "sine", 0.15); tone(700, 0.3, "sine", 0.1, 0.1); },
  tada()   { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, "triangle", 0.2, i * 0.13)); },
  over()   { [392, 330, 262].forEach((f, i) => tone(f, 0.3, "triangle", 0.18, i * 0.25)); },
};

/* ============================ Narration ============================ */

let frVoice = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return;
  const vs = speechSynthesis.getVoices();
  frVoice = vs.find(v => v.lang && v.lang.startsWith("fr")) || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

let lastNarration = "";
function say(text) {
  if (!soundOn || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR"; if (frVoice) u.voice = frVoice;
  u.rate = 0.95; u.pitch = 1.1;
  speechSynthesis.speak(u);
}
function narrate(text) {
  lastNarration = text;
  document.getElementById("narrationText").textContent = text;
  say(text);
}
document.getElementById("replayVoice").addEventListener("click", () => { if (lastNarration) say(lastNarration); });
document.getElementById("soundToggle").addEventListener("click", function () {
  soundOn = !soundOn;
  this.textContent = soundOn ? "🔊" : "🔇";
  if (!soundOn && "speechSynthesis" in window) speechSynthesis.cancel();
});

/* ============================= Entrées ============================= */

const keys = { left: false, right: false, jump: false, shoot: false };
let jumpBuffer = 0, shootLatch = false;

const KEYMAP = {
  ArrowLeft: "left", q: "left", a: "left",
  ArrowRight: "right", d: "right",
  ArrowUp: "jump", " ": "jump", z: "jump", w: "jump",
  x: "shoot", c: "shoot", k: "shoot",
};
window.addEventListener("keydown", e => {
  const k = KEYMAP[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (!k) return;
  e.preventDefault();
  if (k === "jump" && !keys.jump) jumpBuffer = 8;
  keys[k] = true;
});
window.addEventListener("keyup", e => {
  const k = KEYMAP[e.key.length === 1 ? e.key.toLowerCase() : e.key];
  if (!k) return;
  keys[k] = false;
});

function bindBtn(id, key) {
  const el = document.getElementById(id);
  const on = e => { e.preventDefault(); if (key === "jump" && !keys.jump) jumpBuffer = 8; keys[key] = true; };
  const off = e => { e.preventDefault(); keys[key] = false; };
  el.addEventListener("pointerdown", on);
  el.addEventListener("pointerup", off);
  el.addEventListener("pointercancel", off);
  el.addEventListener("pointerleave", off);
  el.addEventListener("contextmenu", e => e.preventDefault());
}
bindBtn("btnL", "left"); bindBtn("btnR", "right");
bindBtn("btnJ", "jump"); bindBtn("btnS", "shoot");

/* ======================= Construction de niveau ===================== */
/*
 * Une grille ROWS × largeur, une lettre = une case de 16 px :
 *   #  sol/roche (solide)          =  plateforme (traversable par dessous)
 *   R  rocher à casser (solide)    ~  eau (décor animé)
 *   F  plume à ramasser            A  carquois (+3 flèches)
 *   E  totem de fin de niveau      T  arbre   %  sapin   *  fleur  (décor)
 *   M  marmotte  B  castor  Q  Grand Aigle  G  chèvre  P  poney  C  condor
 *   s  boule de neige (ennemi)  c  corbeau (ennemi)  g  guêpe (ennemi)
 */

function L(w) {
  const g = Array.from({ length: ROWS }, () => Array(w).fill(" "));
  return {
    g, w,
    ground(x0, x1, top = 17) { for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) g[y][x] = "#"; },
    plat(x0, x1, y) { for (let x = x0; x <= x1; x++) g[y][x] = "="; },
    put(x, y, c) { g[y][x] = c; },
    row(y, c, ...xs) { xs.forEach(x => { g[y][x] = c; }); },
  };
}

const LEVELS = [
  { /* ------------------- Niveau 1 ------------------- */
    name: "Le pré de la marmotte", theme: "meadow", spawn: [2, 16],
    intro: "C'est le printemps, mais la marmotte dort encore ! Cours vers la droite, saute par-dessus les trous, et va la réveiller. Saute avec la flèche du haut !",
    talks: {
      M: "Hmm... La marmotte se réveille : elle avait oublié le printemps ! Elle dit que la rivière est toute petite... Va voir le castor, au prochain niveau ! Continue jusqu'au totem !",
    },
    build() {
      const l = L(96);
      l.ground(0, 20); l.ground(23, 42); l.ground(45, 62, 16); l.ground(66, 95);
      l.plat(28, 31, 14); l.plat(50, 53, 13); l.plat(70, 72, 14);
      l.row(16, "F", 8, 12, 16); l.row(13, "F", 28, 29, 30, 31);
      l.row(15, "F", 21, 22, 43, 44); l.row(12, "F", 50, 53); l.row(14, "F", 63, 64, 65);
      l.row(13, "F", 70, 72); l.row(16, "F", 86, 88);
      l.row(16, "T", 5, 35, 58); l.put(88, 16, "T");
      l.row(16, "*", 10, 18, 26, 47, 68, 75, 83);
      l.put(15, 16, "*"); l.put(55, 15, "*");
      l.put(80, 16, "M"); l.put(92, 16, "E");
      return l;
    },
  },
  { /* ------------------- Niveau 2 ------------------- */
    name: "Le barrage du castor", theme: "forest", spawn: [2, 16],
    intro: "Le castor a fait un barrage pour garder la dernière eau. Traverse la forêt et va le voir ! Ensuite, Grand Aigle te dira quoi faire.",
    talks: {
      B: "Le castor dit : il n'y a presque plus d'eau dans la rivière ! Sans eau, les castors ne peuvent pas vivre... Va écouter Grand Aigle, plus loin sur son rocher !",
      Q: "Grand Aigle dit : celui qui a la tête dans les nuages connaît la source ! L'eau vient de la montagne. En route, Yakari ! Le totem est juste là.",
    },
    build() {
      const l = L(104);
      l.ground(0, 17); l.ground(20, 34); l.ground(37, 58, 16);
      l.ground(59, 60, 13); /* le barrage */
      l.ground(61, 80); l.ground(84, 103);
      l.plat(24, 27, 14); l.plat(46, 49, 13); l.plat(94, 96, 14);
      l.row(16, "F", 6, 10, 14); l.row(15, "F", 18, 19, 35, 36);
      l.row(13, "F", 24, 27); l.row(12, "F", 46, 49);
      l.row(15, "F", 64, 66, 68); l.row(16, "F", 81, 82, 83, 90);
      l.put(59, 12, "B");
      l.row(15, "~", 61, 62, 63, 64, 65, 66);
      l.row(16, "T", 4, 30, 55, 76); l.row(16, "%", 12, 42, 70, 88);
      l.row(16, "*", 8, 22, 51, 73, 91);
      l.put(95, 13, "Q"); l.put(101, 16, "E");
      return l;
    },
  },
  { /* ------------------- Niveau 3 ------------------- */
    name: "La montagne enneigée", theme: "snow", spawn: [2, 16],
    givesBow: true,
    intro: "Yakari prend son arc et ses flèches ! Des boules de neige grognonnes dévalent la montagne : tire dessus avec le bouton arc, ou la touche X. Ramasse des carquois pour avoir plus de flèches, et monte tout en haut !",
    talks: {
      C: "C'est le condor, l'oiseau qui a la tête dans les nuages ! Il dit : je connais la source, monte sur mon dos, on s'envole ! Touche le totem !",
    },
    build() {
      const l = L(104);
      l.ground(0, 14); l.ground(15, 28, 15); l.ground(29, 42, 13);
      l.ground(45, 60, 13); l.ground(61, 74, 11); l.ground(77, 90, 11); l.ground(91, 103, 9);
      l.plat(43, 44, 12);
      l.put(5, 16, "A"); l.put(30, 12, "A"); l.put(48, 12, "A"); l.put(79, 10, "A");
      l.row(16, "F", 8, 11); l.row(14, "F", 18, 22, 26); l.row(12, "F", 32, 36, 40);
      l.row(12, "F", 52, 56); l.row(10, "F", 64, 68, 72, 82, 86); l.row(8, "F", 93, 95);
      l.put(22, 14, "s"); l.put(52, 12, "s"); l.put(84, 10, "s");
      l.row(16, "%", 3, 10); l.row(14, "%", 17, 25); l.row(12, "%", 31, 41);
      l.put(98, 8, "C"); l.put(102, 8, "E");
      return l;
    },
  },
  { /* ------------------- Niveau 4 ------------------- */
    name: "Dans les nuages", theme: "sky", spawn: [2, 15],
    intro: "Yakari saute de nuage en nuage, tout là-haut ! Dis bonjour aux chèvres des montagnes sur les pics, et chasse les corbeaux grognons avec ton arc. Attention à ne pas tomber !",
    talks: {
      G: "Bêêê ! La chèvre des montagnes te salue, Yakari !",
      C: "Le condor te dépose près du ruisseau : l'eau doit couler par là ! Touche le totem !",
    },
    build() {
      const l = L(112);
      l.plat(0, 7, 16); l.plat(10, 16, 15); l.plat(19, 25, 16);
      l.ground(28, 34, 14); /* pic rocheux 1 */
      l.plat(37, 43, 13); l.plat(46, 52, 15); l.plat(55, 61, 13);
      l.ground(64, 70, 12); /* pic rocheux 2 */
      l.plat(73, 79, 14); l.plat(82, 88, 16); l.plat(90, 97, 15);
      l.plat(100, 111, 15);
      l.put(31, 13, "G"); l.put(67, 11, "G");
      l.put(13, 14, "A"); l.put(58, 12, "A"); l.put(85, 15, "A");
      l.row(15, "F", 3, 5); l.row(14, "F", 11, 15); l.row(15, "F", 20, 24);
      l.row(12, "F", 38, 42); l.row(14, "F", 47, 51); l.row(12, "F", 56, 60);
      l.row(13, "F", 74, 78); l.row(15, "F", 83, 87); l.row(13, "F", 92, 96);
      l.row(14, "F", 102, 104);
      l.put(21, 12, "c"); l.put(49, 10, "c"); l.put(76, 10, "c"); l.put(94, 10, "c");
      l.put(106, 14, "C"); l.put(109, 14, "E");
      return l;
    },
  },
  { /* ------------------- Niveau 5 ------------------- */
    name: "Le ruisseau à sec", theme: "canyon", spawn: [2, 16],
    boulder: true,
    intro: "Voilà le ruisseau... mais il est tout sec ! Un gros rocher tombé de la montagne bloque l'eau, tout au bout. Attention aux guêpes ! Tire trois flèches sur le rocher pour libérer l'eau !",
    talks: {},
    build() {
      const l = L(104);
      l.ground(0, 24); l.ground(27, 48); l.ground(52, 71);
      l.ground(72, 78, 15); l.ground(79, 103);
      l.plat(32, 35, 14); l.plat(58, 61, 14);
      for (let y = 12; y <= 16; y++) { l.put(90, y, "R"); l.put(91, y, "R"); }
      l.put(8, 16, "A"); l.put(44, 16, "A"); l.put(68, 16, "A"); l.put(86, 16, "A");
      l.row(16, "F", 5, 12, 18); l.row(15, "F", 25, 26, 49, 50, 51);
      l.row(13, "F", 32, 35, 58, 61); l.row(14, "F", 74, 76); l.row(16, "F", 82, 84);
      l.put(16, 15, "g"); l.put(38, 14, "g"); l.put(62, 15, "g"); l.put(75, 13, "g");
      l.row(16, "T", 21, 55); l.row(16, "*", 30, 65, 81);
      l.put(99, 16, "E");
      return l;
    },
  },
  { /* ------------------- Niveau 6 ------------------- */
    name: "La fête de la rivière", theme: "party", spawn: [2, 16],
    intro: "Hourra, l'eau est revenue ! Tous les amis font la fête au bord de la rivière. Va les saluer un par un, ramasse les plumes, et rejoins le grand totem !",
    talks: {
      P: "Petit Tonnerre hennit de joie : l'eau est revenue !",
      B: "Le castor tape sa queue dans l'eau : merci Yakari !",
      M: "La marmotte danse au milieu des fleurs !",
      Q: "Grand Aigle est très fier de toi, Yakari !",
    },
    build() {
      const l = L(88);
      l.ground(0, 87);
      l.plat(22, 24, 14); l.plat(46, 48, 14);
      l.put(14, 16, "P"); l.put(28, 16, "B"); l.put(42, 16, "M"); l.put(56, 16, "Q");
      l.put(70, 14, "C");
      l.row(16, "F", 5, 8, 11, 18, 33, 36, 39, 51, 60, 63, 66, 74, 78);
      l.row(13, "F", 22, 23, 24, 46, 47, 48);
      l.row(16, "T", 3, 31, 59, 80); l.row(16, "*", 7, 16, 26, 38, 50, 62, 72, 82);
      l.put(84, 16, "E");
      return l;
    },
  },
];

/* =========================== État du jeu =========================== */

const GRAV = 0.42, JUMP_V = -7.4, SPEED = 1.9, MAXFALL = 7;

let state = "title";       // title | play | fade | gameover | victory
let levelIndex = 0;
let grid = null, levelW = 0, level = null;
let hearts = 3, arrowCount = 0, hasBow = false, feathersGot = 0;
let boulderHp = 3, waterFlows = false, emptyWarned = false, emptySince = 0;
let entities = [], enemies = [], arrows = [], particles = [];
let cam = 0, tick = 0;
let fade = { alpha: 0, dir: 0, cb: null };

const player = {
  x: 0, y: 0, vx: 0, vy: 0, w: 12, h: 22,
  facing: 1, onGround: false, coyote: 0, invuln: 0,
  anim: 0, shootAnim: 0,
  safeX: 0, safeY: 0,
};

function tileAt(tx, ty) {
  if (tx < 0 || tx >= levelW) return "#";
  if (ty < 0 || ty >= ROWS) return " ";
  return grid[ty][tx];
}
function isSolid(chr) { return chr === "#" || chr === "R"; }

function loadLevel(i) {
  levelIndex = i;
  level = LEVELS[i];
  const l = level.build();
  grid = l.g; levelW = l.w;
  entities = []; enemies = []; arrows = []; particles = [];
  boulderHp = 3; waterFlows = false; emptyWarned = false; emptySince = 0;
  hearts = 3;
  if (level.givesBow) { hasBow = true; if (arrowCount < 3) arrowCount = 3; }

  for (let y = 0; y < ROWS; y++) for (let x = 0; x < levelW; x++) {
    const c = grid[y][x];
    if ("FAEMBQGPC".includes(c)) {
      entities.push({ chr: c, x: x * TILE + 8, y: y * TILE + 8, talked: false, taken: false, bob: (x * 7) % 20 });
      grid[y][x] = " ";
    } else if (c === "s" || c === "c" || c === "g") {
      const e = { chr: c, x: x * TILE + 8, y: y * TILE + 8, x0: x * TILE + 8, y0: y * TILE + 8, dir: 1, dead: false, t: (x * 13) % 60 };
      enemies.push(e);
      grid[y][x] = " ";
    }
  }
  player.x = level.spawn[0] * TILE + 2;
  player.y = level.spawn[1] * TILE + TILE - player.h;
  player.vx = 0; player.vy = 0; player.facing = 1; player.invuln = 60;
  player.safeX = player.x; player.safeY = player.y;
  cam = 0;
  narrate("Niveau " + (i + 1) + ". " + level.intro);
}

/* =========================== Physique ============================= */

function rectSolid(x, y, w, h) {
  const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 1) / TILE);
  const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 1) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++)
    if (isSolid(tileAt(tx, ty))) return true;
  return false;
}

function movePlayer() {
  const p = player;
  const accel = p.onGround ? 0.5 : 0.35;
  let target = 0;
  if (keys.left) { target = -SPEED; p.facing = -1; }
  if (keys.right) { target = SPEED; p.facing = 1; }
  p.vx += Math.max(-accel, Math.min(accel, target - p.vx));
  if (!keys.left && !keys.right) p.vx *= p.onGround ? 0.6 : 0.9;
  if (Math.abs(p.vx) < 0.05) p.vx = 0;

  if (jumpBuffer > 0) jumpBuffer--;
  if (jumpBuffer > 0 && (p.onGround || p.coyote > 0)) {
    p.vy = JUMP_V; p.onGround = false; p.coyote = 0; jumpBuffer = 0;
    sfx.jump();
  }
  if (!keys.jump && p.vy < -3) p.vy = -3; // saut plus court si on relâche

  p.vy = Math.min(p.vy + GRAV, MAXFALL);

  // Axe X (les plateformes "=" ne bloquent jamais sur les côtés)
  let nx = p.x + p.vx;
  if (nx < 0) nx = 0;
  if (nx + p.w > levelW * TILE) nx = levelW * TILE - p.w;
  if (rectSolid(nx, p.y, p.w, p.h)) {
    const step = p.vx > 0 ? 1 : -1;
    while (!rectSolid(p.x + step, p.y, p.w, p.h)) p.x += step;
    p.vx = 0;
  } else p.x = nx;

  // Axe Y
  const wasBottom = p.y + p.h;
  let ny = p.y + p.vy;
  p.onGround = false;
  if (p.vy >= 0) {
    // descente : sol solide OU plateforme traversable dont on vient d'au-dessus
    const feetY = ny + p.h;
    const ty = Math.floor(feetY / TILE);
    const x0 = Math.floor(p.x / TILE), x1 = Math.floor((p.x + p.w - 1) / TILE);
    let landed = false;
    for (let tx = x0; tx <= x1; tx++) {
      const c = tileAt(tx, ty);
      const top = ty * TILE;
      if (isSolid(c) || (c === "=" && wasBottom <= top + 0.01)) {
        if (feetY >= top) { ny = top - p.h; landed = true; }
      }
    }
    if (landed) {
      p.vy = 0; p.onGround = true; p.coyote = 8;
      // point sûr : bien posé sur du solide, à au moins une case des bords
      const cx = Math.floor((p.x + p.w / 2) / TILE);
      const below = Math.floor((ny + p.h) / TILE);
      const ok = t => isSolid(t) || t === "=";
      if (ok(tileAt(cx - 1, below)) && ok(tileAt(cx, below)) && ok(tileAt(cx + 1, below))) {
        p.safeX = cx * TILE + 8 - p.w / 2; p.safeY = ny;
      }
    } else if (p.vy > 0 && rectSolid(p.x, ny, p.w, p.h)) {
      while (!rectSolid(p.x, p.y + 1, p.w, p.h)) p.y += 1;
      ny = p.y; p.vy = 0; p.onGround = true; p.coyote = 8;
    }
  } else if (rectSolid(p.x, ny, p.w, p.h)) {
    // montée : on se cogne la tête (uniquement sur du solide)
    while (!rectSolid(p.x, p.y - 1, p.w, p.h)) p.y -= 1;
    ny = p.y; p.vy = 0;
  }
  p.y = ny;
  if (!p.onGround && p.coyote > 0) p.coyote--;
  if (p.invuln > 0) p.invuln--;
  if (p.onGround && Math.abs(p.vx) > 0.3) p.anim += Math.abs(p.vx) * 0.12;
  if (p.shootAnim > 0) p.shootAnim--;

  // Tombé dans un trou ?
  if (p.y > ROWS * TILE + 20) {
    hurt(true);
  }
}

function hurt(fell) {
  if (player.invuln > 0 && !fell) return;
  hearts--;
  sfx.aie();
  burst(player.x + 6, player.y + 8, "#e25555", 10);
  if (hearts <= 0) { gameOver(); return; }
  player.invuln = 140;
  if (fell) {
    player.x = player.safeX; player.y = player.safeY - 2;
    player.vx = 0; player.vy = 0;
    narrate("Hop ! Attention aux trous ! Il reste " + hearts + (hearts > 1 ? " cœurs." : " cœur."));
  } else {
    player.vy = -4; player.vx = -player.facing * 2.5;
    narrate("Aïe ! Il reste " + hearts + (hearts > 1 ? " cœurs." : " cœur.") + (hasBow ? " Tire une flèche pour te défendre !" : ""));
  }
}

function gameOver() {
  state = "gameover";
  sfx.over();
  narrate("Oh non, Yakari est trop fatigué... Ce n'est pas grave : on recommence l'aventure depuis le début !");
  showOverlay("Oh non !", "Yakari est tombé... Mais un Sioux ne renonce jamais : on recommence l'aventure du début !", "↻ Recommencer");
}

/* =========================== Ennemis ============================== */

function updateEnemies() {
  for (const e of enemies) {
    if (e.dead) continue;
    e.t++;
    if (e.chr === "s") { // boule de neige : roule sur son plateau
      e.x += e.dir * 0.4;
      const front = Math.floor((e.x + e.dir * 9) / TILE);
      const feet = Math.floor((e.y + 9) / TILE);
      if (isSolid(tileAt(front, Math.floor(e.y / TILE))) || !isSolid(tileAt(front, feet)) || Math.abs(e.x - e.x0) > 44) e.dir *= -1;
    } else if (e.chr === "c") { // corbeau : vole en vague
      e.x += e.dir * 0.55;
      e.y = e.y0 + Math.sin(e.t * 0.05) * 10;
      if (Math.abs(e.x - e.x0) > 52) e.dir *= -1;
    } else if (e.chr === "g") { // guêpe : monte et descend
      e.y = e.y0 + Math.sin(e.t * 0.06) * 14;
      e.x = e.x0 + Math.sin(e.t * 0.03) * 6;
    }
    // Collision avec Yakari (marge indulgente). Sauter dessus l'écrase
    // sans se faire mal ; sinon l'ennemi disparaît quand même en « pouf »,
    // pour ne jamais toucher deux fois de suite.
    const box = enemyBox(e);
    if (player.x + 3 < box.x + box.w - 3 && player.x + player.w - 3 > box.x + 3 &&
        player.y + 4 < box.y + box.h - 3 && player.y + player.h - 3 > box.y + 3) {
      const stomp = player.vy > 1 && player.y + player.h < box.y + box.h * 0.7;
      if (stomp) {
        e.dead = true;
        player.vy = -4.5;
        sfx.pouf();
        burst(e.x, e.y, e.chr === "s" ? "#ffffff" : e.chr === "c" ? "#555a66" : "#f2c744", 12);
      } else if (player.invuln <= 0) {
        e.dead = true;
        burst(e.x, e.y, e.chr === "s" ? "#ffffff" : e.chr === "c" ? "#555a66" : "#f2c744", 10);
        hurt(false);
      }
    }
  }
}
function enemyBox(e) {
  if (e.chr === "s") return { x: e.x - 8, y: e.y - 8, w: 16, h: 16 };
  if (e.chr === "c") return { x: e.x - 9, y: e.y - 6, w: 18, h: 12 };
  return { x: e.x - 6, y: e.y - 6, w: 12, h: 12 };
}

/* ========================== Arc et flèches ========================= */

function tryShoot() {
  if (!hasBow || state !== "play") return;
  if (arrowCount <= 0) {
    sfx.empty();
    if (!emptyWarned) { emptyWarned = true; narrate("Plus de flèches ! Cherche un carquois pour en ramasser."); }
    return;
  }
  arrowCount--;
  emptyWarned = false;
  player.shootAnim = 14;
  sfx.shoot();
  arrows.push({ x: player.x + player.w / 2 + player.facing * 8, y: player.y + 9, vx: player.facing * 5, life: 120 });
}

function updateArrows() {
  for (const a of arrows) {
    if (a.dead) continue;
    a.x += a.vx; a.life--;
    if (a.life <= 0 || a.x < cam - 40 || a.x > cam + VIEW_W + 40) { a.dead = true; continue; }
    const tx = Math.floor(a.x / TILE), ty = Math.floor(a.y / TILE);
    const c = tileAt(tx, ty);
    if (c === "R") { // le gros rocher !
      a.dead = true;
      boulderHp--;
      sfx.crack();
      burst(a.x, a.y, "#9a8f85", 8);
      if (boulderHp === 2) narrate("Crac ! Le rocher se fissure ! Encore deux flèches !");
      else if (boulderHp === 1) narrate("Crac crac ! Presque ! Encore une flèche !");
      else if (boulderHp <= 0) breakBoulder();
      continue;
    }
    if (isSolid(c)) { a.dead = true; burst(a.x, a.y, "#c9b28a", 4); continue; }
    for (const e of enemies) {
      if (e.dead) continue;
      const b = enemyBox(e);
      if (a.x > b.x - 2 && a.x < b.x + b.w + 2 && a.y > b.y - 2 && a.y < b.y + b.h + 2) {
        e.dead = true; a.dead = true;
        sfx.pouf();
        burst(e.x, e.y, e.chr === "s" ? "#ffffff" : e.chr === "c" ? "#555a66" : "#f2c744", 12);
        break;
      }
    }
  }
  arrows = arrows.filter(a => !a.dead);
}

function breakBoulder() {
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < levelW; x++)
    if (grid[y][x] === "R") { grid[y][x] = " "; burst(x * TILE + 8, y * TILE + 8, "#9a8f85", 6); }
  waterFlows = true;
  sfx.splash(); sfx.tada();
  narrate("BOUM ! Le rocher roule sur le côté... L'eau coule à nouveau vers la vallée ! Hourra ! File jusqu'au totem !");
}

/* ==================== Objets, amis et fin de niveau ================= */

function updateEntities() {
  const p = player;
  for (const e of entities) {
    if (e.taken) continue;
    const dx = (e.x) - (p.x + p.w / 2), dy = (e.y) - (p.y + p.h / 2);
    const near = Math.abs(dx) < 14 && Math.abs(dy) < 16;
    const close = Math.abs(dx) < 26 && Math.abs(dy) < 30;
    if (e.chr === "F" && near) {
      e.taken = true; feathersGot++; sfx.pick(); burst(e.x, e.y, "#f7d774", 6);
    } else if (e.chr === "A" && near) {
      e.taken = true; arrowCount = Math.min(arrowCount + 3, 9); sfx.quiver();
      burst(e.x, e.y, "#8a5a33", 6);
      if (hasBow) narrate("Un carquois ! Plus 3 flèches !");
    } else if (e.chr === "E" && Math.abs(dx) < 18 && Math.abs(dy) < 26) {
      levelComplete();
      return;
    } else if ("MBQGPC".includes(e.chr) && close && !e.talked) {
      e.talked = true;
      sfx.cri();
      burst(e.x, e.y - 10, "#ff8fb2", 5);
      const talk = level.talks[e.chr];
      if (talk) narrate(talk);
    }
  }
  // Jamais bloqué sans flèches : si le carquois est vide et qu'il n'en
  // reste aucun à ramasser, Grand Aigle en laisse tomber un après 3 s.
  if (hasBow && arrowCount === 0 && !entities.some(e => e.chr === "A" && !e.taken)) {
    emptySince++;
    if (emptySince > 180) {
      emptySince = -240; // petit délai avant le prochain cadeau
      entities.push({ chr: "A", x: p.safeX + p.w / 2, y: p.safeY + p.h - 8, taken: false, bob: 0 });
      narrate("Grand Aigle laisse tomber un carquois pour toi !");
    }
  } else emptySince = 0;
}

function levelComplete() {
  if (state !== "play") return;
  sfx.tada();
  if (levelIndex === LEVELS.length - 1) {
    state = "victory";
    narrate("Bravo ! Yakari et le condor ont sauvé la rivière ! Tous les animaux te disent merci. À bientôt pour une nouvelle aventure !");
    showOverlay("🎉 Bravo !", "Yakari et le condor ont sauvé la rivière ! Tu as gagné " + feathersGot + " plumes. Hugh !", "↻ Rejouer");
  } else {
    state = "fade";
    fade.alpha = 0; fade.dir = 1;
    fade.cb = () => { loadLevel(levelIndex + 1); state = "play"; fade.dir = -1; };
  }
}

/* =========================== Particules ============================ */

function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    particles.push({ x, y, vx: Math.cos(a) * (0.8 + (i % 3) * 0.5), vy: Math.sin(a) * (0.8 + (i % 3) * 0.5) - 1, life: 26 + (i % 5) * 4, color });
  }
}
function updateParticles() {
  for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.life--; }
  particles = particles.filter(p => p.life > 0);
}

/* ============================= Thèmes ============================== */

const THEMES = {
  meadow: { skyTop: "#8fd3ff", skyBot: "#e8f7ff", hillFar: "#a8d98a", hillNear: "#7ec850", top: "#58b13e", dirt: "#8a5a33", dirt2: "#7a4e2b", plat: "#a06a38" },
  forest: { skyTop: "#9fd8ff", skyBot: "#d8f2e0", hillFar: "#6fae6f", hillNear: "#4f9d4f", top: "#3f8f3f", dirt: "#6a4526", dirt2: "#5c3b20", plat: "#8a5a33" },
  snow:   { skyTop: "#bcd9f7", skyBot: "#eef7ff", hillFar: "#d6e8f7", hillNear: "#c2dbf0", top: "#ffffff", dirt: "#9fb8cc", dirt2: "#8ba6bd", plat: "#cfe4f5" },
  sky:    { skyTop: "#5aa7f0", skyBot: "#cfe9ff", hillFar: "#dcecfb", hillNear: "#c2dbf2", top: "#b0b8c4", dirt: "#8b93a1", dirt2: "#7b8391", plat: "#ffffff" },
  canyon: { skyTop: "#ffd9a0", skyBot: "#ffeecf", hillFar: "#e0a878", hillNear: "#c97f4f", top: "#c49a6a", dirt: "#9c6b40", dirt2: "#8a5a33", plat: "#b98a5a" },
  party:  { skyTop: "#ffb27d", skyBot: "#ffe6b8", hillFar: "#a8d98a", hillNear: "#7ec850", top: "#58b13e", dirt: "#8a5a33", dirt2: "#7a4e2b", plat: "#a06a38" },
};

/* ============================== Rendu ============================== */

function render() {
  const th = THEMES[level ? level.theme : "meadow"];
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, th.skyTop); g.addColorStop(1, th.skyBot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  if (!level) return;

  drawBackdrop(th);

  ctx.save();
  ctx.translate(-Math.round(cam), 0);

  drawTiles(th);
  drawWater();
  for (const e of entities) if (!e.taken) drawEntity(e);
  for (const e of enemies) if (!e.dead) drawEnemy(e);
  for (const a of arrows) drawArrow(a);
  drawPlayer();
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life / 20);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  drawHUD();

  if (fade.dir !== 0 || fade.alpha > 0) {
    fade.alpha = Math.max(0, Math.min(1, fade.alpha + fade.dir * 0.05));
    if (fade.alpha >= 1 && fade.cb) { const cb = fade.cb; fade.cb = null; cb(); }
    if (fade.alpha <= 0) fade.dir = 0;
    ctx.fillStyle = "rgba(20,28,46," + fade.alpha + ")";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

function drawBackdrop(th) {
  // Soleil
  ctx.fillStyle = "rgba(255,240,180,0.9)";
  ctx.beginPath(); ctx.arc(400, 48, 22, 0, Math.PI * 2); ctx.fill();
  // Collines lointaines (parallaxe)
  const o1 = -(cam * 0.25) % 240, o2 = -(cam * 0.5) % 160;
  ctx.fillStyle = th.hillFar;
  for (let x = o1 - 240; x < VIEW_W + 240; x += 240) {
    ctx.beginPath(); ctx.arc(x + 120, 300, 130, Math.PI, 0); ctx.fill();
  }
  ctx.fillStyle = th.hillNear;
  for (let x = o2 - 160; x < VIEW_W + 160; x += 160) {
    ctx.beginPath(); ctx.arc(x + 80, 330, 110, Math.PI, 0); ctx.fill();
  }
  // Bande sombre en bas : les trous se voient bien
  const dg = ctx.createLinearGradient(0, 250, 0, VIEW_H);
  dg.addColorStop(0, "rgba(25,32,50,0)");
  dg.addColorStop(0.4, "rgba(25,32,50,0.75)");
  dg.addColorStop(1, "rgba(15,20,34,0.95)");
  ctx.fillStyle = dg;
  ctx.fillRect(0, 250, VIEW_W, VIEW_H - 250);
  // Nuages
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  const o3 = -(cam * 0.15) % 220;
  for (let x = o3 - 220; x < VIEW_W + 220; x += 220) {
    cloudShape(x + 60, 50, 1); cloudShape(x + 170, 90, 0.7);
  }
  if (level.theme === "party") { // rivière au fond
    ctx.fillStyle = "rgba(90,170,240,0.55)";
    ctx.fillRect(0, 236, VIEW_W, 14);
  }
}
function cloudShape(x, y, s) {
  ctx.beginPath();
  ctx.arc(x, y, 14 * s, 0, Math.PI * 2);
  ctx.arc(x + 14 * s, y - 6 * s, 11 * s, 0, Math.PI * 2);
  ctx.arc(x + 28 * s, y, 13 * s, 0, Math.PI * 2);
  ctx.fill();
}

function drawTiles(th) {
  const x0 = Math.max(0, Math.floor(cam / TILE) - 1);
  const x1 = Math.min(levelW - 1, Math.ceil((cam + VIEW_W) / TILE) + 1);
  for (let ty = 0; ty < ROWS; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = grid[ty][tx], px = tx * TILE, py = ty * TILE;
    if (c === "#") {
      ctx.fillStyle = (tx + ty) % 2 ? th.dirt : th.dirt2;
      ctx.fillRect(px, py, TILE, TILE);
      if (tileAt(tx, ty - 1) !== "#") { // herbe / neige / roche au sommet
        ctx.fillStyle = th.top;
        ctx.fillRect(px, py, TILE, 5);
        ctx.fillRect(px + 2, py + 5, 3, 2); ctx.fillRect(px + 9, py + 5, 3, 2);
      }
    } else if (c === "=") {
      if (level.theme === "sky") { // nuage-plateforme
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(px + 4, py + 8, 7, 0, Math.PI * 2);
        ctx.arc(px + 12, py + 6, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(180,205,230,0.6)";
        ctx.fillRect(px, py + 10, TILE, 4);
      } else {
        ctx.fillStyle = th.plat;
        ctx.fillRect(px, py + 2, TILE, 8);
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(px, py + 8, TILE, 2);
        ctx.fillStyle = level.theme === "snow" ? "#ffffff" : th.top;
        ctx.fillRect(px, py, TILE, 3);
      }
    } else if (c === "R") {
      ctx.fillStyle = "#8d8378";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#a29788";
      ctx.fillRect(px + 2, py + 2, 5, 4); ctx.fillRect(px + 9, py + 8, 5, 4);
      if (boulderHp < 3) { // fissures
        ctx.strokeStyle = "#4c463f"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px + 2, py + 3); ctx.lineTo(px + 8, py + 9); ctx.lineTo(px + 5, py + 14); ctx.stroke();
        if (boulderHp < 2) { ctx.beginPath(); ctx.moveTo(px + 13, py + 2); ctx.lineTo(px + 9, py + 8); ctx.lineTo(px + 13, py + 13); ctx.stroke(); }
      }
    } else if (c === "~") {
      const w = Math.sin(tick * 0.1 + tx) * 1.5;
      ctx.fillStyle = "rgba(90,170,240,0.8)";
      ctx.fillRect(px, py + 4 + w, TILE, TILE - 4 - w);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillRect(px + 2, py + 4 + w, 4, 2);
    } else if (c === "T") {
      ctx.fillStyle = "#7a4e2b";
      ctx.fillRect(px + 6, py - 8, 5, TILE + 8);
      ctx.fillStyle = level.theme === "canyon" ? "#8faf5a" : "#4f9d4f";
      ctx.beginPath(); ctx.arc(px + 8, py - 16, 13, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.beginPath(); ctx.arc(px + 4, py - 20, 6, 0, Math.PI * 2); ctx.fill();
    } else if (c === "%") {
      ctx.fillStyle = "#7a4e2b"; ctx.fillRect(px + 7, py + 8, 3, 8);
      ctx.fillStyle = "#2f7a4f";
      ctx.beginPath(); ctx.moveTo(px + 8, py - 18); ctx.lineTo(px + 17, py + 9); ctx.lineTo(px - 1, py + 9); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(px + 3, py + 2, 4, 2); ctx.fillRect(px + 10, py - 6, 4, 2);
    } else if (c === "*") {
      const b = Math.sin(tick * 0.06 + tx) * 1.2;
      ctx.fillStyle = "#3f8f3f"; ctx.fillRect(px + 7, py + 8, 2, 8);
      ctx.fillStyle = ["#ff8fb2", "#f7d774", "#9fb4ff"][tx % 3];
      ctx.beginPath(); ctx.arc(px + 8, py + 6 + b, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff8e7";
      ctx.beginPath(); ctx.arc(px + 8, py + 6 + b, 1.6, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawWater() {
  if (!waterFlows) return; // niveau 5 : le ruisseau se remplit après le rocher
  ctx.fillStyle = "rgba(90,170,240,0.75)";
  for (let tx = 84; tx < levelW; tx++) {
    const w = Math.sin(tick * 0.12 + tx * 0.8) * 2;
    ctx.fillRect(tx * TILE, 16 * TILE + 6 + w, TILE, 10 - w);
  }
}

function drawEntity(e) {
  const bob = Math.sin((tick + e.bob) * 0.08) * 2;
  const x = e.x, y = e.y;
  if (e.chr === "F") { // plume
    ctx.save(); ctx.translate(x, y + bob); ctx.rotate(0.3);
    ctx.fillStyle = "#f7d774";
    ctx.beginPath(); ctx.ellipse(0, 0, 3, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e08a3c";
    ctx.fillRect(-0.7, -7, 1.4, 14);
    ctx.restore();
  } else if (e.chr === "A") { // carquois
    ctx.save(); ctx.translate(x, y + bob);
    ctx.fillStyle = "#8a5a33"; ctx.fillRect(-4, -6, 8, 13);
    ctx.fillStyle = "#b98a2f"; ctx.fillRect(-4, -6, 8, 3);
    ctx.strokeStyle = "#e8dcc8"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-2, -12); ctx.moveTo(2, -6); ctx.lineTo(2, -11); ctx.stroke();
    ctx.fillStyle = "#f7d774";
    ctx.beginPath(); ctx.moveTo(-2, -14); ctx.lineTo(-4, -10); ctx.lineTo(0, -11); ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (e.chr === "E") { // totem de fin
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#8a5a33"; ctx.fillRect(-5, -24, 10, 32);
    ctx.fillStyle = "#b95b3c"; ctx.fillRect(-5, -24, 10, 8);
    ctx.fillStyle = "#f7d774"; ctx.fillRect(-5, -12, 10, 4);
    ctx.fillStyle = "#2b3a55";
    ctx.fillRect(-3, -22, 2, 3); ctx.fillRect(1, -22, 2, 3);
    const fl = Math.sin(tick * 0.1) * 3;
    ctx.fillStyle = "#e25555";
    ctx.beginPath(); ctx.ellipse(-8, -20 + fl * 0.3, 2.5, 6, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#5aa7f0";
    ctx.beginPath(); ctx.ellipse(8, -20 - fl * 0.3, 2.5, 6, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (e.chr === "M") { // marmotte
    ctx.save(); ctx.translate(x, y + 2);
    ctx.fillStyle = "#a9825c";
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#c9a97e";
    ctx.beginPath(); ctx.ellipse(0, 2, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4a3218";
    if (e.talked) { ctx.fillRect(-4, -3, 2, 2); ctx.fillRect(2, -3, 2, 2); }
    else { ctx.fillRect(-5, -2, 3, 1); ctx.fillRect(2, -2, 3, 1); }
    if (!e.talked) { ctx.fillStyle = "#fff"; ctx.font = "8px sans-serif"; ctx.fillText("z z", 6, -8 + bob); }
    ctx.restore();
  } else if (e.chr === "B") { // castor
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#6a4526";
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8a5a33";
    ctx.beginPath(); ctx.ellipse(6, 6, 6, 3, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4a3218"; ctx.fillRect(-4, -4, 2, 2); ctx.fillRect(1, -4, 2, 2);
    ctx.fillStyle = "#fff"; ctx.fillRect(-1.5, 1, 3, 4);
    ctx.restore();
  } else if (e.chr === "Q") { // Grand Aigle
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = "#6a4526";
    ctx.beginPath(); ctx.ellipse(0, 2, 6, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff8e7";
    ctx.beginPath(); ctx.arc(0, -8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e08a3c";
    ctx.beginPath(); ctx.moveTo(4, -8); ctx.lineTo(9, -6); ctx.lineTo(4, -5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#2b3a55"; ctx.fillRect(1, -10, 2, 2);
    ctx.restore();
  } else if (e.chr === "G") { // chèvre
    ctx.save(); ctx.translate(x, y + bob * 0.4);
    ctx.fillStyle = "#e8dcc8";
    ctx.beginPath(); ctx.ellipse(0, 2, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -4, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#b0a58f"; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(6, -8, 3, Math.PI, Math.PI * 1.8); ctx.stroke();
    ctx.fillStyle = "#4a3218"; ctx.fillRect(7, -5, 2, 2);
    ctx.fillStyle = "#e8dcc8"; ctx.fillRect(-6, 6, 3, 5); ctx.fillRect(3, 6, 3, 5);
    ctx.restore();
  } else if (e.chr === "P") { // Petit Tonnerre
    ctx.save(); ctx.translate(x, y - 2);
    ctx.fillStyle = "#f2e2c8";
    ctx.beginPath(); ctx.ellipse(0, 2, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, -6, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#6a4526";
    ctx.fillRect(6, -12, 6, 4);
    ctx.fillRect(-8, 6, 3, 8); ctx.fillRect(-2, 6, 3, 8); ctx.fillRect(4, 6, 3, 8);
    ctx.fillStyle = "#4a3218"; ctx.fillRect(10, -7, 2, 2);
    ctx.fillStyle = "#6a4526";
    ctx.beginPath(); ctx.ellipse(-10, 0, 3, 6, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  } else if (e.chr === "C") { // condor
    ctx.save(); ctx.translate(x, y + bob);
    const flap = Math.sin(tick * 0.12) * 6;
    ctx.fillStyle = "#3d3d4d";
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-22, -6 - flap); ctx.lineTo(-6, 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(22, -6 - flap); ctx.lineTo(6, 4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 2, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff8e7";
    ctx.beginPath(); ctx.arc(0, -3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e08a3c";
    ctx.beginPath(); ctx.moveTo(2, -4); ctx.lineTo(7, -2.5); ctx.lineTo(2, -1); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawEnemy(e) {
  if (e.chr === "s") { // boule de neige avec petite frimousse grognon
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#d5e5f2";
    ctx.beginPath(); ctx.arc(-2, 3, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2b3a55";
    ctx.fillRect(-4, -3, 2.5, 2); ctx.fillRect(2, -3, 2.5, 2);
    ctx.strokeStyle = "#2b3a55"; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, 4, 2.6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.restore();
  } else if (e.chr === "c") { // corbeau grognon
    ctx.save(); ctx.translate(e.x, e.y);
    if (e.dir < 0) ctx.scale(-1, 1);
    const flap = Math.sin(e.t * 0.2) * 4;
    ctx.fillStyle = "#3a3f4a";
    ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-12, -4 - flap); ctx.lineTo(-3, 3); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e0b13c";
    ctx.beginPath(); ctx.moveTo(6, -1); ctx.lineTo(11, 0.5); ctx.lineTo(6, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(3, -3, 2, 2);
    ctx.restore();
  } else if (e.chr === "g") { // guêpe
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    const flap = Math.sin(e.t * 0.5) * 2;
    ctx.beginPath(); ctx.ellipse(-1, -5 - flap, 4, 2.5, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2, -5 + flap, 4, 2.5, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f2c744";
    ctx.beginPath(); ctx.ellipse(0, 0, 6, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2b3a55";
    ctx.fillRect(-2, -4, 2, 9); ctx.fillRect(2, -4, 2, 9);
    ctx.fillRect(4, -2, 2, 2);
    ctx.restore();
  }
}

function drawArrow(a) {
  ctx.save(); ctx.translate(a.x, a.y);
  if (a.vx < 0) ctx.scale(-1, 1);
  ctx.strokeStyle = "#8a5a33"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(5, 0); ctx.stroke();
  ctx.fillStyle = "#9aa7b8";
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(3, -2.5); ctx.lineTo(3, 2.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#e25555";
  ctx.fillRect(-8, -2, 3, 4);
  ctx.restore();
}

function drawPlayer() {
  const p = player;
  if (p.invuln > 0 && (tick % 8 < 3)) return; // clignote quand touché
  const x = p.x + p.w / 2, y = p.y;
  ctx.save();
  ctx.translate(x, y);
  if (p.facing < 0) ctx.scale(-1, 1);
  const run = p.onGround && Math.abs(p.vx) > 0.3 ? Math.sin(p.anim) : 0;
  const air = !p.onGround;
  // jambes (pantalon bleu)
  ctx.fillStyle = "#4a6fd0";
  if (air) { ctx.fillRect(-5, 14, 4, 8); ctx.fillRect(1, 12, 4, 8); }
  else { ctx.fillRect(-5 + run * 2, 14, 4, 8); ctx.fillRect(1 - run * 2, 14, 4, 8); }
  // mocassins
  ctx.fillStyle = "#8a5a33";
  if (air) { ctx.fillRect(-6, 20, 5, 3); ctx.fillRect(1, 18, 5, 3); }
  else { ctx.fillRect(-6 + run * 2, 20, 5, 3); ctx.fillRect(0 - run * 2, 20, 5, 3); }
  // corps (tunique claire)
  ctx.fillStyle = "#f5e9d0";
  ctx.fillRect(-5, 6, 11, 9);
  ctx.fillStyle = "#e0b13c";
  ctx.fillRect(-5, 13, 11, 2);
  // bras + arc
  if (p.shootAnim > 0 && hasBow) {
    ctx.fillStyle = "#d9a066"; ctx.fillRect(2, 8, 8, 3);
    ctx.strokeStyle = "#8a5a33"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(9, 9, 6, -Math.PI / 2.4, Math.PI / 2.4); ctx.stroke();
    ctx.strokeStyle = "#e8dcc8"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(11, 3.7); ctx.lineTo(11, 14.3); ctx.stroke();
  } else {
    ctx.fillStyle = "#d9a066";
    ctx.fillRect(-7, 7, 3, 7 + run * 1.5);
    ctx.fillRect(4, 7, 3, 7 - run * 1.5);
    if (hasBow) { // arc dans le dos
      ctx.strokeStyle = "#8a5a33"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-4, 10, 7, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
    }
  }
  // tête
  ctx.fillStyle = "#d9a066";
  ctx.beginPath(); ctx.arc(0, 0, 6, 0, Math.PI * 2); ctx.fill();
  // cheveux
  ctx.fillStyle = "#1d1d24";
  ctx.beginPath(); ctx.arc(0, -1.5, 6, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
  ctx.fillRect(-6, -2, 12, 2.5);
  // bandeau + plume
  ctx.fillStyle = "#e25555"; ctx.fillRect(-6, -3, 12, 2);
  ctx.save(); ctx.translate(-3, -8); ctx.rotate(-0.25);
  ctx.fillStyle = "#f7d774";
  ctx.beginPath(); ctx.ellipse(0, 0, 2, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // œil + sourire
  ctx.fillStyle = "#1d1d24"; ctx.fillRect(2, -1, 1.8, 1.8);
  ctx.strokeStyle = "#1d1d24"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(2.5, 2, 2, 0.2, Math.PI * 0.8); ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  // Cœurs
  for (let i = 0; i < 3; i++) {
    ctx.save(); ctx.translate(16 + i * 18, 14);
    ctx.fillStyle = i < hearts ? "#e25555" : "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.arc(-3, -2, 4, 0, Math.PI * 2); ctx.arc(3, -2, 4, 0, Math.PI * 2);
    ctx.moveTo(-6.5, 0); ctx.lineTo(0, 8); ctx.lineTo(6.5, 0);
    ctx.fill();
    ctx.restore();
  }
  // Plumes
  ctx.save(); ctx.translate(20, 34); ctx.rotate(0.3);
  ctx.fillStyle = "#f7d774";
  ctx.beginPath(); ctx.ellipse(0, 0, 3.5, 8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "left";
  ctx.strokeStyle = "rgba(0,0,0,0.4)"; ctx.lineWidth = 3;
  ctx.strokeText("× " + feathersGot, 30, 39); ctx.fillText("× " + feathersGot, 30, 39);
  // Flèches
  if (hasBow) {
    ctx.save(); ctx.translate(20, 56);
    ctx.strokeStyle = "#8a5a33"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 7, -Math.PI / 2.2, Math.PI / 2.2); ctx.stroke();
    ctx.strokeStyle = "#e8dcc8"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(2.5, -6.3); ctx.lineTo(2.5, 6.3); ctx.stroke();
    ctx.restore();
    const col = arrowCount > 0 ? "#fff" : "#ffb0b0";
    ctx.fillStyle = col;
    ctx.strokeStyle = "rgba(0,0,0,0.4)";
    ctx.strokeText("× " + arrowCount, 32, 61); ctx.fillText("× " + arrowCount, 32, 61);
  }
  // Niveau
  ctx.textAlign = "right"; ctx.font = "bold 12px sans-serif";
  const label = "Niveau " + (levelIndex + 1) + "/6";
  ctx.strokeText(label, VIEW_W - 12, 20); ctx.fillStyle = "#fff"; ctx.fillText(label, VIEW_W - 12, 20);
  ctx.textAlign = "left";
}

/* ========================= Boucle principale ======================== */

let lastTime = 0, acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (!lastTime) lastTime = now;
  let dt = now - lastTime;
  lastTime = now;
  if (dt > 200) dt = 200; // onglet en arrière-plan : on ne rattrape pas tout
  acc += dt;
  let steps = 0;
  while (acc >= 1000 / 60 && steps < 4) {
    acc -= 1000 / 60; steps++;
    if (state === "play" || state === "fade") {
      tick++;
      if (state === "play") {
        if (keys.shoot && !shootLatch) { shootLatch = true; tryShoot(); }
        if (!keys.shoot) shootLatch = false;
        movePlayer();
        updateEnemies();
        updateArrows();
        updateEntities();
      }
      updateParticles();
      const targetCam = player.x + player.w / 2 - VIEW_W / 2;
      cam = Math.max(0, Math.min(levelW * TILE - VIEW_W, targetCam));
    }
  }
  render();
}

/* =========================== Overlay / démarrage =================== */

const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlaySub = document.getElementById("overlaySub");
const overlayBtn = document.getElementById("overlayBtn");

function showOverlay(title, sub, btn) {
  overlayTitle.textContent = title;
  overlaySub.textContent = sub;
  overlayBtn.textContent = btn;
  overlay.classList.remove("hidden");
}

overlayBtn.addEventListener("click", () => {
  overlay.classList.add("hidden");
  ac(); // débloque l'audio au premier geste
  feathersGot = 0; arrowCount = 0; hasBow = false;
  loadLevel(0);
  state = "play";
});

requestAnimationFrame(frame);
