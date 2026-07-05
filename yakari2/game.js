/* ============================================================
   YAKARI SUR L'ÎLE — v2 « plateau »
   Jeu façon Game Boy Color (vue de dessus, déplacement case
   par case, on marche contre les choses pour interagir).
   Retrace l'épisode 17 « Les prisonniers de l'île ».
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
  growl() { tone(110, 0.4, "sawtooth", 0.12); tone(95, 0.4, "sawtooth", 0.1, 0.1); },
  cri() { tone(980, 0.15, "sine", 0.15); tone(1100, 0.2, "sine", 0.12, 0.12); },
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
   G herbe · D chemin · T arbre · W eau · S gué · R rocher
   C grotte · F feu de camp · h trou · t tipi · f fleurs · p flaque
   ------------------------------------------------------------ */
const MAP_VILLAGE = [
  "TTTTTTTTTTTTTTTTTTTT",
  "TGGfGGGGGGGGGGGfGGGT",
  "TGtGGGGtGGGGGtGGGGGT",
  "TGGGGGGGGGGGGGGGGGGT",
  "TGGDDDDDDDDDDDDDDGGT",
  "TGtDGGGGGGGGGGGGDGGT",
  "TGGDGGGGtGGfGGGGDDDD",
  "TGGDGGGGGGGGGGGGDGGT",
  "TGtDGGfGGGGtGGGGDGGT",
  "TGGDDDDDDDDDDDDDDGGT",
  "TGGGGGGGGGGGGGGGGGGT",
  "TTTTTTTTTTTTTTTTTTTT",
];
const MAP_PATH = [
  "TTTTTTTTTTTTTTTTTTTTTTTT",
  "TGGGGpGGGGGGpGGGGGGGGRRT",
  "TGGGGpGGppGGpGGppGGGRRCT",
  "DGGppGGGGGGGGGGGGGGGGGGT",
  "TGGGGGGppGGGpppGGGGGGGGT",
  "TGppGGGGGGGGGGGGppGGGGGT",
  "TGGGGGppGGGppGGGGGGGppGT",
  "TGGGGGGGGGGGGGGGGGGGGGGT",
  "TGGppGGGGppGGGGGppGGGGGT",
  "TGGGGGGGGGGGGGGGGGGGGGGT",
  "TGGGGGGGGGGGGGGGGGGGGGGT",
  "TTTTTTTTTTTTTTTTTTTTTTTT",
];
const MAP_ISLAND = [
  "WWWWWWWWWWWWWWWWWWWW",
  "WWWWWWWWWWWWWWWWWWWW",
  "WWWGGGGGGGGGGGGGGWWW",
  "WWGGGRRCRRGGGGGGGGWW",
  "WWGGGGGGGGGGGGTGGGWW",
  "WWGTGGGGGGGGGGGGGGWW",
  "WWGGGGGGFGGGGGGGTGWW",
  "WWGGGGGGGGGGGhGGGGWW",
  "WWGGTGGGGGGGGGGGGGWW",
  "WWGGGGGGGGGGGGGTGGWW",
  "WWWGGGGGGGGGGGGGWWWW",
  "WWWWGGGGGGGGGGWWWWWW",
  "WWWWWWWWWWWWWWWWWWWW",
  "WWWWWWWWWWWWWWWWWWWW",
];
const MAP_CROSSING = [
  "WWWWWWWWWWWWWWWWWWWWWWWWWW",
  "WWGGGWWWWWWWWWWWWWWGGGGGWW",
  "WGGGGGWWWWWWWWWWWWGGGGGGGW",
  "WGGGGGSSSSWWWWWWWWGGtGGGGW",
  "WGGGGGWWWSSSSSWWWWGGGGGGGW",
  "WGGGGGWWWWWWWSSSSGGGGDGGGW",
  "WGGGGGWWWWWWWWWWWWGGGtGGGW",
  "WWGGGWWWWWWWWWWWWWGGGGGGWW",
  "WWWGGWWWWWWWWWWWWWWGGGGWWW",
  "WWWWWWWWWWWWWWWWWWWWWWWWWW",
];

const SOLID_TILES = "TWRCFthp";

/* ------------------------------------------------------------
   ÉTAT DU JEU
   ------------------------------------------------------------ */
let map = MAP_VILLAGE;
let mapW = 20, mapH = 12;
let phase = 0;
let locked = true;               // entrées bloquées (titre, cinématiques)
let raining = false;
let night = false;
let dawn = false;
let fireLit = false;

const player = {
  x: 4, y: 7,                    // case
  dir: "down",
  sprite: "walk",                // walk | ride | elkride
  moving: null,                  // {fx,fy,tx,ty,start,dur}
};
let entities = [];               // pnj, objets, branches...
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
  // fond herbe / eau selon la case
  if (chr === "W") {
    ctx.fillStyle = "#3f78c8";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#5b93dd";
    const ph = Math.floor(t / 550 + (x + y) / 2) % 2;
    ctx.fillRect(px + 4 + ph * 8, py + 8, 10, 3);
    ctx.fillRect(px + 14 - ph * 6, py + 22, 10, 3);
    return;
  }
  if (chr === "S") {
    ctx.fillStyle = "#7fb2d9";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#b8c8d4";
    ctx.fillRect(px + 4, py + 6, 9, 7);
    ctx.fillRect(px + 18, py + 10, 9, 7);
    ctx.fillRect(px + 10, py + 20, 9, 7);
    return;
  }
  // herbe de base
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
    case "p":
      ctx.fillStyle = "#7fb2d9";
      ctx.beginPath();
      ctx.ellipse(px + 16, py + 17, 13, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#a8cde8";
      ctx.beginPath();
      ctx.ellipse(px + 13, py + 14, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "R":
      ctx.fillStyle = "#8d96a0";
      ctx.fillRect(px + 2, py + 6, 28, 24);
      ctx.fillStyle = "#a8b2bc";
      ctx.fillRect(px + 5, py + 9, 12, 8);
      break;
    case "C":
      ctx.fillStyle = "#8d96a0";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#241a10";
      ctx.beginPath();
      ctx.arc(px + 16, py + 30, 13, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(px + 3, py + 30, 26, 2);
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
    case "F": {
      ctx.fillStyle = "#9aa8a0";
      [[4, 22], [12, 26], [22, 22], [8, 14], [18, 12]].forEach(([ox, oy]) => {
        ctx.fillRect(px + ox, py + oy, 6, 5);
      });
      ctx.fillStyle = "#8a5a2b";
      ctx.fillRect(px + 9, py + 16, 14, 5);
      if (fireLit) {
        const fl = Math.floor(t / 180) % 2;
        ctx.fillStyle = "#ff8c2b";
        ctx.fillRect(px + 10, py + 2 + fl * 2, 12, 14 - fl * 2);
        ctx.fillStyle = "#ffd93d";
        ctx.fillRect(px + 13, py + 7 + fl, 6, 9);
      }
      break;
    }
    case "h":
      ctx.fillStyle = "#5c4a33";
      ctx.beginPath();
      ctx.ellipse(px + 16, py + 18, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a2e1f";
      ctx.beginPath();
      ctx.ellipse(px + 16, py + 18, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();
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

function drawGirl(px, py, dir, t) {
  const y0 = py - 2;
  ctx.fillStyle = "#e8b476";
  ctx.fillRect(px + 11, y0 + 24, 4, 6);
  ctx.fillRect(px + 17, y0 + 24, 4, 6);
  // robe
  ctx.fillStyle = "#f2b134";
  ctx.beginPath();
  ctx.moveTo(px + 16, y0 + 10);
  ctx.lineTo(px + 25, y0 + 26);
  ctx.lineTo(px + 7, y0 + 26);
  ctx.closePath();
  ctx.fill();
  // tête
  ctx.fillStyle = "#f0c48c";
  ctx.fillRect(px + 8, y0, 16, 13);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 8, y0, 16, 5);
  ctx.fillRect(px + 5, y0 + 2, 4, 12);   // nattes
  ctx.fillRect(px + 23, y0 + 2, 4, 12);
  ctx.fillStyle = "#d64545";
  ctx.fillRect(px + 8, y0 + 4, 16, 2);   // bandeau
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 12, y0 + 8, 2, 3);
  ctx.fillRect(px + 18, y0 + 8, 2, 3);
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

function drawElk(px, py, big, bandage, t) {
  const s = big ? 1.25 : 1;
  const y0 = py + (big ? -4 : 2);
  ctx.fillStyle = "#9b6a3f";
  ctx.fillRect(px + 4, y0 + 12, 24 * s, 11);
  ctx.fillStyle = "#8a5a33";
  ctx.fillRect(px + 6, y0 + 21, 4, 8);
  ctx.fillRect(px + 20, y0 + 21, 4, 8);
  if (bandage) {
    ctx.fillStyle = "#fff5e0";
    ctx.fillRect(px + 19, y0 + 22, 6, 6);
  }
  // tête
  ctx.fillStyle = "#9b6a3f";
  ctx.fillRect(px + 22, y0 + 2, 10, 12);
  ctx.fillStyle = "#8a5a33";
  ctx.fillRect(px + 29, y0 + 8, 6, 6);      // museau
  ctx.fillRect(px + 21, y0 - 3, 3, 6);      // oreilles
  ctx.fillRect(px + 27, y0 - 3, 3, 6);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 25, y0 + 6, 2, 3);
}

function drawElkRider(px, py, dir, step, t) {
  // maman élan qui nage avec Yakari et Arc-en-ciel sur le dos
  const y0 = py - 6;
  const bob = Math.floor(t / 260) % 2;
  ctx.fillStyle = "#9b6a3f";
  ctx.fillRect(px + 2, y0 + 18 + bob, 28, 12);
  ctx.fillStyle = "#8a5a33";
  const hx = dir === "left" ? px : px + 22;
  ctx.fillRect(hx, y0 + 8 + bob, 10, 12);
  ctx.fillRect(hx + 2, y0 + 2 + bob, 3, 7);
  ctx.fillRect(hx + 6, y0 + 2 + bob, 3, 7);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(hx + (dir === "left" ? 2 : 5), y0 + 12 + bob, 2, 2);
  // vaguelettes
  ctx.fillStyle = "#a8cde8";
  ctx.fillRect(px - 2, y0 + 28 + bob, 8, 3);
  ctx.fillRect(px + 26, y0 + 26 - bob, 8, 3);
  // Yakari
  ctx.fillStyle = "#f0c48c";
  ctx.fillRect(px + 6, y0 + 6 + bob, 9, 9);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 6, y0 + 6 + bob, 9, 3);
  ctx.fillStyle = "#fff5e0";
  ctx.fillRect(px + 13, y0 + 1 + bob, 3, 6);
  // Arc-en-ciel
  ctx.fillStyle = "#f0c48c";
  ctx.fillRect(px + 17, y0 + 6 + bob, 9, 9);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 17, y0 + 6 + bob, 9, 3);
  ctx.fillStyle = "#d64545";
  ctx.fillRect(px + 17, y0 + 8 + bob, 9, 2);
}

function drawLynx(px, py, t) {
  const y0 = py + 2;
  ctx.fillStyle = "#7d5a36";
  ctx.fillRect(px + 4, y0 + 14, 22, 11);
  ctx.fillRect(px + 6, y0 + 23, 4, 6);
  ctx.fillRect(px + 20, y0 + 23, 4, 6);
  ctx.fillStyle = "#8a6540";
  ctx.fillRect(px + 8, y0 + 2, 16, 14);
  // oreilles à pinceaux
  ctx.fillRect(px + 8, y0 - 4, 4, 7);
  ctx.fillRect(px + 20, y0 - 4, 4, 7);
  ctx.fillStyle = "#2d2013";
  ctx.fillRect(px + 9, y0 - 6, 2, 3);
  ctx.fillRect(px + 21, y0 - 6, 2, 3);
  // gros yeux jaunes qui brillent
  const blink = Math.floor(t / 700) % 5 === 4;
  ctx.fillStyle = "#ffd93d";
  if (!blink) {
    ctx.fillRect(px + 11, y0 + 6, 4, 5);
    ctx.fillRect(px + 17, y0 + 6, 4, 5);
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(px + 12, y0 + 8, 2, 3);
    ctx.fillRect(px + 18, y0 + 8, 2, 3);
  } else {
    ctx.fillRect(px + 11, y0 + 8, 4, 2);
    ctx.fillRect(px + 17, y0 + 8, 4, 2);
  }
}

function drawPapa(px, py, t) {
  const y0 = py - 8;
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(px + 10, y0 + 28, 5, 10);
  ctx.fillRect(px + 17, y0 + 28, 5, 10);
  ctx.fillStyle = "#c96a2b";
  ctx.fillRect(px + 7, y0 + 14, 18, 16);
  ctx.fillStyle = "#f0c48c";
  ctx.fillRect(px + 7, y0, 18, 15);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 7, y0, 18, 5);
  ctx.fillRect(px + 11, y0 + 7, 2, 3);
  ctx.fillRect(px + 19, y0 + 7, 2, 3);
  // trois plumes
  ctx.fillStyle = "#fff5e0";
  ctx.fillRect(px + 9, y0 - 8, 4, 9);
  ctx.fillRect(px + 14, y0 - 10, 4, 11);
  ctx.fillRect(px + 19, y0 - 8, 4, 9);
  ctx.fillStyle = "#d64545";
  ctx.fillRect(px + 14, y0 - 10, 4, 3);
}

function drawLogItem(px, py, t) {
  const tw = Math.floor(t / 300) % 2;
  ctx.fillStyle = "#a5713d";
  ctx.fillRect(px + 6, py + 14, 20, 7);
  ctx.fillRect(px + 9, py + 8, 14, 6);
  ctx.strokeStyle = "#6b4a2a";
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 6, py + 14, 20, 7);
  ctx.fillStyle = "#ffd93d";
  if (tw) { ctx.fillRect(px + 4, py + 4, 4, 4); ctx.fillRect(px + 24, py + 22, 3, 3); }
  else { ctx.fillRect(px + 24, py + 4, 4, 4); ctx.fillRect(px + 5, py + 22, 3, 3); }
}

function drawSplintItem(px, py, t) {
  const tw = Math.floor(t / 300) % 2;
  ctx.fillStyle = "#fff5e0";
  ctx.fillRect(px + 7, py + 12, 18, 9);
  ctx.strokeStyle = "#d6b98a";
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 7, py + 12, 18, 9);
  ctx.beginPath();
  ctx.moveTo(px + 13, py + 12); ctx.lineTo(px + 13, py + 21);
  ctx.moveTo(px + 19, py + 12); ctx.lineTo(px + 19, py + 21);
  ctx.stroke();
  ctx.fillStyle = "#ffd93d";
  if (tw) ctx.fillRect(px + 4, py + 6, 4, 4);
  else ctx.fillRect(px + 24, py + 6, 4, 4);
}

function drawBranch(px, py, t) {
  ctx.strokeStyle = "#8a5a2b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(px + 5, py + 8); ctx.lineTo(px + 27, py + 24);
  ctx.moveTo(px + 27, py + 8); ctx.lineTo(px + 5, py + 24);
  ctx.stroke();
  ctx.strokeStyle = "#6b4a2a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 10, py + 12); ctx.lineTo(px + 22, py + 20);
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
      else if (player.sprite === "elkride") drawElkRider(px, py, player.dir, step, t);
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

  // nuit : obscurité trouée autour du joueur et du feu
  if (night) {
    nctx.clearRect(0, 0, nightCanvas.width, nightCanvas.height);
    nctx.fillStyle = "rgba(10,14,44,0.72)";
    nctx.fillRect(0, 0, nightCanvas.width, nightCanvas.height);
    nctx.globalCompositeOperation = "destination-out";
    const holes = [{ x: pp.x - cam.x + 16, y: pp.y - cam.y + 16, r: 70 }];
    if (firePos) holes.push({ x: firePos.x * TILE - cam.x + 16, y: firePos.y * TILE - cam.y + 16, r: 85 });
    for (const h of holes) {
      const g = nctx.createRadialGradient(h.x, h.y, 10, h.x, h.y, h.r);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      nctx.fillStyle = g;
      nctx.beginPath();
      nctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
      nctx.fill();
    }
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
let firePos = null;

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
   PHASE 1 — LE VILLAGE SOUS LA PLUIE : réveiller Petit Tonnerre
   ============================================================ */
function startPhase1() {
  phase = 1;
  updateFeathers(0);
  setMap(MAP_VILLAGE);
  raining = true; night = false; dawn = false; fireLit = false; firePos = null;
  player.x = 4; player.y = 7; player.dir = "right"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.caresses = 0; quest.mounted = false;

  const pony = {
    id: "pony", x: 13, y: 7, solid: true, mode: "sleep",
    draw: (px, py, t, e) => drawPony(px, py, e.mode, t),
    onBump(e) {
      if (e.mode === "sleep") {
        quest.caresses++;
        sfx.pop();
        addFx("heart", e.x, e.y);
        if (quest.caresses === 1) narrate("Petit Tonnerre dort. Caresse-le encore !");
        if (quest.caresses === 2) narrate("Il ouvre un œil... Encore une caresse !");
        if (quest.caresses >= 3) {
          e.mode = "stand";
          sfx.neigh();
          narrate("Hiii ! Petit Tonnerre est réveillé ! Touche-le encore pour monter sur son dos.");
        }
      } else {
        // on monte !
        quest.mounted = true;
        entities = entities.filter(x => x.id !== "pony");
        player.sprite = "ride";
        sfx.success();
        narrate("En selle ! Sors du village par le chemin, à droite !");
        markerTarget = { x: 18, y: 6 };
      }
    },
  };
  entities.push(pony);
  markerTarget = { x: pony.x, y: pony.y };

  onMoveComplete = () => {
    if (quest.mounted && player.y === 6 && player.x >= 18) {
      onMoveComplete = null;
      fadeOut(() => startPhase2());
    }
  };
  tileBumpHandler = null;

  narrate("Il pleut depuis des jours et Arc-en-ciel a disparu ! Va réveiller Petit Tonnerre, il dort près des tipis. Marche avec les flèches, ou touche la carte.");
}

/* ============================================================
   PHASE 2 — LE CHEMIN DE LA COLLINE : trouver la grotte
   ============================================================ */
function startPhase2() {
  phase = 2;
  updateFeathers(1);
  setMap(MAP_PATH);
  raining = true;
  player.x = 1; player.y = 3; player.dir = "right"; player.sprite = "ride"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  markerTarget = { x: 22, y: 2 };
  fadeIn();
  locked = false;

  narrate("Au galop ! Trouve la grotte secrète d'Arc-en-ciel, tout en haut à droite. Passe entre les grosses flaques !");

  tileBumpHandler = (tx, ty, ch) => {
    if (ch === "C") {
      tileBumpHandler = null;
      markerTarget = null;
      locked = true;
      sfx.success();
      narrate("Arc-en-ciel est là ! « Bienvenue dans mon refuge secret ! » Il pleut trop fort pour rentrer : tout le monde dort dans la grotte.");
      wait(4800, () => fadeOut(() => startPhase3(), 1600));
    } else {
      sfx.bump();
    }
  };
  onMoveComplete = null;
}

/* ============================================================
   PHASE 3 — PRISONNIERS DE L'ÎLE : le bois et le feu
   ============================================================ */
function startPhase3() {
  phase = 3;
  updateFeathers(2);
  setMap(MAP_ISLAND);
  raining = false;
  player.x = 7; player.y = 5; player.dir = "down"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.logs = 0; quest.fireDone = false;
  firePos = { x: 8, y: 6 };
  fadeIn(1600);
  locked = false;

  narrate("Au matin, la rivière a tout recouvert : vous êtes prisonniers de l'île ! Il faut prévenir papa. Ramasse les 4 morceaux de bois sec qui brillent !");

  const girl = {
    id: "girl", x: 9, y: 4, solid: true,
    draw: (px, py, t) => drawGirl(px, py, "down", t),
    onBump() {
      sfx.cri();
      narrate(quest.logs < 4
        ? "Arc-en-ciel : « Le bois qui brille est bien sec, il va vite s'allumer ! »"
        : "Arc-en-ciel : « Vite, au feu de camp ! »");
    },
  };
  const pony = {
    id: "pony2", x: 11, y: 5, solid: true, mode: "stand",
    draw: (px, py, t, e) => drawPony(px, py, e.mode, t),
    onBump() { sfx.neigh(); narrate("Petit Tonnerre : « Hiii ! Je surveille l'île ! »"); },
  };
  entities.push(girl, pony);

  const logSpots = [[3, 6], [11, 10], [16, 4], [6, 9]];
  for (const [lx, ly] of logSpots) {
    entities.push({
      id: "log", x: lx, y: ly, solid: false, item: true,
      draw: (px, py, t) => drawLogItem(px, py, t),
    });
  }
  const logsLeft = () => entities.filter(e => e.id === "log");
  markerTarget = nearestMarker(logsLeft());

  onMoveComplete = () => {
    const here = entities.find(e => e.item && e.x === player.x && e.y === player.y);
    if (here && here.id === "log") {
      entities = entities.filter(e => e !== here);
      quest.logs++;
      sfx.pop();
      addFx("sparkle", here.x, here.y);
      const left = 4 - quest.logs;
      if (left > 0) {
        narrate(left === 1 ? "Super ! Encore un dernier morceau de bois !" : `Bien joué ! Encore ${left} morceaux de bois !`);
        markerTarget = nearestMarker(logsLeft());
      } else {
        narrate("Tu as tout le bois ! Apporte-le au feu de camp, au milieu de l'île !");
        markerTarget = { ...firePos };
      }
    }
  };

  tileBumpHandler = (tx, ty, ch) => {
    if (ch === "F") {
      if (quest.logs < 4) {
        sfx.bump();
        narrate("Il faut d'abord ramasser les 4 morceaux de bois sec qui brillent !");
        return;
      }
      if (quest.fireDone) return;
      quest.fireDone = true;
      tileBumpHandler = null;
      markerTarget = null;
      locked = true;
      fireLit = true;
      sfx.success();
      narrate("Le feu brille ! Regarde : un, deux, trois nuages de fumée montent vers le ciel !");
      addFx("smoke", firePos.x, firePos.y - 1);
      wait(1100, () => addFx("smoke", firePos.x, firePos.y - 1));
      wait(2200, () => addFx("smoke", firePos.x, firePos.y - 1));
      wait(4200, () => { sfx.tada(); startPhase4(); });
    } else if (ch === "C") {
      sfx.cri();
      narrate("La grotte d'Arc-en-ciel. Son refuge est devenu une île !");
    } else {
      sfx.bump();
    }
  };
}

/* ============================================================
   PHASE 4 — LE PETIT ÉLAN COINCÉ : branches puis attelle
   ============================================================ */
function startPhase4() {
  phase = 4;
  updateFeathers(3);
  locked = false;
  quest.branches = 0; quest.hasSplint = false; quest.elkFree = false;
  sfx.cri();
  narrate("Tu entends ce cri ? Un petit élan est coincé dans le trou, là-bas à droite ! Enlève les branches en marchant dessus !");

  const branchSpots = [[12, 7], [14, 7], [13, 6], [13, 8]];
  for (const [bx, by] of branchSpots) {
    entities.push({
      id: "branch", x: bx, y: by, solid: true,
      draw: (px, py, t) => drawBranch(px, py, t),
      onBump(e) {
        entities = entities.filter(x => x !== e);
        quest.branches++;
        sfx.pop();
        addFx("poof", e.x, e.y);
        const left = 4 - quest.branches;
        if (left > 0) {
          narrate(left === 1 ? "Encore une branche !" : `Encore ${left} branches !`);
          markerTarget = nearestMarker(entities.filter(x => x.id === "branch"));
        } else {
          revealElk();
        }
      },
    });
  }
  markerTarget = nearestMarker(entities.filter(x => x.id === "branch"));

  function revealElk() {
    sfx.cri();
    const elk = {
      id: "elk", x: 13, y: 7, solid: true, bandage: false,
      draw: (px, py, t, e) => drawElk(px, py, false, e.bandage, t),
      onBump(e) {
        if (!quest.hasSplint) {
          sfx.cri();
          narrate("Le petit élan a la patte cassée. Va chercher l'attelle qui brille près de la grotte !");
          markerTarget = { x: 6, y: 4 };
        } else if (!quest.elkFree) {
          quest.elkFree = true;
          e.bandage = true;
          e.x = 14; e.y = 8;      // il sort du trou
          sfx.success();
          addFx("heart", e.x, e.y);
          markerTarget = null;
          narrate("Bravo ! Arc-en-ciel soigne sa patte avec l'attelle. Le petit élan est sauvé ! La nuit tombe, il faut dormir.");
          wait(4600, () => fadeOut(() => startPhase5(), 1400));
        }
      },
    };
    entities.push(elk);
    entities.push({
      id: "splint", x: 6, y: 4, solid: false, item: true,
      draw: (px, py, t) => drawSplintItem(px, py, t),
    });
    narrate("Le petit élan est là, dans le trou ! Sa patte est cassée. Va chercher l'attelle qui brille près de la grotte !");
    markerTarget = { x: 6, y: 4 };
  }

  onMoveComplete = () => {
    const here = entities.find(e => e.item && e.x === player.x && e.y === player.y);
    if (here && here.id === "splint") {
      entities = entities.filter(e => e !== here);
      quest.hasSplint = true;
      sfx.pop();
      addFx("sparkle", here.x, here.y);
      narrate("Tu as l'attelle ! Rapporte-la au petit élan dans le trou !");
      const elk = entities.find(e => e.id === "elk");
      if (elk) markerTarget = { x: elk.x, y: elk.y };
    }
  };

  tileBumpHandler = (tx, ty, ch) => {
    if (ch === "h") { sfx.cri(); narrate("C'est le trou du petit élan. Enlève les branches autour !"); }
    else sfx.bump();
  };
}

/* ============================================================
   PHASE 5 — LA NUIT : faire fuir le lynx
   ============================================================ */
function startPhase5() {
  phase = 5;
  updateFeathers(4);
  night = true;
  fadeIn(1400);
  locked = false;
  quest.lynxHits = 0;

  narrate("Grand Aigle a prévenu Yakari : une île n'est pas toujours déserte... Un lynx rôde dans le noir ! Va lui faire peur !");

  const spots = [[3, 10], [16, 9], [4, 2]];
  function placeLynx(i) {
    const [lx, ly] = spots[i % spots.length];
    const lynx = {
      id: "lynx", x: lx, y: ly, solid: true,
      draw: (px, py, t) => drawLynx(px, py, t),
      onBump(e) {
        entities = entities.filter(x => x !== e);
        quest.lynxHits++;
        sfx.growl();
        addFx("poof", e.x, e.y);
        if (quest.lynxHits < 3) {
          narrate(quest.lynxHits === 1 ? "Le lynx s'enfuit... mais il revient ailleurs ! Trouve-le !" : "Encore une fois ! Fais-lui peur !");
          wait(900, () => placeLynx(quest.lynxHits));
        } else {
          markerTarget = null;
          sfx.success();
          narrate("Hourra ! Le lynx est parti pour de bon. Tout le monde peut dormir. Bonne nuit !");
          wait(3800, () => fadeOut(() => startPhase6(), 1800));
        }
      },
    };
    entities.push(lynx);
    markerTarget = { x: lx, y: ly };
  }
  placeLynx(0);

  onMoveComplete = null;
  tileBumpHandler = (tx, ty, ch) => { sfx.bump(); };
}

/* ============================================================
   PHASE 6 — LA TRAVERSÉE : le gué sur le dos de maman élan
   ============================================================ */
function startPhase6() {
  phase = 6;
  updateFeathers(5);
  setMap(MAP_CROSSING);
  night = false; dawn = true; fireLit = false; firePos = null;
  player.x = 3; player.y = 4; player.dir = "right"; player.sprite = "elkride"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  fadeIn(1600);
  locked = false;

  narrate("Le soleil est revenu et l'eau a baissé ! Maman élan porte Yakari et Arc-en-ciel. Traverse le gué de pierres pour retrouver papa !");

  const papa = {
    id: "papa", x: 22, y: 5, solid: true,
    draw: (px, py, t) => drawPapa(px, py, t),
    onBump() { victory(); },
  };
  entities.push(papa);
  markerTarget = { x: papa.x, y: papa.y };

  // Petit Tonnerre nage juste derrière
  const pony = {
    id: "ponyFollow", x: 2, y: 4, solid: false,
    draw: (px, py, t) => drawPony(px, py, "stand", t),
  };
  entities.push(pony);
  onMoveComplete = (prev) => {
    pony.x = prev.x; pony.y = prev.y;
    if (tileAt(player.x, player.y) === "S") sfx.splash();
  };
  tileBumpHandler = (tx, ty, ch) => { sfx.bump(); };
}

/* ============================================================
   VICTOIRE
   ============================================================ */
function victory() {
  locked = true;
  markerTarget = null;
  updateFeathers(6);
  sfx.tada();
  narrate("Papa a vu les signaux de fumée ! Tout le monde est sauvé, et le petit élan a retrouvé sa maman. Bravo, tu as fini l'aventure !");
  overlayTitle.textContent = "BRAVO ! 🎉";
  overlaySub.textContent = "Yakari, Arc-en-ciel et le petit élan sont sauvés !";
  overlayBtn.textContent = "🔄 Rejouer";
  overlay.classList.remove("hidden");
  overlayBtn.onclick = () => location.reload();
}

/* ------------------------------------------------------------
   DÉMARRAGE — recharger la page = tout recommencer (voulu)
   ------------------------------------------------------------ */
buildFeathers();
updateFeathers(0);
setMap(MAP_VILLAGE);
raining = true;

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
