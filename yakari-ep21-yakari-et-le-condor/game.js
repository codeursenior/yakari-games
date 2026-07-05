/* ============================================================
   YAKARI ET LE CONDOR — EP21 « plateau »
   Jeu façon Game Boy Color (vue de dessus, déplacement case
   par case, on marche contre les choses pour interagir).
   Retrace l'épisode 21 « Yakari et le condor ».
   Recharger la page recommence l'aventure de zéro.
   ============================================================ */

"use strict";

/* ------------------------------------------------------------
   CONSTANTES & RÉFÉRENCES
   ------------------------------------------------------------ */
const TILE = 32;
const VIEW_W = 15, VIEW_H = 10;          // 480 x 320
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const narrationText = document.getElementById("narrationText");
const feathersBox = document.getElementById("feathers");
const soundToggle = document.getElementById("soundToggle");
const replayVoice = document.getElementById("replayVoice");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlaySub = document.getElementById("overlaySub");
const overlayBtn = document.getElementById("overlayBtn");

let soundOn = true;
let currentNarration = "";

/* ------------------------------------------------------------
   AUDIO (généré, aucun fichier) + VOIX fr-FR
   ------------------------------------------------------------ */
let audioCtx = null;
function actx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
function tone(freq, dur, type = "sine", vol = 0.2, when = 0) {
  if (!soundOn) return;
  try {
    const c = actx();
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, c.currentTime + when);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + when + dur);
    o.connect(g).connect(c.destination);
    o.start(c.currentTime + when);
    o.stop(c.currentTime + when + dur + 0.05);
  } catch (e) { /* pas grave */ }
}
const sfx = {
  step() { tone(220, 0.04, "triangle", 0.05); },
  pop() { tone(520, 0.12, "sine", 0.25); tone(780, 0.1, "sine", 0.15, 0.05); },
  bump() { tone(160, 0.08, "square", 0.08); },
  neigh() { [880, 740, 620, 520].forEach((f, i) => tone(f, 0.12, "sawtooth", 0.08, i * 0.09)); },
  splash() { tone(180, 0.25, "triangle", 0.2); tone(120, 0.3, "sine", 0.15, 0.05); },
  success() { [523, 659, 784].forEach((f, i) => tone(f, 0.18, "sine", 0.2, i * 0.12)); },
  tada() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, "triangle", 0.2, i * 0.13)); tone(1047, 0.6, "sine", 0.15, 0.55); },
  cri() { tone(980, 0.15, "sine", 0.15); tone(1100, 0.2, "sine", 0.12, 0.12); },
  baa() { tone(660, 0.12, "square", 0.1); tone(590, 0.18, "square", 0.09, 0.1); },
  rumble() { [90, 75, 85, 70].forEach((f, i) => tone(f, 0.5, "sawtooth", 0.14, i * 0.22)); },
  boom() { tone(65, 0.7, "sawtooth", 0.25); tone(50, 0.9, "sine", 0.25, 0.08); },
};

let frVoice = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return;
  const voices = speechSynthesis.getVoices();
  frVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("fr")) || null;
}
if ("speechSynthesis" in window) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}
function say(text) {
  if (!soundOn || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  if (frVoice) u.voice = frVoice;
  u.rate = 0.92;
  u.pitch = 1.1;
  speechSynthesis.speak(u);
}
function narrate(text) {
  currentNarration = text;
  narrationText.textContent = text;
  say(text);
}
soundToggle.addEventListener("click", () => {
  soundOn = !soundOn;
  soundToggle.textContent = soundOn ? "🔊" : "🔇";
  soundToggle.classList.toggle("off", !soundOn);
  if (!soundOn && "speechSynthesis" in window) speechSynthesis.cancel();
});
replayVoice.addEventListener("click", () => say(currentNarration));

/* ------------------------------------------------------------
   CARTES (une lettre = une case)
   G herbe · D chemin · T arbre · W eau · f fleurs · t tipi
   R rocher · d lit de rivière à sec · B barrage des castors
   N neige · I paroi rocheuse · K ciel · n nuage · P pic
   w eau peu profonde qui coule (marchable)
   ------------------------------------------------------------ */
const MAP_RIVER = [
  "TTTTTTTTTTTTTTTTTTTTTTTT",
  "TdddddddWWWBBddddddddddT",
  "TdddddddWWWBBddddddddddT",
  "TGGGGGGGGGGGGGGGGGGGGGGT",
  "TGGfGGGGGGGGGGGGRRGGGGGT",
  "TGGGGGGGGGGGGGGGGGGGGGGT",
  "TGtGGGGGGGGGGGGGGGGGtGGT",
  "TGGGGGGGDDDDDDDDGGGGGGGT",
  "TGGfGGGGDGGGGGGDGGGGfGGT",
  "TGGGGGGGDDDDDDDDGGGGGGGT",
  "TGtGGGGGGGGGGGGGGGGGGGGT",
  "TGGGGGGGGGGGGGGGGGGGGGDD",
  "TTTTTTTTTTTTTTTTTTTTTTTT",
];
const MAP_RIVER_FULL = MAP_RIVER.map(row => row.replace(/d/g, "W"));

const MAP_MOUNTAIN = [
  "IIIIIIIIIIIIIII",
  "INNNNNNNNNNNNNI",
  "INNNNNNNNNNNNNI",
  "IIIIIINNIIIIIII",
  "INNNNNNNNNNNNNI",
  "INNNNNNNNNNNNNI",
  "IIIIIIIIIIINNII",
  "INNNNNNNNNNNNNI",
  "INNNNNNNNNNNNNI",
  "IIINNIIIIIIIIII",
  "IGGGGGGGGGGGGGI",
  "IGGGGGGGGGGGGGI",
  "IGGGGGGGGGGGGGI",
  "IIIIIIIIIIIIIII",
];

const MAP_SKY = [
  "KKKKKKKnnKKKKKKKKKKnnKKK",
  "KKnnKKKKKKKKKKnKKKKKKKKK",
  "KKKKKKKKKKKKKKKKKKKKKnnK",
  "KKKKKPKKKKKnnKKKKKKKKKKK",
  "KKKKKPKKKKKKKKKKKKnKKKKK",
  "KnnKKKKKKKKKKKKKKKKKKKKK",
  "KKKKKKKKKKKKKKPKKKKKnnKK",
  "KKKKKKKKKKKKKKPKKKKKKKKK",
  "KKnnKKKKKKKKKKKKKKKKKKKK",
  "KKKKKKKnnKKKKKKKKKKKPPKK",
  "KKKKKKKKKKKKKKKKKKKKPPKK",
  "KKKKKKKKKKKKKKKKKKKKKKKK",
];

const MAP_STREAM = [
  "IIIIIIIIIIIIIIIIIIII",
  "IINWWWWWWWNNNNNNNNNI",
  "IINWWWWWWWNNNNNNNNNI",
  "IINNWWWWWNNNNNNNNNNI",
  "INNNNNdNNNNNNNNNNNNI",
  "INNNNNdNNNNNNNNNNNNI",
  "INNNNNdNNNNNNNNNNNNI",
  "INNNNNdNNNNNNNNNNNNI",
  "INNNNNdNNNNNNNNNNNNI",
  "INNNNNdNNNNNNNNNNNNI",
  "INNNNNdNNNNNNNNNNNNI",
  "IIIIIIIIIIIIIIIIIIII",
];
const MAP_STREAM_FLOW = MAP_STREAM.map(row => row.replace(/d/g, "w"));

const SOLID_TILES = "TWRIBPt";

/* ------------------------------------------------------------
   ÉTAT DU JEU
   ------------------------------------------------------------ */
let map = MAP_RIVER;
let mapW = 24, mapH = 13;
let phase = 0;
let locked = true;               // entrées bloquées (titre, cinématiques)
let raining = false;
let night = false;
let dawn = false;

const player = {
  x: 5, y: 8,                    // case
  dir: "down",
  sprite: "walk",                // walk | ride | fly
  moving: null,                  // {fx,fy,tx,ty,start,dur}
};
let entities = [];               // pnj, objets, boules de neige...
let effects = [];                // cœurs, pouf, fumée, étincelles
let markerTarget = null;         // {x,y} objectif avec flèche qui rebondit
let tileBumpHandler = null;      // interaction avec une case spéciale
let onMoveComplete = null;       // vérifié après chaque pas
let fade = null;                 // {start,dur,mode:'out'|'in',cb}
let lastBump = 0;

const quest = {};                // compteurs de la phase en cours

function setMap(m) {
  map = m;
  mapH = m.length;
  mapW = m[0].length;
}
function tileAt(x, y) {
  if (x < 0 || y < 0 || x >= mapW || y >= mapH) return "T";
  return map[y][x];
}
function tileSolid(x, y) {
  return SOLID_TILES.includes(tileAt(x, y));
}
function entityAt(x, y) {
  return entities.find(e => e.x === x && e.y === y);
}

/* ------------------------------------------------------------
   PLUMES DE PROGRESSION (6 étapes)
   ------------------------------------------------------------ */
const TOTAL_PHASES = 6;
function buildFeathers() {
  feathersBox.innerHTML = "";
  for (let i = 0; i < TOTAL_PHASES; i++) {
    const sp = document.createElement("span");
    sp.textContent = "🪶";
    feathersBox.appendChild(sp);
  }
}
function updateFeathers(done) {
  [...feathersBox.children].forEach((sp, i) => sp.classList.toggle("done", i < done));
}

/* ------------------------------------------------------------
   ENTRÉES : clavier + croix tactile + toucher la carte (BFS)
   ------------------------------------------------------------ */
const held = new Set();
const KEYMAP = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  z: "up", s: "down", q: "left", d: "right",
  w: "up", a: "left",
};
document.addEventListener("keydown", (e) => {
  const dir = KEYMAP[e.key];
  if (dir) { held.add(dir); tapPath = null; e.preventDefault(); }
});
document.addEventListener("keyup", (e) => {
  const dir = KEYMAP[e.key];
  if (dir) held.delete(dir);
});
document.querySelectorAll(".dpadBtn").forEach(btn => {
  const dir = btn.dataset.dir;
  const on = (e) => { e.preventDefault(); held.add(dir); tapPath = null; };
  const off = () => held.delete(dir);
  btn.addEventListener("pointerdown", on);
  btn.addEventListener("pointerup", off);
  btn.addEventListener("pointercancel", off);
  btn.addEventListener("pointerleave", off);
});

// toucher une case de la carte : on y va tout seul (parcours BFS)
let tapPath = null;              // liste de cases à suivre
let tapGoal = null;
canvas.addEventListener("pointerdown", (e) => {
  if (locked) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* pas grave */ }
  const r = canvas.getBoundingClientRect();
  const sx = (e.clientX - r.left) * (canvas.width / r.width);
  const sy = (e.clientY - r.top) * (canvas.height / r.height);
  const cam = camera();
  const tx = Math.floor((sx + cam.x) / TILE);
  const ty = Math.floor((sy + cam.y) / TILE);
  tapGoal = { x: tx, y: ty };
  tapPath = findPath(player.x, player.y, tx, ty);
});

function passable(x, y, goalX, goalY) {
  if (x === goalX && y === goalY) return true; // la cible peut être solide (on ira la « toucher »)
  if (tileSolid(x, y)) return false;
  const e = entityAt(x, y);
  if (e && e.solid) return false;
  return true;
}
function findPath(sx, sy, gx, gy) {
  if (sx === gx && sy === gy) return null;
  const key = (x, y) => x + "," + y;
  const prev = new Map([[key(sx, sy), null]]);
  const queue = [[sx, sy]];
  while (queue.length) {
    const [x, y] = queue.shift();
    if (x === gx && y === gy) {
      const path = [];
      let k = key(x, y), cur = [x, y];
      while (prev.get(k)) {
        path.unshift({ x: cur[0], y: cur[1] });
        cur = prev.get(k);
        k = key(cur[0], cur[1]);
      }
      return path;
    }
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= mapW || ny >= mapH) continue;
      if (prev.has(key(nx, ny))) continue;
      if (!passable(nx, ny, gx, gy)) continue;
      prev.set(key(nx, ny), [x, y]);
      queue.push([nx, ny]);
    }
  }
  return null;
}

function dirBetween(fx, fy, tx, ty) {
  if (tx > fx) return "right";
  if (tx < fx) return "left";
  if (ty > fy) return "down";
  return "up";
}

/* ------------------------------------------------------------
   DÉPLACEMENT & INTERACTIONS
   ------------------------------------------------------------ */
const STEP_MS = 200;

function tryMove(dir) {
  if (locked || player.moving) return;
  player.dir = dir;
  const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  const tx = player.x + d[0], ty = player.y + d[1];

  const ent = entityAt(tx, ty);
  if (ent && ent.solid) {
    const now = performance.now();
    if (now - lastBump > 380) { lastBump = now; ent.onBump && ent.onBump(ent); }
    tapPath = null;
    return;
  }
  if (tileSolid(tx, ty)) {
    const now = performance.now();
    if (now - lastBump > 380) {
      lastBump = now;
      if (tileBumpHandler) tileBumpHandler(tx, ty, tileAt(tx, ty));
      else sfx.bump();
    }
    tapPath = null;
    return;
  }
  player.moving = { fx: player.x, fy: player.y, tx, ty, start: performance.now(), dur: STEP_MS };
  player.x = tx; player.y = ty;
}

function updateLogic(now) {
  // fin de fondu (transition de phase) — géré ici pour ne pas
  // dépendre du rythme d'affichage
  if (fade && now - fade.start >= fade.dur) {
    const cb = fade.cb;
    fade = null;
    if (cb) cb();
  }
  if (player.moving && now - player.moving.start >= player.moving.dur) {
    const prev = { x: player.moving.fx, y: player.moving.fy };
    player.moving = null;
    sfx.step();
    if (onMoveComplete) onMoveComplete(prev);
  }
  if (!player.moving && !locked) {
    // 1. direction maintenue (clavier / croix)
    const dir = ["up", "down", "left", "right"].find(d => held.has(d));
    if (dir) { tryMove(dir); return; }
    // 2. chemin calculé après un toucher sur la carte
    if (tapPath && tapPath.length) {
      const nxt = tapPath[0];
      const stepDir = dirBetween(player.x, player.y, nxt.x, nxt.y);
      const blockedEnt = entityAt(nxt.x, nxt.y);
      const isGoal = tapGoal && nxt.x === tapGoal.x && nxt.y === tapGoal.y;
      if (isGoal && ((blockedEnt && blockedEnt.solid) || tileSolid(nxt.x, nxt.y))) {
        tryMove(stepDir);          // « toucher » la cible solide
        tapPath = null;
        return;
      }
      if ((blockedEnt && blockedEnt.solid) || tileSolid(nxt.x, nxt.y)) {
        tapPath = findPath(player.x, player.y, tapGoal.x, tapGoal.y); // recalcul
        return;
      }
      tapPath.shift();
      tryMove(stepDir);
    }
  }
}

function playerPix(now) {
  if (!player.moving) return { x: player.x * TILE, y: player.y * TILE };
  const m = player.moving;
  const k = Math.min(1, (now - m.start) / m.dur);
  return {
    x: (m.fx + (m.tx - m.fx) * k) * TILE,
    y: (m.fy + (m.ty - m.fy) * k) * TILE,
  };
}

function camera() {
  const now = performance.now();
  const p = playerPix(now);
  return {
    x: Math.max(0, Math.min(mapW * TILE - VIEW_W * TILE, p.x + TILE / 2 - (VIEW_W * TILE) / 2)),
    y: Math.max(0, Math.min(mapH * TILE - VIEW_H * TILE, p.y + TILE / 2 - (VIEW_H * TILE) / 2)),
  };
}

/* ------------------------------------------------------------
   EFFETS (cœurs, pouf, étincelles, fumée)
   ------------------------------------------------------------ */
function addFx(type, x, y) {
  effects.push({ type, x, y, start: performance.now() });
}

/* ------------------------------------------------------------
   DESSIN DES CASES
   ------------------------------------------------------------ */
function speckle(x, y, i) { return ((x * 7 + y * 13 + i * 5) % 11); }

function drawTile(chr, x, y, px, py, t) {
  switch (chr) {
    case "W": {
      ctx.fillStyle = "#3f78c8";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#5b93dd";
      const ph = Math.floor(t / 550 + (x + y) / 2) % 2;
      ctx.fillRect(px + 4 + ph * 8, py + 8, 10, 3);
      ctx.fillRect(px + 14 - ph * 6, py + 22, 10, 3);
      return;
    }
    case "w": {
      ctx.fillStyle = "#6aa8d8";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#a8d4f0";
      const ph2 = Math.floor(t / 260 + y) % 3;
      ctx.fillRect(px + 6, py + 4 + ph2 * 9, 20, 3);
      ctx.fillRect(px + 2, py + 14 + ((ph2 + 1) % 3) * 4, 10, 2);
      return;
    }
    case "d":
      ctx.fillStyle = "#d9c9a0";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#b8a880";
      ctx.fillRect(px + 6 + speckle(x, y, 1), py + 10, 5, 4);
      ctx.fillRect(px + 18, py + 22, 6, 4);
      ctx.fillStyle = "#8d96a0";
      ctx.fillRect(px + 12, py + 5, 4, 3);
      return;
    case "B":
      ctx.fillStyle = "#7fb2d9";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#8a5a2b";
      ctx.fillRect(px, py + 4, TILE, 6);
      ctx.fillRect(px, py + 14, TILE, 6);
      ctx.fillRect(px, py + 24, TILE, 6);
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(px + 6, py + 4, 3, 26);
      ctx.fillRect(px + 20, py + 4, 3, 26);
      return;
    case "N":
      ctx.fillStyle = "#eef4f8";
      ctx.fillRect(px, py, TILE, TILE);
      if (speckle(x, y, 0) < 4) {
        ctx.fillStyle = "#d5e5f2";
        ctx.fillRect(px + 5 + speckle(x, y, 1), py + 7 + speckle(x, y, 2), 4, 3);
        ctx.fillRect(px + 19, py + 21, 4, 3);
      }
      return;
    case "I":
      ctx.fillStyle = "#5f6f85";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#75859c";
      ctx.fillRect(px + 2, py + 8, 12, 9);
      ctx.fillRect(px + 17, py + 18, 11, 10);
      ctx.fillStyle = "#eef4f8";
      ctx.fillRect(px, py, TILE, 5);
      return;
    case "K":
      ctx.fillStyle = "#9fd0f0";
      ctx.fillRect(px, py, TILE, TILE);
      if (speckle(x, y, 0) === 2) {
        ctx.fillStyle = "#b8e0f8";
        ctx.fillRect(px + 8, py + 14, 14, 3);
      }
      return;
    case "n":
      ctx.fillStyle = "#9fd0f0";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.ellipse(px + 12, py + 18, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(px + 22, py + 13, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    case "P":
      ctx.fillStyle = "#9fd0f0";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#6f7a86";
      ctx.beginPath();
      ctx.moveTo(px + 16, py + 2);
      ctx.lineTo(px + 30, py + 30);
      ctx.lineTo(px + 2, py + 30);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#eef4f8";
      ctx.beginPath();
      ctx.moveTo(px + 16, py + 2);
      ctx.lineTo(px + 22, py + 14);
      ctx.lineTo(px + 10, py + 14);
      ctx.closePath();
      ctx.fill();
      return;
  }
  // fond herbe pour G, f, D, T, t, R
  ctx.fillStyle = "#7ec850";
  ctx.fillRect(px, py, TILE, TILE);
  if (speckle(x, y, 0) < 4) {
    ctx.fillStyle = "#6cb244";
    ctx.fillRect(px + 4 + speckle(x, y, 1), py + 6 + speckle(x, y, 2), 4, 4);
    ctx.fillRect(px + 18, py + 20, 4, 4);
  }
  switch (chr) {
    case "D":
      ctx.fillStyle = "#d9b380";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#c8a06a";
      ctx.fillRect(px + 5 + speckle(x, y, 3), py + 8, 5, 4);
      ctx.fillRect(px + 18, py + 20, 5, 4);
      break;
    case "f":
      ctx.fillStyle = "#e86a92";
      ctx.fillRect(px + 6, py + 8, 6, 6);
      ctx.fillStyle = "#f7d774";
      ctx.fillRect(px + 20, py + 18, 6, 6);
      break;
    case "T":
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(px + 13, py + 20, 6, 10);
      ctx.fillStyle = "#356b44";
      ctx.fillRect(px + 4, py + 2, 24, 20);
      ctx.fillStyle = "#3e7d4f";
      ctx.fillRect(px + 7, py - 2, 18, 14);
      break;
    case "R":
      ctx.fillStyle = "#8d96a0";
      ctx.fillRect(px + 2, py + 6, 28, 24);
      ctx.fillStyle = "#a8b2bc";
      ctx.fillRect(px + 5, py + 9, 12, 8);
      break;
    case "t":
      ctx.fillStyle = "#e8d5ae";
      ctx.beginPath();
      ctx.moveTo(px + 16, py - 4);
      ctx.lineTo(px + 30, py + 30);
      ctx.lineTo(px + 2, py + 30);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#b98a2f";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(px + 13, py - 8, 2, 8);
      ctx.fillRect(px + 17, py - 8, 2, 8);
      ctx.fillStyle = "#c96a2b";
      ctx.fillRect(px + 12, py + 20, 8, 10);
      break;
  }
}

/* ------------------------------------------------------------
   SPRITES (formes simples, style rondouillard)
   px,py = coin haut-gauche de la case à l'écran
   ------------------------------------------------------------ */
function drawYakariBody(px, py, dir, step, bob) {
  const y0 = py + bob;
  // jambes
  ctx.fillStyle = "#3f6bb5";
  if (step === 1) {
    ctx.fillRect(px + 10, y0 + 22, 5, 8);
    ctx.fillRect(px + 17, y0 + 20, 5, 8);
  } else {
    ctx.fillRect(px + 10, y0 + 20, 5, 8);
    ctx.fillRect(px + 17, y0 + 22, 5, 8);
  }
  // torse
  ctx.fillStyle = "#e8b476";
  ctx.fillRect(px + 8, y0 + 12, 16, 10);
  // tête
  ctx.fillStyle = "#f0c48c";
  ctx.fillRect(px + 7, y0, 18, 14);
  // cheveux
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 7, y0, 18, 5);
  if (dir === "up") ctx.fillRect(px + 7, y0, 18, 12);
  if (dir === "left") ctx.fillRect(px + 7, y0, 6, 12);
  if (dir === "right") ctx.fillRect(px + 19, y0, 6, 12);
  // plume
  ctx.fillStyle = "#fff5e0";
  ctx.fillRect(px + 21, y0 - 7, 4, 9);
  ctx.fillStyle = "#c96a2b";
  ctx.fillRect(px + 22, y0 - 7, 1, 9);
  // yeux
  if (dir !== "up") {
    ctx.fillStyle = "#1d1d1d";
    if (dir === "down") { ctx.fillRect(px + 12, y0 + 7, 2, 3); ctx.fillRect(px + 18, y0 + 7, 2, 3); }
    if (dir === "left") ctx.fillRect(px + 14, y0 + 7, 2, 3);
    if (dir === "right") ctx.fillRect(px + 16, y0 + 7, 2, 3);
  }
}

function drawYakari(px, py, dir, step) {
  drawYakariBody(px, py - 2, dir, step, 0);
}

function drawPony(px, py, mode, t) {
  const y0 = py;
  if (mode === "sleep") {
    ctx.fillStyle = "#f2d16b";
    ctx.beginPath();
    ctx.ellipse(px + 16, y0 + 22, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px + 27, y0 + 18, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(px + 22, y0 + 10, 4, 8);
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(px + 27, y0 + 16, 2, 1);   // œil fermé
    const zz = Math.floor(t / 600) % 2;
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.fillText("z", px + 26, y0 + 4 - zz * 3);
    ctx.fillText("Z", px + 30, y0 - 2 - zz * 3);
  } else {
    ctx.fillStyle = "#f2d16b";
    ctx.fillRect(px + 4, y0 + 12, 22, 12);
    ctx.fillRect(px + 6, y0 + 22, 4, 8);
    ctx.fillRect(px + 20, y0 + 22, 4, 8);
    ctx.beginPath();
    ctx.ellipse(px + 26, y0 + 8, 6, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(px + 20, y0 + 2, 4, 10);
    ctx.fillRect(px + 2, y0 + 12, 3, 8);   // queue
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(px + 27, y0 + 6, 2, 2);
  }
}

function drawRider(px, py, dir, step, t) {
  // Yakari à dos de Petit Tonnerre
  const y0 = py - 6;
  const bob = step === 1 ? 1 : 0;
  ctx.fillStyle = "#f2d16b";
  if (dir === "left" || dir === "right") {
    const hx = dir === "right" ? px + 24 : px + 2;
    ctx.fillRect(px + 4, y0 + 18, 24, 11);
    ctx.fillRect(px + 6, y0 + 27, 4, 7 - bob * 2);
    ctx.fillRect(px + 22, y0 + 27, 4, 7 - bob * 2);
    ctx.beginPath();
    ctx.ellipse(hx + 3, y0 + 15, 6, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(dir === "right" ? px + 20 : px + 8, y0 + 10, 4, 9);
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(hx + (dir === "right" ? 4 : 0), y0 + 13, 2, 2);
  } else {
    ctx.fillRect(px + 9, y0 + 14, 14, 16);
    ctx.fillStyle = "#8a5a2b";
    ctx.fillRect(px + 12, dir === "down" ? y0 + 26 : y0 + 12, 8, 4); // crinière/queue
    ctx.fillStyle = "#f2d16b";
    ctx.beginPath();
    ctx.ellipse(px + 16, dir === "down" ? y0 + 30 : y0 + 12, 6, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // petit Yakari dessus
  ctx.fillStyle = "#e8b476";
  ctx.fillRect(px + 11, y0 + 6 - bob, 10, 9);
  ctx.fillStyle = "#f0c48c";
  ctx.fillRect(px + 10, y0 - 4 - bob, 12, 11);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 10, y0 - 4 - bob, 12, 4);
  if (dir === "up") ctx.fillRect(px + 10, y0 - 4 - bob, 12, 9);
  ctx.fillStyle = "#fff5e0";
  ctx.fillRect(px + 20, y0 - 10 - bob, 3, 8);
  if (dir !== "up") {
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(px + 13, y0 + 1 - bob, 2, 2);
    ctx.fillRect(px + 17, y0 + 1 - bob, 2, 2);
  }
}

function drawMarmot(px, py, mode, t) {
  const y0 = py + 4;
  // corps rond
  ctx.fillStyle = "#a5713d";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 16, 12, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // ventre clair
  ctx.fillStyle = "#d9b380";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 19, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // tête
  ctx.fillStyle = "#a5713d";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 4, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // oreilles
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(px + 9, y0 - 3, 4, 4);
  ctx.fillRect(px + 19, y0 - 3, 4, 4);
  // museau
  ctx.fillStyle = "#d9b380";
  ctx.fillRect(px + 13, y0 + 4, 6, 4);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 15, y0 + 4, 2, 2);
  if (mode === "sleep") {
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(px + 11, y0 + 1, 3, 1);
    ctx.fillRect(px + 18, y0 + 1, 3, 1);
    const zz = Math.floor(t / 600) % 2;
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.fillText("z", px + 25, y0 - 4 - zz * 3);
    ctx.fillText("Z", px + 29, y0 - 10 - zz * 3);
  } else {
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(px + 11, y0, 2, 3);
    ctx.fillRect(px + 19, y0, 2, 3);
    ctx.fillStyle = "#fff";
    ctx.fillRect(px + 14, y0 + 7, 4, 2);   // dents
  }
}

function drawBeaver(px, py, t, dancing) {
  const bob = dancing ? (Math.floor(t / 250) % 2) * 2 : 0;
  const y0 = py + 2 - bob;
  // queue plate
  ctx.fillStyle = "#6b4a2a";
  ctx.beginPath();
  ctx.ellipse(px + 25, py + 24, 7, 5, 0.5, 0, Math.PI * 2);
  ctx.fill();
  // corps
  ctx.fillStyle = "#8a5a2b";
  ctx.beginPath();
  ctx.ellipse(px + 14, y0 + 18, 11, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // tête
  ctx.beginPath();
  ctx.ellipse(px + 14, y0 + 6, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // oreilles
  ctx.fillStyle = "#6b4a2a";
  ctx.fillRect(px + 7, y0 - 1, 4, 4);
  ctx.fillRect(px + 17, y0 - 1, 4, 4);
  // yeux + dents
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 10, y0 + 4, 2, 3);
  ctx.fillRect(px + 16, y0 + 4, 2, 3);
  ctx.fillStyle = "#fff";
  ctx.fillRect(px + 12, y0 + 9, 5, 4);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 14, y0 + 9, 1, 4);
}

function drawEagle(px, py, t) {
  const y0 = py - 10;
  const bob = Math.floor(t / 700) % 2;
  // ailes repliées
  ctx.fillStyle = "#5f452a";
  ctx.fillRect(px + 4, y0 + 14, 6, 18);
  ctx.fillRect(px + 22, y0 + 14, 6, 18);
  // corps
  ctx.fillStyle = "#7d5a36";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 22, 9, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // tête claire
  ctx.fillStyle = "#f5f0e0";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 7 - bob, 7, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // bec jaune
  ctx.fillStyle = "#f2b134";
  ctx.beginPath();
  ctx.moveTo(px + 16, y0 + 9 - bob);
  ctx.lineTo(px + 20, y0 + 13 - bob);
  ctx.lineTo(px + 12, y0 + 13 - bob);
  ctx.closePath();
  ctx.fill();
  // yeux
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 12, y0 + 4 - bob, 2, 3);
  ctx.fillRect(px + 18, y0 + 4 - bob, 2, 3);
  // serres
  ctx.fillStyle = "#f2b134";
  ctx.fillRect(px + 11, py + 26, 3, 5);
  ctx.fillRect(px + 18, py + 26, 3, 5);
}

function drawCondor(px, py, t) {
  const y0 = py - 12;
  const bob = Math.floor(t / 600) % 2;
  // ailes repliées
  ctx.fillStyle = "#1d1d24";
  ctx.fillRect(px + 2, y0 + 16, 6, 20);
  ctx.fillRect(px + 24, y0 + 16, 6, 20);
  // corps noir
  ctx.fillStyle = "#2b2b33";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 26, 11, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  // collerette blanche
  ctx.fillStyle = "#f5f0e0";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 13, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // tête rosée
  ctx.fillStyle = "#d98a6a";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 6 - bob, 6, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // bec
  ctx.fillStyle = "#f2d16b";
  ctx.fillRect(px + 20, y0 + 5 - bob, 6, 3);
  // yeux
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 13, y0 + 4 - bob, 2, 2);
  ctx.fillRect(px + 17, y0 + 4 - bob, 2, 2);
  // pattes
  ctx.fillStyle = "#8d96a0";
  ctx.fillRect(px + 11, py + 26, 3, 6);
  ctx.fillRect(px + 18, py + 26, 3, 6);
}

function drawCondorFly(px, py, dir, t) {
  // le condor en vol avec Yakari sur le dos (sprite du joueur)
  const y0 = py - 4;
  const flap = Math.floor(t / 240) % 2;
  // ailes
  ctx.fillStyle = "#2b2b33";
  if (flap === 0) {
    ctx.fillRect(px - 8, y0 + 10, 14, 6);
    ctx.fillRect(px + 26, y0 + 10, 14, 6);
    ctx.fillStyle = "#e8e3d8";
    ctx.fillRect(px - 8, y0 + 10, 4, 6);
    ctx.fillRect(px + 36, y0 + 10, 4, 6);
  } else {
    ctx.fillRect(px - 6, y0 + 3, 12, 6);
    ctx.fillRect(px + 26, y0 + 3, 12, 6);
    ctx.fillStyle = "#e8e3d8";
    ctx.fillRect(px - 6, y0 + 3, 4, 6);
    ctx.fillRect(px + 34, y0 + 3, 4, 6);
  }
  // corps
  ctx.fillStyle = "#2b2b33";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 15, 11, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // queue
  ctx.fillRect(px + 10, y0 + 21, 12, 7);
  // tête du condor (vers la direction)
  const hx = dir === "left" ? px + 3 : dir === "right" ? px + 29 : px + 16;
  const hy = dir === "up" ? y0 + 6 : dir === "down" ? y0 + 24 : y0 + 12;
  ctx.fillStyle = "#f5f0e0";       // collerette
  ctx.beginPath();
  ctx.ellipse(px + 16 + (hx - px - 16) * 0.5, y0 + 15 + (hy - y0 - 15) * 0.5, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d98a6a";
  ctx.beginPath();
  ctx.ellipse(hx, hy, 5, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2d16b";       // bec
  ctx.fillRect(hx - 1, hy - 6, 3, 4);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(hx - 3, hy - 2, 2, 2);
  ctx.fillRect(hx + 2, hy - 2, 2, 2);
  // Yakari sur le dos
  ctx.fillStyle = "#f0c48c";
  ctx.fillRect(px + 11, y0 - 2, 10, 9);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 11, y0 - 2, 10, 3);
  ctx.fillStyle = "#fff5e0";
  ctx.fillRect(px + 19, y0 - 8, 3, 7);
}

function drawGoat(px, py, t) {
  const y0 = py + 2;
  const bob = Math.floor(t / 500) % 2;
  // corps blanc
  ctx.fillStyle = "#f5f0e0";
  ctx.fillRect(px + 3, y0 + 12, 20, 11);
  ctx.fillRect(px + 5, y0 + 21, 4, 7);
  ctx.fillRect(px + 17, y0 + 21, 4, 7);
  // tête
  ctx.fillRect(px + 19, y0 + 2 - bob, 10, 11);
  // cornes
  ctx.fillStyle = "#8d96a0";
  ctx.fillRect(px + 19, y0 - 4 - bob, 3, 6);
  ctx.fillRect(px + 25, y0 - 4 - bob, 3, 6);
  // barbichette
  ctx.fillStyle = "#e0d8c8";
  ctx.fillRect(px + 23, y0 + 12 - bob, 3, 4);
  // œil + museau
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 23, y0 + 5 - bob, 2, 3);
  ctx.fillStyle = "#d9b380";
  ctx.fillRect(px + 26, y0 + 8 - bob, 3, 3);
}

function drawSnowball(px, py, t) {
  ctx.fillStyle = "#f5faff";
  ctx.beginPath();
  ctx.arc(px + 16, py + 17, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d5e5f2";
  ctx.beginPath();
  ctx.arc(px + 20, py + 21, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(px + 11, py + 12, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawStoneItem(px, py, t) {
  const tw = Math.floor(t / 300) % 2;
  ctx.fillStyle = "#8d96a0";
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 19, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a8b2bc";
  ctx.beginPath();
  ctx.ellipse(px + 13, py + 16, 4, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd93d";
  if (tw) { ctx.fillRect(px + 4, py + 6, 4, 4); ctx.fillRect(px + 25, py + 22, 3, 3); }
  else { ctx.fillRect(px + 24, py + 6, 4, 4); ctx.fillRect(px + 5, py + 22, 3, 3); }
}

function drawBoulder(px, py, t) {
  ctx.fillStyle = "#6f7a86";
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 14, 16, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8d96a0";
  ctx.beginPath();
  ctx.ellipse(px + 11, py + 8, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#4f5a66";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 8, py + 20);
  ctx.lineTo(px + 16, py + 14);
  ctx.lineTo(px + 22, py + 22);
  ctx.stroke();
}

/* ------------------------------------------------------------
   RENDU
   ------------------------------------------------------------ */
const nightCanvas = document.createElement("canvas");
nightCanvas.width = canvas.width;
nightCanvas.height = canvas.height;
const nctx = nightCanvas.getContext("2d");

function render(now) {
  updateLogic(now);
  const cam = camera();
  const t = now;

  // cases visibles
  const x0 = Math.floor(cam.x / TILE), y0 = Math.floor(cam.y / TILE);
  for (let y = y0; y <= y0 + VIEW_H; y++) {
    for (let x = x0; x <= x0 + VIEW_W; x++) {
      drawTile(tileAt(x, y), x, y, x * TILE - cam.x, y * TILE - cam.y, t);
    }
  }

  // entités + joueur, triés par profondeur
  const pp = playerPix(now);
  const drawList = entities.map(e => ({ y: e.y, fn: () => e.draw(e.x * TILE - cam.x, e.y * TILE - cam.y, t, e) }));
  const step = player.moving ? Math.floor(((now - player.moving.start) / player.moving.dur) * 2) % 2 : 0;
  drawList.push({
    y: player.y, fn: () => {
      const px = pp.x - cam.x, py = pp.y - cam.y;
      if (player.sprite === "ride") drawRider(px, py, player.dir, step, t);
      else if (player.sprite === "fly") drawCondorFly(px, py, player.dir, t);
      else drawYakari(px, py, player.dir, step);
    },
  });
  drawList.sort((a, b) => a.y - b.y);
  drawList.forEach(d => d.fn());

  // effets
  effects = effects.filter(fx => {
    const k = (now - fx.start) / 1000;
    const px = fx.x * TILE - cam.x, py = fx.y * TILE - cam.y;
    if (fx.type === "heart") {
      if (k > 1) return false;
      ctx.font = "16px sans-serif";
      ctx.globalAlpha = 1 - k;
      ctx.fillText("💛", px + 8, py - k * 24);
      ctx.globalAlpha = 1;
    } else if (fx.type === "poof") {
      if (k > 0.8) return false;
      ctx.globalAlpha = 1 - k / 0.8;
      ctx.fillStyle = "#e8e3d8";
      ctx.beginPath();
      ctx.arc(px + 16, py + 12 - k * 20, 8 + k * 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (fx.type === "sparkle") {
      if (k > 0.7) return false;
      ctx.font = "18px sans-serif";
      ctx.globalAlpha = 1 - k / 0.7;
      ctx.fillText("✨", px + 6, py + 8 - k * 20);
      ctx.globalAlpha = 1;
    } else if (fx.type === "smoke") {
      if (k > 2.4) return false;
      ctx.globalAlpha = Math.max(0, 0.9 - k / 2.4);
      ctx.fillStyle = "#e8e3d8";
      ctx.beginPath();
      ctx.arc(px + 16, py + 6 - k * 55, 7 + k * 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    return true;
  });

  // pluie
  if (raining) {
    ctx.strokeStyle = "rgba(210,228,240,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 34; i++) {
      const rx = ((i * 53 + t * 0.25) % (canvas.width + 60)) - 30;
      const ry = ((i * 97 + t * 0.55) % (canvas.height + 40)) - 20;
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 5, ry + 12);
    }
    ctx.stroke();
  }

  // nuit : obscurité trouée autour du joueur
  if (night) {
    nctx.clearRect(0, 0, nightCanvas.width, nightCanvas.height);
    nctx.fillStyle = "rgba(10,14,44,0.72)";
    nctx.fillRect(0, 0, nightCanvas.width, nightCanvas.height);
    nctx.globalCompositeOperation = "destination-out";
    const h = { x: pp.x - cam.x + 16, y: pp.y - cam.y + 16, r: 70 };
    const g = nctx.createRadialGradient(h.x, h.y, 10, h.x, h.y, h.r);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    nctx.fillStyle = g;
    nctx.beginPath();
    nctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
    nctx.fill();
    nctx.globalCompositeOperation = "source-over";
    ctx.drawImage(nightCanvas, 0, 0);
  }
  if (dawn) {
    ctx.fillStyle = "rgba(249,179,132,0.18)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // flèche d'objectif qui rebondit
  if (markerTarget) {
    const bump = Math.abs(Math.sin(t / 260)) * 6;
    const mx = markerTarget.x * TILE - cam.x + 16;
    const my = markerTarget.y * TILE - cam.y - 12 - bump;
    ctx.fillStyle = "#ffd93d";
    ctx.strokeStyle = "#b98a2f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mx, my + 10);
    ctx.lineTo(mx - 9, my - 4);
    ctx.lineTo(mx + 9, my - 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // fondu (le déclenchement de la suite est géré dans updateLogic)
  if (fade) {
    const k = Math.min(1, (now - fade.start) / fade.dur);
    ctx.fillStyle = `rgba(12,16,40,${fade.mode === "out" ? k : 1 - k})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  requestAnimationFrame(render);
}

function fadeOut(cb, dur = 900) {
  locked = true;
  fade = { start: performance.now(), dur, mode: "out", cb };
}
function fadeIn(dur = 900) {
  fade = { start: performance.now(), dur, mode: "in", cb: null };
}

/* ------------------------------------------------------------
   OUTILS DE PHASE
   ------------------------------------------------------------ */
function nearestMarker(list) {
  let best = null, bd = 1e9;
  for (const e of list) {
    const d = Math.abs(e.x - player.x) + Math.abs(e.y - player.y);
    if (d < bd) { bd = d; best = e; }
  }
  return best ? { x: best.x, y: best.y } : null;
}

function wait(ms, cb) { setTimeout(cb, ms); }

/* ============================================================
   PHASE 1 — LA RIVIÈRE ENDORMIE : la marmotte et les castors
   ============================================================ */
function startPhase1() {
  phase = 1;
  updateFeathers(0);
  setMap(MAP_RIVER);
  raining = false; night = false; dawn = false;
  player.x = 5; player.y = 8; player.dir = "up"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.caresses = 0; quest.marmotAwake = false;

  const marmot = {
    id: "marmot", x: 5, y: 5, solid: true, mode: "sleep",
    draw: (px, py, t, e) => drawMarmot(px, py, e.mode, t),
    onBump(e) {
      if (e.mode === "sleep") {
        quest.caresses++;
        sfx.pop();
        addFx("heart", e.x, e.y);
        if (quest.caresses === 1) narrate("La marmotte ronfle encore... Caresse-la !");
        else if (quest.caresses === 2) narrate("Elle baille... hi hi ! Encore une caresse !");
        else {
          e.mode = "awake";
          quest.marmotAwake = true;
          sfx.success();
          addFx("poof", e.x, e.y);
          narrate("La marmotte est réveillée, elle avait oublié le printemps ! Maintenant, va voir le castor près du barrage.");
          markerTarget = { x: 11, y: 3 };
        }
      } else {
        sfx.pop();
        addFx("heart", e.x, e.y);
      }
    },
  };
  const beaver = {
    id: "beaver", x: 11, y: 3, solid: true,
    draw: (px, py, t) => drawBeaver(px, py, t, false),
    onBump() {
      if (!quest.marmotAwake) {
        sfx.bump();
        narrate("Le castor travaille. Réveille d'abord la marmotte qui dort dans le pré !");
        return;
      }
      sfx.cri();
      locked = true;
      markerTarget = null;
      narrate("Le castor dit : il n'y a presque plus d'eau dans la rivière ! Nous avons fait un barrage pour garder la dernière eau. Sans eau, les castors ne peuvent pas vivre...");
      wait(6200, () => startPhase2());
    },
  };
  entities.push(marmot, beaver);
  markerTarget = { x: marmot.x, y: marmot.y };

  onMoveComplete = null;
  tileBumpHandler = null;

  narrate("C'est le printemps, mais la marmotte dort encore ! Va la réveiller. Marche avec les flèches, ou touche la carte.");
}

/* ============================================================
   PHASE 2 — L'ÉNIGME DE GRAND AIGLE : monter Petit Tonnerre
   ============================================================ */
function startPhase2() {
  phase = 2;
  updateFeathers(1);
  quest.riddle = false; quest.mounted = false;
  entities = []; effects = []; tapPath = null;
  locked = false;

  const marmot = {
    id: "marmot", x: 5, y: 5, solid: true, mode: "awake",
    draw: (px, py, t, e) => drawMarmot(px, py, e.mode, t),
    onBump(e) { sfx.pop(); addFx("heart", e.x, e.y); },
  };
  const beaver = {
    id: "beaver", x: 11, y: 3, solid: true,
    draw: (px, py, t) => drawBeaver(px, py, t, false),
    onBump() { sfx.cri(); narrate("Le castor s'inquiète : où est passée l'eau de la montagne ?"); },
  };
  const eagle = {
    id: "eagle", x: 16, y: 4, solid: true,
    draw: (px, py, t) => drawEagle(px, py, t),
    onBump() {
      if (quest.riddle) { sfx.cri(); narrate("Grand Aigle répète : celui qui a la tête dans les nuages connaît la source."); return; }
      quest.riddle = true;
      sfx.cri();
      narrate("Grand Aigle dit : celui qui a la tête dans les nuages connaît la source. L'eau vient de la montagne ! Monte sur Petit Tonnerre !");
      markerTarget = { x: 4, y: 10 };
    },
  };
  const pony = {
    id: "pony", x: 4, y: 10, solid: true, mode: "stand",
    draw: (px, py, t, e) => drawPony(px, py, e.mode, t),
    onBump(e) {
      if (!quest.riddle) {
        sfx.neigh();
        narrate("Petit Tonnerre broute. Va d'abord écouter Grand Aigle sur son rocher !");
        return;
      }
      quest.mounted = true;
      entities = entities.filter(x => x.id !== "pony");
      player.sprite = "ride";
      sfx.neigh();
      sfx.success();
      narrate("En selle ! Direction la montagne : sors du pré par le chemin, en bas à droite !");
      markerTarget = { x: 22, y: 11 };
    },
  };
  entities.push(marmot, beaver, eagle, pony);
  markerTarget = { x: eagle.x, y: eagle.y };

  onMoveComplete = () => {
    if (quest.mounted && player.y === 11 && player.x >= 22) {
      onMoveComplete = null;
      fadeOut(() => startPhase3());
    }
  };
  tileBumpHandler = null;

  narrate("Grand Aigle sait toujours quoi faire. Va le voir sur son rocher, à droite !");
}

/* ============================================================
   PHASE 3 — LE SENTIER DE LA MONTAGNE : l'avalanche
   ============================================================ */
function startPhase3() {
  phase = 3;
  updateFeathers(2);
  setMap(MAP_MOUNTAIN);
  player.x = 7; player.y = 12; player.dir = "up"; player.sprite = "ride"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.gap1 = false; quest.avalanche = false; quest.snowballs = 0; quest.condorMet = false;
  fadeIn();
  locked = false;

  const condor = {
    id: "condor", x: 12, y: 1, solid: true,
    draw: (px, py, t) => drawCondor(px, py, t),
    onBump() {
      if (quest.condorMet) return;
      quest.condorMet = true;
      locked = true;
      markerTarget = null;
      sfx.cri();
      narrate("C'est un condor, l'oiseau qui a la tête dans les nuages ! Il dit : je connais la source, monte sur mon dos ! Petit Tonnerre redescend attendre près de la rivière.");
      wait(7200, () => fadeOut(() => startPhase4(), 1400));
    },
  };
  entities.push(condor);
  markerTarget = { x: 3, y: 8 };

  function triggerAvalanche() {
    quest.avalanche = true;
    locked = true;
    tapPath = null;
    sfx.rumble();
    narrate("Gronde, gronde... Une avalanche !");
    const spots = [[6, 4], [7, 4], [6, 5], [7, 5]];
    spots.forEach(([sx, sy], i) => wait(500 + i * 350, () => {
      entities.push({
        id: "snow", x: sx, y: sy, solid: true,
        draw: (px, py, t) => drawSnowball(px, py, t),
        onBump(e) {
          entities = entities.filter(x => x !== e);
          quest.snowballs++;
          sfx.pop();
          addFx("poof", e.x, e.y);
          const left = 4 - quest.snowballs;
          if (left > 0) {
            narrate(left === 1 ? "Pouf ! Encore une boule de neige !" : `Pouf ! Encore ${left} boules de neige !`);
            markerTarget = nearestMarker(entities.filter(x => x.id === "snow"));
          } else {
            sfx.success();
            narrate("Le chemin est libre ! Monte tout en haut : un grand oiseau t'attend...");
            markerTarget = { x: condor.x, y: condor.y };
          }
        },
      });
      addFx("poof", sx, sy);
      sfx.bump();
    }));
    wait(2400, () => {
      locked = false;
      narrate("Des boules de neige bloquent le chemin ! Pousse-les une par une !");
      markerTarget = nearestMarker(entities.filter(x => x.id === "snow"));
    });
  }

  onMoveComplete = () => {
    if (!quest.gap1 && player.y <= 8) {
      quest.gap1 = true;
      narrate("Bien joué, Petit Tonnerre a le sabot sûr ! Continue à monter par le passage, à droite !");
      markerTarget = { x: 11, y: 5 };
    }
    if (!quest.avalanche && player.y <= 5) triggerAvalanche();
  };
  tileBumpHandler = null;

  narrate("Petit Tonnerre grimpe le sentier de la montagne. Suis le chemin qui monte dans la neige, par le passage à gauche !");
}

/* ============================================================
   PHASE 4 — SUR LE DOS DU CONDOR : le vol dans le ciel
   ============================================================ */
function startPhase4() {
  phase = 4;
  updateFeathers(3);
  setMap(MAP_SKY);
  player.x = 3; player.y = 2; player.dir = "right"; player.sprite = "fly"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.goats = 0;
  fadeIn(1400);
  locked = false;

  const goat1 = {
    id: "goat1", x: 6, y: 4, solid: true, greeted: false,
    draw: (px, py, t) => drawGoat(px, py, t),
    onBump(e) {
      sfx.baa();
      addFx("heart", e.x, e.y);
      if (e.greeted) return;
      e.greeted = true;
      quest.goats++;
      narrate("Bêêê ! Bonjour la chèvre des montagnes ! Il y en a une autre, là-bas !");
      markerTarget = { x: 13, y: 7 };
    },
  };
  const goat2 = {
    id: "goat2", x: 13, y: 7, solid: true, greeted: false,
    draw: (px, py, t) => drawGoat(px, py, t),
    onBump(e) {
      sfx.baa();
      addFx("heart", e.x, e.y);
      if (e.greeted) return;
      e.greeted = true;
      quest.goats++;
      narrate("Bêêê ! Les chèvres te saluent, Yakari ! Maintenant, vole vers le ruisseau, en bas à droite !");
      markerTarget = { x: 22, y: 11 };
    },
  };
  entities.push(goat1, goat2);
  markerTarget = { x: goat1.x, y: goat1.y };

  onMoveComplete = () => {
    if (player.x === 22 && player.y === 11) {
      if (quest.goats < 2) {
        narrate("Va d'abord dire bonjour aux chèvres des montagnes !");
        markerTarget = nearestMarker(entities.filter(e => !e.greeted));
        return;
      }
      onMoveComplete = null;
      fadeOut(() => startPhase5(), 1200);
    }
  };
  tileBumpHandler = null;

  narrate("Que c'est beau ! Yakari vole dans le ciel sur le dos du condor. Va dire bonjour aux chèvres des montagnes, sur les pics !");
}

/* ============================================================
   PHASE 5 — LE ROCHER TÊTU : les pierres lâchées du ciel
   ============================================================ */
function startPhase5() {
  phase = 5;
  updateFeathers(4);
  setMap(MAP_STREAM);
  player.x = 10; player.y = 6; player.dir = "left"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.boulderTried = false; quest.holding = false; quest.drops = 0;
  fadeIn(1200);
  locked = false;

  const boulder = {
    id: "boulder", x: 6, y: 4, solid: true,
    draw: (px, py, t) => drawBoulder(px, py, t),
    onBump() {
      sfx.bump();
      if (!quest.boulderTried) {
        quest.boulderTried = true;
        narrate("Oh ! Ce gros rocher est tombé avec une avalanche : il bloque le ruisseau ! Il est bien trop lourd... Ramasse une pierre qui brille pour le condor !");
        markerTarget = nearestMarker(entities.filter(e => e.id === "stone"));
      } else {
        narrate("Trop lourd ! Apporte une pierre qui brille au condor !");
      }
    },
  };
  const condor = {
    id: "condor", x: 14, y: 2, solid: true,
    draw: (px, py, t) => drawCondor(px, py, t),
    onBump() {
      if (!quest.holding) {
        sfx.cri();
        narrate("Le condor dit : apporte-moi une pierre qui brille, je la lâcherai sur le rocher !");
        if (quest.boulderTried) markerTarget = nearestMarker(entities.filter(e => e.id === "stone"));
        return;
      }
      quest.holding = false;
      quest.drops++;
      locked = true;
      markerTarget = null;
      sfx.cri();
      narrate("Le condor s'envole tout là-haut avec la pierre... et la lâche !");
      wait(2600, () => {
        if (quest.drops === 1) {
          sfx.bump();
          addFx("poof", 6, 3);
          narrate("Raté ! Pas assez grosse, le rocher n'a pas bougé. Cherche une autre pierre qui brille !");
          wait(3800, () => {
            locked = false;
            markerTarget = nearestMarker(entities.filter(e => e.id === "stone"));
          });
        } else if (quest.drops === 2) {
          sfx.bump();
          addFx("poof", 6, 3);
          addFx("poof", 7, 4);
          narrate("Boum... presque ! Le rocher a bougé un tout petit peu. Encore une pierre !");
          wait(3800, () => {
            locked = false;
            markerTarget = nearestMarker(entities.filter(e => e.id === "stone"));
          });
        } else {
          sfx.boom();
          addFx("poof", 6, 4);
          addFx("poof", 5, 4);
          addFx("sparkle", 6, 5);
          entities = entities.filter(x => x.id !== "boulder");
          setMap(MAP_STREAM_FLOW);
          sfx.splash();
          narrate("BOUM ! Le rocher roule sur le côté... L'eau coule à nouveau vers la vallée ! Hourra !");
          wait(5200, () => { sfx.tada(); fadeOut(() => startPhase6(), 1600); });
        }
      });
    },
  };
  entities.push(boulder, condor);

  const stoneSpots = [[3, 7], [11, 4], [13, 8]];
  for (const [sx, sy] of stoneSpots) {
    entities.push({
      id: "stone", x: sx, y: sy, solid: false, item: true,
      draw: (px, py, t) => drawStoneItem(px, py, t),
    });
  }
  markerTarget = { x: boulder.x, y: boulder.y };

  onMoveComplete = () => {
    if (tileAt(player.x, player.y) === "w") sfx.splash();
    const here = entities.find(e => e.item && e.x === player.x && e.y === player.y);
    if (here && here.id === "stone" && !quest.holding) {
      entities = entities.filter(e => e !== here);
      quest.holding = true;
      quest.boulderTried = true;
      sfx.pop();
      addFx("sparkle", here.x, here.y);
      narrate("Tu as une pierre qui brille ! Apporte-la au condor, sur la neige en haut !");
      markerTarget = { x: condor.x, y: condor.y };
    }
  };
  tileBumpHandler = null;

  narrate("Voilà le ruisseau ! Mais il est tout sec... Quelque chose bloque l'eau, là-haut. Va toucher le gros rocher !");
}

/* ============================================================
   PHASE 6 — L'EAU EST REVENUE : la fête des castors
   ============================================================ */
function startPhase6() {
  phase = 6;
  updateFeathers(5);
  setMap(MAP_RIVER_FULL);
  dawn = true;
  player.x = 5; player.y = 4; player.dir = "down"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.greeted = 0;
  fadeIn(1600);
  locked = false;

  function friendBump(e, text) {
    addFx("heart", e.x, e.y);
    if (e.greeted) return;
    e.greeted = true;
    quest.greeted++;
    narrate(text);
    if (quest.greeted === 1) markerTarget = { x: 14, y: 3 };
    else if (quest.greeted === 2) markerTarget = { x: 4, y: 10 };
    else markerTarget = { x: 16, y: 4 };
  }

  const beaver1 = {
    id: "beaver1", x: 9, y: 3, solid: true, greeted: false,
    draw: (px, py, t) => drawBeaver(px, py, t, true),
    onBump(e) { sfx.pop(); friendBump(e, "Le castor danse de joie : l'eau est revenue ! Merci Yakari ! Va voir son ami castor !"); },
  };
  const beaver2 = {
    id: "beaver2", x: 14, y: 3, solid: true, greeted: false,
    draw: (px, py, t) => drawBeaver(px, py, t, true),
    onBump(e) { sfx.pop(); friendBump(e, "Tous les castors sont sauvés ! Maintenant, va retrouver Petit Tonnerre !"); },
  };
  const pony = {
    id: "pony", x: 4, y: 10, solid: true, mode: "stand", greeted: false,
    draw: (px, py, t, e) => drawPony(px, py, e.mode, t),
    onBump(e) { sfx.neigh(); friendBump(e, "Hiii ! Petit Tonnerre est fier de toi ! Va voir Grand Aigle sur son rocher !"); },
  };
  const eagle = {
    id: "eagle", x: 16, y: 4, solid: true,
    draw: (px, py, t) => drawEagle(px, py, t),
    onBump() {
      if (quest.greeted < 3) {
        sfx.cri();
        narrate("Grand Aigle sourit : va d'abord faire la fête avec tes amis !");
        return;
      }
      victory();
    },
  };
  entities.push(beaver1, beaver2, pony, eagle);
  markerTarget = { x: beaver1.x, y: beaver1.y };

  onMoveComplete = null;
  tileBumpHandler = null;

  narrate("Le condor a redéposé Yakari près de la rivière, endormi comme après un rêve... Mais ce n'était pas un rêve : l'eau est revenue ! Va faire la fête avec les castors !");
}

/* ============================================================
   VICTOIRE
   ============================================================ */
function victory() {
  locked = true;
  markerTarget = null;
  updateFeathers(6);
  sfx.tada();
  narrate("Grand Aigle dit : je suis fier de toi, Yakari. Tu as trouvé la source et fait revenir l'eau ! Bravo, tu as fini l'aventure !");
  overlayTitle.textContent = "BRAVO ! 🎉";
  overlaySub.textContent = "L'eau est revenue : Yakari et le condor ont sauvé la rivière !";
  overlayBtn.textContent = "🔄 Rejouer";
  overlay.classList.remove("hidden");
  overlayBtn.onclick = () => location.reload();
}

/* ------------------------------------------------------------
   DÉMARRAGE — recharger la page = tout recommencer (voulu)
   ------------------------------------------------------------ */
buildFeathers();
updateFeathers(0);
setMap(MAP_RIVER);

overlayBtn.onclick = () => {
  overlay.classList.add("hidden");
  actx();                      // débloque l'audio (geste utilisateur)
  locked = false;
  startPhase1();
};

// le canvas remplit l'espace disponible sans se déformer
function fitCanvas() {
  const wrap = document.getElementById("stageWrap");
  const scale = Math.min(wrap.clientWidth / canvas.width, wrap.clientHeight / canvas.height);
  canvas.style.width = Math.floor(canvas.width * scale) + "px";
  canvas.style.height = Math.floor(canvas.height * scale) + "px";
}
window.addEventListener("resize", fitCanvas);
fitCanvas();

requestAnimationFrame(render);

// La logique avance aussi via un minuteur : le jeu ne se fige pas
// si le navigateur met l'animation en pause (onglet masqué, etc.)
setInterval(() => updateLogic(performance.now()), 120);
