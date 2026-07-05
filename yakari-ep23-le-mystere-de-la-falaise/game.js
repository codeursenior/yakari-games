/* ============================================================
   YAKARI ET LE MYSTÈRE DE LA FALAISE — EP23
   Jeu façon Game Boy Color (vue de dessus, déplacement case
   par case, on marche contre les choses pour interagir).
   Retrace l'épisode 23 « Le mystère de la falaise » :
   le squelette géant, le rêve envoyé par Grand Aigle,
   Diatryma, Eohippus et le volcan.
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
  rumble() { tone(70, 0.6, "sawtooth", 0.12); tone(55, 0.7, "sawtooth", 0.1, 0.15); },
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
   B sable · G herbe · j fougère · S eau peu profonde (gué)
   W eau · R rocher · K falaise · q crâne · Q côtes du squelette
   F feu de camp · P arbre préhistorique · T arbre
   V roche volcanique · c cratère · L lave
   ------------------------------------------------------------ */
const MAP_PLAGE = [
  "KKKKKKKKKKKKKKKKKKKKKK",
  "KKKKKqQQQKKKKKKKKKKKKK",
  "KKKKKQQQQKKKKKKKKKKKKK",
  "BBBBBBBBBBBBRBBBBBRBBB",
  "BRBBBBBBBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBRBBBBB",
  "BBBBBBBFBBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBBBBBBBBBB",
  "BBRBBBBBBBBBBBBRBBBBBB",
  "BBBBBBBBBBBBBBBBBBBBBB",
  "BBBBSBBBBBBBBBBSBBBBBB",
  "WWWWSWWWWWWWWWWSWWWWWW",
  "WWWWWWWWWWWWWWWWWWWWWW",
  "WWWWWWWWWWWWWWWWWWWWWW",
];
const MAP_REVE = [
  "VVVVVVVVVVVVVVVVVVVVVVVVVV",
  "VVVVVVVVVcVVVVVVVVVVVVVVVV",
  "VVVVVVVVVVVVVVVVVVVVVVVVVV",
  "GGjGGGGGGGGGGGGjGGGGGGGjGG",
  "GGGGPGGGGGGjGGGGGGGPGGGGGG",
  "GjGGGGGGGGGGGGGGGGGGGGjGGG",
  "GGGGGGGGGWWGGGGGGGGGGGGGGG",
  "GGGPGGGGWWWWGGGGGjGGGGGPGG",
  "GGGGGGGGGWWGGGGGGGGGGGGGGG",
  "GjGGGGGGGGGGGGGGGjGGGGGGGG",
  "GGGGGGGGGGGGGGGGGGGGGGGGGG",
  "GGGPGGGGjGGGGGGGGGGGGPGGGG",
  "GGGGGGGGGGGGGGGGGGGGGGGGGG",
  "GGjGGGGGGGGGGjGGGGGGGGGjGG",
  "GGGGGGGGGGGGGGGGGGGGGGGGGG",
  "PPPPPPPPPPPPPPPPPPPPPPPPPP",
];
// même vallée, mais la lave a commencé à couler du cratère
const MAP_FUITE = [
  "VVVVVVVVVVVVVVVVVVVVVVVVVV",
  "VVVVVVVVVcVVVVVVVVVVVVVVVV",
  "VVVVVVVVLLVVVVVVVVVVVVVVVV",
  "GGjGGGGGLLGGGGGjGGGGGGGjGG",
  "GGGGPGGGLLGjGGGGGGGPGGGGGG",
  "GjGGGGGGGGGGGGGGGGGGGGjGGG",
  "GGGGGGGGGWWGGGGGGGGGGGGGGG",
  "GGGPGGGGWWWWGGGGGjGGGGGPGG",
  "GGGGGGGGGWWGGGGGGGGGGGGGGG",
  "GjGGGGGGGGGGGGGGGjGGGGGGGG",
  "GGGGGGGGGGGGGGGGGGGGGGGGGG",
  "GGGPGGGGjGGGGGGGGGGGGPGGGG",
  "GGGGGGGGGGGGGGGGGGGGGGGGGG",
  "GGjGGGGGGGGGGjGGGGGGGGGjGG",
  "GGGGGGGGGGGGGGGGGGGGGGGGGG",
  "PPPPPPPPPPPPPPPPPPPPPPPPPP",
];

const SOLID_TILES = "TWRKQqFPVcL";
const CRATER = { x: 9, y: 1 };           // d'où sort la fumée du volcan

/* ------------------------------------------------------------
   ÉTAT DU JEU
   ------------------------------------------------------------ */
let map = MAP_PLAGE;
let mapW = 22, mapH = 14;
let phase = 0;
let locked = true;               // entrées bloquées (titre, cinématiques)
let night = false;
let dawn = false;
let eruption = false;            // teinte rouge + grondements
let volcanoLevel = 0;            // 0 rien · 1 fumée calme · 2 éruption
let fireLit = false;

const player = {
  x: 4, y: 8,                    // case
  dir: "down",
  sprite: "walk",                // walk | bird (à dos de Diatryma)
  moving: null,                  // {fx,fy,tx,ty,start,dur}
};
let entities = [];               // pnj, objets...
let effects = [];                // cœurs, pouf, fumée, étincelles
let markerTarget = null;         // {x,y} objectif avec flèche qui rebondit
let tileBumpHandler = null;      // interaction avec une case spéciale
let onMoveComplete = null;       // vérifié après chaque pas
let fade = null;                 // {start,dur,mode:'out'|'in',cb}
let lastBump = 0;
let lastCraterFx = 0;

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
  // fumée du volcan (calme ou éruption), basée sur le temps absolu
  if (volcanoLevel > 0 && now - lastCraterFx > (volcanoLevel === 2 ? 1100 : 3400)) {
    lastCraterFx = now;
    addFx("smoke", CRATER.x, CRATER.y);
    if (volcanoLevel === 2) {
      addFx("smoke", CRATER.x + (Math.floor(now / 1100) % 3) - 1, CRATER.y);
      sfx.rumble();
    }
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

function drawCliffBase(px, py, x, y) {
  ctx.fillStyle = "#8a7862";
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = "#75654f";
  ctx.fillRect(px, py + 10 + (speckle(x, y, 1) % 8), TILE, 4);
  ctx.fillStyle = "#9c8a73";
  ctx.fillRect(px + speckle(x, y, 2), py + 3, 8, 3);
}

function drawTile(chr, x, y, px, py, t) {
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
    return;
  }
  if (chr === "L") {
    ctx.fillStyle = "#d94f1e";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#ff8c2b";
    const ph = Math.floor(t / 300 + (x + y) / 2) % 2;
    ctx.fillRect(px + 3 + ph * 9, py + 7, 11, 4);
    ctx.fillRect(px + 15 - ph * 7, py + 21, 11, 4);
    ctx.fillStyle = "#ffd93d";
    ctx.fillRect(px + 12 + ph * 4, py + 14, 4, 4);
    return;
  }
  if (chr === "K" || chr === "q" || chr === "Q") {
    drawCliffBase(px, py, x, y);
    if (chr === "q") {
      // crâne de l'oiseau géant, bec vers la gauche
      ctx.fillStyle = "#f2ead8";
      ctx.beginPath();
      ctx.arc(px + 18, py + 14, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(px + 10, py + 12);
      ctx.lineTo(px - 5, py + 21);
      ctx.lineTo(px + 12, py + 22);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#3a2e1f";
      ctx.beginPath();
      ctx.arc(px + 18, py + 12, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (chr === "Q") {
      // colonne + côtes blanches
      ctx.fillStyle = "#f2ead8";
      ctx.fillRect(px, py + 6, TILE, 3);
      ctx.fillRect(px + 5, py + 9, 4, 18);
      ctx.fillRect(px + 15, py + 9, 4, 16);
      ctx.fillRect(px + 25, py + 9, 4, 18);
    }
    return;
  }
  if (chr === "V" || chr === "c") {
    ctx.fillStyle = "#57504a";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#463f3a";
    ctx.fillRect(px + 3 + speckle(x, y, 1), py + 6, 6, 5);
    ctx.fillRect(px + 16, py + 18 + (speckle(x, y, 2) % 6), 7, 5);
    if (chr === "c") {
      const g = Math.floor(t / 300) % 2;
      ctx.fillStyle = "#e2542b";
      ctx.beginPath();
      ctx.arc(px + 16, py + 16, 11 + g * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd93d";
      ctx.beginPath();
      ctx.arc(px + 16, py + 16, 5 + g, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
  if (chr === "R") {
    // rocher sur le sable de la plage
    ctx.fillStyle = "#ecd9a8";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#8d96a0";
    ctx.fillRect(px + 2, py + 6, 28, 24);
    ctx.fillStyle = "#a8b2bc";
    ctx.fillRect(px + 5, py + 9, 12, 8);
    return;
  }
  if (chr === "B") {
    ctx.fillStyle = "#ecd9a8";
    ctx.fillRect(px, py, TILE, TILE);
    if (speckle(x, y, 0) < 4) {
      ctx.fillStyle = "#dcc48e";
      ctx.fillRect(px + 4 + speckle(x, y, 1), py + 6 + speckle(x, y, 2), 4, 4);
      ctx.fillRect(px + 18, py + 20, 4, 4);
    }
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
    case "j":
      ctx.strokeStyle = "#2f6b3c";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(px + 16, py + 27);
      ctx.quadraticCurveTo(px + 6, py + 18, px + 5, py + 8);
      ctx.moveTo(px + 16, py + 27);
      ctx.quadraticCurveTo(px + 26, py + 18, px + 27, py + 8);
      ctx.moveTo(px + 16, py + 27);
      ctx.lineTo(px + 16, py + 6);
      ctx.stroke();
      break;
    case "T":
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(px + 13, py + 20, 6, 10);
      ctx.fillStyle = "#356b44";
      ctx.fillRect(px + 4, py + 2, 24, 20);
      ctx.fillStyle = "#3e7d4f";
      ctx.fillRect(px + 7, py - 2, 18, 14);
      break;
    case "P":
      ctx.fillStyle = "#8a5a2b";
      ctx.fillRect(px + 14, py + 8, 5, 22);
      ctx.strokeStyle = "#2f7a44";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(px + 16, py + 10); ctx.lineTo(px + 2, py - 2);
      ctx.moveTo(px + 16, py + 10); ctx.lineTo(px + 30, py - 2);
      ctx.moveTo(px + 16, py + 10); ctx.lineTo(px + 16, py - 6);
      ctx.moveTo(px + 16, py + 10); ctx.lineTo(px + 4, py + 12);
      ctx.moveTo(px + 16, py + 10); ctx.lineTo(px + 28, py + 12);
      ctx.stroke();
      break;
    case "F": {
      ctx.fillStyle = "#ecd9a8";
      ctx.fillRect(px, py, TILE, TILE);
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

function drawPony(px, py, t) {
  const y0 = py;
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

function drawAigle(px, py, t) {
  const y0 = py - 10;
  const bob = Math.floor(t / 500) % 2;
  // halo doux : Grand Aigle apparaît dans la nuit / le rêve
  ctx.globalAlpha = 0.3 + bob * 0.08;
  ctx.fillStyle = "#ffd93d";
  ctx.beginPath();
  ctx.arc(px + 16, y0 + 18, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // corps brun
  ctx.fillStyle = "#6b4a2a";
  ctx.fillRect(px + 8, y0 + 14, 16, 20);
  // ailes repliées
  ctx.fillStyle = "#59391c";
  ctx.fillRect(px + 4, y0 + 16, 5, 14);
  ctx.fillRect(px + 23, y0 + 16, 5, 14);
  // queue claire
  ctx.fillStyle = "#f2ead8";
  ctx.fillRect(px + 12, y0 + 32, 8, 5);
  // tête blanche
  ctx.fillStyle = "#f7f2e4";
  ctx.beginPath();
  ctx.arc(px + 16, y0 + 9, 8, 0, Math.PI * 2);
  ctx.fill();
  // bec jaune
  ctx.fillStyle = "#f2b134";
  ctx.beginPath();
  ctx.moveTo(px + 17, y0 + 8);
  ctx.lineTo(px + 27, y0 + 12);
  ctx.lineTo(px + 17, y0 + 14);
  ctx.closePath();
  ctx.fill();
  // œil + serres
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 13, y0 + 7, 3, 3);
  ctx.fillStyle = "#f2b134";
  ctx.fillRect(px + 10, y0 + 33, 4, 3);
  ctx.fillRect(px + 18, y0 + 33, 4, 3);
}

function drawDiatryma(px, py, t) {
  const y0 = py - 14;
  const bob = Math.floor(t / 420) % 2;
  // pattes hautes + doigts
  ctx.fillStyle = "#e0a12f";
  ctx.fillRect(px + 10, y0 + 34, 4, 12);
  ctx.fillRect(px + 20, y0 + 34, 4, 12);
  ctx.fillRect(px + 8, y0 + 44, 8, 3);
  ctx.fillRect(px + 18, y0 + 44, 8, 3);
  // gros corps rond, sans ailes (juste un moignon)
  ctx.fillStyle = "#c96a2b";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 27 + bob, 14, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#a54f1d";
  ctx.beginPath();
  ctx.ellipse(px + 12, y0 + 27 + bob, 6, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  // cou + tête
  ctx.fillStyle = "#c96a2b";
  ctx.fillRect(px + 19, y0 + 8 + bob, 8, 16);
  ctx.beginPath();
  ctx.arc(px + 23, y0 + 6 + bob, 8, 0, Math.PI * 2);
  ctx.fill();
  // énorme bec
  ctx.fillStyle = "#f2b134";
  ctx.beginPath();
  ctx.moveTo(px + 28, y0 + bob);
  ctx.lineTo(px + 42, y0 + 6 + bob);
  ctx.lineTo(px + 28, y0 + 12 + bob);
  ctx.closePath();
  ctx.fill();
  // œil
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 20, y0 + 3 + bob, 3, 3);
}

function drawBirdRider(px, py, dir, step, t) {
  // Yakari à dos de Diatryma, qui « file comme le vent »
  const y0 = py - 12;
  const bob = step === 1 ? 2 : 0;
  // pattes qui courent
  ctx.fillStyle = "#e0a12f";
  ctx.fillRect(px + 9, y0 + 30 + bob, 4, 12 - bob);
  ctx.fillRect(px + 19, y0 + 32 - bob, 4, 10 + bob);
  // corps
  ctx.fillStyle = "#c96a2b";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 24, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  // cou + tête selon la direction
  const side = dir === "left" ? -1 : 1;
  let hx = px + 16 + side * 11;
  if (dir === "up") hx = px + 7;
  ctx.fillStyle = "#c96a2b";
  ctx.fillRect(hx - 3, y0 + 4, 7, 16);
  ctx.beginPath();
  ctx.arc(hx, y0 + 4, 7, 0, Math.PI * 2);
  ctx.fill();
  // énorme bec
  ctx.fillStyle = "#f2b134";
  ctx.beginPath();
  ctx.moveTo(hx + side * 5, y0 - 1);
  ctx.lineTo(hx + side * 18, y0 + 4);
  ctx.lineTo(hx + side * 5, y0 + 9);
  ctx.closePath();
  ctx.fill();
  // œil
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(hx - 2 + side * 2, y0 + 1, 3, 3);
  // petit Yakari cramponné sur le dos
  const yx = dir === "left" ? px + 18 : px + 8;
  ctx.fillStyle = "#e8b476";
  ctx.fillRect(yx + 1, y0 + 8 - bob, 10, 9);
  ctx.fillStyle = "#f0c48c";
  ctx.fillRect(yx, y0 - 2 - bob, 12, 11);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(yx, y0 - 2 - bob, 12, 4);
  ctx.fillStyle = "#fff5e0";
  ctx.fillRect(yx + 10, y0 - 8 - bob, 3, 8);
  if (dir !== "up") {
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(yx + 3, y0 + 3 - bob, 2, 2);
    ctx.fillRect(yx + 7, y0 + 3 - bob, 2, 2);
  }
}

function drawEohippus(px, py, t) {
  // minuscule cheval des premiers temps, des doigts à la place des sabots
  const y0 = py + 8;
  const bob = Math.floor(t / 350) % 2;
  ctx.fillStyle = "#c9a06a";
  ctx.fillRect(px + 6, y0 + 6 + bob, 18, 9);
  ctx.fillRect(px + 8, y0 + 14, 3, 6);
  ctx.fillRect(px + 20, y0 + 14, 3, 6);
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(px + 6, y0 + 19, 6, 2);   // les fameux doigts !
  ctx.fillRect(px + 19, y0 + 19, 6, 2);
  ctx.fillStyle = "#c9a06a";
  ctx.fillRect(px + 21, y0 - 1, 8, 9);   // tête
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(px + 19, y0 - 3, 3, 9);   // crinière
  ctx.fillRect(px + 3, y0 + 6 + bob, 3, 7); // queue
  ctx.fillRect(px + 11, y0 + 7 + bob, 2, 6); // rayures
  ctx.fillRect(px + 15, y0 + 7 + bob, 2, 6);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 25, y0 + 1, 2, 2);
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

function drawFishItem(px, py, t) {
  const tw = Math.floor(t / 300) % 2;
  ctx.fillStyle = "#5b93dd";
  ctx.beginPath();
  ctx.ellipse(px + 13, py + 16, 9, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(px + 21, py + 16);
  ctx.lineTo(px + 28, py + 10);
  ctx.lineTo(px + 28, py + 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.fillRect(px + 8, py + 13, 3, 3);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 9, py + 14, 2, 2);
  ctx.fillStyle = "#ffd93d";
  if (tw) ctx.fillRect(px + 4, py + 5, 4, 4);
  else ctx.fillRect(px + 25, py + 4, 4, 4);
}

function drawFlag(px, py, t) {
  const wave = Math.floor(t / 260) % 2 * 3;
  ctx.fillStyle = "#8d96a0";
  ctx.fillRect(px + 4, py + 26, 14, 5);
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(px + 9, py + 2, 3, 26);
  ctx.fillStyle = "#d64545";
  ctx.beginPath();
  ctx.moveTo(px + 12, py + 3);
  ctx.lineTo(px + 28 + wave, py + 8);
  ctx.lineTo(px + 12, py + 13);
  ctx.closePath();
  ctx.fill();
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
      if (player.sprite === "bird") drawBirdRider(px, py, player.dir, step, t);
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
      ctx.fillStyle = eruption ? "#8d8d8d" : "#e8e3d8";
      ctx.beginPath();
      ctx.arc(px + 16, py + 6 - k * 55, 7 + k * 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    return true;
  });

  // nuit : obscurité trouée autour du joueur, du feu et des êtres qui brillent
  if (night) {
    nctx.clearRect(0, 0, nightCanvas.width, nightCanvas.height);
    nctx.fillStyle = "rgba(10,14,44,0.72)";
    nctx.fillRect(0, 0, nightCanvas.width, nightCanvas.height);
    nctx.globalCompositeOperation = "destination-out";
    const holes = [{ x: pp.x - cam.x + 16, y: pp.y - cam.y + 16, r: 70 }];
    if (firePos) holes.push({ x: firePos.x * TILE - cam.x + 16, y: firePos.y * TILE - cam.y + 16, r: 85 });
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
  if (eruption) {
    const pulse = Math.floor(t / 450) % 2;
    ctx.fillStyle = `rgba(216,58,32,${0.2 + pulse * 0.07})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // flèche d'objectif qui rebondit
  if (markerTarget) {
    const bump = Math.abs(Math.sin(t / 260)) * 6;
    // la flèche reste collée au bord de l'écran si l'objectif est loin
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
   PHASE 1 — LA PLAGE INCONNUE : le bois et le feu
   ============================================================ */
function startPhase1() {
  phase = 1;
  updateFeathers(0);
  setMap(MAP_PLAGE);
  night = false; dawn = false; eruption = false; volcanoLevel = 0;
  fireLit = false; firePos = { x: 7, y: 6 };
  player.x = 4; player.y = 8; player.dir = "up"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.logs = 0; quest.fireDone = false;

  const girl = {
    id: "girl", x: 8, y: 6, solid: true,
    draw: (px, py, t) => drawGirl(px, py, "down", t),
    onBump() {
      sfx.cri();
      if (phase === 1) {
        narrate(quest.logs < 3
          ? "Arc-en-ciel : « Quel toboggan, cette rivière ! Le bois qui brille est bien sec, il s'allumera vite ! »"
          : "Arc-en-ciel : « Vite, au feu de camp ! »");
      } else if (phase === 2) {
        girlBumpPhase2();
      } else {
        narrate("Arc-en-ciel : « Quelle nuit étoilée ! »");
      }
    },
  };
  const pony = {
    id: "pony", x: 12, y: 4, solid: true,
    draw: (px, py, t) => drawPony(px, py, t),
    onBump() {
      sfx.neigh();
      narrate("Petit Tonnerre : « Hiii ! Jamais je ne pourrai marcher sur ces rochers ! Je monterai la garde. »");
    },
  };
  entities.push(girl, pony);

  const logSpots = [[3, 6], [10, 8], [15, 5]];
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
      const left = 3 - quest.logs;
      if (left > 0) {
        narrate(left === 1 ? "Super ! Encore un dernier morceau de bois !" : `Bien joué ! Encore ${left} morceaux de bois !`);
        markerTarget = nearestMarker(logsLeft());
      } else {
        narrate("Tu as tout le bois ! Apporte-le au feu de camp !");
        markerTarget = { ...firePos };
      }
    }
  };

  tileBumpHandler = (tx, ty, ch) => {
    if (ch === "F") {
      if (quest.logs < 3) {
        sfx.bump();
        narrate("Ramasse d'abord les 3 morceaux de bois sec qui brillent !");
        return;
      }
      if (quest.fireDone) return;
      quest.fireDone = true;
      markerTarget = null;
      locked = true;
      fireLit = true;
      sfx.success();
      narrate("Le feu crépite, les vêtements sèchent ! Mais... regarde là-haut, dans la falaise !");
      wait(4600, () => startPhase2());
    } else if (ch === "Q" || ch === "q") {
      sfx.bump();
      narrate("On dirait quelque chose de bizarre dans la falaise... D'abord, le feu !");
    } else {
      sfx.bump();
    }
  };

  narrate("Quelle descente ! La rivière a emporté Yakari, Arc-en-ciel et Petit Tonnerre jusqu'à une plage inconnue. Tout le monde est trempé ! Ramasse les 3 morceaux de bois qui brillent. Marche avec les flèches, ou touche la carte.");
}

/* ============================================================
   PHASE 2 — LE SQUELETTE GÉANT : la découverte, puis le dîner
   ============================================================ */
let girlBumpPhase2 = () => {};

function startPhase2() {
  phase = 2;
  updateFeathers(1);
  locked = false;
  quest.skelSeen = false; quest.hasFish = false; quest.fishDelivered = false;
  markerTarget = { x: 6, y: 2 };

  narrate("On dirait des os géants dans la falaise ! Approche-toi et touche le squelette !");

  girlBumpPhase2 = () => {
    if (quest.hasFish && !quest.fishDelivered) {
      quest.fishDelivered = true;
      sfx.success();
      addFx("heart", 8, 6);
      markerTarget = null;
      locked = true;
      narrate("« Merci Yakari ! » Miam, quel bon dîner de poisson. La nuit tombe sur la plage...");
      wait(5000, () => fadeOut(() => startPhase3(), 1400));
    } else if (quest.skelSeen) {
      narrate("Arc-en-ciel : « Un oiseau géant sans ailes... étonnant ! Attrape le poisson pour le dîner ! »");
    } else {
      narrate("Arc-en-ciel : « Regarde là-haut, dans la falaise ! »");
    }
  };

  tileBumpHandler = (tx, ty, ch) => {
    if (ch === "Q" || ch === "q") {
      if (!quest.skelSeen) {
        quest.skelSeen = true;
        sfx.success();
        addFx("sparkle", tx, ty + 1);
        narrate("Un squelette géant, prisonnier de la falaise ! On dirait un oiseau... mais il n'a pas d'ailes ! Un oiseau des temps anciens ? C'est l'heure du dîner : attrape le poisson qui brille dans l'eau !");
        markerTarget = { x: 4, y: 11 };
        entities.push({
          id: "fish", x: 4, y: 11, solid: false, item: true,
          draw: (px, py, t) => drawFishItem(px, py, t),
        });
      } else {
        sfx.bump();
        narrate("Les os sont durs comme la pierre !");
      }
    } else {
      sfx.bump();
    }
  };

  onMoveComplete = () => {
    const here = entities.find(e => e.item && e.x === player.x && e.y === player.y);
    if (here && here.id === "fish") {
      entities = entities.filter(e => e !== here);
      quest.hasFish = true;
      sfx.splash();
      addFx("sparkle", here.x, here.y);
      narrate("Tu as le poisson ! Apporte-le à Arc-en-ciel, près du feu.");
      markerTarget = { x: 8, y: 6 };
    }
  };
}

/* ============================================================
   PHASE 3 — LA NUIT : la visite de Grand Aigle
   ============================================================ */
function startPhase3() {
  phase = 3;
  updateFeathers(2);
  night = true;
  fadeIn(1400);
  locked = false;

  narrate("Yakari aimerait tant interroger Grand Aigle sur le squelette... Regarde, une lumière dans la nuit ! Va voir qui est là !");

  const aigle = {
    id: "aigle", x: 14, y: 8, solid: true, glow: true,
    draw: (px, py, t) => drawAigle(px, py, t),
    onBump() {
      locked = true;
      markerTarget = null;
      sfx.cri();
      addFx("sparkle", 14, 7);
      addFx("sparkle", 13, 8);
      addFx("sparkle", 15, 8);
      narrate("Grand Aigle : « Je suis venu répondre à tes questions, Yakari. Regarde ces flammes... Que dirais-tu d'un grand voyage ? »");
      wait(5400, () => fadeOut(() => startPhase4(), 1800));
    },
  };
  entities.push(aigle);
  markerTarget = { x: aigle.x, y: aigle.y };

  onMoveComplete = null;
  tileBumpHandler = () => sfx.bump();
}

/* ============================================================
   PHASE 4 — LE RÊVE : au temps des volcans, saluer Diatryma
   ============================================================ */
function startPhase4() {
  phase = 4;
  updateFeathers(3);
  setMap(MAP_REVE);
  night = false; dawn = false; volcanoLevel = 1;
  fireLit = false; firePos = null;
  player.x = 4; player.y = 12; player.dir = "up"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.hello = 0;
  fadeIn(1800);
  locked = false;

  narrate("Quel rêve étrange ! Yakari est arrivé au temps des volcans. Qui est ce grand oiseau, là-bas ? Va le saluer !");

  const diatryma = {
    id: "diatryma", x: 7, y: 10, solid: true,
    draw: (px, py, t) => drawDiatryma(px, py, t),
    onBump(e) {
      quest.hello++;
      sfx.pop();
      addFx("heart", e.x, e.y);
      if (quest.hello === 1) narrate("« Salut à toi, Yakari ! Je suis Diatryma, l'ancêtre des oies sauvages ! » Caresse-le encore !");
      if (quest.hello === 2) narrate("« Je ne vole pas... mais je file comme le vent ! » Encore une caresse !");
      if (quest.hello >= 3) {
        entities = entities.filter(x => x.id !== "diatryma");
        player.sprite = "bird";
        sfx.success();
        narrate("« Monte sur mon dos et cramponne-toi ! » En route vers le point d'eau : c'est l'heure où Eohippus vient boire !");
        markerTarget = { x: 10, y: 8 };
        wait(3800, () => startPhase5());
      }
    },
  };
  entities.push(diatryma);
  markerTarget = { x: diatryma.x, y: diatryma.y };

  onMoveComplete = null;
  tileBumpHandler = () => sfx.bump();
}

/* ============================================================
   PHASE 5 — EOHIPPUS : la course, puis boire au point d'eau
   ============================================================ */
function startPhase5() {
  phase = 5;
  updateFeathers(4);
  quest.race = false; quest.raceDone = false; quest.drank = false;

  sfx.cri();
  const eo = {
    id: "eohippus", x: 12, y: 7, solid: true,
    draw: (px, py, t) => drawEohippus(px, py, t),
    onBump(e) {
      if (!quest.race) {
        quest.race = true;
        addFx("poof", e.x, e.y);
        e.x = 18; e.y = 12;
        sfx.neigh();
        entities.push({
          id: "flag", x: 19, y: 12, solid: true,
          draw: (px, py, t) => drawFlag(px, py, t),
          onBump() { finishRace(); },
        });
        markerTarget = { x: 19, y: 12 };
        narrate("Eohippus : « Je parie que je cours plus vite que toi ! Attention... c'est parti ! » File jusqu'au drapeau !");
      } else if (!quest.raceDone) {
        finishRace();
      } else {
        sfx.neigh();
        narrate("Eohippus : « Je n'ai pas de temps à perdre avec les bipèdes ! » Quel caractère... comme Petit Tonnerre !");
      }
    },
  };
  entities.push(eo);
  markerTarget = { x: eo.x, y: eo.y };

  narrate("Le voilà ! Eohippus, le minuscule cheval des premiers temps : pas de sabots, mais des doigts ! Va le saluer.");

  function finishRace() {
    if (quest.raceDone) return;
    quest.raceDone = true;
    sfx.success();
    addFx("sparkle", 19, 12);
    narrate("Eohippus : « Alors, qui de nous deux est le plus rapide ? » Quelle course ! Ça donne soif : va boire au point d'eau !");
    markerTarget = { x: 10, y: 8 };
  }

  tileBumpHandler = (tx, ty, ch) => {
    if (ch === "W" && quest.raceDone && !quest.drank) {
      quest.drank = true;
      markerTarget = null;
      locked = true;
      sfx.splash();
      addFx("sparkle", tx, ty);
      narrate("Glou glou ! Toute cette eau fraîche... Mais... le sol se met à trembler !");
      wait(4200, () => startPhase6());
    } else if (ch === "W") {
      sfx.splash();
    } else {
      sfx.bump();
    }
  };
  onMoveComplete = null;
}

/* ============================================================
   PHASE 6 — L'ÉRUPTION : rejoindre Grand Aigle, puis le réveil
   ============================================================ */
function startPhase6() {
  phase = 6;
  updateFeathers(5);
  setMap(MAP_FUITE);
  eruption = true; volcanoLevel = 2;
  locked = false;

  // Eohippus file se mettre à l'abri
  const eo = entities.find(e => e.id === "eohippus");
  if (eo) { addFx("poof", eo.x, eo.y); entities = entities.filter(e => e !== eo); }

  sfx.rumble();
  narrate("Le volcan gronde, la lave coule ! « Sauve-toi, petit Eohippus ! » Cramponne-toi à Diatryma et rejoins Grand Aigle, vite !");

  const aigle = {
    id: "aigle2", x: 16, y: 12, solid: true, glow: true,
    draw: (px, py, t) => drawAigle(px, py, t),
    onBump() {
      locked = true;
      markerTarget = null;
      sfx.success();
      addFx("sparkle", 16, 11);
      narrate("Grand Aigle : « N'aie pas peur, Yakari. Souviens-toi : tout ceci n'est qu'un rêve ! »");
      wait(4600, () => fadeOut(() => wakeOnBeach(), 1800));
    },
  };
  entities.push(aigle);
  markerTarget = { x: aigle.x, y: aigle.y };

  tileBumpHandler = () => sfx.bump();
  onMoveComplete = null;
}

function wakeOnBeach() {
  setMap(MAP_PLAGE);
  eruption = false; volcanoLevel = 0; night = false; dawn = true;
  fireLit = true; firePos = { x: 7, y: 6 };
  player.x = 5; player.y = 8; player.dir = "up"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  fadeIn(1800);
  locked = false;

  narrate("Le jour se lève sur la plage. Va vite raconter ton voyage à Arc-en-ciel et Petit Tonnerre !");

  const girl = {
    id: "girl2", x: 8, y: 6, solid: true,
    draw: (px, py, t) => drawGirl(px, py, "down", t),
    onBump() { victory(); },
  };
  const pony = {
    id: "pony2", x: 10, y: 7, solid: true,
    draw: (px, py, t) => drawPony(px, py, t),
    onBump() { victory(); },
  };
  entities.push(girl, pony);
  markerTarget = { x: girl.x, y: girl.y };

  tileBumpHandler = () => sfx.bump();
  onMoveComplete = null;
}

/* ============================================================
   VICTOIRE
   ============================================================ */
function victory() {
  locked = true;
  markerTarget = null;
  updateFeathers(6);
  sfx.tada();
  addFx("heart", 8, 6);
  addFx("heart", 10, 7);
  narrate("La lave du volcan avait recouvert le pauvre Diatryma, et son squelette est devenu dur comme la pierre : voilà le mystère de la falaise ! Bravo, tu as fini l'aventure !");
  overlayTitle.textContent = "BRAVO ! 🎉";
  overlaySub.textContent = "Le mystère de la falaise est résolu !";
  overlayBtn.textContent = "🔄 Rejouer";
  overlay.classList.remove("hidden");
  overlayBtn.onclick = () => location.reload();
}

/* ------------------------------------------------------------
   DÉMARRAGE — recharger la page = tout recommencer (voulu)
   ------------------------------------------------------------ */
buildFeathers();
updateFeathers(0);
setMap(MAP_PLAGE);

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
