/* ============================================================
   YAKARI SUR L'ÎLE — v2 « plateau »
   Jeu façon Game Boy Color (vue de dessus, déplacement case
   par case, on marche contre les choses pour interagir).
   Retrace l'épisode 17 « Les prisonniers de l'île ».
   Recharger la page recommence l'aventure de zéro.
   ============================================================ */

"use strict";

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

SOLID_TILES = "TWRCFthp";

/* ------------------------------------------------------------
   ÉTAT DU JEU
   ------------------------------------------------------------ */
let fireLit = false;             // le feu de camp est-il allumé ?


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
let firePos = null;

function drawPlayerSprite(px, py, dir, step, t) {
  if (player.sprite === "ride") drawRider(px, py, dir, step, t);
  else if (player.sprite === "elkride") drawElkRider(px, py, dir, step, t);
  else drawYakari(px, py, dir, step);
}

/* ============================================================
   PHASE 1 — LE VILLAGE SOUS LA PLUIE : réveiller Petit Tonnerre
   ============================================================ */
function startPhase1() {
  phase = 1;
  updateFeathers(0);
  setMap(MAP_VILLAGE);
  raining = true; night = false; dawn = false; fireLit = false; firePos = null; lightPos = null;
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
  firePos = { x: 8, y: 6 }; lightPos = firePos;
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
  night = false; dawn = true; fireLit = false; firePos = null; lightPos = null;
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
   DÉMARRAGE
   ------------------------------------------------------------ */
setMap(MAP_VILLAGE);
raining = true;
player.x = 4; player.y = 7; player.dir = "down"; player.sprite = "walk";
startEngine(startPhase1);
