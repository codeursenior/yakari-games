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
/* sons spécifiques de cet épisode */
Object.assign(sfx, {
  baa() { tone(660, 0.12, "square", 0.1); tone(590, 0.18, "square", 0.09, 0.1); },
  rumble() { [90, 75, 85, 70].forEach((f, i) => tone(f, 0.5, "sawtooth", 0.14, i * 0.22)); },
  boom() { tone(65, 0.7, "sawtooth", 0.25); tone(50, 0.9, "sine", 0.25, 0.08); },
});

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

SOLID_TILES = "TWRIBPt";

/* ------------------------------------------------------------
   ÉTAT DU JEU
   ------------------------------------------------------------ */


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
function drawPlayerSprite(px, py, dir, step, t) {
  if (player.sprite === "ride") drawRider(px, py, dir, step, t);
  else if (player.sprite === "fly") drawCondorFly(px, py, dir, t);
  else drawYakari(px, py, dir, step);
}

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
   DÉMARRAGE
   ------------------------------------------------------------ */
setMap(MAP_RIVER);
player.x = 5; player.y = 8; player.dir = "down"; player.sprite = "walk";
startEngine(startPhase1);
