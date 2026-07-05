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
/* sons spécifiques de cet épisode */
Object.assign(sfx, {
  rumble() { tone(70, 0.6, "sawtooth", 0.12); tone(55, 0.7, "sawtooth", 0.1, 0.15); },
});

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

SOLID_TILES = "TWRKQqFPVcL";
const CRATER = { x: 9, y: 1 };           // d'où sort la fumée du volcan

/* ------------------------------------------------------------
   ÉTAT DU JEU
   ------------------------------------------------------------ */
let eruption = false;            // teinte rouge + grondements
let volcanoLevel = 0;            // 0 rien · 1 fumée calme · 2 éruption
let fireLit = false;
let lastCraterFx = 0;

// fumée du volcan (calme ou éruption), basée sur le temps absolu
logicTickHook = (now) => {
  if (volcanoLevel > 0 && now - lastCraterFx > (volcanoLevel === 2 ? 1100 : 3400)) {
    lastCraterFx = now;
    addFx("smoke", CRATER.x, CRATER.y);
    if (volcanoLevel === 2) {
      addFx("smoke", CRATER.x + (Math.floor(now / 1100) % 3) - 1, CRATER.y);
      sfx.rumble();
    }
  }
};

// teinte rouge qui pulse pendant l'éruption
renderOverlayHook = (now) => {
  if (eruption) {
    const pulse = Math.floor(now / 450) % 2;
    ctx.fillStyle = `rgba(216,58,32,${0.2 + pulse * 0.07})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
};


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
let firePos = null;

function drawPlayerSprite(px, py, dir, step, t) {
  if (player.sprite === "bird") drawBirdRider(px, py, dir, step, t);
  else drawYakari(px, py, dir, step);
}

/* ============================================================
   PHASE 1 — LA PLAGE INCONNUE : le bois et le feu
   ============================================================ */
function startPhase1() {
  phase = 1;
  updateFeathers(0);
  setMap(MAP_PLAGE);
  night = false; dawn = false; eruption = false; volcanoLevel = 0;
  fireLit = false; firePos = { x: 7, y: 6 }; lightPos = firePos;
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
  fireLit = false; firePos = null; lightPos = null;
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
  eruption = true; volcanoLevel = 2; smokeColor = "#8d8d8d";
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
  eruption = false; volcanoLevel = 0; smokeColor = "#e8e3d8"; night = false; dawn = true;
  fireLit = true; firePos = { x: 7, y: 6 }; lightPos = firePos;
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
   DÉMARRAGE
   ------------------------------------------------------------ */
setMap(MAP_PLAGE);
player.x = 4; player.y = 8; player.dir = "down"; player.sprite = "walk";
startEngine(startPhase1);
