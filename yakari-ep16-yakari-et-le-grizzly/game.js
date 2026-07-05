/* ============================================================
   YAKARI ET LE GRIZZLY — EP16
   Jeu façon Game Boy Color (vue de dessus, déplacement case
   par case, on marche contre les choses pour interagir).
   Retrace l'épisode 16 « Yakari et le grizzly » : le grizzly
   qui terrorise la forêt, le conseil de Grand Aigle (« ruse et
   patience surpassent la force »), l'hibernation, la poussée
   sur la glace jusqu'à l'île, la promesse et la leçon de
   natation au printemps.
   Recharger la page recommence l'aventure de zéro.
   ============================================================ */

"use strict";

/* ------------------------------------------------------------
   CONSTANTES & RÉFÉRENCES
   ------------------------------------------------------------ */
/* sons spécifiques de cet épisode */
Object.assign(sfx, {
  snore() { tone(95, 0.45, "sawtooth", 0.09); tone(75, 0.5, "sawtooth", 0.08, 0.4); },
  yawn() { tone(330, 0.3, "sine", 0.12); tone(240, 0.4, "sine", 0.1, 0.2); },
  slide() { [420, 340, 260, 200].forEach((f, i) => tone(f, 0.1, "triangle", 0.1, i * 0.06)); },
});

/* ------------------------------------------------------------
   CARTES (une lettre = une case)
   G herbe · D chemin · T arbre vert · A arbre d'automne
   Y sapin enneigé · W eau (décor) · w eau du lac (canoë)
   N neige · I glace · R rocher · C grotte · l feuilles · k traces
   ------------------------------------------------------------ */
const MAP_FOREST = [
  "AAAAAAAAAAAAAAAAAAAAAAAA",
  "AGGlGGGGGGGGAGGGGGlGGGGA",
  "AGAGGGGlGGGGGGGAGGGGGAGA",
  "AGGGGGGGGGkGGGGGGGGGGGGA",
  "AGGGGAGGGGGGGGGGAGGlGGGA",
  "AGGlGGGGGGGGGGGGGkGGGGGA",
  "AGGGGGGGGGGGGGGGGGGGGGGG",
  "AGGGGAGGGlGGGGGGGGGAGGGA",
  "AGGGGGGGGGGkGGGGGGGGGGGA",
  "AGlGGGGGGGAGGGGGGGGGlGGA",
  "AGGGGGGGGGGGGGGGGGGGGGGA",
  "AAAAAAAAAAAAAAAAAAAAAAAA",
];
const MAP_RIVER = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TWWWWWWWWWWWWWWWWWWWWWWWWT",
  "TWWWWWWWWWWWWWWWWWWWWWWWWT",
  "TGGGGGGGGGGGGGGGGGGGRRCRRT",
  "TGGGGGGGGGGGGGGGGGGGGGGGGT",
  "TGGGGGGGGGGGGGGGGGGGGGGGGT",
  "TGGAGGGGGGGGGGGGGGAGGGGGGT",
  "DGGGGGGGGGGGGGGGGGGGGGGGGT",
  "TGGGGGAGGGGGGGGAGGGGGGGGGT",
  "TGGlGGGGGGGlGGGGGGGGGGGGGT",
  "TGGGGGGGGGGGGGGGGGGGGGGGGT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTT",
];
const MAP_EAGLE = [
  "TTTTTTTTTTTTTTTTTTTT",
  "TGGGGGGGGGGGGGGGGGGT",
  "TGGAGGGGGGGGGGGAGGGT",
  "TGGGGGGGGGGGGGGGGGGT",
  "TGGGGGGGGRRRGGGGGGGT",
  "TGGAGGGGGGGGGGGGGGGT",
  "DGGGGGGGGGGGGGGGAGGT",
  "TGGGGGGGGGGGGGGGGGGT",
  "TGGGGAGGGGGGAGGGGGGT",
  "TGGGGGGGGGGGGGGGGGGT",
  "TTTTTTTTTTTTTTTTTTTT",
];
const MAP_LAKE = [
  "YYYYYYYYYYYYYYYYYYYYYYYYYY",
  "YNNNNIIIIIIIIIIIIIIIINNNNY",
  "YNNIIIIIIIIIIIIIIIIIIIINNY",
  "YNIIIIIIIIIIIIIIIIIIIIIINY",
  "YNIIIIIIIIIIINNNNIIIIIIINY",
  "YNIIIIIIIIIIINNNNIIIIIIINY",
  "YNIIIIIIIIIIIIIIIIIIIIIINY",
  "YNNIIIIIIIIIIIIIIIIIIIINNY",
  "YNNNIIIIIIIIIIIIIIIIINNNNY",
  "YNNNNNNNNIIIIIIIINNNNNNNNY",
  "YNNNNNNNNNNNNNNNNNNRRCRRNY",
  "YNNNNNNNNNNNNNNNNNNNNNNNNY",
  "YNNNNNNNNNNNNNNNNNNNNNNNNY",
  "YYYYYYYYYYYYYYYYYYYYYYYYYY",
];
const MAP_SPRING = [
  "TTTTTTTTTTTTTTTTTTTTTTTTTT",
  "TGGGGwwwwwwwwwwwwwwwwGGGGT",
  "TGGwwwwwwwwwwwwwwwwwwwwGGT",
  "TGwwwwwwwwwwwwwwwwwwwwwwGT",
  "TGwwwwwwwwwwwGGGGwwwwwwwGT",
  "TGwwwwwwwwwwwGGGGwwwwwwwGT",
  "TGwwwwwwwwwwwwwwwwwwwwwwGT",
  "TGGwwwwwwwwwwwwwwwwwwwwGGT",
  "TGGGwwwwwwwwwwwwwwwwwGGGGT",
  "TGGGGGGGGwwwwwwwwGGGGGGGGT",
  "TGGGGGGGGGGGGGGGGGGRRCRRGT",
  "TGGGGGGGGGGGGGGGGGGGGGGGGT",
  "TGGGGGGGGGGGGGGGGGGGGGGGGT",
  "TTTTTTTTTTTTTTTTTTTTTTTTTT",
];

SOLID_TILES = "TWRCAY";

/* ------------------------------------------------------------
   ÉTAT DU JEU
   ------------------------------------------------------------ */
let theme = "autumn";            // autumn | winter | spring (teinte de l'herbe)

// le lac 'w' n'est franchissable qu'en canoë
tileSolidHook = (chr) => (chr === "w" ? !quest.inCanoe : undefined);


function drawTile(chr, x, y, px, py, t) {
  if (chr === "W" || chr === "w") {
    ctx.fillStyle = "#3f78c8";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#5b93dd";
    const ph = Math.floor(t / 550 + (x + y) / 2) % 2;
    ctx.fillRect(px + 4 + ph * 8, py + 8, 10, 3);
    ctx.fillRect(px + 14 - ph * 6, py + 22, 10, 3);
    return;
  }
  if (chr === "I") {
    ctx.fillStyle = "#bfe3f2";
    ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = "#e4f4fb";
    ctx.fillRect(px + 3 + speckle(x, y, 1), py + 5, 12, 3);
    ctx.fillRect(px + 14, py + 20, 12, 3);
    if (speckle(x, y, 2) < 3) {
      ctx.strokeStyle = "#9fcbe0";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 6, py + 24);
      ctx.lineTo(px + 16, py + 14);
      ctx.lineTo(px + 26, py + 18);
      ctx.stroke();
    }
    return;
  }
  if (chr === "N" || chr === "Y") {
    ctx.fillStyle = "#eef4f8";
    ctx.fillRect(px, py, TILE, TILE);
    if (speckle(x, y, 0) < 4) {
      ctx.fillStyle = "#dbe7ee";
      ctx.fillRect(px + 4 + speckle(x, y, 1), py + 6 + speckle(x, y, 2), 5, 4);
      ctx.fillRect(px + 18, py + 20, 5, 4);
    }
    if (chr === "Y") {
      // sapin enneigé
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(px + 13, py + 22, 6, 8);
      ctx.fillStyle = "#2f5e40";
      ctx.beginPath();
      ctx.moveTo(px + 16, py - 4);
      ctx.lineTo(px + 29, py + 24);
      ctx.lineTo(px + 3, py + 24);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f6fbff";
      ctx.fillRect(px + 9, py + 8, 14, 4);
      ctx.fillRect(px + 12, py - 2, 8, 4);
    }
    return;
  }
  // herbe de base (teinte selon la saison)
  ctx.fillStyle = theme === "autumn" ? "#9cb44e" : "#7ec850";
  ctx.fillRect(px, py, TILE, TILE);
  if (speckle(x, y, 0) < 4) {
    ctx.fillStyle = theme === "autumn" ? "#88a040" : "#6cb244";
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
    case "l":
      // tas de feuilles mortes
      ctx.fillStyle = "#d97b2b";
      ctx.fillRect(px + 5, py + 9, 7, 5);
      ctx.fillRect(px + 18, py + 18, 7, 5);
      ctx.fillStyle = "#c9542a";
      ctx.fillRect(px + 12, py + 20, 6, 5);
      ctx.fillStyle = "#e8a04a";
      ctx.fillRect(px + 19, py + 7, 6, 4);
      break;
    case "k":
      // traces de pattes
      ctx.fillStyle = "#7a5c38";
      ctx.beginPath();
      ctx.ellipse(px + 9, py + 10, 3, 4, 0.4, 0, Math.PI * 2);
      ctx.ellipse(px + 18, py + 16, 3, 4, 0.4, 0, Math.PI * 2);
      ctx.ellipse(px + 12, py + 24, 3, 4, 0.4, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "T":
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(px + 13, py + 20, 6, 10);
      ctx.fillStyle = "#356b44";
      ctx.fillRect(px + 4, py + 2, 24, 20);
      ctx.fillStyle = "#3e7d4f";
      ctx.fillRect(px + 7, py - 2, 18, 14);
      break;
    case "A":
      // arbre d'automne (feuillage orange)
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(px + 13, py + 20, 6, 10);
      ctx.fillStyle = "#c9662a";
      ctx.fillRect(px + 4, py + 2, 24, 20);
      ctx.fillStyle = "#e08a3c";
      ctx.fillRect(px + 7, py - 2, 18, 14);
      ctx.fillStyle = "#f2b04e";
      ctx.fillRect(px + 10, py + 2, 10, 6);
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
  }
}


function drawCanoeRider(px, py, dir, t) {
  // Yakari et la petite loutre en canoë
  const y0 = py;
  const bob = Math.floor(t / 320) % 2;
  // vaguelettes
  ctx.fillStyle = "#a8cde8";
  ctx.fillRect(px - 3, y0 + 26 + bob, 9, 3);
  ctx.fillRect(px + 26, y0 + 24 - bob, 9, 3);
  // coque
  ctx.fillStyle = "#a5713d";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 20 + bob, 17, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7c5228";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 17 + bob, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // pagaie
  ctx.strokeStyle = "#6b4a2a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(px + 6, y0 + 4 + bob);
  ctx.lineTo(px + 1, y0 + 24 + bob);
  ctx.stroke();
  ctx.fillStyle = "#8a5a2b";
  ctx.fillRect(px - 2, y0 + 22 + bob, 6, 8);
  // Yakari
  ctx.fillStyle = "#e8b476";
  ctx.fillRect(px + 7, y0 + 8 + bob, 9, 9);
  ctx.fillStyle = "#f0c48c";
  ctx.fillRect(px + 6, y0 - 2 + bob, 11, 11);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 6, y0 - 2 + bob, 11, 4);
  ctx.fillRect(px + 9, y0 + 4 + bob, 2, 2);
  ctx.fillRect(px + 13, y0 + 4 + bob, 2, 2);
  ctx.fillStyle = "#fff5e0";
  ctx.fillRect(px + 15, y0 - 8 + bob, 3, 7);
  // loutre à l'arrière
  ctx.fillStyle = "#8a5a3b";
  ctx.fillRect(px + 20, y0 + 6 + bob, 8, 10);
  ctx.fillStyle = "#c99b6a";
  ctx.fillRect(px + 22, y0 + 10 + bob, 4, 5);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 22, y0 + 8 + bob, 1, 2);
  ctx.fillRect(px + 25, y0 + 8 + bob, 1, 2);
}

function drawGrizzly(px, py, mode, t) {
  const B = "#7a4c28", BD = "#5f3a1e", M = "#c99b6a";
  if (mode === "sleep") {
    // allongé, il ronfle
    const br = Math.floor(t / 800) % 2;   // respiration
    ctx.fillStyle = B;
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 18, 22, 12 + br, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(px + 33, py + 14, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BD;
    ctx.fillRect(px + 27, py + 4, 5, 5);   // oreille
    ctx.fillRect(px + 36, py + 4, 5, 5);
    ctx.fillStyle = M;
    ctx.fillRect(px + 36, py + 13, 7, 6);  // museau
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(px + 40, py + 14, 3, 2);  // truffe
    ctx.fillRect(px + 31, py + 11, 4, 1);  // œil fermé
    const zz = Math.floor(t / 600) % 2;
    ctx.fillStyle = "#fff";
    ctx.font = "11px sans-serif";
    ctx.fillText("z", px + 34, py - 2 - zz * 3);
    ctx.fillText("Z", px + 39, py - 8 - zz * 3);
    return;
  }
  if (mode === "swim") {
    // seule la tête et les pattes avant dépassent de l'eau
    const bob = Math.floor(t / 300) % 2;
    ctx.fillStyle = "#a8cde8";
    ctx.fillRect(px - 4, py + 22 + bob, 12, 3);
    ctx.fillRect(px + 24, py + 20 - bob, 12, 3);
    ctx.fillStyle = B;
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 14 + bob, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = BD;
    ctx.fillRect(px + 6, py + 2 + bob, 6, 6);
    ctx.fillRect(px + 20, py + 2 + bob, 6, 6);
    // pattes qui barbotent
    ctx.fillStyle = B;
    ctx.fillRect(px - 2, py + 16 - bob * 4, 7, 6);
    ctx.fillRect(px + 27, py + 12 + bob * 4, 7, 6);
    ctx.fillStyle = M;
    ctx.fillRect(px + 11, py + 14 + bob, 10, 8);
    ctx.fillStyle = "#1d1d1d";
    ctx.fillRect(px + 14, py + 16 + bob, 4, 3);
    ctx.fillRect(px + 10, py + 9 + bob, 3, 3);
    ctx.fillRect(px + 19, py + 9 + bob, 3, 3);
    return;
  }
  // assis (sit), debout inquiet (stand) ou joyeux (happy)
  const up = mode === "happy" ? -2 : 0;
  // gros corps
  ctx.fillStyle = B;
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 16 + up, 17, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  // ventre
  ctx.fillStyle = M;
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 20 + up, 10, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // pattes
  ctx.fillStyle = BD;
  ctx.fillRect(px + 2, py + 24 + up, 8, 7);
  ctx.fillRect(px + 22, py + 24 + up, 8, 7);
  // bras
  if (mode === "stand") {
    ctx.fillStyle = B;
    ctx.fillRect(px - 4, py + 2 + up, 7, 12);   // bras levés (au secours !)
    ctx.fillRect(px + 29, py + 2 + up, 7, 12);
  } else {
    ctx.fillStyle = B;
    ctx.fillRect(px - 2, py + 12 + up, 7, 10);
    ctx.fillRect(px + 27, py + 12 + up, 7, 10);
  }
  // tête
  ctx.fillStyle = B;
  ctx.beginPath();
  ctx.ellipse(px + 16, py - 2 + up, 12, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BD;
  ctx.fillRect(px + 4, py - 12 + up, 6, 7);   // oreilles
  ctx.fillRect(px + 22, py - 12 + up, 6, 7);
  // museau
  ctx.fillStyle = M;
  ctx.fillRect(px + 10, py - 2 + up, 12, 9);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 14, py + 1 + up, 4, 3);   // truffe
  // yeux
  ctx.fillRect(px + 9, py - 6 + up, 3, 3);
  ctx.fillRect(px + 20, py - 6 + up, 3, 3);
  // bouche
  if (mode === "happy") {
    ctx.strokeStyle = "#1d1d1d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px + 16, py + 4 + up, 4, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (mode === "sit") {
    // il grignote un poisson
    ctx.fillStyle = "#6fa8dc";
    ctx.fillRect(px + 24, py + 8, 10, 4);
    ctx.fillStyle = "#4e86ba";
    ctx.beginPath();
    ctx.moveTo(px + 34, py + 10);
    ctx.lineTo(px + 38, py + 6);
    ctx.lineTo(px + 38, py + 14);
    ctx.closePath();
    ctx.fill();
  }
}

function drawOtter(px, py, e, t) {
  const y0 = py + 2;
  const sad = e && e.sad;
  // queue épaisse
  ctx.fillStyle = "#6f4529";
  ctx.fillRect(px + 2, y0 + 18, 8, 5);
  // corps
  ctx.fillStyle = "#8a5a3b";
  ctx.fillRect(px + 8, y0 + 8, 14, 16);
  // ventre clair
  ctx.fillStyle = "#c99b6a";
  ctx.fillRect(px + 11, y0 + 13, 8, 10);
  // tête
  ctx.fillStyle = "#8a5a3b";
  ctx.beginPath();
  ctx.ellipse(px + 15, y0 + 4, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6f4529";
  ctx.fillRect(px + 8, y0 - 4, 4, 4);   // petites oreilles
  ctx.fillRect(px + 18, y0 - 4, 4, 4);
  // museau
  ctx.fillStyle = "#c99b6a";
  ctx.fillRect(px + 11, y0 + 3, 8, 6);
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 14, y0 + 4, 3, 2);  // truffe
  ctx.fillRect(px + 10, y0, 2, 2);      // yeux
  ctx.fillRect(px + 19, y0, 2, 2);
  // moustaches
  ctx.strokeStyle = "#f5e8d5";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px + 8, y0 + 5); ctx.lineTo(px + 3, y0 + 4);
  ctx.moveTo(px + 23, y0 + 5); ctx.lineTo(px + 28, y0 + 4);
  ctx.stroke();
  // bouche triste ou contente
  ctx.strokeStyle = "#1d1d1d";
  ctx.beginPath();
  if (sad) ctx.arc(px + 15, y0 + 11, 2, Math.PI + 0.4, -0.4);
  else ctx.arc(px + 15, y0 + 8, 2, 0.4, Math.PI - 0.4);
  ctx.stroke();
  // un poisson dans les pattes
  if (e && e.fish) {
    ctx.fillStyle = "#6fa8dc";
    ctx.fillRect(px + 9, y0 + 15, 10, 4);
    ctx.fillStyle = "#4e86ba";
    ctx.beginPath();
    ctx.moveTo(px + 19, y0 + 17);
    ctx.lineTo(px + 23, y0 + 14);
    ctx.lineTo(px + 23, y0 + 20);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHare(px, py, t) {
  const y0 = py + 4;
  const tw = Math.floor(t / 400) % 2;    // il tremble un peu
  // corps
  ctx.fillStyle = "#b0a48c";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 16, 10, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // queue blanche
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(px + 6, y0 + 18, 4, 0, Math.PI * 2);
  ctx.fill();
  // tête
  ctx.fillStyle = "#b0a48c";
  ctx.beginPath();
  ctx.ellipse(px + 21, y0 + 4, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // grandes oreilles
  ctx.fillStyle = "#9c9078";
  ctx.fillRect(px + 15 + tw, y0 - 10, 4, 12);
  ctx.fillRect(px + 22 - tw, y0 - 10, 4, 12);
  ctx.fillStyle = "#e8c8c8";
  ctx.fillRect(px + 16 + tw, y0 - 8, 2, 8);
  ctx.fillRect(px + 23 - tw, y0 - 8, 2, 8);
  // ventre
  ctx.fillStyle = "#e8e0d0";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 19, 6, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // yeux + truffe
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 19, y0 + 2, 2, 3);
  ctx.fillRect(px + 24, y0 + 2, 2, 3);
  ctx.fillStyle = "#d68a8a";
  ctx.fillRect(px + 26, y0 + 5, 3, 2);
}

function drawEagle(px, py, t) {
  const y0 = py - 8;
  const w = Math.floor(t / 500) % 2;
  // serres + rocher d'appui
  ctx.fillStyle = "#e8b545";
  ctx.fillRect(px + 11, y0 + 32, 4, 5);
  ctx.fillRect(px + 18, y0 + 32, 4, 5);
  // corps
  ctx.fillStyle = "#5f4426";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 22, 11, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  // aile repliée
  ctx.fillStyle = "#4a341d";
  ctx.beginPath();
  ctx.ellipse(px + 10 - w, y0 + 22, 5, 11, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(px + 22 + w, y0 + 22, 5, 11, -0.2, 0, Math.PI * 2);
  ctx.fill();
  // collerette claire
  ctx.fillStyle = "#d9c9a8";
  ctx.fillRect(px + 9, y0 + 10, 14, 5);
  // tête
  ctx.fillStyle = "#8a6a3f";
  ctx.beginPath();
  ctx.ellipse(px + 16, y0 + 5, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // bec jaune
  ctx.fillStyle = "#e8b545";
  ctx.beginPath();
  ctx.moveTo(px + 22, y0 + 4);
  ctx.lineTo(px + 29, y0 + 7);
  ctx.lineTo(px + 22, y0 + 9);
  ctx.closePath();
  ctx.fill();
  // œil
  ctx.fillStyle = "#1d1d1d";
  ctx.fillRect(px + 17, y0 + 2, 3, 3);
}

function drawCanoeItem(px, py, t) {
  const tw = Math.floor(t / 300) % 2;
  ctx.fillStyle = "#a5713d";
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 18, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7c5228";
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 16, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd93d";
  if (tw) { ctx.fillRect(px + 2, py + 4, 4, 4); ctx.fillRect(px + 26, py + 24, 3, 3); }
  else { ctx.fillRect(px + 26, py + 4, 4, 4); ctx.fillRect(px + 3, py + 24, 3, 3); }
}

function drawFishPile(px, py, t) {
  ctx.fillStyle = "#6fa8dc";
  ctx.fillRect(px + 4, py + 18, 14, 5);
  ctx.fillRect(px + 12, py + 12, 14, 5);
  ctx.fillRect(px + 6, py + 6, 14, 5);
  ctx.fillStyle = "#4e86ba";
  [[18, 20], [26, 14], [20, 8]].forEach(([ox, oy]) => {
    ctx.beginPath();
    ctx.moveTo(px + ox, py + oy);
    ctx.lineTo(px + ox + 5, py + oy - 4);
    ctx.lineTo(px + ox + 5, py + oy + 4);
    ctx.closePath();
    ctx.fill();
  });
  ctx.fillStyle = "#fff";
  ctx.fillRect(px + 7, py + 19, 2, 2);
  ctx.fillRect(px + 15, py + 13, 2, 2);
}

function drawIceStar(px, py, t) {
  const tw = Math.floor(t / 260) % 2;
  const r = tw ? 9 : 7;
  ctx.fillStyle = "#ffd93d";
  ctx.strokeStyle = "#b98a2f";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r / 2.4;
    const x = px + 16 + Math.cos(a) * rr;
    const y = py + 16 + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawBurrow(px, py, e, t) {
  // terrier (vide) au pied d'un talus
  ctx.fillStyle = "#8a7048";
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 14, 14, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a2e1f";
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 18, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!e.done) {
    const tw = Math.floor(t / 300) % 2;
    ctx.fillStyle = "#ffd93d";
    if (tw) ctx.fillRect(px + 3, py + 2, 4, 4);
    else ctx.fillRect(px + 25, py + 4, 4, 4);
  }
}

/* ------------------------------------------------------------
   RENDU
   ------------------------------------------------------------ */
function drawPlayerSprite(px, py, dir, step, t) {
  if (player.sprite === "ride") drawRider(px, py, dir, step, t);
  else if (player.sprite === "canoe") drawCanoeRider(px, py, dir, t);
  else drawYakari(px, py, dir, step);
}

/* ============================================================
   PHASE 1 — LE BOIS SILENCIEUX : les terriers vides
   ============================================================ */
function startPhase1() {
  phase = 1;
  updateFeathers(0);
  setMap(MAP_FOREST);
  theme = "autumn"; snowing = false; night = false; dawn = false; lightPos = null;
  player.x = 2; player.y = 6; player.dir = "right"; player.sprite = "ride"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.terriers = 0; quest.inCanoe = false;

  const lines = [
    "Personne ! Le terrier est vide...",
    "Regarde, des traces ! Toute la famille des lièvres est partie en courant !",
    "Tous les animaux ont disparu ! Allons voir à la rivière : suis le chemin, tout à droite !",
  ];
  const burrowSpots = [[7, 4], [12, 8], [18, 5]];
  for (const [bx, by] of burrowSpots) {
    entities.push({
      id: "burrow", x: bx, y: by, solid: true, done: false,
      draw: (px, py, t, e) => drawBurrow(px, py, e, t),
      onBump(e) {
        if (e.done) { sfx.bump(); narrate("C'est vide... tout le monde est parti."); return; }
        e.done = true;
        quest.terriers++;
        sfx.pop();
        addFx("sparkle", e.x, e.y);
        narrate(lines[quest.terriers - 1]);
        if (quest.terriers < 3) {
          markerTarget = nearestMarker(entities.filter(b => b.id === "burrow" && !b.done));
        } else {
          markerTarget = { x: 23, y: 6 };
        }
      },
    });
  }
  markerTarget = { x: 7, y: 4 };

  onMoveComplete = () => {
    if (quest.terriers >= 3 && player.y === 6 && player.x >= 22) {
      onMoveComplete = null;
      fadeOut(() => startPhase2());
    }
  };
  tileBumpHandler = null;

  narrate("C'est l'automne. Yakari et Petit Tonnerre se promènent dans le bois... mais quel silence ! Va regarder les terriers, sous la flèche jaune. Marche avec les flèches, ou touche la carte.");
}

/* ============================================================
   PHASE 2 — LA RIVIÈRE : le grizzly et les animaux apeurés
   ============================================================ */
function startPhase2() {
  phase = 2;
  updateFeathers(1);
  setMap(MAP_RIVER);
  theme = "autumn";
  player.x = 2; player.y = 7; player.dir = "right"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.helped = 0;
  fadeIn();
  locked = false;

  narrate("Oh ! Un énorme grizzly, là-bas, près de la grotte ! Il oblige les loutres à lui apporter des poissons. Va consoler la petite loutre.");

  entities.push({
    id: "grizzly", x: 16, y: 4, solid: true, mode: "sit",
    draw: (px, py, t, e) => drawGrizzly(px, py, e.mode, t),
    onBump(e) {
      sfx.growl();
      addFx("poof", e.x, e.y + 1);
      narrate("« GRRR ! Je suis le maître de la forêt ! » Ouh là... ne restons pas trop près !");
    },
  });
  entities.push({
    id: "fishpile", x: 18, y: 5, solid: true,
    draw: (px, py, t) => drawFishPile(px, py, t),
    onBump() {
      sfx.bump();
      narrate("Toute une montagne de poissons ! Quel goinfre, ce grizzly !");
    },
  });
  entities.push({
    id: "pony", x: 3, y: 8, solid: true,
    draw: (px, py, t) => drawPony(px, py, "stand", t),
    onBump() { sfx.neigh(); narrate("Petit Tonnerre : « Hiii ! Je t'attends ici, sois prudent ! »"); },
  });

  const friends = [
    { id: "otter1", x: 13, y: 5, kind: "otter", sad: true, fish: true, line: "La petite loutre : « C'est le quinzième poisson que je lui apporte ! Aide-nous, Yakari ! »" },
    { id: "hare", x: 6, y: 9, kind: "hare", line: "Le lièvre tremble : « Ce gros poilu fait régner la terreur dans toute la forêt ! »" },
    { id: "otter2", x: 4, y: 4, kind: "otter", sad: true, line: "« S'il te plaît, ne nous abandonne pas ! » Yakari promet : « Je vais vous aider ! » Va voir Grand Aigle : prends le chemin, tout à gauche !" },
  ];
  for (const f of friends) {
    entities.push({
      id: f.id, x: f.x, y: f.y, solid: true, sad: f.sad, fish: f.fish, consoled: false,
      draw: (px, py, t, e) => f.kind === "otter" ? drawOtter(px, py, e, t) : drawHare(px, py, t),
      onBump(e) {
        if (e.consoled) { sfx.cri(); addFx("heart", e.x, e.y); narrate("« Merci Yakari ! »"); return; }
        e.consoled = true;
        e.sad = false; e.fish = false;
        quest.helped++;
        sfx.cri();
        addFx("heart", e.x, e.y);
        narrate(f.line);
        const left = entities.filter(x => x.consoled === false);
        if (quest.helped < 3) markerTarget = nearestMarker(left);
        else markerTarget = { x: 0, y: 7 };
      },
    });
  }
  markerTarget = { x: 13, y: 5 };

  onMoveComplete = () => {
    if (quest.helped >= 3 && player.x <= 0 && player.y === 7) {
      onMoveComplete = null;
      fadeOut(() => startPhase3());
    }
  };
  tileBumpHandler = (tx, ty, ch) => {
    if (ch === "C") { sfx.growl(); narrate("C'est la grotte du grizzly. Brrr !"); }
    else sfx.bump();
  };
}

/* ============================================================
   PHASE 3 — GRAND AIGLE : ruse et patience
   ============================================================ */
function startPhase3() {
  phase = 3;
  updateFeathers(2);
  setMap(MAP_EAGLE);
  theme = "autumn";
  player.x = 1; player.y = 6; player.dir = "right"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  fadeIn();
  locked = false;

  narrate("Grand Aigle sait toujours quoi faire. Monte le voir, près de son rocher !");

  entities.push({
    id: "eagle", x: 10, y: 3, solid: true, spoken: false,
    draw: (px, py, t) => drawEagle(px, py, t),
    onBump(e) {
      if (e.spoken) return;
      e.spoken = true;
      markerTarget = null;
      locked = true;
      sfx.success();
      addFx("sparkle", e.x, e.y);
      narrate("Grand Aigle : « Ruse et patience surpassent la force, Yakari. L'hiver est proche : il t'apportera la solution. »");
      wait(6200, () => {
        snowing = true;
        sfx.pop();
        narrate("Oh ! La neige ! Le grizzly a tellement mangé qu'il va bientôt hiberner... Yakari a une idée !");
        wait(5200, () => fadeOut(() => startPhase4(), 1400));
      });
    },
  });
  markerTarget = { x: 10, y: 3 };

  onMoveComplete = null;
  tileBumpHandler = null;
}

/* ============================================================
   PHASE 4 — L'HIVER : le grizzly s'endort, on teste la glace
   ============================================================ */
function startPhase4() {
  phase = 4;
  updateFeathers(3);
  setMap(MAP_LAKE);
  theme = "winter"; snowing = true;
  player.x = 8; player.y = 11; player.dir = "right"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.yawns = 0; quest.sleeping = false; quest.stars = 0;
  fadeIn(1400);
  locked = false;

  narrate("L'hiver est là ! Le gros grizzly n'a plus faim du tout... il a terriblement sommeil. Approche-toi et touche-le tout doucement.");

  const grizzly = {
    id: "grizzly", x: 15, y: 10, solid: true, mode: "sit",
    draw: (px, py, t, e) => drawGrizzly(px, py, e.mode, t),
    onBump(e) {
      if (!quest.sleeping) {
        quest.yawns++;
        if (quest.yawns === 1) {
          sfx.yawn();
          narrate("Le grizzly baille... « Je ne sais pas ce qui m'arrive... j'ai terriblement sommeil ! » Touche-le encore !");
        } else {
          quest.sleeping = true;
          e.mode = "sleep";
          sfx.snore();
          narrate("Chhh... Il s'est endormi pour tout l'hiver ! Maintenant, vérifie la glace : marche sur les 3 étoiles qui brillent sur le lac !");
          spawnStars();
        }
      } else {
        sfx.snore();
        narrate("Chhh... il ronfle comme un tonnerre !");
      }
    },
  };
  entities.push(grizzly);
  entities.push({
    id: "pony", x: 6, y: 11, solid: true,
    draw: (px, py, t) => drawPony(px, py, "stand", t),
    onBump() { sfx.neigh(); narrate("Petit Tonnerre : « Hiii ! La neige, j'adore ça ! »"); },
  });
  markerTarget = { x: 15, y: 10 };

  function spawnStars() {
    const spots = [[11, 8], [13, 7], [15, 6]];
    for (const [sx, sy] of spots) {
      entities.push({
        id: "star", x: sx, y: sy, solid: false, item: true,
        draw: (px, py, t) => drawIceStar(px, py, t),
      });
    }
    markerTarget = nearestMarker(entities.filter(e => e.id === "star"));
  }

  onMoveComplete = () => {
    const here = entities.find(e => e.item && e.x === player.x && e.y === player.y);
    if (here && here.id === "star") {
      entities = entities.filter(e => e !== here);
      quest.stars++;
      sfx.pop();
      addFx("sparkle", here.x, here.y);
      if (quest.stars === 1) {
        narrate("La glace est bien solide ici ! Encore 2 étoiles !");
        markerTarget = nearestMarker(entities.filter(e => e.id === "star"));
      } else if (quest.stars === 2) {
        narrate("Elle ne craque même pas ! Encore une étoile !");
        markerTarget = nearestMarker(entities.filter(e => e.id === "star"));
      } else {
        markerTarget = null;
        locked = true;
        sfx.success();
        narrate("La glace est épaisse, on peut y aller ! Cette nuit, on poussera le gros dormeur jusqu'à l'île. Chut...");
        wait(5200, () => fadeOut(() => startPhase5(), 1600));
      }
    }
  };
  tileBumpHandler = null;
}

/* ============================================================
   PHASE 5 — LA NUIT : pousser le grizzly endormi sur l'île
   ============================================================ */
function startPhase5() {
  phase = 5;
  updateFeathers(4);
  theme = "winter"; snowing = false; night = true;
  player.x = 12; player.y = 11; player.dir = "right"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.pushes = 0;
  fadeIn(1600);
  locked = false;

  narrate("C'est la nuit. Les loutres sont venues aider ! Tous ensemble, poussons le grizzly endormi sur la glace, jusqu'à l'île. Marche contre lui pour le pousser !");

  const path = [{ x: 15, y: 8 }, { x: 15, y: 6 }, { x: 15, y: 5 }];
  const pushLines = [
    "Hooo hisse ! Il glisse sur la glace !",
    "Hooo hisse ! Encore une poussée, on y est presque !",
    "Ça y est, il est sur l'île ! Bonne nuit, grosse truite ! Dors bien jusqu'au printemps.",
  ];

  const helper = {
    id: "otterHelper", x: 14, y: 10, solid: false, sad: false,
    draw: (px, py, t, e) => drawOtter(px, py, e, t),
  };
  const grizzly = {
    id: "grizzly", x: 15, y: 10, solid: true, mode: "sleep",
    draw: (px, py, t, e) => drawGrizzly(px, py, e.mode, t),
    onBump(e) {
      if (quest.pushes >= path.length) { sfx.snore(); return; }
      const dest = path[quest.pushes];
      quest.pushes++;
      addFx("poof", e.x, e.y);
      // personne ne doit se retrouver sous le gros dormeur
      if (player.x === dest.x && player.y === dest.y) { player.x = dest.x - 1; }
      e.x = dest.x; e.y = dest.y;
      helper.x = dest.x - 1; helper.y = dest.y;
      lightPos = { x: e.x, y: e.y };
      sfx.slide();
      narrate(pushLines[quest.pushes - 1]);
      if (quest.pushes < path.length) {
        markerTarget = { x: e.x, y: e.y };
      } else {
        markerTarget = null;
        locked = true;
        sfx.tada();
        wait(5000, () => fadeOut(() => startPhase6(), 1800));
      }
    },
  };
  entities.push(grizzly, helper);
  entities.push({
    id: "pony", x: 10, y: 11, solid: true,
    draw: (px, py, t) => drawPony(px, py, "stand", t),
    onBump() { sfx.neigh(); narrate("Petit Tonnerre : « Chhht ! Il ne faut pas le réveiller ! »"); },
  });
  lightPos = { x: 15, y: 10 };
  markerTarget = { x: 15, y: 10 };

  onMoveComplete = null;
  tileBumpHandler = null;
}

/* ============================================================
   PHASE 6 — LE PRINTEMPS : la promesse et la leçon de natation
   ============================================================ */
function startPhase6() {
  phase = 6;
  updateFeathers(5);
  setMap(MAP_SPRING);
  theme = "spring"; night = false; dawn = true; lightPos = null;
  player.x = 8; player.y = 11; player.dir = "up"; player.sprite = "walk"; player.moving = null;
  entities = []; effects = []; tapPath = null;
  quest.inCanoe = false; quest.gstage = 0;
  fadeIn(1800);
  locked = false;

  narrate("Le printemps est revenu et la glace a fondu ! Le grizzly est réveillé, tout seul sur son île. Monte dans le canoë avec la petite loutre !");

  const grizzly = {
    id: "grizzly", x: 15, y: 5, solid: true, mode: "stand",
    draw: (px, py, t, e) => drawGrizzly(px, py, e.mode, t),
    onBump(e) {
      if (quest.gstage === 0) {
        quest.gstage = 1;
        sfx.growl();
        addFx("heart", e.x, e.y);
        narrate("« Au secours, sortez-moi de là ! — Promets de ne plus jamais faire peur aux animaux ! — C'est promis ! » Touche-le encore : la loutre va lui apprendre à nager !");
        return;
      }
      if (quest.gstage === 1) {
        quest.gstage = 2;
        e.mode = "swim"; e.x = 15; e.y = 7;
        sfx.splash();
        addFx("splash", 15, 7);
        narrate("« Une ! Et deux ! » Le grizzly nage avec ses grosses pattes !");
        markerTarget = { x: e.x, y: e.y };
        return;
      }
      if (quest.gstage === 2) {
        quest.gstage = 3;
        e.x = 15; e.y = 9;
        sfx.splash();
        addFx("splash", 15, 9);
        narrate("« Une ! Et deux ! » Il y est presque... Encore !");
        markerTarget = { x: e.x, y: e.y };
        return;
      }
      if (quest.gstage === 3) {
        quest.gstage = 4;
        e.mode = "happy"; e.x = 18; e.y = 10;
        sfx.success();
        addFx("splash", 15, 10);
        addFx("heart", 18, 10);
        narrate("« J'ai réussi ! Merci petite loutre ! » Le grizzly invite tout le monde à un festin dans sa grotte. Rejoins-le sur la plage !");
        markerTarget = { x: 18, y: 10 };
        spawnFeast();
        return;
      }
      victory();
    },
  };
  entities.push(grizzly);
  entities.push({
    id: "canoe", x: 9, y: 9, solid: true,
    draw: (px, py, t) => drawCanoeItem(px, py, t),
    onBump(e) {
      entities = entities.filter(x => x !== e);
      quest.inCanoe = true;
      player.sprite = "canoe";
      sfx.splash();
      addFx("splash", 9, 9);
      narrate("En avant ! Rame jusqu'à l'île et va parler au grizzly.");
      markerTarget = { x: 15, y: 5 };
    },
  });
  entities.push({
    id: "pony", x: 6, y: 11, solid: true,
    draw: (px, py, t) => drawPony(px, py, "stand", t),
    onBump() { sfx.neigh(); narrate("Petit Tonnerre : « Hiii ! Le printemps est là ! »"); },
  });
  markerTarget = { x: 9, y: 9 };

  function spawnFeast() {
    entities.push({
      id: "hare", x: 16, y: 11, solid: true,
      draw: (px, py, t) => drawHare(px, py, t),
      onBump() { sfx.cri(); addFx("heart", 16, 11); narrate("Le lièvre : « Les animaux sont revenus dans la forêt ! »"); },
    });
    entities.push({
      id: "otter2", x: 20, y: 11, solid: true, sad: false,
      draw: (px, py, t, e) => drawOtter(px, py, e, t),
      onBump() { sfx.cri(); addFx("heart", 20, 11); narrate("La loutre : « Quel bon nageur, ce grizzly ! »"); },
    });
    entities.push({
      id: "feastFish", x: 17, y: 11, solid: true,
      draw: (px, py, t) => drawFishPile(px, py, t),
      onBump() { sfx.pop(); narrate("Le grizzly a pêché ces poissons tout seul, pour le festin !"); },
    });
  }

  onMoveComplete = () => {
    if (quest.inCanoe) {
      const onWater = tileAt(player.x, player.y) === "w";
      if (onWater && player.sprite !== "canoe") { player.sprite = "canoe"; sfx.splash(); }
      if (!onWater && player.sprite !== "walk") { player.sprite = "walk"; sfx.splash(); addFx("splash", player.x, player.y); }
    }
  };
  tileBumpHandler = (tx, ty, ch) => {
    if (ch === "C") { sfx.pop(); narrate("C'est la grotte du grizzly : le festin est bientôt prêt !"); }
    else sfx.bump();
  };
}

/* ============================================================
   VICTOIRE
   ============================================================ */
function victory() {
  locked = true;
  markerTarget = null;
  updateFeathers(6);
  sfx.tada();
  narrate("Quel festin ! Le grizzly a tenu sa promesse, et tous les animaux sont revenus dans la forêt. Bravo, tu as fini l'aventure !");
  overlayTitle.textContent = "BRAVO ! 🎉";
  overlaySub.textContent = "Le grizzly est devenu gentil, la forêt est sauvée !";
  overlayBtn.textContent = "🔄 Rejouer";
  overlay.classList.remove("hidden");
  overlayBtn.onclick = () => location.reload();
}

/* ------------------------------------------------------------
   DÉMARRAGE
   ------------------------------------------------------------ */
setMap(MAP_FOREST);
theme = "autumn";
player.x = 2; player.y = 6; player.dir = "down"; player.sprite = "ride";
startEngine(startPhase1);
