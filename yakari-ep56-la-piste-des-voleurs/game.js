/* ============================================================
   LA PISTE DES VOLEURS — jeu « plateau »
   Jeu façon Game Boy Color (vue de dessus, déplacement case
   par case, on marche contre les choses pour interagir).
   Retrace l'épisode 56 « La piste des voleurs » : l'objet
   sacré de la tribu a été volé dans le tipi de Roc Tranquille.
   Recharger la page recommence l'aventure de zéro.
   ============================================================ */

"use strict";

/* ------------------------------------------------------------
   CARTES (une lettre = une case)
   G herbe · D chemin · T arbre · W eau · S gué · R rocher
   t tipi · f fleurs · p flaque · M boue · e piste d'empreintes
   F feu de camp
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
const MAP_PRAIRIE = [
  "TTTTTTTTTTTTTTTTTTTTTTTT",
  "TGGGGGfGGGGGGGGGGfGGGGGT",
  "TGGTGGGGGGTGGGGGGGGGTGGT",
  "TGGGGGGGGGGGGGGfGGGGGGGT",
  "TGfGGGGGGGGGGGGGGGGGGGGT",
  "TGGGGGGTGGGGGGGGGTGGGGGT",
  "DDDDDDDDDDDDDDDDDDDDDDDD",
  "TGGGGGGGGGGGGGGGGGGGGGGT",
  "TGGfGGGGGGGGGGGGGGGfGGGT",
  "TGGGGGTGGGGGGGTGGGGGGGGT",
  "TGGGGGGGGGGGGGGGGGGGGGGT",
  "TTTTTTTTTTTTTTTTTTTTTTTT",
];
const MAP_RIVIERE = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TGGGGGTGGGGGGGGGGWWWGGGGGT",
  "TGGTGGGGGGGGTGGGGWWWGGTGGT",
  "TGGGGGGGGGGGGGGGGWWWGGGGGT",
  "TGfGGGGGGTGGGGGGGWWWGGfGGT",
  "TGGGGGGGGGGGGGGGGWWWGGGGGT",
  "DeeeeeeeeeeeeeeeGSSSGGGGGT",
  "TGGGGGGGGGGGGGGGGWWWGGGGGT",
  "TGGGTGGGGGGGTGGGGWWWGGGGGT",
  "TGGGGGGGGGGGGGGGGWWWGGTGGT",
  "TGGGGGGGGGGGGGGGGWWWGGGGGT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTT",
];
const MAP_MARAIS = [
  "TTTTTTTTTTTTTTTTTTTTTT",
  "TGGGGGGGGGGGGGGGGGGGGT",
  "TGGMMGGGGGGGTGGGGGGGGT",
  "TGGMMMGGGGGGGGGGMMGGGT",
  "TGGGMMGGGGGGGGGMMMMGGT",
  "TGGGGGGGGpGGGGGMMMMGGT",
  "DGGGGGGGGGGGGGGGMMGGGT",
  "TGGGpGGGGGGGGGGGGGGGGT",
  "TGGGGGGGGGGGGGTGGGGGGT",
  "TGGMMGGGGGGGGGGGGMMGGT",
  "TGGGGGGGGGGGGGGGGGGGGT",
  "TTTTTTTTTTTTTTTTTTTTTT",
];
const MAP_REPAIRE = [
  "RRRRRRRRRRRRRRRRRRRRRR",
  "RGGGGGGGRRGGGGGGGGGGGR",
  "RGGGGGGGRGGGGGGGRRGGGR",
  "RGGGGGGGGGGGGGGGGGGGGR",
  "RGGGGGGGGDDDGGGGGGGGGR",
  "RGGGGGGGGDFDGGGGGGGGGR",
  "DGGGGGGGGDDDGGGGGGGGGR",
  "RGGGGGGGGGGGGGGGGGGGGR",
  "RGGRRGGGGGGGGGGGGRGGGR",
  "RGGGGGGGGGGGGGGGGGGGGR",
  "RGGGGGGGGGGGGGGGGGGGGR",
  "RRRRRRRRRRRRRRRRRRRRRR",
];

SOLID_TILES = "TWRtFp";
TOTAL_PHASES = 6;

/* ------------------------------------------------------------
   CASES
   ------------------------------------------------------------ */
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
    ctx.fillRect(px + 10, py + 20, 9, 7);
    return;
  }
  if (chr === "R") {
    ctx.fillStyle = "#a89887";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#8d96a0";
    ctx.fillRect(px + 2, py + 4, 28, 26);
    ctx.fillStyle = "#a8b2bc";
    ctx.fillRect(px + 5, py + 8, 12, 8);
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
    case "e": // la piste : chemin marqué d'empreintes de sabots
      ctx.fillStyle = "#d9b380";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#8a6a42";
      ctx.fillRect(px + 6, py + 8, 5, 6);
      ctx.fillRect(px + 18, py + 18, 5, 6);
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
    case "M": {
      ctx.fillStyle = "#9b7448";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#82603a";
      ctx.beginPath();
      ctx.ellipse(px + 10 + speckle(x, y, 4), py + 12, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(px + 22, py + 24, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
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
      ctx.fillStyle = "#d9b380";
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = "#9aa8a0";
      [[4, 22], [12, 26], [22, 22], [8, 14], [18, 12]].forEach(([ox, oy]) => {
        ctx.fillRect(px + ox, py + oy, 6, 5);
      });
      const fl = Math.floor(t / 180) % 2;
      ctx.fillStyle = "#ff8c2b";
      ctx.fillRect(px + 10, py + 2 + fl * 2, 12, 14 - fl * 2);
      ctx.fillStyle = "#ffd93d";
      ctx.fillRect(px + 13, py + 7 + fl, 6, 9);
      break;
    }
  }
}

/* ------------------------------------------------------------
   SPRITES (primitives canvas, pixel rondouillard 32 px)
   ------------------------------------------------------------ */
function drawRoc(px, py, t) {
  // Roc Tranquille, le gardien de l'objet sacré (bras croisés)
  const y0 = py - 6;
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(px + 10, y0 + 26, 5, 10);
  ctx.fillRect(px + 17, y0 + 26, 5, 10);
  ctx.fillStyle = "#a04838";
  ctx.fillRect(px + 7, y0 + 13, 18, 15);
  ctx.fillStyle = "#e8b476";
  ctx.fillRect(px + 8, y0 + 17, 16, 4);   // bras croisés
  ctx.fillStyle = "#f0c48c";
  ctx.fillRect(px + 7, y0, 18, 14);
  ctx.fillStyle = "#c8c8c8";               // cheveux gris
  ctx.fillRect(px + 7, y0, 18, 5);
  ctx.fillRect(px + 5, y0 + 2, 3, 10);
  ctx.fillRect(px + 24, y0 + 2, 3, 10);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 11, y0 + 7, 2, 3);
  ctx.fillRect(px + 19, y0 + 7, 2, 3);
  // deux plumes
  ctx.fillStyle = "#fff5e0";
  ctx.fillRect(px + 10, y0 - 8, 4, 9);
  ctx.fillRect(px + 18, y0 - 8, 4, 9);
  ctx.fillStyle = "#a04838";
  ctx.fillRect(px + 10, y0 - 8, 4, 3);
  ctx.fillRect(px + 18, y0 - 8, 4, 3);
}

function drawRegard(px, py, t) {
  // Regard Droit, le papa de Yakari (trois plumes)
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
  ctx.fillStyle = "#fff5e0";
  ctx.fillRect(px + 9, y0 - 8, 4, 9);
  ctx.fillRect(px + 14, y0 - 10, 4, 11);
  ctx.fillRect(px + 19, y0 - 8, 4, 9);
  ctx.fillStyle = "#d64545";
  ctx.fillRect(px + 14, y0 - 10, 4, 3);
}

function drawGraine(px, py, t) {
  // Graine de Bison, le garçon costaud et vantard
  const y0 = py - 4;
  ctx.fillStyle = "#3f6bb5";
  ctx.fillRect(px + 9, y0 + 24, 6, 8);
  ctx.fillRect(px + 17, y0 + 24, 6, 8);
  ctx.fillStyle = "#b5623f";                // tunique
  ctx.fillRect(px + 6, y0 + 12, 20, 13);
  ctx.fillStyle = "#f0c48c";
  ctx.fillRect(px + 7, y0, 18, 14);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 7, y0, 18, 6);
  ctx.fillRect(px + 12, y0 + 8, 2, 3);
  ctx.fillRect(px + 18, y0 + 8, 2, 3);
  // grosses joues
  ctx.fillStyle = "#e8a87a";
  ctx.fillRect(px + 8, y0 + 10, 4, 3);
  ctx.fillRect(px + 20, y0 + 10, 4, 3);
  // une plume
  ctx.fillStyle = "#fff5e0";
  ctx.fillRect(px + 20, y0 - 7, 4, 9);
  ctx.fillStyle = "#4a7a3a";
  ctx.fillRect(px + 20, y0 - 7, 4, 3);
}

function drawEclair(px, py, stuck, t) {
  // Éclair Vif, le cheval brun de Graine de Bison
  const y0 = py;
  if (stuck) {
    // enfoncé dans la boue : seul le haut dépasse, il gigote
    const wob = Math.floor(t / 320) % 2;
    ctx.fillStyle = "#82603a";
    ctx.beginPath();
    ctx.ellipse(px + 16, y0 + 24, 15, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a5a33";
    ctx.fillRect(px + 6, y0 + 10 + wob, 20, 12);
    ctx.beginPath();
    ctx.ellipse(px + 26, y0 + 6 + wob, 6, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c3d20";
    ctx.fillRect(px + 20, y0 + wob, 4, 9);
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(px + 27, y0 + 4 + wob, 2, 2);
    return;
  }
  ctx.fillStyle = "#8a5a33";
  ctx.fillRect(px + 4, y0 + 12, 22, 12);
  ctx.fillRect(px + 6, y0 + 22, 4, 8);
  ctx.fillRect(px + 20, y0 + 22, 4, 8);
  ctx.beginPath();
  ctx.ellipse(px + 26, y0 + 8, 6, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5c3d20";
  ctx.fillRect(px + 20, y0 + 2, 4, 10);
  ctx.fillRect(px + 2, y0 + 12, 3, 8);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 27, y0 + 6, 2, 2);
}

function drawGraineRider(px, py, t) {
  // Graine de Bison au galop sur Éclair Vif
  const y0 = py - 6;
  const bob = Math.floor(t / 200) % 2;
  ctx.fillStyle = "#8a5a33";
  ctx.fillRect(px + 4, y0 + 18, 24, 11);
  ctx.fillRect(px + 6, y0 + 27, 4, 7 - bob * 2);
  ctx.fillRect(px + 22, y0 + 27, 4, 7 - bob * 2);
  ctx.beginPath();
  ctx.ellipse(px + 27, y0 + 15, 6, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5c3d20";
  ctx.fillRect(px + 20, y0 + 10, 4, 9);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 28, y0 + 13, 2, 2);
  // Graine de Bison dessus
  ctx.fillStyle = "#b5623f";
  ctx.fillRect(px + 10, y0 + 6 - bob, 12, 10);
  ctx.fillStyle = "#f0c48c";
  ctx.fillRect(px + 10, y0 - 4 - bob, 12, 11);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 10, y0 - 4 - bob, 12, 5);
  ctx.fillStyle = "#fff5e0";
  ctx.fillRect(px + 20, y0 - 10 - bob, 3, 8);
}

function drawVoleur(px, py, awake, t) {
  // un voleur : silhouette grise à bandeau, endormie (Zzz)
  const y0 = py + 2;
  if (!awake) {
    ctx.fillStyle = "#6d6d78";
    ctx.beginPath();
    ctx.ellipse(px + 15, y0 + 20, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f0c48c";
    ctx.beginPath();
    ctx.ellipse(px + 26, y0 + 16, 6, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2d2d33";                 // bandeau
    ctx.fillRect(px + 20, y0 + 12, 12, 4);
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(px + 26, y0 + 17, 3, 1);      // œil fermé
    const zz = Math.floor(t / 600) % 2;
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.fillText("z", px + 24, y0 + 2 - zz * 3);
    ctx.fillText("Z", px + 28, y0 - 4 - zz * 3);
    return;
  }
  ctx.fillStyle = "#6d6d78";
  ctx.fillRect(px + 8, y0 + 8, 16, 14);
  ctx.fillRect(px + 9, y0 + 20, 5, 8);
  ctx.fillRect(px + 18, y0 + 20, 5, 8);
  ctx.fillStyle = "#f0c48c";
  ctx.fillRect(px + 8, y0 - 4, 16, 13);
  ctx.fillStyle = "#2d2d33";
  ctx.fillRect(px + 8, y0 - 1, 16, 4);
  ctx.fillStyle = "#fff";
  ctx.fillRect(px + 11, y0, 3, 2);
  ctx.fillRect(px + 18, y0, 3, 2);
}

function drawTracksItem(px, py, t) {
  // empreintes fraîches qui scintillent
  const tw = Math.floor(t / 300) % 2;
  ctx.fillStyle = "#6b4a2a";
  ctx.beginPath();
  ctx.ellipse(px + 10, py + 12, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(px + 20, py + 20, 4, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd93d";
  if (tw) { ctx.fillRect(px + 4, py + 4, 4, 4); ctx.fillRect(px + 24, py + 24, 3, 3); }
  else { ctx.fillRect(px + 24, py + 4, 4, 4); ctx.fillRect(px + 5, py + 24, 3, 3); }
}

function drawBranchItem(px, py, t) {
  const tw = Math.floor(t / 300) % 2;
  ctx.strokeStyle = "#8a5a2b";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(px + 5, py + 22);
  ctx.lineTo(px + 27, py + 12);
  ctx.stroke();
  ctx.strokeStyle = "#6b4a2a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + 14, py + 18); ctx.lineTo(px + 20, py + 8);
  ctx.stroke();
  ctx.fillStyle = "#ffd93d";
  if (tw) ctx.fillRect(px + 4, py + 6, 4, 4);
  else ctx.fillRect(px + 24, py + 22, 4, 4);
}

function drawRelic(px, py, t) {
  // l'objet sacré : une peau peinte qui raconte l'histoire de la tribu
  const tw = Math.floor(t / 300) % 2;
  ctx.fillStyle = "#e8d5ae";
  ctx.fillRect(px + 5, py + 6, 22, 20);
  ctx.strokeStyle = "#b98a2f";
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 5, py + 6, 22, 20);
  // pictogrammes rouges : soleil et zigzag
  ctx.fillStyle = "#d64545";
  ctx.beginPath();
  ctx.arc(px + 12, py + 12, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#a04838";
  ctx.beginPath();
  ctx.moveTo(px + 8, py + 21); ctx.lineTo(px + 13, py + 17);
  ctx.lineTo(px + 18, py + 21); ctx.lineTo(px + 23, py + 17);
  ctx.stroke();
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(px + 19, py + 9, 6, 4);       // petit bison
  ctx.fillStyle = "#ffd93d";
  if (tw) { ctx.fillRect(px + 2, py + 2, 5, 5); ctx.fillRect(px + 26, py + 24, 4, 4); }
  else { ctx.fillRect(px + 26, py + 2, 5, 5); ctx.fillRect(px + 2, py + 24, 4, 4); }
}

function drawPlayerSprite(px, py, dir, step, t) {
  if (player.sprite === "ride") drawRider(px, py, dir, step, t);
  else drawYakari(px, py, dir, step);
}

/* ============================================================
   PHASE 1 — LE VILLAGE AU MATIN : le vol est découvert
   ============================================================ */
function startPhase1() {
  phase = 1;
  updateFeathers(0);
  setMap(MAP_VILLAGE);
  raining = false; night = false; dawn = false; lightPos = null;
  player.x = 4; player.y = 7; player.dir = "up"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.talkedRoc = false; quest.talkedGraine = false; quest.ponyReady = false; quest.mounted = false;

  const roc = {
    id: "roc", x: 7, y: 3, solid: true,
    draw: (px, py, t) => drawRoc(px, py, t),
    onBump() {
      if (!quest.talkedRoc) {
        quest.talkedRoc = true;
        sfx.cri();
        narrate("Roc Tranquille : « On a volé l'objet sacré de la tribu dans mon tipi ! » Va voir Graine de Bison, là-bas !");
        markerTarget = { x: 11, y: 7 };
      } else {
        narrate("Roc Tranquille est très triste. Il faut retrouver l'objet sacré !");
      }
    },
  };
  const graine = {
    id: "graine", x: 11, y: 7, solid: true,
    draw: (px, py, t) => drawGraine(px, py, t),
    onBump(e) {
      if (!quest.talkedRoc) { sfx.bump(); narrate("Va d'abord écouter Roc Tranquille, près de son tipi !"); return; }
      if (quest.talkedGraine) return;
      quest.talkedGraine = true;
      narrate("Graine de Bison : « C'est moi le meilleur pisteur ! Je ramènerai l'objet sacré avant tout le monde ! » Et il part au galop !");
      wait(1400, () => {
        entities = entities.filter(x => x.id !== "graine" && x.id !== "eclair");
        addFx("poof", e.x, e.y);
        sfx.neigh();
        quest.ponyReady = true;
        narrate("Yakari veut que papa soit fier de lui. Touche Petit Tonnerre pour monter sur son dos !");
        markerTarget = { x: 5, y: 9 };
      });
    },
  };
  const eclair = {
    id: "eclair", x: 12, y: 7, solid: true,
    draw: (px, py, t) => drawEclair(px, py, false, t),
    onBump() { sfx.neigh(); narrate("C'est Éclair Vif, le cheval de Graine de Bison."); },
  };
  const papa = {
    id: "papa", x: 9, y: 5, solid: true,
    draw: (px, py, t) => drawRegard(px, py, t),
    onBump() { narrate("Papa Regard Droit observe les traces. Il a l'air soucieux."); },
  };
  const pony = {
    id: "pony", x: 5, y: 9, solid: true, mode: "stand",
    draw: (px, py, t, e) => drawPony(px, py, e.mode, t),
    onBump(e) {
      if (!quest.ponyReady) {
        sfx.neigh();
        narrate("Petit Tonnerre : « Hiii ! » Va d'abord voir Roc Tranquille et Graine de Bison !");
        return;
      }
      quest.mounted = true;
      entities = entities.filter(x => x.id !== "pony");
      player.sprite = "ride";
      sfx.success();
      narrate("En selle ! Sors du village par le chemin, à droite !");
      markerTarget = { x: 18, y: 6 };
    },
  };
  entities.push(roc, graine, eclair, papa, pony);
  markerTarget = { x: roc.x, y: roc.y };

  onMoveComplete = () => {
    if (quest.mounted && player.y === 6 && player.x >= 18) {
      onMoveComplete = null;
      fadeOut(() => startPhase2());
    }
  };
  tileBumpHandler = null;

  narrate("Ce matin, tout le village est inquiet. Va écouter Roc Tranquille, près de son tipi ! Marche avec les flèches, ou touche la carte.");
}

/* ============================================================
   PHASE 2 — LA PRAIRIE : trouver les empreintes des voleurs
   ============================================================ */
function startPhase2() {
  phase = 2;
  updateFeathers(1);
  setMap(MAP_PRAIRIE);
  player.x = 1; player.y = 6; player.dir = "right"; player.sprite = "ride"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.tracks = 0;
  fadeIn();
  locked = false;

  narrate("Pour suivre les voleurs, il faut leurs empreintes ! Cherche les 4 traces qui brillent dans la prairie !");

  const trackSpots = [[6, 3], [10, 8], [15, 4], [19, 7]];
  for (const [tx, ty] of trackSpots) {
    entities.push({
      id: "track", x: tx, y: ty, solid: false, item: true,
      draw: (px, py, t) => drawTracksItem(px, py, t),
    });
  }
  const tracksLeft = () => entities.filter(e => e.id === "track");
  markerTarget = nearestMarker(tracksLeft());

  onMoveComplete = () => {
    const here = entities.find(e => e.item && e.x === player.x && e.y === player.y);
    if (here && here.id === "track") {
      entities = entities.filter(e => e !== here);
      quest.tracks++;
      sfx.pop();
      addFx("sparkle", here.x, here.y);
      const left = 4 - quest.tracks;
      if (left > 0) {
        narrate(left === 1 ? "Bien vu ! Encore une dernière trace !" : `Bien vu ! Encore ${left} traces !`);
        markerTarget = nearestMarker(tracksLeft());
      } else {
        narrate("Toutes les empreintes vont vers la forêt ! Suis la piste, tout à droite !");
        markerTarget = { x: 22, y: 6 };
      }
      return;
    }
    if (quest.tracks >= 4 && player.y === 6 && player.x >= 22) {
      onMoveComplete = null;
      fadeOut(() => startPhase3());
    }
  };
  tileBumpHandler = null;
}

/* ============================================================
   PHASE 3 — LA COURSE VERS LA RIVIÈRE : Yakari s'énerve
   ============================================================ */
function startPhase3() {
  phase = 3;
  updateFeathers(2);
  setMap(MAP_RIVIERE);
  player.x = 1; player.y = 6; player.dir = "right"; player.sprite = "ride"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.river = false;
  fadeIn();
  locked = false;

  narrate("La piste continue dans la forêt ! Suis les empreintes jusqu'à la rivière !");
  markerTarget = { x: 14, y: 6 };

  // Graine de Bison double Yakari au galop
  const rival = {
    id: "rival", x: 3, y: 5, solid: false,
    draw: (px, py, t) => drawGraineRider(px, py, t),
  };
  entities.push(rival);
  wait(1800, () => {
    if (phase !== 3) return;
    narrate("Graine de Bison vous dépasse à toute vitesse ! Yakari veut aller encore plus vite...");
    sfx.neigh();
    addFx("poof", rival.x, rival.y);
    entities = entities.filter(x => x.id !== "rival");
  });

  onMoveComplete = () => {
    if (!quest.river && player.y === 6 && player.x >= 14) {
      quest.river = true;
      onMoveComplete = null;
      locked = true;
      markerTarget = null;
      sfx.bump();
      narrate("Petit Tonnerre s'arrête au bord de la rivière pour souffler. Yakari le gronde très fort. Ce n'est pas gentil...");
      wait(4200, () => {
        addFx("poof", player.x - 1, player.y);
        player.sprite = "walk";
        sfx.neigh();
        narrate("Petit Tonnerre est tout triste : il s'en va ! Et la nuit tombe...");
        wait(3800, () => fadeOut(() => startPhase4(), 1400));
      });
    }
  };
  tileBumpHandler = (tx, ty, ch) => {
    if (ch === "W" || ch === "S") { sfx.splash(); addFx("splash", tx, ty); narrate("Brrr, l'eau est froide !"); }
    else sfx.bump();
  };
}

/* ============================================================
   PHASE 4 — LA NUIT : retrouver Petit Tonnerre et se réconcilier
   ============================================================ */
function startPhase4() {
  phase = 4;
  updateFeathers(3);
  night = true;
  player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.caresses = 0; quest.friends = false;
  fadeIn(1400);
  locked = false;

  narrate("Il fait tout noir et Yakari est seul. Retrouve Petit Tonnerre pour lui demander pardon !");

  const pony = {
    id: "pony", x: 9, y: 3, solid: true, mode: "stand", glow: true,
    draw: (px, py, t, e) => drawPony(px, py, e.mode, t),
    onBump(e) {
      if (!quest.friends) {
        quest.caresses++;
        sfx.pop();
        addFx("heart", e.x, e.y);
        if (quest.caresses === 1) narrate("Pardon, Petit Tonnerre. Caresse-le doucement, encore !");
        if (quest.caresses === 2) narrate("Petit Tonnerre tend son museau... Encore une caresse !");
        if (quest.caresses >= 3) {
          quest.friends = true;
          sfx.neigh();
          narrate("Hiii ! Petit Tonnerre pardonne Yakari : les amis, c'est plus important que la course ! Touche-le encore pour monter.");
        }
      } else {
        entities = entities.filter(x => x.id !== "pony");
        player.sprite = "ride";
        sfx.success();
        narrate("En selle ! Traverse la rivière sur les pierres du gué, à droite !");
        markerTarget = { x: 22, y: 6 };
        onMoveComplete = () => {
          if (tileAt(player.x, player.y) === "S") { sfx.splash(); addFx("splash", player.x, player.y); }
          if (player.y === 6 && player.x >= 22) {
            onMoveComplete = null;
            fadeOut(() => startPhase5(), 1400);
          }
        };
      }
    },
  };
  entities.push(pony);
  markerTarget = { x: pony.x, y: pony.y };

  onMoveComplete = null;
  tileBumpHandler = (tx, ty, ch) => { sfx.bump(); };
}

/* ============================================================
   PHASE 5 — L'AUBE AU MARAIS : aider Graine de Bison
   ============================================================ */
function startPhase5() {
  phase = 5;
  updateFeathers(4);
  setMap(MAP_MARAIS);
  night = false; dawn = true;
  player.x = 1; player.y = 6; player.dir = "right"; player.sprite = "ride"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.askedHelp = false; quest.hasBranch = false; quest.freed = false;
  fadeIn(1400);
  locked = false;

  narrate("Le jour se lève sur le marais. Tu entends ? Quelqu'un appelle au secours, là-bas !");

  const graine = {
    id: "graine", x: 14, y: 5, solid: true,
    draw: (px, py, t) => drawGraine(px, py, t),
    onBump() {
      if (!quest.askedHelp) {
        quest.askedHelp = true;
        sfx.cri();
        narrate("Graine de Bison : « Au secours ! Éclair Vif est coincé dans la boue ! » Va chercher la grande branche qui brille !");
        markerTarget = { x: 5, y: 8 };
        entities.push({
          id: "branch", x: 5, y: 8, solid: false, item: true,
          draw: (px, py, t) => drawBranchItem(px, py, t),
        });
      } else if (!quest.hasBranch) {
        narrate("Graine de Bison : « Vite, la branche qui brille ! »");
      } else {
        narrate("Graine de Bison : « Tends la branche à Éclair Vif ! »");
      }
    },
  };
  const eclair = {
    id: "eclair", x: 17, y: 5, solid: true, stuck: true,
    draw: (px, py, t, e) => drawEclair(px, py, e.stuck, t),
    onBump(e) {
      if (!quest.askedHelp) { sfx.neigh(); narrate("Éclair Vif est en difficulté ! Va parler à Graine de Bison !"); return; }
      if (!quest.hasBranch) { sfx.neigh(); narrate("Il faut la grande branche qui brille pour le tirer de là !"); markerTarget = { x: 5, y: 8 }; return; }
      if (quest.freed) return;
      quest.freed = true;
      e.stuck = false;
      e.x = 17; e.y = 4;
      sfx.splash();
      addFx("splash", 17, 5);
      addFx("poof", 17, 5);
      addFx("heart", 17, 4);
      sfx.success();
      markerTarget = null;
      locked = true;
      narrate("Hop ! Éclair Vif est libre ! Graine de Bison dit merci : Yakari a arrêté la course pour aider un ami.");
      wait(4600, () => fadeOut(() => startPhase6(), 1400));
    },
  };
  entities.push(graine, eclair);
  markerTarget = { x: graine.x, y: graine.y };

  onMoveComplete = () => {
    const here = entities.find(e => e.item && e.x === player.x && e.y === player.y);
    if (here && here.id === "branch") {
      entities = entities.filter(e => e !== here);
      quest.hasBranch = true;
      sfx.pop();
      addFx("sparkle", here.x, here.y);
      narrate("Tu as la branche ! Apporte-la à Éclair Vif, dans la boue !");
      markerTarget = { x: 17, y: 5 };
    }
    if (tileAt(player.x, player.y) === "M") { sfx.splash(); addFx("splash", player.x, player.y); }
  };
  tileBumpHandler = (tx, ty, ch) => {
    if (ch === "p") { sfx.splash(); addFx("splash", tx, ty); }
    else sfx.bump();
  };
}

/* ============================================================
   PHASE 6 — LE REPAIRE DES VOLEURS puis LE RETOUR AU VILLAGE
   ============================================================ */
function startPhase6() {
  phase = 6;
  updateFeathers(5);
  setMap(MAP_REPAIRE);
  dawn = false;
  player.x = 1; player.y = 6; player.dir = "right"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.scared = 0; quest.hasRelic = false;
  lightPos = { x: 10, y: 5 };
  fadeIn(1400);
  locked = false;

  narrate("Chhht... Voici le repaire des voleurs ! Ils dorment près du feu. Marche vers eux pour leur faire une grosse peur !");

  const spots = [[8, 4], [12, 6]];
  for (const [vx, vy] of spots) {
    entities.push({
      id: "voleur", x: vx, y: vy, solid: true,
      draw: (px, py, t) => drawVoleur(px, py, false, t),
      onBump(e) {
        entities = entities.filter(x => x !== e);
        quest.scared++;
        sfx.growl();
        addFx("poof", e.x, e.y);
        if (quest.scared < 2) {
          narrate("Hou ! Le voleur détale à toutes jambes ! Fais peur à l'autre voleur !");
          markerTarget = nearestMarker(entities.filter(x => x.id === "voleur"));
        } else {
          sfx.success();
          narrate("Les voleurs sont partis en courant ! Regarde : l'objet sacré brille près du feu. Va le chercher !");
          entities.push({
            id: "relic", x: 10, y: 4, solid: false, item: true,
            draw: (px, py, t) => drawRelic(px, py, t),
          });
          markerTarget = { x: 10, y: 4 };
        }
      },
    });
  }
  markerTarget = nearestMarker(entities.filter(x => x.id === "voleur"));

  onMoveComplete = () => {
    const here = entities.find(e => e.item && e.x === player.x && e.y === player.y);
    if (here && here.id === "relic") {
      entities = entities.filter(e => e !== here);
      quest.hasRelic = true;
      sfx.tada();
      addFx("sparkle", here.x, here.y);
      markerTarget = null;
      locked = true;
      narrate("Tu as retrouvé l'objet sacré de la tribu ! Vite, rentrons au village avec Graine de Bison !");
      wait(4200, () => fadeOut(() => startReturn(), 1400));
    }
  };
  tileBumpHandler = (tx, ty, ch) => {
    if (ch === "F") { narrate("Attention, le feu des voleurs est chaud !"); sfx.bump(); }
    else sfx.bump();
  };
}

function startReturn() {
  // retour au village (toujours la phase 6)
  setMap(MAP_VILLAGE);
  dawn = true; lightPos = null;
  player.x = 17; player.y = 6; player.dir = "left"; player.sprite = "ride"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  fadeIn(1400);
  locked = false;

  narrate("Te voilà au village ! Apporte l'objet sacré à Roc Tranquille, près de son tipi !");

  const roc = {
    id: "roc", x: 7, y: 3, solid: true,
    draw: (px, py, t) => drawRoc(px, py, t),
    onBump() { victory(); },
  };
  const papa = {
    id: "papa", x: 8, y: 4, solid: true,
    draw: (px, py, t) => drawRegard(px, py, t),
    onBump() { narrate("Papa sourit : il a tout vu. Donne l'objet sacré à Roc Tranquille !"); },
  };
  const graine = {
    id: "graine", x: 11, y: 7, solid: true,
    draw: (px, py, t) => drawGraine(px, py, t),
    onBump() { narrate("Graine de Bison : « Yakari est un vrai ami ! »"); },
  };
  const eclair = {
    id: "eclair", x: 12, y: 7, solid: true,
    draw: (px, py, t) => drawEclair(px, py, false, t),
    onBump() { sfx.neigh(); },
  };
  entities.push(roc, papa, graine, eclair);
  markerTarget = { x: roc.x, y: roc.y };

  onMoveComplete = null;
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
  narrate("Roc Tranquille retrouve l'objet sacré ! Papa est très fier de Yakari : le vrai honneur, ce n'est pas de gagner, c'est d'aider les autres. Bravo, tu as fini l'aventure !");
  overlayTitle.textContent = "BRAVO ! 🎉";
  overlaySub.textContent = "L'objet sacré est de retour, et Petit Tonnerre a le meilleur ami du monde !";
  overlayBtn.textContent = "🔄 Rejouer";
  overlay.classList.remove("hidden");
  overlayBtn.onclick = () => location.reload();
}

/* ------------------------------------------------------------
   DÉMARRAGE
   ------------------------------------------------------------ */
setMap(MAP_VILLAGE);
player.x = 4; player.y = 7; player.dir = "down"; player.sprite = "walk";
startEngine(startPhase1);
