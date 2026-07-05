/* ============================================================
   YAKARI ENGINE — moteur commun des jeux Yakari « plateau »
   Jeu façon Game Boy Color : vue de dessus, déplacement case
   par case, caméra qui suit, on marche contre les choses pour
   interagir. Zéro dépendance, zéro fichier externe.

   Un jeu = un dossier avec index.html + game.js. Le game.js :
   - déclare ses cartes ASCII et assigne SOLID_TILES ;
   - définit drawTile(chr, x, y, px, py, t) pour ses cases ;
   - redéfinit drawPlayerSprite(...) si Yakari a des montures ;
   - peut ajouter des sons : Object.assign(sfx, {...}) ;
   - peut brancher tileSolidHook / logicTickHook /
     renderOverlayHook pour ses règles spéciales ;
   - crée ses phases (startPhase1...) et appelle
     startEngine(startPhase1) à la fin.

   La logique avance sur un minuteur (setInterval) séparé du
   rendu (requestAnimationFrame), sur le temps absolu
   (performance.now()) : le jeu ne se fige pas si le navigateur
   met l'animation en pause. Recharger la page = tout
   recommencer (voulu).
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
// sons de base — chaque jeu peut en ajouter : Object.assign(sfx, {...})
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
   ÉTAT DU JEU (partagé avec le game.js, scripts classiques)
   ------------------------------------------------------------ */
let SOLID_TILES = "";            // assigné par le jeu
let map = [""];
let mapW = 1, mapH = 1;
let phase = 0;
let locked = true;               // entrées bloquées (titre, cinématiques)
let raining = false;             // pluie
let snowing = false;             // neige
let night = false;               // obscurité trouée de halos
let dawn = false;                // teinte d'aube
let lightPos = null;             // {x,y} 2e halo la nuit (feu, lanterne...)
let smokeColor = "#e8e3d8";      // couleur de la fumée (cendres d'éruption...)

const player = {
  x: 0, y: 0,                    // case
  dir: "down",
  sprite: "walk",                // le jeu décide des variantes (ride, canoe...)
  moving: null,                  // {fx,fy,tx,ty,start,dur}
};
let entities = [];               // pnj, objets... ({glow:true} = halo la nuit)
let effects = [];                // cœurs, pouf, étincelles, fumée, splash
let markerTarget = null;         // {x,y} objectif avec flèche qui rebondit
let tileBumpHandler = null;      // interaction avec une case spéciale
let onMoveComplete = null;       // vérifié après chaque pas
let fade = null;                 // {start,dur,mode:'out'|'in',cb}
let lastBump = 0;

const quest = {};                // compteurs de la phase en cours

/* Crochets optionnels, branchés par le jeu */
let tileSolidHook = null;        // (chr, x, y) => bool | undefined
let logicTickHook = null;        // (now) => void, à chaque tick logique
let renderOverlayHook = null;    // (now, cam) => void, après météo/nuit/aube

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
  const c = tileAt(x, y);
  if (tileSolidHook) {
    const r = tileSolidHook(c, x, y);
    if (r !== undefined) return r;
  }
  return SOLID_TILES.includes(c);
}
function entityAt(x, y) {
  return entities.find(e => e.x === x && e.y === y);
}

/* ------------------------------------------------------------
   PLUMES DE PROGRESSION
   ------------------------------------------------------------ */
let TOTAL_PHASES = 6;
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
  const on = (e) => {
    e.preventDefault();
    try { btn.setPointerCapture(e.pointerId); } catch (err) { /* pas grave */ }
    held.add(dir); tapPath = null;
  };
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
  // règles spéciales du jeu (volcan qui fume...), temps absolu
  if (logicTickHook) logicTickHook(now);
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
   EFFETS (cœurs, pouf, étincelles, fumée, éclaboussures)
   ------------------------------------------------------------ */
function addFx(type, x, y) {
  effects.push({ type, x, y, start: performance.now() });
}

function speckle(x, y, i) { return ((x * 7 + y * 13 + i * 5) % 11); }

/* ------------------------------------------------------------
   SPRITES PARTAGÉS (Yakari, Petit Tonnerre, Yakari à poney)
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

// le jeu redéfinit cette fonction si Yakari a des montures
function drawPlayerSprite(px, py, dir, step, t) {
  drawYakari(px, py, dir, step);
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

  // cases visibles — drawTile est fourni par le jeu
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
      drawPlayerSprite(pp.x - cam.x, pp.y - cam.y, player.dir, step, t);
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
      ctx.fillStyle = smokeColor;
      ctx.beginPath();
      ctx.arc(px + 16, py + 6 - k * 55, 7 + k * 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (fx.type === "splash") {
      if (k > 0.7) return false;
      ctx.globalAlpha = 1 - k / 0.7;
      ctx.fillStyle = "#a8cde8";
      ctx.beginPath();
      ctx.arc(px + 16, py + 16, 6 + k * 16, 0, Math.PI * 2);
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

  // neige
  if (snowing) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (let i = 0; i < 36; i++) {
      const rx = ((i * 61 + t * 0.035 + Math.sin(t / 800 + i) * 14) % (canvas.width + 40)) - 20;
      const ry = ((i * 89 + t * 0.075) % (canvas.height + 30)) - 15;
      ctx.beginPath();
      ctx.arc(rx, ry, i % 3 === 0 ? 2.4 : 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // nuit : obscurité trouée autour du joueur, de lightPos et des
  // entités qui brillent ({glow: true})
  if (night) {
    nctx.clearRect(0, 0, nightCanvas.width, nightCanvas.height);
    nctx.fillStyle = "rgba(10,14,44,0.72)";
    nctx.fillRect(0, 0, nightCanvas.width, nightCanvas.height);
    nctx.globalCompositeOperation = "destination-out";
    const holes = [{ x: pp.x - cam.x + 16, y: pp.y - cam.y + 16, r: 70 }];
    if (lightPos) holes.push({ x: lightPos.x * TILE - cam.x + 16, y: lightPos.y * TILE - cam.y + 16, r: 85 });
    for (const e of entities) {
      if (e.glow) holes.push({ x: e.x * TILE - cam.x + 16, y: e.y * TILE - cam.y + 16, r: 65 });
    }
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
  if (renderOverlayHook) renderOverlayHook(now, cam);

  // flèche d'objectif qui rebondit (collée au bord si l'objectif est loin)
  if (markerTarget) {
    const bump = Math.abs(Math.sin(t / 260)) * 6;
    const mx = Math.max(14, Math.min(canvas.width - 14, markerTarget.x * TILE - cam.x + 16));
    const my = Math.max(18, Math.min(canvas.height - 14, markerTarget.y * TILE - cam.y - 12 - bump));
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

/* ------------------------------------------------------------
   DÉMARRAGE — appelé par le game.js une fois ses cartes,
   sprites et phases déclarés. Recharger la page = tout
   recommencer (voulu).
   ------------------------------------------------------------ */
function fitCanvas() {
  const wrap = document.getElementById("stageWrap");
  const scale = Math.min(wrap.clientWidth / canvas.width, wrap.clientHeight / canvas.height);
  canvas.style.width = Math.floor(canvas.width * scale) + "px";
  canvas.style.height = Math.floor(canvas.height * scale) + "px";
}

function startEngine(startFirstPhase) {
  buildFeathers();
  updateFeathers(0);

  overlayBtn.onclick = () => {
    overlay.classList.add("hidden");
    actx();                      // débloque l'audio (geste utilisateur)
    locked = false;
    startFirstPhase();
  };

  // le canvas remplit l'espace disponible sans se déformer
  window.addEventListener("resize", fitCanvas);
  fitCanvas();

  requestAnimationFrame(render);

  // La logique avance aussi via un minuteur : le jeu ne se fige pas
  // si le navigateur met l'animation en pause (onglet masqué, etc.)
  setInterval(() => updateLogic(performance.now()), 120);
}
