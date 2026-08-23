/* ============================================================
   BLACK MARKET CASES
   Pure vanilla JS. No APIs, no external dependencies.
   Fictional in-game currency only.
   ============================================================ */

/* ---------------- RARITY DATA ---------------- */
const RARITIES = [
  { id:"consumer",   label:"Consumer Grade", css:"consumer",   color:"#b0c3d9", weight:7992, valueMin:1,    valueMax:5 },
  { id:"industrial", label:"Industrial Grade",css:"industrial", color:"#5e98d9", weight:1598, valueMin:5,    valueMax:20 },
  { id:"milspec",    label:"Mil-Spec",       css:"milspec",    color:"#4b69ff", weight:320,  valueMin:20,   valueMax:80 },
  { id:"restricted", label:"Restricted",     css:"restricted", color:"#8847ff", weight:64,   valueMin:80,   valueMax:300 },
  { id:"classified", label:"Classified",     css:"classified", color:"#d32ce6", weight:12.8, valueMin:300,  valueMax:1200 },
  { id:"covert",     label:"Covert",         css:"covert",     color:"#eb4b4b", weight:2.56, valueMin:1200, valueMax:5000 },
  { id:"knife",      label:"Knife",          css:"knife",      color:"#ffd700", weight:0.64, valueMin:5000, valueMax:20000 },
  { id:"exclusive",  label:"Exclusive",      css:"exclusive",  color:"#ff00d4", weight:0.02, valueMin:20000,valueMax:100000 },
  // Contraband has weight 0 so it can NEVER be selected by the normal
  // weightedPickRarity pool — it is only ever handed out directly by
  // the rotating limited-time case logic further down this file.
  { id:"contraband",  label:"Contraband",     css:"contraband",  color:"#ff1a1a", weight:0, valueMin:100000,         valueMax:500000 },
  { id:"mythical",    label:"Mythical",        css:"mythical",    color:"#ff6600", weight:0, valueMin:1000000,        valueMax:5000000 },
  { id:"divine",      label:"Divine",          css:"divine",      color:"#00eaff", weight:0, valueMin:10000000,       valueMax:50000000 },
  { id:"cosmic",      label:"Cosmic",          css:"cosmic",      color:"#bf00ff", weight:0, valueMin:100000000,      valueMax:500000000 },
  { id:"singularity", label:"Singularity",     css:"singularity", color:"#ffffff", weight:0, valueMin:1000000000,     valueMax:5000000000 },
  { id:"celestial",   label:"Celestial",       css:"celestial",   color:"#ffe066", weight:0, valueMin:20000000000,    valueMax:100000000000 },
  { id:"abyssal",     label:"Abyssal",         css:"abyssal",     color:"#00ff88", weight:0, valueMin:500000000000,   valueMax:2500000000000 },
  { id:"ethereal",    label:"Ethereal",        css:"ethereal",    color:"#ff44cc", weight:0, valueMin:10000000000000, valueMax:50000000000000 },
  { id:"godlike",     label:"Godlike",         css:"godlike",     color:"#ff0000", weight:0, valueMin:1e15,           valueMax:1e16 },
  { id:"transcendent",label:"Transcendent",    css:"transcendent",color:"#aaffff", weight:0, valueMin:1e18,           valueMax:1e19 },
  // Eternal & Omniscient have weight 0, same as every tier above — they can
  // never come from the normal weightedPickRarity pool. They are only ever
  // handed out directly by the Void Market cases (see VOID_CASES), at odds
  // around 1-in-100-quadrillion that only ever move with the Luck upgrade.
  { id:"eternal",     label:"Eternal",         css:"eternal",     color:"#ffe9a8", weight:0, valueMin:3e200,          valueMax:8e200 },
  { id:"omniscient",  label:"Omniscient",      css:"omniscient",  color:"#ff2fe0", weight:0, valueMin:3e201,          valueMax:9e201 },
];
const RARITY_INDEX = {};
RARITIES.forEach((r,i)=>RARITY_INDEX[r.id]=i);

/* ---------------- SKIN DATABASE (generated) ---------------- */
const WEAPONS = ["AK-47","M4A4","M4A1-S","AWP","Desert Eagle","USP-S","Glock-18","P250",
  "MAC-10","MP7","MP9","Nova","XM1014","SSG 08","G3SG1","FAMAS","Galil AR","P90","UMP-45","Five-SeveN"];
const SUFFIXES_LOW = ["Safari Mesh","Forest DDPAT","Boreal Forest","Scorched","Urban Masked","Blue Laminate","Sand Dune","Jungle Spray",
  "Rust Coat","Field Drab","Concrete","Paved","Gunsmoke","Grease Monkey","Cardboard","Rubber","Frontside Misty","Dark Age",
  "Ash Wood","Freight","Fresh Paint","Hexane","Elite Build","Rat Rod","Aloha","Contour","Traveler","Grill"];
const SUFFIXES_MID = ["Redline","Stained","Blue Steel","Case Hardened","Night","Blaze","Ocean Foam","Storm",
  "Vanilla Swirl","Dune","Slate","Cyanospatter","Dragon Tattoo","Nitro","Snakebite","Shadow Web","Static Rift","Roll Cage",
  "Frostbite","Vulcan Steel","Amber Fade","Copper Head","Rat Pack","Warhawk"];
const SUFFIXES_HI  = ["Asiimov","Vulcan","Hyper Beast","Neon Rider","Fever Dream","Wildfire","Bloodsport","Printstream",
  "Neo-Noir","Neon Revolution","Fade Runner","Chromatic Aberration","Head Shot","Toxic Rain","Freehand Blaze","Wasteland Rebel"];
const SUFFIXES_EPIC= ["Dragon Lore","Fire Serpent","Howl","Medusa","Fade","Doppler","Marble Fade","Crimson Web",
  "Gungnir","Wildfire Prime","Emerald Dragon","Golden Coil","Nightfall Ritual"];
const ICONS_BY_WEAPON = {
  "AK-47":"🔫","M4A4":"🔫","M4A1-S":"🔫","AWP":"🎯","Desert Eagle":"🔫","USP-S":"🔫","Glock-18":"🔫","P250":"🔫",
  "MAC-10":"🔫","MP7":"🔫","MP9":"🔫","Nova":"🔫","XM1014":"🔫","SSG 08":"🎯","G3SG1":"🎯","FAMAS":"🔫",
  "Galil AR":"🔫","P90":"🔫","UMP-45":"🔫","Five-SeveN":"🔫"
};

/* ---------------- PROCEDURAL SKIN ICONS ----------------
   Every icon is generated on the fly: a weapon-category silhouette
   (rifle / pistol / smg / shotgun / sniper / knife shapes) painted
   with a gradient + pattern derived from the skin's own name, so
   no two skins render identically even when they share a weapon. */
function hashStr(s){
  let h = 2166136261;
  for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
function seededRand(seed, i){
  const x = Math.sin(seed*12.9898 + i*78.233)*43758.5453;
  return x - Math.floor(x);
}
const WEAPON_CATEGORY = {
  "Desert Eagle":"pistol","USP-S":"pistol","Glock-18":"pistol","P250":"pistol","Five-SeveN":"pistol",
  "AK-47":"rifle","M4A4":"rifle","M4A1-S":"rifle","FAMAS":"rifle","Galil AR":"rifle",
  "MAC-10":"smg","MP7":"smg","MP9":"smg","UMP-45":"smg","P90":"smg",
  "Nova":"shotgun","XM1014":"shotgun",
  "AWP":"sniper","SSG 08":"sniper","G3SG1":"sniper"
};
const KNIFE_SHAPE = {
  "Karambit":"karambit","Talon Knife":"karambit","Falchion Knife":"karambit","Skeleton Knife":"karambit",
  "Butterfly Knife":"butterfly"
};
const SHAPE_MARKUP = {
  pistol:`<rect x="46" y="14" width="34" height="9" rx="1"/><rect x="70" y="16" width="14" height="5" rx="1"/><path d="M46 23 L38 23 L30 44 L44 44 L50 23 Z"/><rect x="42" y="23" width="10" height="6"/>`,
  rifle:`<rect x="10" y="20" width="16" height="9" rx="1"/><rect x="24" y="17" width="50" height="12" rx="1"/><rect x="74" y="20" width="22" height="5" rx="1"/><path d="M40 29 L34 45 L46 45 L50 29 Z"/><rect x="58" y="29" width="8" height="10" rx="1"/>`,
  smg:`<rect x="14" y="19" width="14" height="7" rx="1"/><rect x="26" y="15" width="42" height="13" rx="1"/><rect x="68" y="18" width="20" height="6" rx="1"/><path d="M40 28 L34 46 L44 46 L48 28 Z"/><rect x="55" y="28" width="7" height="9" rx="1"/>`,
  shotgun:`<path d="M8 20 L30 18 L30 30 L12 34 Z"/><rect x="28" y="20" width="64" height="10" rx="2"/><rect x="44" y="30" width="20" height="8" rx="2"/>`,
  sniper:`<rect x="14" y="24" width="80" height="5" rx="1"/><rect x="14" y="18" width="28" height="12" rx="1"/><rect x="26" y="8" width="24" height="7" rx="1"/><rect x="32" y="4" width="3" height="6"/><rect x="44" y="4" width="3" height="6"/><path d="M88 29 L94 40 M88 29 L96 34" stroke-width="2"/>`,
  straight:`<path d="M8 24 L70 19 L72 23 L70 27 L8 30 Z"/><rect x="70" y="16" width="24" height="16" rx="3"/>`,
  butterfly:`<path d="M10 25 L55 15 L58 20 L20 32 Z"/><path d="M10 25 L55 35 L58 30 L20 18 Z"/><rect x="55" y="12" width="30" height="10" rx="2" transform="rotate(-8 55 12)"/><rect x="55" y="28" width="30" height="10" rx="2" transform="rotate(8 55 28)"/>`,
  karambit:`<path d="M20 30 Q55 5 82 22 Q64 34 42 30 Q34 34 26 38 Z"/><circle cx="16" cy="34" r="7"/>`,
  exclusive:`<polygon points="50,6 61,34 91,34 67,52 76,82 50,64 24,82 33,52 9,34 39,34"/><circle cx="50" cy="46" r="9"/>`,
  contraband:`<circle cx="50" cy="34" r="26"/><circle cx="40" cy="30" r="6"/><circle cx="60" cy="30" r="6"/><path d="M32 50 Q50 66 68 50 L64 78 L56 66 L50 80 L44 66 L36 78 Z"/>`
};
const SUFFIX_PALETTES = [
  { test:/forest|jungle|boreal|ddpat/i, hues:[112,96,144], pattern:"camo" },
  { test:/sand|desert|urban masked|safari/i, hues:[38,44,28], pattern:"camo" },
  { test:/ocean|blue|storm|steel|laminate/i, hues:[200,206,184], pattern:"sweep" },
  { test:/fire|blaze|wildfire|dragon|crimson|blood|vulcan|scorched/i, hues:[8,22,354], pattern:"sweep" },
  { test:/fade|doppler|marble/i, hues:[286,320,204], pattern:"marble" },
  { test:/web/i, hues:[4,14,350], pattern:"web" },
  { test:/night|shadow|stained/i, hues:[236,246,222], pattern:"sweep" },
  { test:/gold|emperor|black sun|void|dragon lore/i, hues:[46,32,300], pattern:"marble" },
  { test:/hyper beast|fever dream|neon rider|printstream|asiimov/i, hues:[330,190,54], pattern:"marble" }
];
function skinPalette(item){
  const h = hashStr(item.name);
  const p = SUFFIX_PALETTES.find(p=>p.test.test(item.suffix||""));
  let hues, pattern;
  if(p){
    hues = p.hues.map((hu,i)=> (hu + (h>>(i*3))%14 - 7 + 360)%360);
    pattern = p.pattern;
  } else {
    const base = h%360;
    hues = [base, (base+35)%360, (base+300)%360];
    pattern = ["sweep","camo","web"][h%3];
  }
  const rIdx = RARITY_INDEX[item.rarity]!==undefined ? RARITY_INDEX[item.rarity] : 0;
  const sat = rIdx>=4 ? 72 : 42;
  const light = rIdx>=6 ? 60 : 48;
  return { colors: hues.map(hu=>`hsl(${hu},${sat}%,${light}%)`), pattern, seed:h };
}
function buildOverlay(pattern, colors, seed, isExclusive, H){
  if(isExclusive){
    let dots="";
    for(let i=0;i<7;i++){
      const cx=(15+seededRand(seed,i)*70).toFixed(1), cy=(8+seededRand(seed,i+9)*76).toFixed(1);
      const r=(1.2+seededRand(seed,i+20)*1.8).toFixed(1);
      dots += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" opacity="${(0.35+seededRand(seed,i+30)*0.5).toFixed(2)}"/>`;
    }
    return dots;
  }
  switch(pattern){
    case "camo":{
      let out="";
      for(let i=0;i<6;i++){
        const cx=(seededRand(seed,i)*100).toFixed(1), cy=(seededRand(seed,i+10)*H).toFixed(1);
        const rx=(8+seededRand(seed,i+20)*14).toFixed(1), ry=(5+seededRand(seed,i+30)*8).toFixed(1);
        const c = i%2===0? colors[1]: colors[2];
        out += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" opacity="0.55" transform="rotate(${(seededRand(seed,i+40)*40-20).toFixed(0)} ${cx} ${cy})"/>`;
      }
      return out;
    }
    case "sweep":
      return `<rect x="-20" y="-20" width="55" height="${H+40}" fill="#ffffff" opacity="0.16" transform="rotate(25 30 ${H/2})"/>
        <rect x="42" y="-20" width="26" height="${H+40}" fill="${colors[2]}" opacity="0.35" transform="rotate(25 60 ${H/2})"/>`;
    case "marble":{
      let out="";
      for(let i=0;i<5;i++){
        const cx=(seededRand(seed,i+1)*100).toFixed(1), cy=(seededRand(seed,i+11)*H).toFixed(1), r=(6+seededRand(seed,i+21)*10).toFixed(1);
        out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${i%2?colors[2]:colors[1]}" opacity="0.4"/>`;
      }
      out += `<rect x="0" y="0" width="100" height="${H}" fill="#fff" opacity="0.05"/>`;
      return out;
    }
    case "web":{
      let out="";
      for(let i=0;i<4;i++){
        const x1=(seededRand(seed,i)*100).toFixed(1), y1=(seededRand(seed,i+5)*H).toFixed(1);
        const x2=(seededRand(seed,i+15)*100).toFixed(1), y2=(seededRand(seed,i+25)*H).toFixed(1);
        out += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${colors[2]}" stroke-width="1" opacity="0.5"/>`;
      }
      return out;
    }
    default: return "";
  }
}
function buildSkinIcon(item){
  let category;
  if(item.rarity==="contraband") category = "contraband";
  else if(item.rarity==="exclusive") category = "exclusive";
  else if(item.rarity==="knife") category = KNIFE_SHAPE[item.weapon] || "straight";
  else category = WEAPON_CATEGORY[item.weapon] || "pistol";

  const pal = skinPalette(item);
  const shape = SHAPE_MARKUP[category];
  const H = (category==="exclusive"||category==="contraband") ? 92 : 50;
  const gid = "g"+pal.seed, cid = "c"+pal.seed;
  const x1 = 8 + (pal.seed%28), x2 = 92 - (pal.seed%20);
  const overlay = buildOverlay(pal.pattern, pal.colors, pal.seed, category==="exclusive"||category==="contraband", H);

  return `<svg viewBox="0 0 100 ${H}" xmlns="http://www.w3.org/2000/svg" class="skin-svg">
    <defs>
      <linearGradient id="${gid}" x1="${x1}%" y1="0%" x2="${x2}%" y2="100%">
        <stop offset="0%" stop-color="${pal.colors[0]}"/>
        <stop offset="55%" stop-color="${pal.colors[1]}"/>
        <stop offset="100%" stop-color="${pal.colors[2]}"/>
      </linearGradient>
      <clipPath id="${cid}">${shape}</clipPath>
    </defs>
    <g clip-path="url(#${cid})">
      <rect x="0" y="0" width="100" height="${H}" fill="url(#${gid})"/>
      ${overlay}
    </g>
    <g fill="none" stroke="rgba(0,0,0,.45)" stroke-width="1.4">${shape}</g>
  </svg>`;
}

function generateSkinDatabase(){
  const db = { consumer:[], industrial:[], milspec:[], restricted:[], classified:[], covert:[] };
  const suffixSets = {
    consumer: SUFFIXES_LOW, industrial: SUFFIXES_LOW,
    milspec: SUFFIXES_MID, restricted: SUFFIXES_MID,
    classified: SUFFIXES_HI, covert: SUFFIXES_EPIC
  };
  // commons/mids get MORE variants per weapon so drops feel far less
  // repetitive; the rarer bands stay leaner so each name still feels special.
  const picksPerBand = { consumer:4, industrial:4, milspec:3, restricted:3, classified:2, covert:2 };
  let idCounter = 1;
  WEAPONS.forEach((weapon, wi)=>{
    Object.keys(suffixSets).forEach(rarityId=>{
      const suffixes = suffixSets[rarityId];
      const count = Math.min(picksPerBand[rarityId], suffixes.length);
      const rarity = RARITIES[RARITY_INDEX[rarityId]];
      const used = new Set();
      for(let k=0;k<count;k++){
        const idx = (wi + k*7) % suffixes.length; // spread picks so neighboring weapons don't share the same suffix set
        if(used.has(idx)) continue;
        used.add(idx);
        const pick = suffixes[idx];
        db[rarityId].push({
          id: "s"+(idCounter++),
          name: `${weapon} | ${pick}`,
          weapon, suffix:pick,
          rarity: rarityId,
          icon: ICONS_BY_WEAPON[weapon] || "🔫",
          value: Math.round(rarity.valueMin + Math.random()*(rarity.valueMax-rarity.valueMin))
        });
      }
    });
  });
  return db;
}
const SKIN_DB = generateSkinDatabase();

/* ---------------- KNIFE DATABASE ---------------- */
const KNIFE_TYPES = ["Karambit","Butterfly Knife","M9 Bayonet","Talon Knife","Bayonet",
  "Flip Knife","Gut Knife","Huntsman Knife","Falchion Knife","Shadow Daggers","Bowie Knife","Skeleton Knife"];
const KNIFE_FINISHES = ["Fade","Doppler","Tiger Tooth","Marble Fade","Crimson Web","Case Hardened",
  "Slaughter","Night","Autotronic","Freehand","Damascus Steel","Lore"];
function generateKnifeDatabase(){
  const list = [];
  let idCounter = 1;
  KNIFE_TYPES.forEach((knife, ki)=>{
    KNIFE_FINISHES.forEach((finish, fi)=>{
      if((ki+fi)%3!==0) return; // trim combinatorics down to a manageable "hundreds" pool overall
      list.push({
        id:"k"+(idCounter++),
        name:`★ ${knife} | ${finish}`,
        weapon:knife, suffix:finish,
        rarity:"knife",
        icon:"🗡️",
        value: Math.round(5000 + Math.random()*15000)
      });
    });
  });
  return list;
}
const KNIFE_DB = generateKnifeDatabase();

/* ---------------- EXCLUSIVE DATABASE ---------------- */
const EXCLUSIVE_DB = [
  { id:"ex1", name:"★ Karambit | Gold Dragon", weapon:"Karambit", suffix:"Gold Dragon", rarity:"exclusive", icon:"✨", value:75000 },
  { id:"ex2", name:"★ Butterfly Knife | Black Sun", weapon:"Butterfly Knife", suffix:"Black Sun", rarity:"exclusive", icon:"✨", value:82000 },
  { id:"ex3", name:"AWP | The Black Market", weapon:"AWP", suffix:"The Black Market", rarity:"exclusive", icon:"🌟", value:60000 },
  { id:"ex4", name:"★ Talon Knife | Void", weapon:"Talon Knife", suffix:"Void", rarity:"exclusive", icon:"🌌", value:95000 },
  { id:"ex5", name:"AK-47 | Emperor's Ransom", weapon:"AK-47", suffix:"Emperor's Ransom", rarity:"exclusive", icon:"👑", value:100000 },
  { id:"ex6", name:"★ Skeleton Knife | Eclipse", weapon:"Skeleton Knife", suffix:"Eclipse", rarity:"exclusive", icon:"🌑", value:110000 },
  { id:"ex7", name:"M4A4 | Last Rites", weapon:"M4A4", suffix:"Last Rites", rarity:"exclusive", icon:"🕯️", value:88000 },
  { id:"ex8", name:"★ Bayonet | Sovereign", weapon:"Bayonet", suffix:"Sovereign", rarity:"exclusive", icon:"👑", value:130000 },
];

/* ---------------- CONTRABAND DATABASE ---------------- */
// Top-of-ladder tier. Only ever reachable through LIMITED_CASES below.
const CONTRABAND_DB = [
  { id:"cb1", name:"★ Karambit | Blackout Cartel", weapon:"Karambit", suffix:"Blackout Cartel", rarity:"contraband", icon:"☠️", value:180000 },
  { id:"cb2", name:"AWP | Red Ledger", weapon:"AWP", suffix:"Red Ledger", rarity:"contraband", icon:"☠️", value:220000 },
  { id:"cb3", name:"★ Butterfly Knife | Smuggler's Mark", weapon:"Butterfly Knife", suffix:"Smuggler's Mark", rarity:"contraband", icon:"☠️", value:260000 },
  { id:"cb4", name:"AK-47 | Iron Curtain", weapon:"AK-47", suffix:"Iron Curtain", rarity:"contraband", icon:"☠️", value:310000 },
  { id:"cb5", name:"★ Talon Knife | Blacksite", weapon:"Talon Knife", suffix:"Blacksite", rarity:"contraband", icon:"☠️", value:420000 },
  // ---- ultra-rare: a tiny sliver of the already-tiny Contraband pool ----
  { id:"cb6", name:"★ Karambit | One In A Million", weapon:"Karambit", suffix:"One In A Million", rarity:"contraband", icon:"🌠", value:600000 },
  { id:"cb7", name:"★ Butterfly Knife | The Last Ledger", weapon:"Butterfly Knife", suffix:"The Last Ledger", rarity:"contraband", icon:"🌠", value:750000 },
  { id:"cb8", name:"AWP | Kingmaker", weapon:"AWP", suffix:"Kingmaker", rarity:"contraband", icon:"🌠", value:900000 },
];

const MYTHICAL_DB = [
  { id:"my1", name:"★ Karambit | Godfire",          weapon:"Karambit",        suffix:"Godfire",          rarity:"mythical",    icon:"🔥", value:1500000 },
  { id:"my2", name:"AWP | Armageddon",               weapon:"AWP",             suffix:"Armageddon",       rarity:"mythical",    icon:"💥", value:2000000 },
  { id:"my3", name:"★ Butterfly Knife | Soulreaper", weapon:"Butterfly Knife", suffix:"Soulreaper",       rarity:"mythical",    icon:"💀", value:2500000 },
  { id:"my4", name:"AK-47 | Oblivion",               weapon:"AK-47",           suffix:"Oblivion",         rarity:"mythical",    icon:"🌑", value:3000000 },
  { id:"my5", name:"★ M9 Bayonet | Hellbrand",       weapon:"M9 Bayonet",      suffix:"Hellbrand",        rarity:"mythical",    icon:"🔱", value:4500000 },
];
const DIVINE_DB = [
  { id:"dv1", name:"★ Karambit | Celestial Wrath",   weapon:"Karambit",        suffix:"Celestial Wrath",  rarity:"divine",      icon:"⚡", value:12000000 },
  { id:"dv2", name:"AWP | Heaven's Gate",             weapon:"AWP",             suffix:"Heaven's Gate",    rarity:"divine",      icon:"🌤️", value:18000000 },
  { id:"dv3", name:"★ Butterfly Knife | Seraphim",    weapon:"Butterfly Knife", suffix:"Seraphim",         rarity:"divine",      icon:"👼", value:25000000 },
  { id:"dv4", name:"AK-47 | God Emperor",             weapon:"AK-47",           suffix:"God Emperor",      rarity:"divine",      icon:"👑", value:40000000 },
];
const COSMIC_DB = [
  { id:"cos1", name:"★ Karambit | Event Horizon",    weapon:"Karambit",        suffix:"Event Horizon",    rarity:"cosmic",      icon:"🌌", value:150000000 },
  { id:"cos2", name:"AWP | Dark Matter",              weapon:"AWP",             suffix:"Dark Matter",      rarity:"cosmic",      icon:"🕳️", value:250000000 },
  { id:"cos3", name:"★ Butterfly Knife | Supernova",  weapon:"Butterfly Knife", suffix:"Supernova",        rarity:"cosmic",      icon:"💫", value:400000000 },
];
const SINGULARITY_DB = [
  { id:"sg1", name:"★ Karambit | The Singularity",   weapon:"Karambit",        suffix:"The Singularity",  rarity:"singularity", icon:"🌀", value:2000000000 },
  { id:"sg2", name:"AWP | End of Everything",         weapon:"AWP",             suffix:"End of Everything",rarity:"singularity", icon:"✨", value:3500000000 },
  { id:"sg3", name:"★ Butterfly Knife | Big Bang",    weapon:"Butterfly Knife", suffix:"Big Bang",         rarity:"singularity", icon:"💠", value:5000000000 },
];

const CELESTIAL_DB = [
  { id:"ce1", name:"★ Karambit | Stardust Requiem",   weapon:"Karambit",        suffix:"Stardust Requiem",   rarity:"celestial",    icon:"✨", value:25000000000 },
  { id:"ce2", name:"AWP | Nova Collapse",              weapon:"AWP",             suffix:"Nova Collapse",      rarity:"celestial",    icon:"💥", value:40000000000 },
  { id:"ce3", name:"★ Butterfly Knife | Helios",       weapon:"Butterfly Knife", suffix:"Helios",             rarity:"celestial",    icon:"☀️", value:60000000000 },
  { id:"ce4", name:"AK-47 | Astral Phoenix",           weapon:"AK-47",           suffix:"Astral Phoenix",     rarity:"celestial",    icon:"🦅", value:90000000000 },
];
const ABYSSAL_DB = [
  { id:"ab1", name:"★ Karambit | Void Reaper",         weapon:"Karambit",        suffix:"Void Reaper",        rarity:"abyssal",      icon:"💀", value:600000000000 },
  { id:"ab2", name:"AWP | Deep Abyss",                 weapon:"AWP",             suffix:"Deep Abyss",         rarity:"abyssal",      icon:"🕳️", value:1000000000000 },
  { id:"ab3", name:"★ Butterfly Knife | Oblivion Pulse",weapon:"Butterfly Knife",suffix:"Oblivion Pulse",     rarity:"abyssal",      icon:"🌑", value:2000000000000 },
  { id:"ab4", name:"AK-47 | Abyss Walker",             weapon:"AK-47",           suffix:"Abyss Walker",       rarity:"abyssal",      icon:"👁️", value:2400000000000 },
];
const ETHEREAL_DB = [
  { id:"et1", name:"★ Karambit | Phantasm",            weapon:"Karambit",        suffix:"Phantasm",           rarity:"ethereal",     icon:"👻", value:12000000000000 },
  { id:"et2", name:"AWP | Soul Fragment",               weapon:"AWP",             suffix:"Soul Fragment",      rarity:"ethereal",     icon:"💎", value:20000000000000 },
  { id:"et3", name:"★ Butterfly Knife | Wraithblade",   weapon:"Butterfly Knife", suffix:"Wraithblade",        rarity:"ethereal",     icon:"🔮", value:40000000000000 },
];
const GODLIKE_DB = [
  { id:"gl1", name:"★ Karambit | Wrath of Gods",       weapon:"Karambit",        suffix:"Wrath of Gods",      rarity:"godlike",      icon:"⚡", value:2000000000000000 },
  { id:"gl2", name:"AWP | Divine Judgment",             weapon:"AWP",             suffix:"Divine Judgment",    rarity:"godlike",      icon:"☄️", value:5000000000000000 },
  { id:"gl3", name:"★ Butterfly Knife | Pantheon",      weapon:"Butterfly Knife", suffix:"Pantheon",           rarity:"godlike",      icon:"🏛️", value:9000000000000000 },
];
const TRANSCENDENT_DB = [
  { id:"tr1", name:"★ Karambit | Beyond Reality",      weapon:"Karambit",        suffix:"Beyond Reality",     rarity:"transcendent", icon:"🌌", value:2e18 },
  { id:"tr2", name:"AWP | The Last Light",              weapon:"AWP",             suffix:"The Last Light",     rarity:"transcendent", icon:"🌟", value:5e18 },
  { id:"tr3", name:"★ Butterfly Knife | Existence",     weapon:"Butterfly Knife", suffix:"Existence",          rarity:"transcendent", icon:"♾️", value:1e19 },
];
const ETERNAL_DB = [
  { id:"et1", name:"★ Karambit | Beyond The Veil",      weapon:"Karambit",        suffix:"Beyond The Veil",    rarity:"eternal",      icon:"🌠", value:3e200 },
  { id:"et2", name:"★ Butterfly Knife | Endless Horizon",weapon:"Butterfly Knife", suffix:"Endless Horizon",    rarity:"eternal",      icon:"🌀", value:5e200 },
  { id:"et3", name:"AWP | The Eternal Eye",              weapon:"AWP",             suffix:"The Eternal Eye",    rarity:"eternal",      icon:"👁️", value:8e200 },
];
const OMNISCIENT_DB = [
  { id:"om1", name:"★ Karambit | All-Seeing",           weapon:"Karambit",        suffix:"All-Seeing",         rarity:"omniscient",   icon:"🔮", value:3e201 },
  { id:"om2", name:"★ M9 Bayonet | The Final Truth",     weapon:"M9 Bayonet",      suffix:"The Final Truth",    rarity:"omniscient",   icon:"🌐", value:6e201 },
  { id:"om3", name:"AK-47 | Genesis Code",               weapon:"AK-47",           suffix:"Genesis Code",       rarity:"omniscient",   icon:"✨", value:9e201 },
];

function allSkinsForRarity(rarityId){
  if(rarityId==="knife") return KNIFE_DB;
  if(rarityId==="exclusive") return EXCLUSIVE_DB;
  if(rarityId==="contraband") return CONTRABAND_DB;
  if(rarityId==="mythical") return MYTHICAL_DB;
  if(rarityId==="divine") return DIVINE_DB;
  if(rarityId==="cosmic") return COSMIC_DB;
  if(rarityId==="singularity") return SINGULARITY_DB;
  if(rarityId==="celestial") return CELESTIAL_DB;
  if(rarityId==="abyssal") return ABYSSAL_DB;
  if(rarityId==="ethereal") return ETHEREAL_DB;
  if(rarityId==="godlike") return GODLIKE_DB;
  if(rarityId==="transcendent") return TRANSCENDENT_DB;
  if(rarityId==="eternal") return ETERNAL_DB;
  if(rarityId==="omniscient") return OMNISCIENT_DB;
  return SKIN_DB[rarityId] || [];
}

/* ---------------- STICKER / CHARM DATABASE ---------------- */
const STICKER_DEFS = [
  { id:"st_bronze",   name:"Bronze Charm",     icon:"🔶", cost:50,   boost:0.02 },
  { id:"st_silver",   name:"Silver Charm",     icon:"⚪", cost:150,  boost:0.04 },
  { id:"st_gold",     name:"Gold Charm",       icon:"🟡", cost:400,  boost:0.07 },
  { id:"st_skull",    name:"Skull Sticker",    icon:"💀", cost:900,  boost:0.10 },
  { id:"st_diamond",  name:"Diamond Sticker",  icon:"💠", cost:2200, boost:0.15 },
  // ---- higher tiers: prices start climbing hard ----
  { id:"st_holo",     name:"Holo Sticker",     icon:"🌈", cost:6000,      boost:0.20 },
  { id:"st_foil",     name:"Foil Sticker",     icon:"✨", cost:15000,     boost:0.26 },
  { id:"st_gold_foil",name:"Gold Foil Sticker",icon:"🏵️", cost:40000,     boost:0.33 },
  { id:"st_crown",    name:"Crown Charm",      icon:"👑", cost:120000,    boost:0.42 },
  { id:"st_relic",    name:"Ancient Relic Charm",icon:"🗿",cost:350000,   boost:0.55 },
  // ---- "crazy prices" tier ----
  { id:"st_vault",    name:"Vault Key Charm",  icon:"🗝️", cost:1200000,   boost:0.70 },
  { id:"st_meteor",   name:"Meteorite Sticker",icon:"☄️", cost:5000000,   boost:0.90 },
  { id:"st_phoenix",  name:"Phoenix Sticker",  icon:"🔥", cost:20000000,  boost:1.15 },
  { id:"st_cosmic",   name:"Cosmic Sticker",   icon:"🌌", cost:100000000, boost:1.50 },
  { id:"st_godlike",  name:"Godlike Sticker",  icon:"🕊️", cost:750000000, boost:2.00 },
];
const STICKER_INDEX = {};
STICKER_DEFS.forEach(s=>STICKER_INDEX[s.id]=s);

/* ---------------- CASE DEFINITIONS ---------------- */
// Each weapon case has an odds multiplier profile (favors certain rarities slightly)
const CASES = [
  { id:"case_street", name:"Street Case", icon:"📦", price:15,
    oddsBoost:1.0, desc:"The everyday case. Cheap and cheerful." },
  { id:"case_shadow", name:"Shadow Case", icon:"🌑", price:40,
    oddsBoost:1.2, desc:"Slightly better odds at rare finds." },
  { id:"case_vertigo", name:"Vertigo Case", icon:"🏙️", price:90,
    oddsBoost:1.5, desc:"High-rise drops for high rollers." },
  { id:"case_phantom", name:"Phantom Case", icon:"👻", price:180,
    oddsBoost:2.0, desc:"Ghostly rare odds boost." },
  { id:"case_nightfall", name:"Nightfall Case", icon:"🌌", price:400,
    oddsBoost:3.0, desc:"Excellent weapon case odds." },
  { id:"case_obsidian", name:"Obsidian Case", icon:"🖤", price:800,
    oddsBoost:4.0, desc:"Dense, dark, and dangerously good odds." },
  { id:"case_platinum", name:"Platinum Case", icon:"💠", price:1600,
    oddsBoost:5.5, desc:"The best weapon case odds money can buy." },
];

const KNIFE_CASES = [
  { id:"kcase_rusty", name:"Rusty Blade Crate", icon:"🔪", price:800,
    oddsBoost:1.0, desc:"Cheap entry point. Guaranteed Knife-tier or better." },
  { id:"kcase_basic", name:"Blade Crate", icon:"🎒", price:1500,
    oddsBoost:1.0, desc:"Guaranteed Knife-tier or better." },
  { id:"kcase_elite", name:"Elite Blade Crate", icon:"💼", price:4000,
    oddsBoost:1.0, exclusiveChanceMult:4, desc:"Guaranteed Knife-tier, much better shot at Exclusive." },
  { id:"kcase_prestige", name:"Prestige Blade Crate", icon:"🏆", price:9000,
    oddsBoost:1.0, exclusiveChanceMult:8, desc:"Guaranteed Knife-tier, serious odds at Exclusive." },
  { id:"kcase_ultra", name:"Ultra Blade Crate", icon:"💎", price:20000,
    oddsBoost:1.0, exclusiveChanceMult:16, desc:"The ultimate knife crate — the best Exclusive odds in the game." },
];

/* ---------------- LIMITED-TIME / CONTRABAND CASES ----------------
   These rotate daily (a new one "goes live" every real-world day) and
   are the only source of Contraband-tier drops. */
const LIMITED_CASES = [
  { id:"lcase_blacksite", name:"Blacksite Case", icon:"☣️", price:2500,
    contrabandChance:0.015, oddsBoost:2.2, desc:"Military surplus, off the books. Small shot at Contraband." },
  { id:"lcase_redledger", name:"Red Ledger Case", icon:"📕", price:6000,
    contrabandChance:0.04, oddsBoost:2.5, desc:"Cartel-grade crate. Much better Contraband odds." },
  { id:"lcase_voidmarket", name:"Void Market Case", icon:"🕳️", price:15000,
    contrabandChance:0.07, oddsBoost:3.0, desc:"Off the grid entirely. Serious Contraband odds, serious price." },
  { id:"lcase_kingmaker", name:"Kingmaker Case", icon:"👑", price:40000,
    contrabandChance:0.12, oddsBoost:3.5, desc:"For collectors chasing the single rarest items in the game." },
];
// deterministically pick "today's" limited case so it feels like a
// genuine daily rotation rather than a random reshuffle on every load
function todaysLimitedCase(){
  const dayIndex = Math.floor(Date.now()/86400000);
  return LIMITED_CASES[dayIndex % LIMITED_CASES.length];
}
function msUntilNextDay(){
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1, 0,0,0,0);
  return next.getTime() - now.getTime();
}
function formatCountdown(ms){
  if(ms<0) ms=0;
  const h = Math.floor(ms/3600000);
  const m = Math.floor((ms%3600000)/60000);
  const s = Math.floor((ms%60000)/1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

/* ---------------- VOID MARKET CASES ----------------
   Priced around 1e200+. Not a source of Contraband — instead these are
   the only source of the Eternal / Omniscient tiers, at odds so small
   they're expressed as a fraction of a percent of a percent. The floor
   result is always a guaranteed Exclusive-tier item; see voidCaseChances()
   and resolveOneCaseResult() below for the actual roll. */
const VOID_CASES = [
  { id:"vcase_rift", name:"Void Rift Case", icon:"🕳️", price:1e200,
    oddsBoost:6.0, desc:"Tears a hole clean through the fabric of the market. Guaranteed Exclusive-tier or better, with an almost immeasurable shot at something beyond Transcendent." },
  { id:"vcase_omniversal", name:"Omniversal Case", icon:"🌀", price:5e200,
    oddsBoost:8.0, desc:"Bankroll enough to buy a universe. Guaranteed Exclusive-tier or better, with the best odds anywhere at an Eternal or Omniscient pull." },
];
// Eternal/Omniscient odds scale only with the core Luck upgrade, from
// 1-in-100-quadrillion (0.000000000000001%) at Luck level 0 up to
// 1-in-10-quadrillion (0.00000000000001%) at Luck level 50 (maxed).
// Omniscient sits a further order of magnitude beyond Eternal.
function voidCaseChances(){
  const luckLevel = clamp(STATE.upgrades.luck||0, 0, 50);
  const eternalChance = 1e-17 * (1 + (luckLevel/50)*9); // 1e-17 -> 1e-16
  const omniscientChance = eternalChance / 10;
  return { eternalChance, omniscientChance };
}

/* ---------------- DAILY FREE CASE ---------------- */
const FREE_CASE = { id:"free_daily", name:"Daily Free Case", icon:"🎁", price:0,
  oddsBoost:0.6, desc:"One on the house, every 24 hours." };
function todayDateStr(){
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
}
function freeCaseAvailable(){
  return STATE.lastFreeCaseDate !== todayDateStr();
}

/* ---------------- UPGRADES ---------------- */
function upgradeCost(base, level, growth){ return Math.round(base * Math.pow(growth, level)); }

const UPGRADE_DEFS = {
  // ── TIER 1: Early Game ───────────────────────────────────────────────────
  luck:              { name:"Better Luck",              icon:"🍀",  desc:"Increases odds of higher rarities.",                                         base:100,    growth:1.6,  max:50,  tier:1 },
  speed:             { name:"Faster Opening",           icon:"⚡",  desc:"Reduces case opening animation time.",                                       base:80,     growth:1.5,  max:10,  tier:1 },
  reward:            { name:"Bigger Rewards",           icon:"💎",  desc:"Increases sell value & generator income.",                                   base:150,    growth:1.7,  max:50,  tier:1 },
  genBoost:          { name:"Operations Efficiency",    icon:"🏭",  desc:"Further boosts all generator income.",                                       base:600,    growth:1.8,  max:50,  tier:1 },
  contrabandLuck:    { name:"Cartel Connections",       icon:"☠️", desc:"Increases the Contraband drop chance in Limited Cases.",                     base:2500,   growth:1.9,  max:30,  tier:1 },
  plinkoBoost:       { name:"Rigged Rig",               icon:"🟣",  desc:"Increases every Plinko payout multiplier.",                                  base:1000,   growth:1.75, max:30,  tier:1 },
  stickerDeal:       { name:"Sticker Connect",          icon:"🎫",  desc:"Discounts every sticker in the Sticker Shop.",                               base:500,    growth:1.7,  max:15,  tier:1 },
  // ── TIER 2: Mid Game ─────────────────────────────────────────────────────
  case_efficiency:   { name:"Case Efficiency",          icon:"📦",  desc:"Each case open has a 5% chance per level to open a 2nd case free.",         base:50000,  growth:2.0,  max:20,  tier:2 },
  black_market_tax:  { name:"Black Market Tax",         icon:"🏛️", desc:"Passive income trickles in from all sold items — +2% per level.",           base:25000,  growth:1.85, max:25,  tier:2 },
  lucky_streak:      { name:"Lucky Streak",             icon:"🎲",  desc:"Consecutive opens without a rare increase your odds by 1% per level.",       base:10000,  growth:1.9,  max:20,  tier:2 },
  shadow_broker:     { name:"Shadow Broker",            icon:"🕵️", desc:"Sell prices increase by 15% per level.",                                     base:75000,  growth:2.0,  max:20,  tier:2 },
  // ── TIER 3: Late Game ────────────────────────────────────────────────────
  hyper_gen:         { name:"Hyper Generator",          icon:"🔋",  desc:"Doubles ALL generator income per level.",                                    base:1e12,   growth:2.1,  max:30,  tier:3 },
  void_luck:         { name:"Void Luck",                icon:"🌌",  desc:"Massively boosts ultra-rare (Mythical+) drop chances.",                      base:1e15,   growth:2.2,  max:20,  tier:3 },
  temporal_boost:    { name:"Temporal Boost",           icon:"⏱️", desc:"Generators tick 10% faster per level.",                                      base:1e13,   growth:2.0,  max:20,  tier:3 },
  dark_energy:       { name:"Dark Energy",              icon:"🔯",  desc:"Boosts contraband & mythical odds by 30% per level on top of everything.",   base:1e14,   growth:2.3,  max:20,  tier:3 },
  // ── TIER 4: End Game ─────────────────────────────────────────────────────
  quantum_reward:    { name:"Quantum Rewards",          icon:"⚛️", desc:"Each level doubles sell value and generator income.",                         base:1e18,   growth:2.5,  max:20,  tier:4 },
  reality_fracture:  { name:"Reality Fracture",         icon:"💠",  desc:"5% chance per level to triple any case result's value on unbox.",            base:1e17,   growth:2.4,  max:15,  tier:4 },
  entropy_engine:    { name:"Entropy Engine",           icon:"🌪️", desc:"Every 100 cases opened grants a permanent +1% income boost (stacks).",       base:1e16,   growth:2.2,  max:25,  tier:4 },
  // ── TIER 5: God Tier ─────────────────────────────────────────────────────
  singularity_boost: { name:"Singularity Drive",        icon:"🌀",  desc:"Multiplies everything — generators, luck, and rewards — by 5× per level.",  base:1e21,   growth:3.0,  max:15,  tier:5 },
  omnipotence:       { name:"Omnipotence",              icon:"👁️", desc:"Grants a 1% chance per level of ANY case drop being Transcendent-tier.",     base:1e24,   growth:3.5,  max:10,  tier:5 },
  infinite_wealth:   { name:"Infinite Wealth",          icon:"♾️",  desc:"Passive income from nothing — earns 0.1% of your net worth per tick.",       base:1e27,   growth:4.0,  max:10,  tier:5 },
  // ── TIER 6: Cosmic Ascension (for the truly loaded — 1e60+ net worth) ──────
  auto_broker:       { name:"Auto-Broker",              icon:"🤖",  desc:"Each level automatically buys 1 more of the cheapest affordable generator, every second — for free labor that never sleeps.", base:1e60,  growth:3.2, max:10, tier:6 },
  plinko_singularity:{ name:"Plinko Singularity",       icon:"🟣",  desc:"Warps the Plinko board itself — a massive extra multiplier on every payout, stacking with Rigged Rig.", base:1e58,  growth:3.4, max:20, tier:6 },
  reality_echo:      { name:"Reality Echo",             icon:"🔁",  desc:"Each level grants a small chance, every second, of an echo windfall: an instant +10% of your current money.", base:1e62, growth:3.6, max:15, tier:6 },
  // ── TIER 7: The Void Beyond (for the obscenely wealthy — 1e100+ net worth) ─
  interest_engine:   { name:"Interest Engine",          icon:"📈",  desc:"Your fortune compounds like interest — earns an extra 0.02% of your current money per level, every second.", base:1e100, growth:4.5, max:20, tier:7 },
  dimension_split:   { name:"Dimensional Split",        icon:"🌌",  desc:"Each level grants a small chance, every second, of a random owned generator splitting into an identical free clone.", base:1e110, growth:5.0, max:15, tier:7 },
  omega_multiplier:  { name:"Omega Multiplier",         icon:"Ω",   desc:"The final lever. Multiplies ALL income and sell prices by 100× per level.", base:1e150, growth:8.0, max:5, tier:7 },
};

/* ---------------- GENERATORS ---------------- */
const GENERATOR_DEFS = {
  street_vendor:   { name:"Street Vendor",         icon:"🛒",  baseCost:50,                growth:1.15, baseIncome:0.5 },
  fence:           { name:"The Fence",              icon:"🕴️", baseCost:400,               growth:1.16, baseIncome:4 },
  smuggler:        { name:"Smuggler Ring",          icon:"🚚",  baseCost:3000,              growth:1.17, baseIncome:25 },
  cartel:          { name:"Cartel Operation",       icon:"🏭",  baseCost:20000,             growth:1.18, baseIncome:150 },
  syndicate:       { name:"Global Syndicate",       icon:"🌐",  baseCost:150000,            growth:1.20, baseIncome:900 },
  offshore_bank:   { name:"Offshore Bank",          icon:"🏦",  baseCost:1200000,           growth:1.21, baseIncome:7000 },
  private_army:    { name:"Private Army",           icon:"⚔️", baseCost:9000000,           growth:1.22, baseIncome:50000 },
  black_exchange:  { name:"Black Exchange",         icon:"🪙",  baseCost:70000000,          growth:1.23, baseIncome:340000 },
  shadow_corp:     { name:"Shadow Corporation",     icon:"🏢",  baseCost:550000000,         growth:1.24, baseIncome:2400000 },
  global_monopoly: { name:"Global Monopoly",        icon:"🌍",  baseCost:4500000000,        growth:1.25, baseIncome:18000000 },
  dark_nation:     { name:"Dark Nation State",      icon:"🏴",  baseCost:50000000000,       growth:1.26, baseIncome:150000000 },
  void_network:    { name:"Void Network",           icon:"👁️", baseCost:600000000000,      growth:1.27, baseIncome:1500000000 },
  quantum_exchange:{ name:"Quantum Exchange",       icon:"⚛️", baseCost:8000000000000,     growth:1.28, baseIncome:15000000000 },
  galactic_cartel: { name:"Galactic Cartel",        icon:"🌌",  baseCost:120000000000000,   growth:1.29, baseIncome:180000000000 },
  omniversal_bank: { name:"Omniversal Bank",        icon:"🔮",  baseCost:2000000000000000,  growth:1.30, baseIncome:2500000000000 },
  singularity_corp:   { name:"Singularity Corp",         icon:"🌀",  baseCost:4e16,   growth:1.31, baseIncome:4e13 },
  celestial_vault:    { name:"Celestial Vault",          icon:"✨",  baseCost:8e18,   growth:1.32, baseIncome:8e15 },
  abyssal_forge:      { name:"Abyssal Forge",            icon:"🔥",  baseCost:2e21,   growth:1.33, baseIncome:2e18 },
  ethereal_exchange:  { name:"Ethereal Exchange",        icon:"👻",  baseCost:6e23,   growth:1.34, baseIncome:6e20 },
  godlike_empire:     { name:"Godlike Empire",           icon:"⚡",  baseCost:2e26,   growth:1.35, baseIncome:2e23 },
  transcendent_nexus: { name:"Transcendent Nexus",       icon:"♾️", baseCost:1e29,   growth:1.36, baseIncome:1e26 },
};

/* ---------------- ACHIEVEMENTS ---------------- */
const ACHIEVEMENT_DEFS = [
  { id:"first_case", icon:"📦", name:"First Steps", desc:"Open your first case.", check:s=>s.stats.casesOpened>=1 },
  { id:"10_cases", icon:"📦", name:"Regular", desc:"Open 10 cases.", check:s=>s.stats.casesOpened>=10 },
  { id:"100_cases", icon:"📦", name:"Case Addict", desc:"Open 100 cases.", check:s=>s.stats.casesOpened>=100 },
  { id:"first_knife", icon:"🗡️", name:"Bladesmith", desc:"Unbox your first knife.", check:s=>s.stats.knivesFound>=1 },
  { id:"first_covert", icon:"🔥", name:"Covert Ops", desc:"Unbox a Covert skin.", check:s=>s.stats.rarityFound.covert>=1 },
  { id:"first_exclusive", icon:"👑", name:"Jackpot Legend", desc:"Unbox an Exclusive item.", check:s=>s.stats.rarityFound.exclusive>=1 },
  { id:"rich_1k", icon:"💰", name:"Getting By", desc:"Earn a total of $1,000.", check:s=>s.stats.totalEarned>=1000 },
  { id:"rich_100k", icon:"💰", name:"Kingpin", desc:"Earn a total of $100,000.", check:s=>s.stats.totalEarned>=100000 },
  { id:"rich_1m", icon:"💵", name:"Mogul", desc:"Earn a total of $1,000,000.", check:s=>s.stats.totalEarned>=1000000 },
  { id:"rich_100m", icon:"💵", name:"Tycoon", desc:"Earn a total of $100,000,000.", check:s=>s.stats.totalEarned>=100000000 },
  { id:"rich_1b", icon:"🏦", name:"Billionaire", desc:"Earn a total of $1,000,000,000.", check:s=>s.stats.totalEarned>=1000000000 },
  { id:"rich_1t", icon:"🌍", name:"Trillion-Dollar Empire", desc:"Earn a total of $1,000,000,000,000.", check:s=>s.stats.totalEarned>=1000000000000 },
  { id:"rich_1e60", icon:"🌠", name:"Cosmic Fortune", desc:"Earn a total of $1 Novemdecillion (1e60).", check:s=>s.stats.totalEarned>=1e60 },
  { id:"rich_1e100", icon:"🕳️", name:"Beyond Comprehension", desc:"Earn a total of 1e100 — a googol dollars.", check:s=>s.stats.totalEarned>=1e100 },
  { id:"first_tradeup", icon:"🔄", name:"Upgrader", desc:"Complete a trade-up contract.", check:s=>s.stats.tradeUps>=1 },
  { id:"first_jackpot", icon:"🎰", name:"High Roller", desc:"Win a jackpot round.", check:s=>s.stats.jackpotsWon>=1 },
  { id:"gen_owner", icon:"🏭", name:"Investor", desc:"Buy your first generator.", check:s=>Object.values(s.generators).some(lvl=>lvl>0) },
  { id:"inv_50", icon:"🎒", name:"Collector", desc:"Hold 50 items in your inventory.", check:s=>s.inventory.length>=50 },
  { id:"first_contraband", icon:"☠️", name:"Off The Books", desc:"Unbox a Contraband item.", check:s=>(s.stats.rarityFound.contraband||0)>=1 },
  { id:"first_free_case", icon:"🎁", name:"On The House", desc:"Claim your first Daily Free Case.", check:s=>!!s.lastFreeCaseDate },
  { id:"first_favorite", icon:"⭐", name:"Pinned", desc:"Favorite an item to protect it from Sell All.", check:s=>s.favorites.length>=1 },
  { id:"first_sticker", icon:"🎫", name:"Customized", desc:"Apply a sticker or charm to a weapon.", check:s=>(s.stats.stickersApplied||0)>=1 },
  { id:"first_crash_win", icon:"📈", name:"Cashed Out", desc:"Win a round of Crash.", check:s=>s.stats.crashesWon>=1 },
  { id:"prestige_1", icon:"👑", name:"Reborn", desc:"Retire and prestige for the first time.", check:s=>s.prestige.count>=1 },
  { id:"prestige_5", icon:"👑", name:"Serial Retiree", desc:"Prestige 5 times.", check:s=>s.prestige.count>=5 },
  { id:"prestige_25", icon:"👑", name:"Empire Builder", desc:"Prestige 25 times.", check:s=>s.prestige.count>=25 },
  { id:"first_plinko_win", icon:"🟣", name:"Board Walker", desc:"Win a round of Plinko.", check:s=>(s.stats.plinkoWon||0)>=1 },
];

/* ============================================================
   STATE
   ============================================================ */
/** Returns the part of the signed-in user's email before the @,
 *  or "Player" if no user is available. Used as the default display name. */
function defaultUsername(){
  try{
    const user = window.CloudSync && window.CloudSync.getUser ? window.CloudSync.getUser() : null;
    if(user && user.email){
      const local = user.email.split("@")[0];
      if(local) return local;
    }
  }catch(e){}
  return "Player";
}

function defaultState(){
  return {
    username:"Player",
    avatarColor:"#ffb300",
    avatarUrl:"", // optional custom profile picture, direct image link
    money:200,
    inventory:[], // {uid, skinId, name, weapon, suffix, rarity, icon, value, float, stattrak, pattern, stickers}
    upgrades:{ luck:0, speed:0, reward:0, genBoost:0, contrabandLuck:0, plinkoBoost:0, stickerDeal:0, case_efficiency:0, black_market_tax:0, lucky_streak:0, shadow_broker:0, hyper_gen:0, void_luck:0, temporal_boost:0, dark_energy:0, quantum_reward:0, reality_fracture:0, entropy_engine:0, singularity_boost:0, omnipotence:0, infinite_wealth:0, auto_broker:0, plinko_singularity:0, reality_echo:0, interest_engine:0, dimension_split:0, omega_multiplier:0 },
    autoOpenUnlocked: false,
    autoSellUnlocked: false,
    autoStickerUnlocked: false,
    autoSellMinRarity: "consumer", // sell items at or below this rarity
    generators:{ street_vendor:1, fence:0, smuggler:0, cartel:0, syndicate:0, dark_nation:0, void_network:0, quantum_exchange:0, galactic_cartel:0, omniversal_bank:0, singularity_corp:0, offshore_bank:0, private_army:0, black_exchange:0, shadow_corp:0, global_monopoly:0, celestial_vault:0, abyssal_forge:0, ethereal_exchange:0, godlike_empire:0, transcendent_nexus:0 },
    prestige:{ points:0, count:0 },
    achievementsUnlocked:[],
    lastTick: Date.now(),
    lastFreeCaseDate: null,
    favorites: [], // array of inventory item uids
    pinned: [], // array of inventory item uids featured on the public profile (max 3)
    stickerBag: {}, // { stickerId: count } — owned, unapplied stickers
    stats:{
      casesOpened:0,
      knivesFound:0,
      exclusivesFound:0,
      totalEarned:0,
      totalSpent:0,
      bestDrop:null, // {name, value, rarity}
      tradeUps:0,
      jackpotsWon:0,
      jackpotsPlayed:0,
      coinflipsWon:0,
      coinflipsPlayed:0,
      rouletteWon:0,
      roulettePlayed:0,
      skinsSold:0,
      rarityFound:{ consumer:0, industrial:0, milspec:0, restricted:0, classified:0, covert:0, knife:0, exclusive:0, contraband:0, mythical:0, divine:0, cosmic:0, singularity:0, celestial:0, abyssal:0, ethereal:0, godlike:0, transcendent:0, eternal:0, omniscient:0 },
      crashesPlayed:0,
      crashesWon:0,
      stickersApplied:0,
      plinkoDropped:0,
      plinkoWon:0
    }
  };
}

let STATE = loadState();

// Shared merge logic so both Firestore cloud loads AND file imports
// survive future field additions without wiping unrelated save data.
function mergeStateWithDefaults(parsed){
  const base = defaultState();
  const merged = Object.assign({}, base, parsed);
  merged.upgrades = Object.assign({}, base.upgrades, parsed.upgrades||{});
  if(parsed.autoOpenUnlocked) merged.autoOpenUnlocked = true;
  if(parsed.autoSellUnlocked) merged.autoSellUnlocked = true;
  if(parsed.autoStickerUnlocked) merged.autoStickerUnlocked = true;
  if(parsed.autoSellMinRarity) merged.autoSellMinRarity = parsed.autoSellMinRarity;
  merged.generators = Object.assign({}, base.generators, parsed.generators||{});
  merged.prestige = Object.assign({}, base.prestige, parsed.prestige||{});
  merged.stats = Object.assign({}, base.stats, parsed.stats||{});
  merged.stats.rarityFound = Object.assign({}, base.stats.rarityFound, (parsed.stats&&parsed.stats.rarityFound)||{});
  merged.inventory = parsed.inventory || [];
  merged.achievementsUnlocked = parsed.achievementsUnlocked || [];
  merged.favorites = parsed.favorites || [];
  merged.pinned = parsed.pinned || [];
  merged.avatarUrl = parsed.avatarUrl || "";
  merged.stickerBag = Object.assign({}, parsed.stickerBag||{});
  merged.lastFreeCaseDate = parsed.lastFreeCaseDate || null;
  return merged;
}

// No local storage — Firestore is the only save target. This just
// seeds an empty session; firebase-sync.js overwrites STATE via
// applyImportedState() once sign-in resolves (an existing account's
// cloud save gets pulled, or a brand-new account's save gets created
// from this fresh default state).
function loadState(){
  return defaultState();
}

function saveState(silent){
  try{
    STATE.lastTick = Date.now();
    // Cloud sync hook — populated by firebase-sync.js once the
    // person is signed in (accounts are required to play, and this
    // is the only place progress is persisted — no local storage).
    if(window.CloudSync && typeof window.CloudSync.onLocalSave==="function"){
      window.CloudSync.onLocalSave();
    }
    if(!silent && !suppressSaveToast) toast("💾 Game saved");
  }catch(e){
    console.error("Failed to save", e);
    if(!silent) toast("⚠️ Save failed — check your connection");
  }
}

// Replaces the live game state wholesale — used by both the "Import
// Save" file picker and cloud-load. Exposed on window so
// firebase-sync.js (a separate module) can call it too.
function applyImportedState(parsed, opts){
  opts = opts||{};
  STATE = mergeStateWithDefaults(parsed);
  setTimeout(syncAutoSellPicker, 0);
  // Cloud restores are silent — there's no local save that could
  // already have accounted for time passed since this was last
  // synced, so credit offline earnings against the cloud's lastTick.
  if(opts.silent) applyOfflineEarnings();
  updateTopbar();
  renderAll();
  checkAchievements();
  saveState(true);
  if(!opts.silent) toast("📥 Save imported");
}
window.applyImportedState = applyImportedState;
window.getSaveSnapshot = function(){ return STATE; };

// Clears whatever's in memory back to a blank slate — called by
// firebase-sync.js on sign-out so a following sign-in (possibly to a
// different account) never starts from another account's leftover
// state. No re-render needed: the login gate covers the whole screen
// whenever nobody's signed in.
window.resetToDefaultState = function(){
  STATE = defaultState();
};

// Small, denormalized snapshot written to the PUBLIC leaderboard doc —
// only what's needed to render the leaderboard and a read-only profile
// view for other players. Never includes the full inventory, money,
// generators, etc.
window.getPublicProfileSnapshot = function(){
  const invValue = STATE.inventory.reduce((a,b)=>a+b.value,0);
  const pinnedItems = STATE.pinned
    .map(u=>STATE.inventory.find(i=>i.uid===u))
    .filter(Boolean)
    .slice(0,3)
    .map(it=>({
      name: it.name, weapon: it.weapon, rarity: it.rarity,
      value: it.value, stattrak: !!it.stattrak, icon: it.icon
    }));
  return {
    username: STATE.username || defaultUsername(),
    avatarColor: STATE.avatarColor || "#ffb300",
    avatarUrl: STATE.avatarUrl || "",
    netWorth: STATE.money + invValue,
    pinnedItems
  };
};

/* ============================================================
   UTILITIES
   ============================================================ */
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }

// Named suffixes run up through Vigintillion (1e63) — comfortably past
// the Cosmic Ascension tier of upgrades. Anything bigger (Tier 7 costs,
// and any net worth beyond that) switches to scientific notation, which
// scales cleanly all the way up to 1e300+ without ever overflowing.
const MONEY_SUFFIXES = ["","K","M","B","T","Qa","Qi","Sx","Sp","Oc","No","Dc",
  "Ud","Dd","Td","Qad","Qid","Sxd","Spd","Ocd","Nod","Vg"];
const MONEY_NAMED_MAX = Math.pow(10, MONEY_SUFFIXES.length*3); // 1e66 — first value that needs scientific notation
function formatMoney(n){
  const sign = n<0 ? "-" : "";
  n = Math.abs(n);
  if(n < 1000000){
    n = Math.round(n*100)/100;
    return sign + "$" + n.toLocaleString(undefined,{maximumFractionDigits:2});
  }
  if(n < MONEY_NAMED_MAX){
    let tier = Math.floor(Math.log10(n)/3);
    tier = Math.min(tier, MONEY_SUFFIXES.length-1);
    const scaled = n / Math.pow(1000, tier);
    const decimals = scaled<10 ? 2 : scaled<100 ? 1 : 0;
    return sign + "$" + scaled.toFixed(decimals) + MONEY_SUFFIXES[tier];
  }
  // Scientific notation for anything from Vigintillion up to 1e300+.
  const exp = Math.floor(Math.log10(n));
  const mantissa = n / Math.pow(10, exp);
  return sign + "$" + mantissa.toFixed(2) + "e+" + exp;
}

function rarityMeta(id){ return RARITIES[RARITY_INDEX[id]]; }

function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

// Weighted pick with luck skew: luck level raises weight of higher-index rarities
function weightedPickRarity(oddsBoost, excludeBelow){
  const luckLevel = STATE.upgrades.luck;
  const voidBonus = (STATE.upgrades.void_luck||0)*0.5;
  const singBonus = (STATE.upgrades.singularity_boost||0)*0.3;
  const luckMult = 1 + luckLevel*0.18 + voidBonus + singBonus; // each level raises rare odds
  const weights = RARITIES.map((r,i)=>{
    if(excludeBelow!==undefined && i < excludeBelow) return 0;
    let w = r.weight;
    if(i>=2){ // milspec and above get boosted by luck/oddsBoost
      w = w * Math.pow(luckMult, i-1) * oddsBoost;
    }
    return w;
  });
  const total = weights.reduce((a,b)=>a+b,0);
  let roll = Math.random()*total;
  for(let i=0;i<RARITIES.length;i++){
    if(roll < weights[i]) return RARITIES[i].id;
    roll -= weights[i];
  }
  return RARITIES[0].id;
}

function pickSkinFromRarity(rarityId){
  const pool = allSkinsForRarity(rarityId);
  if(!pool.length) return pickSkinFromRarity("consumer");
  return pool[Math.floor(Math.random()*pool.length)];
}

function rewardMultiplier(){
  const base = (1 + STATE.upgrades.reward*0.12) * prestigeMultiplier();
  const shadowBroker = 1 + (STATE.upgrades.shadow_broker||0)*0.15;
  const quantum = Math.pow(2, STATE.upgrades.quantum_reward||0);
  const singularity = Math.pow(5, STATE.upgrades.singularity_boost||0);
  const omega = Math.pow(100, STATE.upgrades.omega_multiplier||0);
  return base * shadowBroker * quantum * singularity * omega;
}

/* ============================================================
   PRESTIGE
   ============================================================ */
const PRESTIGE_MIN_NET_WORTH = 50000;

function netWorth(){
  const invValue = STATE.inventory.reduce((a,b)=>a+b.value,0);
  return STATE.money + invValue;
}
function prestigePointsForNetWorth(nw){
  return Math.floor(Math.sqrt(Math.max(0,nw)/10000));
}
function prestigeMultiplier(){
  return 1 + STATE.prestige.points*0.02;
}

function renderPrestige(){
  const nw = netWorth();
  const gain = prestigePointsForNetWorth(nw);
  const grid = document.getElementById("prestigeStatsGrid");
  grid.innerHTML = [
    ["Prestige Points", STATE.prestige.points],
    ["Permanent Bonus", `+${Math.round((prestigeMultiplier()-1)*100)}%`],
    ["Times Retired", STATE.prestige.count],
    ["Current Net Worth", formatMoney(nw)],
  ].map(([lbl,val])=>`<div class="stat-card"><div class="val">${val}</div><div class="lbl">${lbl}</div></div>`).join("");

  const estimate = document.getElementById("prestigeEstimate");
  const btn = document.getElementById("prestigeBtn");
  if(nw < PRESTIGE_MIN_NET_WORTH){
    estimate.innerHTML = `Reach <strong>${formatMoney(PRESTIGE_MIN_NET_WORTH)}</strong> net worth to unlock your first retirement.`;
    btn.disabled = true;
  } else {
    estimate.innerHTML = `Retiring now earns <strong>+${gain} Prestige Points</strong> — a permanent <strong>+${gain*2}%</strong> boost to all future income and sell prices.`;
    btn.disabled = false;
  }
}

document.getElementById("prestigeBtn").addEventListener("click", ()=>{
  const nw = netWorth();
  if(nw < PRESTIGE_MIN_NET_WORTH){ toast("❌ Not enough net worth yet"); return; }
  const gain = prestigePointsForNetWorth(nw);
  if(!confirm(`Retire with ${formatMoney(nw)} net worth for +${gain} Prestige Points (a permanent +${gain*2}% boost to all future income and sell prices)?\n\nThis resets your money, inventory, generators and upgrades. Achievements and stats are kept forever.`)) return;

  const fresh = defaultState();
  STATE.prestige.points += gain;
  STATE.prestige.count += 1;
  STATE.money = fresh.money;
  STATE.inventory = [];
  STATE.generators = fresh.generators;
  STATE.upgrades = fresh.upgrades;
  STATE.favorites = [];
  STATE.pinned = [];
  STATE.stickerBag = {};

  toast(`👑 Retired! +${gain} Prestige Points — permanent +${gain*2}% to income & sell prices`);
  sfx("win");
  burstParticles(window.innerWidth/2, window.innerHeight/2, "#f2a93b", 100);
  checkAchievements();
  renderAll();
  updateTopbar();
  saveState(true);
  if(window.CloudSync && typeof window.CloudSync.forceSyncNow==="function"){
    window.CloudSync.forceSyncNow();
  }
});

/* ============================================================
   MARKET SIMULATION (fake fluctuating price per skin over time)
   ============================================================ */
// Purely cosmetic-ish random walk built from a few offset sine waves,
// seeded per skinId so every copy of the same skin shares one "market
// price" line, and sampled against real elapsed time so it drifts
// slowly while the person is playing.
function marketModifier(skinId, tOverrideSec){
  const seed = hashStr(skinId);
  const t = tOverrideSec!==undefined ? tOverrideSec : Date.now()/1000;
  const a = Math.sin(t/42 + (seed%97))*0.06;
  const b = Math.sin(t/17 + (seed%53))*0.04;
  const c = Math.sin(t/91 + (seed%31))*0.05;
  return 1 + a + b + c; // ranges roughly 0.85 - 1.15
}
function stickerBoost(item){
  if(!item.stickers || !item.stickers.length) return 0;
  return item.stickers.reduce((sum,id)=> sum + (STICKER_INDEX[id]? STICKER_INDEX[id].boost : 0), 0);
}
// The value actually used when a specific inventory item is sold or
// displayed: base drop value, nudged by the live market wave, boosted
// by any applied stickers/charms.
function marketValue(item){
  const withMarket = item.value * marketModifier(item.skinId);
  const withStickers = withMarket * (1 + stickerBoost(item));
  return Math.max(1, Math.round(withStickers));
}
function sparklineSeries(skinId, points){
  points = points||24;
  const now = Date.now()/1000;
  const stepSec = 25; // each point represents a ~25s-old sample
  const series = [];
  for(let i=points-1;i>=0;i--){
    series.push(marketModifier(skinId, now - i*stepSec));
  }
  return series;
}

function openAnimDuration(){
  const base = 4200;
  const temporalMult = 1 / (1 + (STATE.upgrades.temporal_boost||0)*0.10);
  return Math.max(200, Math.round((base - STATE.upgrades.speed*280) * temporalMult));
}

/* ---------- AUTO-SELL ---------- */
function autoSellCheck(item){
  if(!STATE.autoSellUnlocked) return;
  if(STATE.favorites.includes(item.uid)) return;
  const minRarityIdx = RARITY_INDEX[STATE.autoSellMinRarity] ?? 0;
  if(RARITY_INDEX[item.rarity] > minRarityIdx) return;
  // sell it silently
  const sellValue = Math.round(marketValue(item) * 0.65 * rewardMultiplier());
  STATE.inventory = STATE.inventory.filter(i=>i.uid!==item.uid);
  STATE.money += sellValue;
  STATE.stats.totalEarned += sellValue;
  STATE.stats.skinsSold++;
}

/* ---------- AUTO-STICKER ---------- */
function autoStickerCheck(item){
  if(!STATE.autoStickerUnlocked) return;
  if(!item.stickers) item.stickers = [];
  if(item.stickers.length >= 3) return;
  const discount = 1 - (STATE.upgrades.stickerDeal||0)*0.03;
  // pick the best sticker we can afford, up to 3 slots
  while(item.stickers.length < 3){
    // find best owned sticker first
    let bestOwned = null;
    let bestOwnedBoost = -1;
    Object.keys(STATE.stickerBag).forEach(id=>{
      if((STATE.stickerBag[id]||0) > 0){
        const s = STICKER_INDEX[id];
        if(s && s.boost > bestOwnedBoost){ bestOwnedBoost = s.boost; bestOwned = id; }
      }
    });
    if(bestOwned){
      // use from bag
      STATE.stickerBag[bestOwned]--;
      if(STATE.stickerBag[bestOwned]<=0) delete STATE.stickerBag[bestOwned];
      item.stickers.push(bestOwned);
    } else {
      // buy the best we can afford
      let bestAffordable = null;
      let bestBoost = -1;
      STICKER_DEFS.forEach(s=>{
        const price = Math.max(1, Math.round(s.cost * discount));
        if(STATE.money >= price && s.boost > bestBoost){ bestBoost = s.boost; bestAffordable = s; }
      });
      if(!bestAffordable) break; // can't afford any sticker
      const price = Math.max(1, Math.round(bestAffordable.cost * discount));
      STATE.money -= price;
      STATE.stats.totalSpent += price;
      item.stickers.push(bestAffordable.id);
    }
  }
}

function addToInventory(skin){
  const item = {
    uid: uid(),
    skinId: skin.id,
    name: skin.name,
    weapon: skin.weapon,
    suffix: skin.suffix,
    rarity: skin.rarity,
    icon: skin.icon,
    value: skin.value,
    float: Math.round(Math.random()*99999999)/100000000, // 0.00000000 - 0.99999999, wear value
    stattrak: Math.random() < 0.10, // StatTrat-style variant, rolled once at drop time
    pattern: Math.floor(Math.random()*1000), // pattern/paint seed index
    stickers: [] // up to 3 applied sticker ids, see STICKER_DEFS
  };
  STATE.inventory.push(item);
  STATE.stats.rarityFound[skin.rarity] = (STATE.stats.rarityFound[skin.rarity]||0)+1;
  if(skin.rarity==="knife") STATE.stats.knivesFound++;
  if(skin.rarity==="exclusive") STATE.stats.exclusivesFound++;
  if(!STATE.stats.bestDrop || skin.value > STATE.stats.bestDrop.value){
    STATE.stats.bestDrop = { name:skin.name, value:skin.value, rarity:skin.rarity };
  }
  // auto-sticker first (boosts value), then auto-sell (may remove it)
  autoStickerCheck(item);
  autoSellCheck(item);
  return item;
}

/* ============================================================
   TOASTS
   ============================================================ */
function toast(msg){
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(()=>el.remove(), 3200);
}

/* ============================================================
   GLOBAL ANNOUNCEMENT TICKER
   Extremely rare drops (Exclusive/Contraband unboxes, huge Plinko
   hits) get broadcast to every signed-in player via a small shared
   Firestore collection (see firebase-sync.js). Locally we always
   show our own announcement immediately without waiting on the
   network round-trip.
   ============================================================ */
let localAnnouncements = [];
function renderGlobalAnnouncements(list){
  const ticker = document.getElementById("globalAnnounceTicker");
  const track = document.getElementById("gatTrack");
  if(!ticker || !track) return;
  if(!list || !list.length){ ticker.classList.add("hidden"); return; }
  ticker.classList.remove("hidden");
  track.innerHTML = list.slice(0,20).map(a=>`<span class="gat-item">${a.text}</span>`).join("");
}
function broadcastRareEvent(text){
  localAnnouncements.unshift({ text, ts:Date.now() });
  localAnnouncements = localAnnouncements.slice(0,20);
  renderGlobalAnnouncements(localAnnouncements);
  if(window.CloudSync && typeof window.CloudSync.announceDrop==="function"){
    window.CloudSync.announceDrop(text).catch(()=>{});
  }
}
// Called by firebase-sync.js whenever the shared announcements feed
// updates, so drops from OTHER players show up here live too.
window.onCloudAnnouncements = function(remoteList){
  // merge remote feed with anything we've broadcast locally this
  // session but that may not have round-tripped back yet
  const merged = [...remoteList];
  localAnnouncements.forEach(a=>{
    if(!merged.some(m=>m.text===a.text && Math.abs((m.ts||0)-a.ts)<4000)) merged.unshift(a);
  });
  merged.sort((a,b)=>(b.ts||0)-(a.ts||0));
  renderGlobalAnnouncements(merged.slice(0,20));
};

/* ============================================================
   AUDIO (WebAudio synth - no files needed)
   ============================================================ */
let audioCtx = null;
function getAudioCtx(){
  if(!audioCtx){
    try{ audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; }
  }
  return audioCtx;
}
function playTone(freq, duration, type, gainVal){
  const ctx = getAudioCtx();
  if(!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type||"sine";
  osc.frequency.value = freq;
  gain.gain.value = gainVal!==undefined?gainVal:0.08;
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration + 0.02);
}
function sfx(name){
  switch(name){
    case "click": playTone(320,0.08,"square",0.05); break;
    case "spin": playTone(200,0.06,"sawtooth",0.03); break;
    case "reveal_common": playTone(300,0.25,"sine",0.06); break;
    case "reveal_rare": playTone(500,0.2,"triangle",0.08); playTone(700,0.3,"triangle",0.06); break;
    case "reveal_epic":
      playTone(600,0.15,"triangle",0.09);
      setTimeout(()=>playTone(800,0.15,"triangle",0.09),100);
      setTimeout(()=>playTone(1000,0.35,"triangle",0.1),200);
      break;
    case "coin": playTone(880,0.15,"square",0.07); break;
    case "win": playTone(660,0.12,"sine",0.08); setTimeout(()=>playTone(990,0.25,"sine",0.09),120); break;
    case "lose": playTone(180,0.3,"sawtooth",0.07); break;
    case "buy": playTone(440,0.1,"square",0.05); break;
  }
}

/* ============================================================
   PARTICLES (canvas)
   ============================================================ */
const pCanvas = document.getElementById("particleCanvas");
const pCtx = pCanvas.getContext("2d");
let particles = [];
function resizeCanvas(){ pCanvas.width = window.innerWidth; pCanvas.height = window.innerHeight; }
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function burstParticles(x, y, color, count){
  count = count || 40;
  for(let i=0;i<count;i++){
    const angle = Math.random()*Math.PI*2;
    const speed = 2+Math.random()*6;
    particles.push({
      x, y,
      vx: Math.cos(angle)*speed,
      vy: Math.sin(angle)*speed - 2,
      life: 1,
      decay: 0.008 + Math.random()*0.015,
      size: 2+Math.random()*4,
      color
    });
  }
}
function animateParticles(){
  pCtx.clearRect(0,0,pCanvas.width,pCanvas.height);
  particles = particles.filter(p=>p.life>0);
  particles.forEach(p=>{
    p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= p.decay;
    pCtx.globalAlpha = clamp(p.life,0,1);
    pCtx.fillStyle = p.color;
    pCtx.beginPath();
    pCtx.arc(p.x,p.y,p.size,0,Math.PI*2);
    pCtx.fill();
  });
  pCtx.globalAlpha = 1;
  requestAnimationFrame(animateParticles);
}
animateParticles();

/* ============================================================
   TAB NAVIGATION
   ============================================================ */
document.getElementById("tabs").addEventListener("click", e=>{
  const btn = e.target.closest(".tab-btn");
  if(!btn) return;
  document.querySelectorAll(".tab-btn").forEach(b=>b.classList.remove("active"));
  document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("tab-"+btn.dataset.tab).classList.add("active");
  sfx("click");
  refreshActiveTab(btn.dataset.tab);
  document.querySelector(".shell").classList.remove("sidebar-open");
  window.scrollTo({top:0, behavior:"smooth"});
});

const menuToggleBtn = document.getElementById("menuToggle");
if(menuToggleBtn){
  menuToggleBtn.addEventListener("click", ()=>{
    document.querySelector(".shell").classList.toggle("sidebar-open");
  });
}

function refreshActiveTab(tab){
  if(tab==="inventory") renderInventory();
  if(tab==="tradeup") renderTradeup();
  if(tab==="upgrades") renderUpgrades();
  if(tab==="inventory"){
    const asc = document.getElementById("autoSellControls");
    if(asc){ if(STATE.autoSellUnlocked) asc.classList.remove("hidden"); else asc.classList.add("hidden"); }
  }
  if(tab==="generators") renderGenerators();
  if(tab==="prestige") renderPrestige();
  if(tab==="stats") renderStats();
  if(tab==="leaderboard") renderLeaderboard();
  if(tab==="profile") renderProfile();
  if(tab==="crash"){ resizeCrashCanvas(); drawCrashGraph(); }
  if(tab==="plinko"){ resizePlinkoCanvas(); drawPlinkoBoard(null); renderPlinkoSlots(); }
}

/* ============================================================
   TOP BAR
   ============================================================ */
function updateTopbar(){
  document.getElementById("moneyDisplay").textContent = formatMoney(STATE.money);
  document.getElementById("usernameDisplay").textContent = STATE.username;
  document.getElementById("incomeDisplay").textContent = formatMoney(totalIncomePerSec())+"/s";
}

function totalIncomePerSec(){
  let total = 0;
  Object.keys(GENERATOR_DEFS).forEach(key=>{
    const lvl = STATE.generators[key]||0;
    if(lvl>0) total += GENERATOR_DEFS[key].baseIncome * lvl;
  });
  const hyperMult = Math.pow(2, STATE.upgrades.hyper_gen||0);
  const singularityMult = Math.pow(5, STATE.upgrades.singularity_boost||0);
  const netWorth = STATE.money + STATE.inventory.reduce((s,i)=>s+(i.value||0),0);
  const infiniteWealth = netWorth * (STATE.upgrades.infinite_wealth||0) * 0.001;
  const interest = STATE.money * (STATE.upgrades.interest_engine||0) * 0.0002;
  return total * rewardMultiplier() * (1 + (STATE.upgrades.genBoost||0)*0.15) * hyperMult * singularityMult + infiniteWealth + interest;
}

/* ============================================================
   RENDER: CASES
   ============================================================ */
function rarityStripHTML(oddsBoost){
  return `<div class="rarity-strip">` + RARITIES.map(r=>`<span style="background:${r.color}"></span>`).join("") + `</div>`;
}

function renderCases(){
  const grid = document.getElementById("casesGrid");
  const freeReady = freeCaseAvailable();
  const freeCard = `
    <div class="case-card free-case" data-case="${FREE_CASE.id}" data-kind="free">
      <span class="case-badge-free">Free</span>
      <div class="case-icon-badge"><span class="case-icon">${FREE_CASE.icon}</span></div>
      <div class="case-name">${FREE_CASE.name}</div>
      <div class="case-countdown ${freeReady?"ready":""}">${freeReady? "Ready to open!" : "Resets in "+formatCountdown(msUntilNextDay())}</div>
      ${rarityStripHTML(FREE_CASE.oddsBoost)}
      <div style="color:var(--text-dim);font-size:.8em;margin-bottom:10px;">${FREE_CASE.desc}</div>
      <button class="btn primary open-case-btn" ${freeReady?"":"disabled"}>${freeReady?"Open Free Case":"Already Claimed Today"}</button>
    </div>`;
  grid.innerHTML = freeCard + CASES.map(c=>`
    <div class="case-card" data-case="${c.id}" data-kind="weapon">
      <div class="case-icon-badge"><span class="case-icon">${c.icon}</span></div>
      <div class="case-name">${c.name}</div>
      <div class="case-price">${formatMoney(c.price)}</div>
      ${rarityStripHTML(c.oddsBoost)}
      <div style="color:var(--text-dim);font-size:.8em;margin-bottom:10px;">${c.desc}</div>
      <button class="btn primary open-case-btn">Open Case</button>
      <button class="btn small multi-open-btn" style="margin-top:5px;background:#7c3aed;">📦 Multi-Open (10×) — $1B</button>
      ${STATE.autoOpenUnlocked ? `<button class="btn small auto-open-btn" style="margin-top:4px;background:#1d4ed8;">⏩ Auto Open</button>` : ""}
    </div>
  `).join("");
}
function renderKnifeCases(){
  const grid = document.getElementById("knivesGrid");
  grid.innerHTML = KNIFE_CASES.map(c=>`
    <div class="case-card" data-case="${c.id}" data-kind="knife">
      <div class="case-icon-badge"><span class="case-icon">${c.icon}</span></div>
      <div class="case-name">${c.name}</div>
      <div class="case-price">${formatMoney(c.price)}</div>
      <div style="color:var(--text-dim);font-size:.8em;margin-bottom:10px;">${c.desc}</div>
      <button class="btn primary open-case-btn">Open Crate</button>
      <button class="btn small multi-open-btn" style="margin-top:5px;background:#7c3aed;">📦 Multi-Open (10×) — $1B</button>
      ${STATE.autoOpenUnlocked ? `<button class="btn small auto-open-btn" style="margin-top:4px;background:#1d4ed8;">⏩ Auto Open</button>` : ""}
    </div>
  `).join("");
}
function renderLimitedCases(){
  const grid = document.getElementById("limitedGrid");
  const c = todaysLimitedCase();
  grid.innerHTML = `
    <div class="case-card limited-case" data-case="${c.id}" data-kind="limited">
      <span class="case-badge-limited">Contraband</span>
      <div class="case-icon-badge"><span class="case-icon">${c.icon}</span></div>
      <div class="case-name">${c.name}</div>
      <div class="case-price">${formatMoney(c.price)}</div>
      <div class="case-countdown">Rotates in ${formatCountdown(msUntilNextDay())}</div>
      ${rarityStripHTML(c.oddsBoost)}
      <div style="color:var(--text-dim);font-size:.8em;margin-bottom:10px;">${c.desc}</div>
      <button class="btn primary open-case-btn">Open Case</button>
      <button class="btn small multi-open-btn" style="margin-top:5px;background:#7c3aed;">📦 Multi-Open (10×) — $1B</button>
      ${STATE.autoOpenUnlocked ? `<button class="btn small auto-open-btn" style="margin-top:4px;background:#1d4ed8;">⏩ Auto Open</button>` : ""}
    </div>`;
}
function renderVoidCases(){
  const grid = document.getElementById("voidGrid");
  if(!grid) return;
  grid.innerHTML = VOID_CASES.map(c=>`
    <div class="case-card void-case" data-case="${c.id}" data-kind="void">
      <span class="case-badge-void">Void Market</span>
      <div class="case-icon-badge"><span class="case-icon">${c.icon}</span></div>
      <div class="case-name">${c.name}</div>
      <div class="case-price">${formatMoney(c.price)}</div>
      <div style="color:var(--text-dim);font-size:.8em;margin-bottom:10px;">${c.desc}</div>
      <button class="btn primary open-case-btn">Open Case</button>
      <button class="btn small multi-open-btn" style="margin-top:5px;background:#7c3aed;">📦 Multi-Open (10×) — $1B</button>
      ${STATE.autoOpenUnlocked ? `<button class="btn small auto-open-btn" style="margin-top:4px;background:#1d4ed8;">⏩ Auto Open</button>` : ""}
    </div>
  `).join("");
}

function caseDefById(caseId, kind){
  if(kind==="knife") return KNIFE_CASES.find(c=>c.id===caseId);
  if(kind==="free") return FREE_CASE;
  if(kind==="limited") return LIMITED_CASES.find(c=>c.id===caseId) || todaysLimitedCase();
  if(kind==="void") return VOID_CASES.find(c=>c.id===caseId);
  return CASES.find(c=>c.id===caseId);
}

function caseGridClickHandler(kind){
  return e=>{
    const openBtn = e.target.closest(".open-case-btn");
    const multiBtn = e.target.closest(".multi-open-btn");
    const autoBtn = e.target.closest(".auto-open-btn");
    const card = e.target.closest(".case-card");
    if(!card) return;
    if(openBtn){
      if(openBtn.disabled) return;
      openCaseFlow(card.dataset.case, kind);
    } else if(multiBtn){
      openMultipleCases(card.dataset.case, kind);
    } else if(autoBtn){
      toggleAutoOpen(card.dataset.case, kind, autoBtn);
    } else {
      openCasePreview(card.dataset.case, kind);
    }
  };
}
document.getElementById("casesGrid").addEventListener("click", e=>{
  const card = e.target.closest(".case-card");
  if(!card) return;
  caseGridClickHandler(card.dataset.kind)(e);
});
document.getElementById("knivesGrid").addEventListener("click", caseGridClickHandler("knife"));
document.getElementById("limitedGrid").addEventListener("click", caseGridClickHandler("limited"));
document.getElementById("voidGrid").addEventListener("click", caseGridClickHandler("void"));

/* ============================================================
   CASE CONTENTS PREVIEW MODAL
   ============================================================ */
function computeCaseOdds(caseDef, kind){
  // Mirrors the live weightedPickRarity math (including current Luck
  // upgrades) so the preview always reflects the odds the player will
  // actually get if they open right now.
  if(kind==="knife"){
    const exclusiveMult = caseDef.exclusiveChanceMult||1;
    const exclusiveChance = 0.01 * exclusiveMult * (1+STATE.upgrades.luck*0.1);
    return [
      { rarity:"exclusive", pct:exclusiveChance*100 },
      { rarity:"knife", pct:(1-exclusiveChance)*100 },
    ];
  }
  if(kind==="void"){
    const { eternalChance, omniscientChance } = voidCaseChances();
    return [
      { rarity:"omniscient", pct:omniscientChance*100 },
      { rarity:"eternal", pct:eternalChance*100 },
      { rarity:"exclusive", pct:(1-eternalChance-omniscientChance)*100 },
    ];
  }
  if(kind==="limited"){
    const cbChance = caseDef.contrabandChance * (1+STATE.upgrades.luck*0.1) * (1+(STATE.upgrades.contrabandLuck||0)*0.25) * (1+(STATE.upgrades.void_luck||0)*0.5) * (1+(STATE.upgrades.dark_energy||0)*0.30) * Math.pow(5, STATE.upgrades.singularity_boost||0);
    const rest = 1 - cbChance;
    const luckLevel = STATE.upgrades.luck;
    const luckMult = 1 + luckLevel*0.18;
    const weights = RARITIES.filter(r=>r.id!=="contraband").map((r,i)=>{
      let w = r.weight;
      if(i>=2) w = w * Math.pow(luckMult, i-1) * caseDef.oddsBoost;
      return { id:r.id, w };
    });
    const total = weights.reduce((a,b)=>a+b.w,0);
    const out = weights.map(w=>({ rarity:w.id, pct:(w.w/total)*rest*100 }));
    out.push({ rarity:"contraband", pct:cbChance*100 });
    return out;
  }
  // standard weapon case
  const luckLevel = STATE.upgrades.luck;
  const luckMult = 1 + luckLevel*0.18;
  const weights = RARITIES.filter(r=>r.id!=="contraband").map((r,i)=>{
    let w = r.weight;
    if(i>=2) w = w * Math.pow(luckMult, i-1) * caseDef.oddsBoost;
    return { id:r.id, w };
  });
  const total = weights.reduce((a,b)=>a+b.w,0);
  return weights.map(w=>({ rarity:w.id, pct:(w.w/total)*100 })).filter(o=>o.pct>0.00001);
}

function openCasePreview(caseId, kind){
  const caseDef = caseDefById(caseId, kind);
  if(!caseDef) return;
  const odds = computeCaseOdds(caseDef, kind).sort((a,b)=>RARITY_INDEX[b.rarity]-RARITY_INDEX[a.rarity]);
  const content = document.getElementById("casePreviewContent");
  content.innerHTML = `
    <div class="preview-header">
      <span class="preview-icon">${caseDef.icon}</span>
      <div>
        <div class="preview-title">${caseDef.name}</div>
        <div style="color:var(--amber);font-family:var(--f-mono);font-weight:700;">${caseDef.price?formatMoney(caseDef.price):"FREE"}</div>
      </div>
    </div>
    <div class="preview-desc">${caseDef.desc} Your current Luck upgrade is factored into these odds.</div>
    ${odds.map(o=>{
      const meta = rarityMeta(o.rarity);
      const pool = allSkinsForRarity(o.rarity);
      const sample = pool.slice(0, 24);
      return `
      <div class="preview-odds-row" data-rarity="${o.rarity}">
        <span class="preview-odds-swatch" style="background:${meta.color}"></span>
        <span class="preview-odds-label text-${meta.css}">${meta.label}</span>
        <span class="preview-odds-pct">${o.pct<0.01 ? o.pct.toFixed(4) : o.pct.toFixed(2)}%</span>
      </div>
      <div class="preview-odds-pool">
        ${sample.map(s=>`<span class="preview-pool-item"><span class="pi-icon">${buildSkinIcon(s)}</span>${s.name}</span>`).join("")}
        ${pool.length>24? `<span class="preview-pool-item">+${pool.length-24} more…</span>` : ""}
      </div>`;
    }).join("")}
  `;
  content.querySelectorAll(".preview-odds-row").forEach(row=>{
    row.addEventListener("click", ()=> row.classList.toggle("expanded"));
  });
  document.getElementById("casePreviewModal").classList.remove("hidden");
}
document.getElementById("closeCasePreviewBtn").addEventListener("click", ()=>{
  document.getElementById("casePreviewModal").classList.add("hidden");
});
document.getElementById("casePreviewModal").addEventListener("click", e=>{
  if(e.target.id==="casePreviewModal") document.getElementById("casePreviewModal").classList.add("hidden");
});

/* ============================================================
   CASE OPENING FLOW
   ============================================================ */
let isOpening = false;
let autoOpenInterval = null;
let suppressSaveToast = false;
Object.defineProperty(window, "suppressSaveToast", { get:()=>suppressSaveToast, set:v=>suppressSaveToast=v });

function resolveOneCaseResult(caseDef, kind){
  let resultSkin;
  if(kind==="knife"){
    const exclusiveMult = caseDef.exclusiveChanceMult||1;
    const exclusiveChance = 0.01 * exclusiveMult * (1+STATE.upgrades.luck*0.1);
    if(Math.random() < exclusiveChance){ resultSkin = pickSkinFromRarity("exclusive"); }
    else { resultSkin = pickSkinFromRarity("knife"); }
  } else if(kind==="void"){
    const { eternalChance, omniscientChance } = voidCaseChances();
    const roll = Math.random();
    if(roll < omniscientChance){ resultSkin = pickSkinFromRarity("omniscient"); }
    else if(roll < omniscientChance + eternalChance){ resultSkin = pickSkinFromRarity("eternal"); }
    else { resultSkin = pickSkinFromRarity("exclusive"); }
  } else if(kind==="limited"){
    const cbChance = caseDef.contrabandChance * (1+STATE.upgrades.luck*0.1) * (1+(STATE.upgrades.contrabandLuck||0)*0.25) * (1+(STATE.upgrades.void_luck||0)*0.5) * (1+(STATE.upgrades.dark_energy||0)*0.30) * Math.pow(5, STATE.upgrades.singularity_boost||0);
    const roll = Math.random();
    if(roll < cbChance * 1e-19){          resultSkin = pickSkinFromRarity("transcendent"); }
    else if(roll < cbChance * 1e-16){    resultSkin = pickSkinFromRarity("godlike"); }
    else if(roll < cbChance * 1e-13){    resultSkin = pickSkinFromRarity("ethereal"); }
    else if(roll < cbChance * 1e-10){    resultSkin = pickSkinFromRarity("abyssal"); }
    else if(roll < cbChance * 1e-8){     resultSkin = pickSkinFromRarity("celestial"); }
    else if(roll < cbChance * 1e-11){    resultSkin = pickSkinFromRarity("singularity"); }
    else if(roll < cbChance * 1e-7){     resultSkin = pickSkinFromRarity("cosmic"); }
    else if(roll < cbChance * 0.00001){  resultSkin = pickSkinFromRarity("divine"); }
    else if(roll < cbChance * 0.001){    resultSkin = pickSkinFromRarity("mythical"); }
    else if(roll < cbChance){            resultSkin = pickSkinFromRarity("contraband"); }
    else { const rarityId = weightedPickRarity(caseDef.oddsBoost, 0); resultSkin = pickSkinFromRarity(rarityId==="contraband"?"exclusive":rarityId); }
  } else {
    const rarityId = weightedPickRarity(caseDef.oddsBoost, 0);
    resultSkin = pickSkinFromRarity(rarityId);
  }
  return resultSkin;
}

const MULTI_OPEN_COST = 1_000_000_000;
const MULTI_OPEN_COUNT = 10;
const AUTO_OPEN_SHOP_COST    = 500_000_000_000;   // 500B one-time
const AUTO_SELL_SHOP_COST    = 1_000_000_000_000; // 1T one-time
const AUTO_STICKER_SHOP_COST = 10_000_000_000_000; // 10T one-time // 500 billion one-time purchase

function openMultipleCases(caseId, kind){
  if(isOpening) return;
  const caseDef = caseDefById(caseId, kind);
  if(!caseDef) return;
  const totalCost = MULTI_OPEN_COST;
  if(STATE.money < totalCost){ toast("❌ Multi-Open costs $1B"); return; }
  STATE.money -= totalCost;
  STATE.stats.totalSpent += totalCost;
  updateTopbar();
  const results = [];
  for(let i=0;i<MULTI_OPEN_COUNT;i++){
    const skin = resolveOneCaseResult(caseDef, kind);
    const item = addToInventory(skin);
    STATE.stats.casesOpened++;
    results.push(item);
  }
  saveState(true);
  checkAchievements();
  showMultiOpenResults(results);
  if(kind==="free") renderCases();
}

function showMultiOpenResults(items){
  const overlay = document.getElementById("openOverlay");
  const reel = document.getElementById("reel");
  const resultBox = document.getElementById("openResult");
  const card = document.getElementById("resultCard");
  reel.innerHTML = "";
  reel.style.transform = "";
  resultBox.classList.remove("hidden");
  overlay.classList.remove("hidden");
  items.sort((a,b)=>RARITY_INDEX[b.rarity]-RARITY_INDEX[a.rarity]);
  card.className = "result-card multi-open-result";
  card.style.removeProperty("--ri-color");
  card.innerHTML = `<div style="font-size:1.1em;margin-bottom:10px;color:#fff;">📦 ${items.length} Cases Opened</div>` +
    items.map(it=>{
      const meta = rarityMeta(it.rarity);
      return `<div class="multi-result-row rarity-${meta.css}" style="--ri-color:${meta.color}">
        <span>${it.icon||"🔫"}</span>
        <span style="flex:1;text-align:left;margin-left:8px;">${it.name}</span>
        <span style="color:${meta.color};font-size:.78em;">${meta.label}</span>
        <span style="color:#aaffaa;margin-left:8px;">${formatMoney(it.value)}</span>
      </div>`;
    }).join("");
  const cx = window.innerWidth/2, cy = window.innerHeight/2-40;
  burstParticles(cx, cy, "#ffd700", 80);
}

function toggleAutoOpen(caseId, kind, btn){
  if(!STATE.autoOpenUnlocked){
    toast("🔒 Buy Auto-Open in the Upgrade Shop first!");
    return;
  }
  if(autoOpenInterval){
    clearInterval(autoOpenInterval);
    autoOpenInterval = null;
    // update all auto buttons
    suppressSaveToast = false;
  document.querySelectorAll(".auto-open-btn").forEach(b=>{ b.textContent="⏩ Auto Open"; b.classList.remove("danger"); });
    return;
  }
  document.querySelectorAll(".auto-open-btn").forEach(b=>{ b.textContent="⏹ Stop Auto"; b.classList.add("danger"); });
  suppressSaveToast = true;
  let autoSaveCounter = 0;
  const runOne = ()=>{
    const caseDef = caseDefById(caseId, kind);
    const batchSize = 10; // always open 10 when auto-open is unlocked
    const totalCost = caseDef.price * batchSize;
    if(!caseDef || STATE.money < totalCost){
      clearInterval(autoOpenInterval);
      autoOpenInterval = null;
      suppressSaveToast = false;
      document.querySelectorAll(".auto-open-btn").forEach(b=>{ b.textContent="⏩ Auto Open"; b.classList.remove("danger"); });
      toast("⏹ Auto-open stopped (not enough money)");
      return;
    }
    STATE.money -= totalCost;
    STATE.stats.totalSpent += totalCost;
    const rare = [];
    for(let i=0;i<batchSize;i++){
      const skin = resolveOneCaseResult(caseDef, kind);
      const item = addToInventory(skin);
      STATE.stats.casesOpened++;
      if(RARITY_INDEX[skin.rarity]>=6) rare.push({skin, item});
    }
    updateTopbar();
    // only toast/broadcast truly rare drops, not spammy
    rare.forEach(({skin, item})=>{
      toast(`✨ Auto: ${skin.name} (${rarityMeta(skin.rarity).label}) — ${formatMoney(item.value)}`);
      if(RARITY_INDEX[skin.rarity]>=9) broadcastRareEvent(`🌍 ${STATE.username} auto-opened <b>${skin.name}</b> (${rarityMeta(skin.rarity).label}) worth ${formatMoney(item.value)}!`);
    });
    // only save every 10 batches (100 opens) to avoid spam
    autoSaveCounter++;
    if(autoSaveCounter>=10){ autoSaveCounter=0; saveState(true); checkAchievements(); }
  };
  autoOpenInterval = setInterval(runOne, 600);
}

function openCaseFlow(caseId, kind){
  if(isOpening) return;
  const caseDef = caseDefById(caseId, kind);
  if(!caseDef) return;
  if(kind==="free" && !freeCaseAvailable()){ toast("❌ Already claimed today's free case"); return; }
  if(STATE.money < caseDef.price){ toast("❌ Not enough money"); return; }

  STATE.money -= caseDef.price;
  STATE.stats.totalSpent += caseDef.price;
  if(kind==="free") STATE.lastFreeCaseDate = todayDateStr();
  updateTopbar();

  // Determine result
  let resultSkin;
  if(kind==="knife"){
    // guaranteed knife tier, small chance of exclusive
    const exclusiveMult = caseDef.exclusiveChanceMult||1;
    const exclusiveChance = 0.01 * exclusiveMult * (1+STATE.upgrades.luck*0.1);
    if(Math.random() < exclusiveChance){
      resultSkin = pickSkinFromRarity("exclusive");
    } else {
      resultSkin = pickSkinFromRarity("knife");
    }
  } else if(kind==="void"){
    // the only path that can ever produce an Eternal/Omniscient drop
    const { eternalChance, omniscientChance } = voidCaseChances();
    const roll = Math.random();
    if(roll < omniscientChance){
      resultSkin = pickSkinFromRarity("omniscient");
    } else if(roll < omniscientChance + eternalChance){
      resultSkin = pickSkinFromRarity("eternal");
    } else {
      resultSkin = pickSkinFromRarity("exclusive");
    }
  } else if(kind==="limited"){
    // the only path that can ever produce a Contraband-tier or higher drop
    const cbChance = caseDef.contrabandChance * (1+STATE.upgrades.luck*0.1) * (1+(STATE.upgrades.contrabandLuck||0)*0.25) * (1+(STATE.upgrades.void_luck||0)*0.5) * (1+(STATE.upgrades.dark_energy||0)*0.30) * Math.pow(5, STATE.upgrades.singularity_boost||0);
    const roll = Math.random();
    // Ultra-rare tiers — each is a fraction of the contraband chance
    if(roll < cbChance * 0.00000000001){
      resultSkin = pickSkinFromRarity("singularity");
    } else if(roll < cbChance * 0.0000001){
      resultSkin = pickSkinFromRarity("cosmic");
    } else if(roll < cbChance * 0.00001){
      resultSkin = pickSkinFromRarity("divine");
    } else if(roll < cbChance * 0.001){
      resultSkin = pickSkinFromRarity("mythical");
    } else if(roll < cbChance){
      resultSkin = pickSkinFromRarity("contraband");
    } else {
      const rarityId = weightedPickRarity(caseDef.oddsBoost, 0);
      resultSkin = pickSkinFromRarity(rarityId==="contraband"?"exclusive":rarityId);
    }
  } else {
    const rarityId = weightedPickRarity(caseDef.oddsBoost, 0);
    resultSkin = pickSkinFromRarity(rarityId);
  }

  isOpening = true;
  runReelAnimation(resultSkin, ()=>{
    const item = addToInventory(resultSkin);
    STATE.stats.casesOpened++;
    STATE.stats.totalEarned += 0; // earned tracked via sells/games, not raw drop value
    saveState(true);
    showResultCard(item);
    checkAchievements();
    if(kind==="free") renderCases();
    isOpening = false;
  });
}

function runReelAnimation(resultSkin, onDone){
  const overlay = document.getElementById("openOverlay");
  const reel = document.getElementById("reel");
  const resultBox = document.getElementById("openResult");
  resultBox.classList.add("hidden");
  overlay.classList.remove("hidden");

  // Build a strip of filler items ending in the true result. Length,
  // filler odds, and a possible late "near miss" all vary per spin so
  // no two openings feel identical.
  const ITEM_COUNT = 36 + Math.floor(Math.random()*20); // 36-55 items
  const isKnifeCrate = RARITY_INDEX[resultSkin.rarity] >= RARITY_INDEX["knife"];
  const items = [];
  for(let i=0;i<ITEM_COUNT-1;i++){
    let s;
    if(isKnifeCrate){
      s = Math.random()<0.12 ? pickSkinFromRarity("exclusive") : pickSkinFromRarity("knife");
    } else {
      s = pickSkinFromRarity(weightedPickRarity(1.0, 0));
    }
    items.push(s);
  }
  // sprinkle a late "near miss" — a high-rarity item a couple slots
  // before the landing spot — to build tension, unless the real drop
  // already is one.
  let fakeoutSlot = -1;
  if(!isKnifeCrate && RARITY_INDEX[resultSkin.rarity] < 5 && Math.random() < 0.8){
    const slot = ITEM_COUNT - 2 - Math.floor(Math.random()*3);
    if(slot > 0){ items[slot] = pickSkinFromRarity(RARITIES[5+Math.floor(Math.random()*2)].id); fakeoutSlot = slot; }
  }
  items.push(resultSkin); // land on the real result
  const targetIndex = items.length - 1; // remember where the winner sits before padding the tail

  // pad a run of items AFTER the winner too, so the strip keeps going
  // past the pointer instead of visibly running out right at the result
  const TRAIL_COUNT = 10 + Math.floor(Math.random()*8);
  for(let i=0;i<TRAIL_COUNT;i++){
    let s;
    if(isKnifeCrate){
      s = Math.random()<0.12 ? pickSkinFromRarity("exclusive") : pickSkinFromRarity("knife");
    } else {
      s = pickSkinFromRarity(weightedPickRarity(1.0, 0));
    }
    items.push(s);
  }

  reel.innerHTML = items.map((s,i)=>`
    <div class="reel-item rarity-${rarityMeta(s.rarity).css} ${i===fakeoutSlot?"fakeout":""}" style="--ri-color:${rarityMeta(s.rarity).color}">
      <div class="ri-icon">${buildSkinIcon(s)}</div>
      <div class="ri-name">${s.name}</div>
    </div>
  `).join("");

  // measure the actual rendered item width so the math stays correct
  // no matter what the CSS does
  const firstItem = reel.children[0];
  const fics = getComputedStyle(firstItem);
  const itemWidth = firstItem.getBoundingClientRect().width + parseFloat(fics.marginLeft) + parseFloat(fics.marginRight);

  const wrapWidth = reel.parentElement.offsetWidth;
  const jitter = (Math.random()*100-50);
  const finalOffset = (targetIndex*itemWidth) - (wrapWidth/2) + (itemWidth/2) + jitter;
  const overshoot = 18 + Math.random()*34; // spin slightly past the mark, then settle back

  reel.style.transition = "none";
  reel.style.transform = "translateX(0px)";
  reel.classList.add("spinning");
  // force reflow
  void reel.offsetWidth;

  const duration = Math.max(900, openAnimDuration() + Math.floor(Math.random()*500-200));
  const mainDuration = Math.max(850, Math.round(duration*0.86));
  reel.style.transition = `transform ${mainDuration}ms cubic-bezier(.11,.75,.1,1.02)`;
  requestAnimationFrame(()=>{
    reel.style.transform = `translateX(-${finalOffset+overshoot}px)`;
  });

  const tickInterval = setInterval(()=>sfx("spin"), 82+Math.random()*22);
  // ease off the blur/motion styling as the reel decelerates near the end
  setTimeout(()=>reel.classList.remove("spinning"), mainDuration*0.7);
  setTimeout(()=>reel.classList.add("settling"), mainDuration*0.85);

  // small bounce-back correction onto the exact winning item
  setTimeout(()=>{
    reel.style.transition = `transform 260ms cubic-bezier(.32,.6,.4,1)`;
    reel.style.transform = `translateX(-${finalOffset}px)`;
  }, mainDuration);

  setTimeout(()=>{
    clearInterval(tickInterval);
    reel.classList.remove("settling");
    const rIdx = RARITY_INDEX[resultSkin.rarity];
    sfx(rIdx>=6?"reveal_epic":rIdx>=4?"reveal_rare":"reveal_common");
    if(rIdx>=5){
      document.body.classList.add("screen-shake");
      setTimeout(()=>document.body.classList.remove("screen-shake"), 400);
    }
    onDone();
  }, mainDuration+300);
}

function showResultCard(item){
  const overlay = document.getElementById("openOverlay");
  const resultBox = document.getElementById("openResult");
  const card = document.getElementById("resultCard");
  const meta = rarityMeta(item.rarity);
  const rIdx = RARITY_INDEX[item.rarity];
  const isMega = rIdx>=6; // knife tier and above
  card.className = "result-card rarity-"+meta.css + (rIdx>=6? " holo":"") + (isMega? " mega":"");
  card.style.setProperty("--ri-color", meta.color);
  card.innerHTML = `
    <div class="ri-icon">${buildSkinIcon(item)}</div>
    <div class="ri-name">${item.name}</div>
    <div class="ri-rarity text-${meta.css}">${meta.label}</div>
    <div class="ri-value">${formatMoney(item.value)}</div>
  `;
  resultBox.classList.remove("hidden");

  // particle burst from center of screen, colored by rarity
  const cx = window.innerWidth/2, cy = window.innerHeight/2 - 40;
  burstParticles(cx, cy, meta.color, RARITY_INDEX[item.rarity]>=5?90:40);

  if(isMega){
    document.body.classList.add("legendary-flash");
    setTimeout(()=>document.body.classList.remove("legendary-flash"), 750);
    // a bigger, delayed second burst for extra drama on the very top tiers
    if(rIdx>=7){
      setTimeout(()=>burstParticles(cx, cy, meta.color, 140), 220);
    }
  }

  if(RARITY_INDEX[item.rarity]>=4){
    toast(`✨ You unboxed: ${item.name}!`);
  }

  // extremely rare drops get broadcast to every signed-in player
  if(rIdx>=7){
    const tierEmoji = rIdx>=12?"🌀":rIdx>=11?"💫":rIdx>=10?"⚡":rIdx>=9?"🔥":"🌍";
    broadcastRareEvent(`${tierEmoji} ${STATE.username} just unboxed <b>${item.name}</b> (${meta.label}) worth ${formatMoney(item.value)}!`);
  }
}

document.getElementById("closeResultBtn").addEventListener("click", ()=>{
  document.getElementById("openOverlay").classList.add("hidden");
  updateTopbar();
});

/* ============================================================
   INVENTORY
   ============================================================ */
function populateRarityFilter(){
  const sel = document.getElementById("invFilter");
  sel.innerHTML = `<option value="all">All Rarities</option>` +
    RARITIES.map(r=>`<option value="${r.id}">${r.label}</option>`).join("");
}
populateRarityFilter();

function getFilteredSortedInventory(){
  const search = document.getElementById("invSearch").value.toLowerCase();
  const filter = document.getElementById("invFilter").value;
  const sort = document.getElementById("invSort").value;
  let list = STATE.inventory.filter(it=>{
    if(filter!=="all" && it.rarity!==filter) return false;
    if(search && !it.name.toLowerCase().includes(search)) return false;
    return true;
  });
  list.sort((a,b)=>{
    switch(sort){
      case "rarity-desc": return RARITY_INDEX[b.rarity]-RARITY_INDEX[a.rarity] || b.value-a.value;
      case "rarity-asc": return RARITY_INDEX[a.rarity]-RARITY_INDEX[b.rarity] || a.value-b.value;
      case "value-desc": return b.value-a.value;
      case "value-asc": return a.value-b.value;
      case "name": return a.name.localeCompare(b.name);
    }
    return 0;
  });
  return list;
}

function skinCardHTML(item, opts){
  opts = opts||{};
  const meta = rarityMeta(item.rarity);
  const isFav = STATE.favorites.includes(item.uid);
  const isPinned = STATE.pinned.includes(item.uid);
  const mv = marketValue(item);
  const delta = mv - item.value;
  const deltaHTML = Math.abs(delta) >= 1 ?
    `<span class="market-delta-badge ${delta>=0?"up":"down"}">${delta>=0?"▲":"▼"}${formatMoney(Math.abs(delta))}</span>` : "";
  const stickerHTML = (item.stickers&&item.stickers.length) ?
    `<span class="sticker-count-badge">${item.stickers.map(id=>STICKER_INDEX[id]?STICKER_INDEX[id].icon:"").join("")}</span>` : "";
  const checkboxHTML = opts.bulkMode ?
    `<input type="checkbox" class="bulk-checkbox" data-uid="${item.uid}" ${bulkSelection.has(item.uid)?"checked":""}>` : "";
  const pinHTML = opts.bulkMode ? "" :
    `<span class="pin-star ${isPinned?"active":""}" data-uid="${item.uid}" title="Pin to public profile">📌</span>`;
  return `
    <div class="skin-card rarity-${meta.css} ${opts.bulkMode?"bulk-mode":""} ${bulkSelection.has(item.uid)?"bulk-picked":""}" data-uid="${item.uid}">
      ${checkboxHTML}
      <span class="fav-star ${isFav?"active":""}" data-uid="${item.uid}" title="Favorite">★</span>
      ${pinHTML}
      <div class="skin-icon">${buildSkinIcon(item)}</div>
      <div class="skin-name">${item.name}${item.stattrak?' <span class="text-industrial" title="StatTrak">™</span>':""}</div>
      <div class="skin-rarity text-${meta.css}">${meta.label}</div>
      <div class="skin-value">${formatMoney(mv)}${stickerHTML}${deltaHTML}</div>
      ${opts.sellable? `<button class="btn small danger sell-btn" data-uid="${item.uid}">Sell</button>` : ""}
    </div>
  `;
}

// Read-only card for items pinned to ANOTHER player's public profile —
// we only ever receive a small denormalized snapshot for those, not a
// full inventory item, so this renders straight from that shape.
function publicPinnedCardHTML(item){
  const meta = rarityMeta(item.rarity);
  return `
    <div class="skin-card rarity-${meta.css}">
      <div class="skin-icon">${buildSkinIcon(item)}</div>
      <div class="skin-name">${item.name}${item.stattrak?' <span class="text-industrial" title="StatTrak">™</span>':""}</div>
      <div class="skin-rarity text-${meta.css}">${meta.label}</div>
      <div class="skin-value">${formatMoney(item.value)}</div>
    </div>
  `;
}

function renderInventory(){
  const grid = document.getElementById("invGrid");
  let list = getFilteredSortedInventory();
  if(document.getElementById("invFavOnly").checked){
    list = list.filter(it=>STATE.favorites.includes(it.uid));
  }
  grid.innerHTML = list.map(it=>skinCardHTML(it,{sellable:!bulkMode, bulkMode})).join("") || `<p style="color:var(--text-dim);">No items yet — open some cases!</p>`;
  const totalValue = STATE.inventory.reduce((a,b)=>a+marketValue(b),0);
  document.getElementById("invSummary").textContent =
    `${STATE.inventory.length} items · Total value: ${formatMoney(totalValue)} · ${STATE.favorites.length} favorited`;
  updateBulkBar();
}

document.getElementById("invSearch").addEventListener("input", renderInventory);
document.getElementById("invSort").addEventListener("change", renderInventory);
document.getElementById("invFilter").addEventListener("change", renderInventory);
document.getElementById("invFavOnly").addEventListener("change", renderInventory);

document.getElementById("invGrid").addEventListener("click", e=>{
  if(e.target.classList.contains("sell-btn")){
    sellItem(e.target.dataset.uid);
    return;
  }
  if(e.target.classList.contains("fav-star")){
    toggleFavorite(e.target.dataset.uid);
    renderInventory();
    return;
  }
  if(e.target.classList.contains("pin-star")){
    togglePin(e.target.dataset.uid);
    renderInventory();
    return;
  }
  if(e.target.classList.contains("bulk-checkbox")){
    const u = e.target.dataset.uid;
    if(bulkSelection.has(u)) bulkSelection.delete(u); else bulkSelection.add(u);
    renderInventory();
    return;
  }
  const card = e.target.closest(".skin-card");
  if(!card) return;
  if(bulkMode){
    const u = card.dataset.uid;
    if(bulkSelection.has(u)) bulkSelection.delete(u); else bulkSelection.add(u);
    renderInventory();
    return;
  }
  openItemInspect(card.dataset.uid);
});

function sellItem(uidVal){
  const idx = STATE.inventory.findIndex(i=>i.uid===uidVal);
  if(idx===-1) return;
  const item = STATE.inventory[idx];
  const sellValue = Math.round(marketValue(item) * 0.65 * rewardMultiplier());
  STATE.inventory.splice(idx,1);
  STATE.favorites = STATE.favorites.filter(u=>u!==uidVal);
  STATE.pinned = STATE.pinned.filter(u=>u!==uidVal);
  STATE.money += sellValue;
  STATE.stats.totalEarned += sellValue;
  STATE.stats.skinsSold++;
  toast(`💰 Sold ${item.name} for ${formatMoney(sellValue)}`);
  sfx("buy");
  updateTopbar();
  renderInventory();
  checkAchievements();
  saveState(true);
}

document.getElementById("sellAllJunkBtn").addEventListener("click", ()=>{
  // Favorited/pinned items are excluded, even if Consumer grade.
  const junk = STATE.inventory.filter(i=>i.rarity==="consumer" && !STATE.favorites.includes(i.uid));
  if(!junk.length){ toast("No sellable Consumer items (favorites are excluded)"); return; }
  let total = 0;
  junk.forEach(item=>{ total += Math.round(marketValue(item)*0.65*rewardMultiplier()); });
  const junkUids = new Set(junk.map(i=>i.uid));
  STATE.inventory = STATE.inventory.filter(i=>!junkUids.has(i.uid));
  STATE.pinned = STATE.pinned.filter(u=>!junkUids.has(u));
  STATE.money += total;
  STATE.stats.totalEarned += total;
  STATE.stats.skinsSold += junk.length;
  toast(`💰 Sold ${junk.length} items for ${formatMoney(total)}`);
  sfx("buy");
  updateTopbar();
  renderInventory();
  checkAchievements();
  saveState(true);
});

document.getElementById("sellAllBtn").addEventListener("click", ()=>{
  // Sells the ENTIRE inventory, any rarity — favorited/pinned items are
  // always excluded, same protection as Sell All Consumer.
  const sellable = STATE.inventory.filter(i=>!STATE.favorites.includes(i.uid));
  if(!sellable.length){ toast("No sellable items (favorites are excluded)"); return; }
  let total = 0;
  sellable.forEach(item=>{ total += Math.round(marketValue(item)*0.65*rewardMultiplier()); });
  if(!confirm(`Sell all ${sellable.length} non-favorited items for ${formatMoney(total)}? This cannot be undone.`)) return;
  const sellUids = new Set(sellable.map(i=>i.uid));
  STATE.inventory = STATE.inventory.filter(i=>!sellUids.has(i.uid));
  STATE.pinned = STATE.pinned.filter(u=>!sellUids.has(u));
  STATE.money += total;
  STATE.stats.totalEarned += total;
  STATE.stats.skinsSold += sellable.length;
  toast(`💰 Sold ${sellable.length} items for ${formatMoney(total)}`);
  sfx("buy");
  updateTopbar();
  renderInventory();
  checkAchievements();
  saveState(true);
});

/* ============================================================
   FAVORITES / WISHLIST
   ============================================================ */
function toggleFavorite(uidVal){
  const i = STATE.favorites.indexOf(uidVal);
  if(i===-1) STATE.favorites.push(uidVal);
  else STATE.favorites.splice(i,1);
  saveState(true);
}

/* ============================================================
   PINNED ITEMS (featured on public profile)
   ============================================================ */
const MAX_PINNED = 3;
function togglePin(uidVal){
  const i = STATE.pinned.indexOf(uidVal);
  if(i!==-1){
    STATE.pinned.splice(i,1);
    saveState(true);
    return;
  }
  if(STATE.pinned.length>=MAX_PINNED){
    toast(`📌 You can only pin up to ${MAX_PINNED} items — unpin one first`);
    return;
  }
  STATE.pinned.push(uidVal);
  toast("📌 Pinned to your public profile");
  saveState(true);
}

/* ============================================================
   BULK SELECT / BULK SELL
   ============================================================ */
let bulkMode = false;
let bulkSelection = new Set();

document.getElementById("bulkModeBtn").addEventListener("click", ()=>{
  bulkMode = !bulkMode;
  if(!bulkMode) bulkSelection.clear();
  document.getElementById("bulkModeBtn").classList.toggle("active", bulkMode);
  document.getElementById("bulkModeBtn").textContent = bulkMode ? "✖️ Cancel Select" : "☑️ Select Multiple";
  renderInventory();
});

document.getElementById("bulkClearBtn").addEventListener("click", ()=>{
  bulkSelection.clear();
  renderInventory();
});

document.getElementById("bulkSellBtn").addEventListener("click", ()=>{
  if(!bulkSelection.size) return;
  const items = STATE.inventory.filter(i=>bulkSelection.has(i.uid));
  let total = 0;
  items.forEach(item=>{ total += Math.round(marketValue(item)*0.65*rewardMultiplier()); });
  STATE.inventory = STATE.inventory.filter(i=>!bulkSelection.has(i.uid));
  STATE.favorites = STATE.favorites.filter(u=>!bulkSelection.has(u));
  STATE.pinned = STATE.pinned.filter(u=>!bulkSelection.has(u));
  STATE.money += total;
  STATE.stats.totalEarned += total;
  STATE.stats.skinsSold += items.length;
  toast(`💰 Sold ${items.length} items for ${formatMoney(total)}`);
  sfx("buy");
  bulkSelection.clear();
  updateTopbar();
  renderInventory();
  checkAchievements();
  saveState(true);
});

function updateBulkBar(){
  const bar = document.getElementById("bulkBar");
  if(!bulkMode || bulkSelection.size===0){
    bar.classList.add("hidden");
    if(!bulkMode) return;
  } else {
    bar.classList.remove("hidden");
  }
  const items = STATE.inventory.filter(i=>bulkSelection.has(i.uid));
  const total = items.reduce((a,it)=>a+Math.round(marketValue(it)*0.65*rewardMultiplier()),0);
  document.getElementById("bulkCount").textContent = `${bulkSelection.size} selected`;
  document.getElementById("bulkTotal").textContent = bulkSelection.size ? `≈ ${formatMoney(total)}` : "";
  document.getElementById("bulkSellBtn").disabled = bulkSelection.size===0;
}

/* ============================================================
   ITEM INSPECTION VIEW
   ============================================================ */
const WEAR_BANDS = [
  { max:0.07, label:"Factory New" },
  { max:0.15, label:"Minimal Wear" },
  { max:0.38, label:"Field-Tested" },
  { max:0.45, label:"Well-Worn" },
  { max:1.001, label:"Battle-Scarred" },
];
function wearLabel(float){
  return (WEAR_BANDS.find(b=>float<=b.max) || WEAR_BANDS[WEAR_BANDS.length-1]).label;
}
function buildSparklineSVG(series){
  const w = 300, h = 44;
  const min = Math.min(...series), max = Math.max(...series);
  const range = (max-min) || 0.01;
  const pts = series.map((v,i)=>{
    const x = (i/(series.length-1))*w;
    const y = h - ((v-min)/range)*h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const rising = series[series.length-1] >= series[0];
  const color = rising ? "#3ddc84" : "var(--crimson)";
  return `<svg class="sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
  </svg>`;
}

let inspectTargetSlot = null;

function openItemInspect(uidVal){
  const item = STATE.inventory.find(i=>i.uid===uidVal);
  if(!item) return;
  inspectTargetSlot = null;
  renderItemInspect(item);
  document.getElementById("itemInspectModal").classList.remove("hidden");
}

function renderItemInspect(item){
  const meta = rarityMeta(item.rarity);
  const mv = marketValue(item);
  const delta = mv - item.value;
  const isFav = STATE.favorites.includes(item.uid);
  const isPinned = STATE.pinned.includes(item.uid);
  const series = sparklineSeries(item.skinId);
  const pctChange = ((series[series.length-1]-1)*100).toFixed(1);
  const content = document.getElementById("itemInspectContent");
  content.innerHTML = `
    <div class="inspect-top rarity-${meta.css}" style="--ri-border:${meta.color}">
      <div class="inspect-icon">${buildSkinIcon(item)}</div>
      <div class="inspect-name">${item.name}</div>
      <div class="inspect-rarity text-${meta.css}">${meta.label}</div>
      ${item.stattrak? `<div class="inspect-stattrak">★ StatTrak™ Tracking Enabled</div>` : ""}
      <div class="inspect-stat-grid">
        <div class="inspect-stat">
          <div class="lbl">Float / Wear</div>
          <div class="val">${item.float.toFixed(8)}</div>
          <div style="font-size:.7em;color:var(--text-dim);margin-top:2px;">${wearLabel(item.float)}</div>
          <div class="inspect-float-bar"><div class="inspect-float-marker" style="left:${(item.float*100).toFixed(1)}%"></div></div>
        </div>
        <div class="inspect-stat">
          <div class="lbl">Pattern Index</div>
          <div class="val">#${item.pattern}</div>
          <div style="font-size:.7em;color:var(--text-dim);margin-top:2px;">Seed derived, cosmetic only</div>
        </div>
      </div>
      <div class="inspect-market">
        <div class="lbl">Market Price (live, fluctuates)</div>
        <div class="inspect-market-row">
          <span class="inspect-market-price">${formatMoney(mv)}</span>
          <span class="inspect-market-delta ${delta>=0?"up":"down"}">${delta>=0?"▲":"▼"} ${pctChange}% vs base</span>
        </div>
        ${buildSparklineSVG(series)}
      </div>
      <div class="inspect-stickers">
        <div class="lbl">Stickers / Charms (boost sell value)</div>
        <div class="sticker-slots">
          ${[0,1,2].map(i=>{
            const sid = item.stickers[i];
            if(sid){
              const s = STICKER_INDEX[sid];
              return `<div class="sticker-slot filled" data-slot="${i}" data-action="remove">${s?s.icon:"?"}<span class="remove-x">✕</span></div>`;
            }
            return `<div class="sticker-slot" data-slot="${i}" data-action="pick">+</div>`;
          }).join("")}
        </div>
        ${stickerBoost(item)>0? `<div class="sticker-boost-note">+${Math.round(stickerBoost(item)*100)}% sell value from applied stickers</div>` : ""}
        <div id="stickerPickerArea"></div>
      </div>
      <div class="inspect-actions">
        <button class="btn inspect-fav-btn ${isFav?"active":""}" id="inspectFavBtn">★ ${isFav?"Favorited":"Favorite"}</button>
        <button class="btn inspect-fav-btn ${isPinned?"active":""}" id="inspectPinBtn">📌 ${isPinned?"Pinned":"Pin to Profile"}</button>
        <button class="btn danger" id="inspectSellBtn">Sell for ${formatMoney(Math.round(mv*0.65*rewardMultiplier()))}</button>
      </div>
    </div>
  `;

  content.querySelectorAll(".sticker-slot").forEach(slot=>{
    slot.addEventListener("click", ()=>{
      const idx = Number(slot.dataset.slot);
      if(slot.dataset.action==="remove"){
        const sid = item.stickers[idx];
        item.stickers.splice(idx,1,undefined); // keep slot semantics simple: clear this slot
        item.stickers = item.stickers.filter(s=>s!==undefined);
        STATE.stickerBag[sid] = (STATE.stickerBag[sid]||0)+1;
        saveState(true);
        renderItemInspect(item);
        renderInventory();
        return;
      }
      // pick a sticker to apply into this slot
      inspectTargetSlot = idx;
      const owned = Object.keys(STATE.stickerBag).filter(id=>STATE.stickerBag[id]>0);
      const picker = document.getElementById("stickerPickerArea");
      if(!owned.length){
        picker.innerHTML = `<div style="font-size:.75em;color:var(--text-dim);margin-top:8px;">No stickers owned yet — visit the Sticker Shop.</div>`;
        return;
      }
      picker.innerHTML = `<div class="sticker-picker">${owned.map(id=>{
        const s = STICKER_INDEX[id];
        return `<div class="sticker-pick-item" data-apply="${id}">${s.icon} ${s.name} <span style="color:var(--teal)">+${Math.round(s.boost*100)}%</span> <span style="color:var(--text-faint)">(x${STATE.stickerBag[id]})</span></div>`;
      }).join("")}</div>`;
      picker.querySelectorAll("[data-apply]").forEach(pick=>{
        pick.addEventListener("click", ()=>{
          const id = pick.dataset.apply;
          if(item.stickers.length>=3 && inspectTargetSlot===null) return;
          if(item.stickers[inspectTargetSlot]) return; // slot already filled defensively
          while(item.stickers.length <= inspectTargetSlot) item.stickers.push(undefined);
          item.stickers[inspectTargetSlot] = id;
          item.stickers = item.stickers.filter(s=>s!==undefined);
          STATE.stickerBag[id]--;
          STATE.stats.stickersApplied = (STATE.stats.stickersApplied||0)+1;
          toast(`🎫 Applied ${STICKER_INDEX[id].name}`);
          saveState(true);
          renderItemInspect(item);
          renderInventory();
        });
      });
    });
  });

  document.getElementById("inspectFavBtn").addEventListener("click", ()=>{
    toggleFavorite(item.uid);
    renderItemInspect(item);
    renderInventory();
  });
  document.getElementById("inspectPinBtn").addEventListener("click", ()=>{
    togglePin(item.uid);
    renderItemInspect(item);
    renderInventory();
  });
  document.getElementById("inspectSellBtn").addEventListener("click", ()=>{
    document.getElementById("itemInspectModal").classList.add("hidden");
    sellItem(item.uid);
  });
}

document.getElementById("closeInspectBtn").addEventListener("click", ()=>{
  document.getElementById("itemInspectModal").classList.add("hidden");
});
document.getElementById("itemInspectModal").addEventListener("click", e=>{
  if(e.target.id==="itemInspectModal") document.getElementById("itemInspectModal").classList.add("hidden");
});

/* ============================================================
   AUTO-SELL RARITY PICKER
   ============================================================ */
function syncAutoSellPicker(){
  const sel = document.getElementById("autoSellRaritySelect");
  if(!sel) return;
  sel.value = STATE.autoSellMinRarity || "consumer";
  const asc = document.getElementById("autoSellControls");
  if(asc){ if(STATE.autoSellUnlocked) asc.classList.remove("hidden"); else asc.classList.add("hidden"); }
}
document.addEventListener("DOMContentLoaded", ()=>{
  const sel = document.getElementById("autoSellRaritySelect");
  if(sel){
    syncAutoSellPicker();
    sel.addEventListener("change", ()=>{
      STATE.autoSellMinRarity = sel.value;
      toast("💸 Auto-Sell threshold → "+sel.options[sel.selectedIndex].text);
      saveState(true);
    });
  }
});

/* ============================================================
   STICKER SHOP
   ============================================================ */
function renderStickerShop(){
  const grid = document.getElementById("stickerShopGrid");
  const discount = 1 - (STATE.upgrades.stickerDeal||0)*0.03;
  grid.innerHTML = STICKER_DEFS.map(s=>{
    const tier = s.cost>=100000000?"cosmic":s.cost>=1000000?"legendary":s.cost>=15000?"premium":"";
    const price = Math.max(1, Math.round(s.cost*discount));
    return `
    <div class="sticker-shop-card ${tier}">
      <div class="ss-icon">${s.icon}</div>
      <div class="ss-name">${s.name}</div>
      <div class="ss-boost">+${Math.round(s.boost*100)}% sell value</div>
      <div class="ss-owned">Owned: ${STATE.stickerBag[s.id]||0}</div>
      <button class="btn primary small buy-sticker-btn" data-id="${s.id}">Buy — ${formatMoney(price)}</button>
    </div>`;
  }).join("");
}
document.getElementById("stickerShopBtn").addEventListener("click", ()=>{
  renderStickerShop();
  document.getElementById("stickerShopModal").classList.remove("hidden");
});
document.getElementById("closeStickerShopBtn").addEventListener("click", ()=>{
  document.getElementById("stickerShopModal").classList.add("hidden");
});
document.getElementById("stickerShopModal").addEventListener("click", e=>{
  if(e.target.id==="stickerShopModal"){ document.getElementById("stickerShopModal").classList.add("hidden"); return; }
  if(e.target.classList.contains("buy-sticker-btn")){
    const id = e.target.dataset.id;
    const def = STICKER_INDEX[id];
    const discount = 1 - (STATE.upgrades.stickerDeal||0)*0.03;
    const price = Math.max(1, Math.round(def.cost*discount));
    if(STATE.money < price){ toast("❌ Not enough money"); return; }
    STATE.money -= price;
    STATE.stats.totalSpent += price;
    STATE.stickerBag[id] = (STATE.stickerBag[id]||0)+1;
    sfx("buy");
    toast(`🎫 Bought ${def.name}`);
    updateTopbar();
    renderStickerShop();
    saveState(true);
  }
});

/* ============================================================
   TRADE-UP CONTRACTS
   ============================================================ */
let tradeupSelection = new Set();

function renderTradeup(){
  const grid = document.getElementById("tradeupGrid");
  // only show tradeable rarities (consumer..covert, not knife/exclusive - already top tier enough)
  const list = STATE.inventory.filter(i=>RARITY_INDEX[i.rarity] <= RARITY_INDEX["covert"]);
  grid.innerHTML = list.map(it=>{
    const meta = rarityMeta(it.rarity);
    const sel = tradeupSelection.has(it.uid) ? "selected" : "";
    return `
    <div class="skin-card rarity-${meta.css} ${sel}" data-uid="${it.uid}">
      <div class="skin-icon">${buildSkinIcon(it)}</div>
      <div class="skin-name">${it.name}</div>
      <div class="skin-rarity text-${meta.css}">${meta.label}</div>
      <div class="skin-value">${formatMoney(it.value)}</div>
    </div>`;
  }).join("") || `<p style="color:var(--text-dim);">Nothing to trade — open some cases first!</p>`;
  updateTradeupBar();
}

function updateTradeupBar(){
  document.getElementById("tradeupCount").textContent = `${tradeupSelection.size} / 10 selected`;
  const btn = document.getElementById("executeTradeupBtn");
  // valid only if exactly 10 selected and all same rarity and rarity has a tier above it
  let valid = false;
  if(tradeupSelection.size===10){
    const items = STATE.inventory.filter(i=>tradeupSelection.has(i.uid));
    const rarities = new Set(items.map(i=>i.rarity));
    if(rarities.size===1){
      const r = [...rarities][0];
      if(RARITY_INDEX[r] < RARITY_INDEX["covert"]) valid = true;
    }
  }
  btn.disabled = !valid;
}

document.getElementById("tradeupGrid").addEventListener("click", e=>{
  const card = e.target.closest(".skin-card");
  if(!card) return;
  const uidVal = card.dataset.uid;
  if(tradeupSelection.has(uidVal)){
    tradeupSelection.delete(uidVal);
  } else {
    if(tradeupSelection.size>=10){ toast("Max 10 items selected"); return; }
    // enforce same rarity as first pick
    if(tradeupSelection.size>0){
      const firstItem = STATE.inventory.find(i=>i.uid===[...tradeupSelection][0]);
      const thisItem = STATE.inventory.find(i=>i.uid===uidVal);
      if(firstItem && thisItem && firstItem.rarity!==thisItem.rarity){
        toast("⚠️ All 10 items must be the same rarity");
        return;
      }
    }
    tradeupSelection.add(uidVal);
  }
  renderTradeup();
});

document.getElementById("clearTradeupBtn").addEventListener("click", ()=>{
  tradeupSelection.clear();
  renderTradeup();
});

document.getElementById("executeTradeupBtn").addEventListener("click", ()=>{
  if(tradeupSelection.size!==10) return;
  const items = STATE.inventory.filter(i=>tradeupSelection.has(i.uid));
  const rarity = items[0].rarity;
  const nextRarity = RARITIES[RARITY_INDEX[rarity]+1].id;
  // remove the 10 items
  STATE.inventory = STATE.inventory.filter(i=>!tradeupSelection.has(i.uid));
  tradeupSelection.clear();
  const resultSkin = pickSkinFromRarity(nextRarity);
  const item = addToInventory(resultSkin);
  STATE.stats.tradeUps++;
  sfx("reveal_rare");
  toast(`🔄 Trade-up complete! Received: ${item.name}`);
  const cx = window.innerWidth/2, cy = window.innerHeight/2;
  burstParticles(cx, cy, rarityMeta(nextRarity).color, 60);
  renderTradeup();
  updateTopbar();
  checkAchievements();
  saveState(true);
});

/* ============================================================
   UPGRADES
   ============================================================ */
function renderUpgrades(){
  const grid = document.getElementById("upgradesGrid");
  const tierLabels = {1:"⚔️ Early Game",2:"🏴 Mid Game",3:"🌌 Late Game",4:"⚛️ End Game",5:"👁️ God Tier",6:"🌠 Cosmic Ascension",7:"🕳️ The Void Beyond"};
  const tierColors = {1:"#4b69ff",2:"#d32ce6",3:"#bf00ff",4:"#00eaff",5:"#ffffff",6:"#ff9100",7:"#00ffcc"};
  let lastTier = 0;
  grid.innerHTML = Object.keys(UPGRADE_DEFS).map(key=>{
    const def = UPGRADE_DEFS[key];
    const level = STATE.upgrades[key]||0;
    const maxed = level>=def.max;
    const cost = maxed?0:upgradeCost(def.base, level, def.growth);
    const pct = Math.round((level/def.max)*100);
    const tier = def.tier||1;
    let header = "";
    if(tier!==lastTier){ lastTier=tier; header=`<div class="upgrade-tier-header" style="--tc:${tierColors[tier]}">${tierLabels[tier]}</div>`; }
    return header + `
    <div class="upgrade-card tier-${tier}">
      <h4>${def.icon} ${def.name}</h4>
      <p>${def.desc}</p>
      <div class="upgrade-level">Level ${level} / ${def.max}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <button class="btn primary buy-upgrade-btn" data-key="${key}" ${maxed?"disabled":""}>
        ${maxed? "MAXED" : "Upgrade — "+formatMoney(cost)}
      </button>
    </div>`;
  }).join("") + `
    <div class="upgrade-card one-time-purchase ${STATE.autoOpenUnlocked?"owned":""}">
      <h4>⏩ Auto-Open</h4>
      <p>Unlocks the Auto-Open button on every case. When active, automatically opens <b>10 cases per tick</b> non-stop. One-time purchase.</p>
      <div class="upgrade-level">${STATE.autoOpenUnlocked ? "✅ Owned" : "One-Time Purchase"}</div>
      <button class="btn primary buy-autoopen-btn" ${STATE.autoOpenUnlocked?"disabled":""}>
        ${STATE.autoOpenUnlocked ? "OWNED" : "Buy — "+formatMoney(AUTO_OPEN_SHOP_COST)}
      </button>
    </div>
    <div class="upgrade-card one-time-purchase ${STATE.autoSellUnlocked?"owned":""}">
      <h4>💸 Auto-Sell</h4>
      <p>Every item unboxed at or below your chosen rarity threshold is <b>instantly sold</b> at full sell price. Favorites are always protected. Configure the threshold in the Inventory tab.</p>
      <div class="upgrade-level">${STATE.autoSellUnlocked ? "✅ Owned" : "One-Time Purchase"}</div>
      <button class="btn primary buy-autosell-btn" ${STATE.autoSellUnlocked?"disabled":""}>
        ${STATE.autoSellUnlocked ? "OWNED" : "Buy — "+formatMoney(AUTO_SELL_SHOP_COST)}
      </button>
    </div>
    <div class="upgrade-card one-time-purchase ${STATE.autoStickerUnlocked?"owned":""}">
      <h4>🎫 Auto-Sticker</h4>
      <p>Every item unboxed is automatically equipped with <b>3 stickers</b> — using your best owned stickers first, then auto-buying the best affordable ones. Massively boosts sell value.</p>
      <div class="upgrade-level">${STATE.autoStickerUnlocked ? "✅ Owned" : "One-Time Purchase"}</div>
      <button class="btn primary buy-autosticker-btn" ${STATE.autoStickerUnlocked?"disabled":""}>
        ${STATE.autoStickerUnlocked ? "OWNED" : "Buy — "+formatMoney(AUTO_STICKER_SHOP_COST)}
      </button>
    </div>`;
}

document.getElementById("upgradesGrid").addEventListener("click", e=>{
  if(e.target.classList.contains("buy-autoopen-btn")){
    if(STATE.autoOpenUnlocked){ toast("✅ Already owned!"); return; }
    if(STATE.money < AUTO_OPEN_SHOP_COST){ toast("❌ Not enough money — costs "+formatMoney(AUTO_OPEN_SHOP_COST)); return; }
    STATE.money -= AUTO_OPEN_SHOP_COST;
    STATE.stats.totalSpent += AUTO_OPEN_SHOP_COST;
    STATE.autoOpenUnlocked = true;
    sfx("buy");
    toast("⏩ Auto-Open unlocked! Find the button on any case.");
    renderUpgrades();
    renderCases(); renderKnifeCases(); renderLimitedCases(); renderVoidCases();
    updateTopbar();
    saveState(true);
    return;
  }
  if(e.target.classList.contains("buy-autosell-btn")){
    if(STATE.autoSellUnlocked){ toast("✅ Already owned!"); return; }
    if(STATE.money < AUTO_SELL_SHOP_COST){ toast("❌ Not enough money — costs "+formatMoney(AUTO_SELL_SHOP_COST)); return; }
    STATE.money -= AUTO_SELL_SHOP_COST;
    STATE.stats.totalSpent += AUTO_SELL_SHOP_COST;
    STATE.autoSellUnlocked = true;
    sfx("buy");
    toast("💸 Auto-Sell unlocked! Configure the rarity threshold in your Inventory tab.");
    renderUpgrades();
    renderInventory();
    updateTopbar();
    saveState(true);
    return;
  }
  if(e.target.classList.contains("buy-autosticker-btn")){
    if(STATE.autoStickerUnlocked){ toast("✅ Already owned!"); return; }
    if(STATE.money < AUTO_STICKER_SHOP_COST){ toast("❌ Not enough money — costs "+formatMoney(AUTO_STICKER_SHOP_COST)); return; }
    STATE.money -= AUTO_STICKER_SHOP_COST;
    STATE.stats.totalSpent += AUTO_STICKER_SHOP_COST;
    STATE.autoStickerUnlocked = true;
    sfx("buy");
    toast("🎫 Auto-Sticker unlocked! Every new drop will be stickered automatically.");
    renderUpgrades();
    updateTopbar();
    saveState(true);
    return;
  }
  if(!e.target.classList.contains("buy-upgrade-btn")) return;
  const key = e.target.dataset.key;
  const def = UPGRADE_DEFS[key];
  const level = STATE.upgrades[key];
  if(level>=def.max) return;
  const cost = upgradeCost(def.base, level, def.growth);
  if(STATE.money < cost){ toast("❌ Not enough money"); return; }
  STATE.money -= cost;
  STATE.stats.totalSpent += cost;
  STATE.upgrades[key]++;
  sfx("buy");
  toast(`⚡ ${def.name} upgraded to level ${STATE.upgrades[key]}`);
  renderUpgrades();
  updateTopbar();
  checkAchievements();
  saveState(true);
});

/* ============================================================
   GENERATORS
   ============================================================ */
function generatorCost(key){
  const def = GENERATOR_DEFS[key];
  const level = STATE.generators[key]||0;
  return Math.round(def.baseCost * Math.pow(def.growth, level));
}

function renderGenerators(){
  const grid = document.getElementById("generatorsGrid");
  grid.innerHTML = Object.keys(GENERATOR_DEFS).map(key=>{
    const def = GENERATOR_DEFS[key];
    const level = STATE.generators[key]||0;
    const cost = generatorCost(key);
    const income = def.baseIncome*level*rewardMultiplier();
    return `
    <div class="generator-card">
      <h4>${def.icon} ${def.name}</h4>
      <p>Owned: ${level} · Earning ${formatMoney(income)}/s</p>
      <button class="btn primary buy-gen-btn" data-key="${key}">Buy — ${formatMoney(cost)}</button>
    </div>`;
  }).join("");
}

document.getElementById("generatorsGrid").addEventListener("click", e=>{
  if(!e.target.classList.contains("buy-gen-btn")) return;
  const key = e.target.dataset.key;
  const cost = generatorCost(key);
  if(STATE.money < cost){ toast("❌ Not enough money"); return; }
  STATE.money -= cost;
  STATE.stats.totalSpent += cost;
  STATE.generators[key] = (STATE.generators[key]||0)+1;
  sfx("buy");
  toast(`🏭 Bought ${GENERATOR_DEFS[key].name} (Lv.${STATE.generators[key]})`);
  renderGenerators();
  updateTopbar();
  checkAchievements();
  saveState(true);
});

/* ============================================================
   COSMIC / VOID TICK EFFECTS  (Tier 6 & 7 upgrades)
   These are the wild, chance-based, non-generator effects for
   players deep into the 1e60+ / 1e100+ net worth range — reality
   echoes, generator cloning, and a tireless auto-buying broker.
   ============================================================ */
function runCosmicTickEffects(){
  // Reality Echo — small chance per second for an instant windfall
  // equal to a slice of your current fortune.
  const echoLvl = STATE.upgrades.reality_echo||0;
  if(echoLvl>0 && Math.random() < echoLvl*0.001){
    const bonus = STATE.money*0.10;
    if(bonus>0){
      STATE.money += bonus;
      STATE.stats.totalEarned += bonus;
      toast(`🔁 Reality Echo! +${formatMoney(bonus)} out of nowhere`);
      sfx("reveal_rare");
    }
  }
  // Dimensional Split — small chance per second for a random owned
  // generator to spontaneously clone itself, for free.
  const splitLvl = STATE.upgrades.dimension_split||0;
  if(splitLvl>0 && Math.random() < splitLvl*0.001){
    const owned = Object.keys(STATE.generators).filter(k=>(STATE.generators[k]||0)>0);
    if(owned.length){
      const key = owned[Math.floor(Math.random()*owned.length)];
      STATE.generators[key]++;
      toast(`🌌 Dimensional Split! A free ${GENERATOR_DEFS[key].name} split into existence`);
      sfx("buy");
    }
  }
  // Auto-Broker — automatically buys the N cheapest affordable
  // generators every second, where N is the upgrade's level.
  const brokerLvl = STATE.upgrades.auto_broker||0;
  for(let i=0;i<brokerLvl;i++){
    let cheapestKey = null, cheapestCost = Infinity;
    Object.keys(GENERATOR_DEFS).forEach(key=>{
      const cost = generatorCost(key);
      if(cost < cheapestCost){ cheapestCost = cost; cheapestKey = key; }
    });
    if(cheapestKey===null || cheapestCost > STATE.money) break;
    STATE.money -= cheapestCost;
    STATE.stats.totalSpent += cheapestCost;
    STATE.generators[cheapestKey] = (STATE.generators[cheapestKey]||0)+1;
  }
}

// Generator tick loop - runs every second while app is open
setInterval(()=>{
  const income = totalIncomePerSec();
  if(income>0){
    STATE.money += income;
    STATE.stats.totalEarned += income;
  }
  runCosmicTickEffects();
  updateTopbar();
}, 1000);

// Offline earnings on load (capped at 8 hours)
function applyOfflineEarnings(){
  const now = Date.now();
  const elapsedSec = Math.min((now - (STATE.lastTick||now))/1000, 8*3600);
  if(elapsedSec > 5){
    const income = totalIncomePerSec();
    const earned = income*elapsedSec;
    if(earned>0){
      STATE.money += earned;
      STATE.stats.totalEarned += earned;
      toast(`⏱️ Welcome back! Earned ${formatMoney(earned)} while away.`);
    }
  }
  STATE.lastTick = now;
}

/* ============================================================
   JACKPOT
   ============================================================ */
const JACKPOT_BOTS = ["ShadowFox","VendettaX","NightRaider","GhostTrader","ViperKing","CrimsonAce"];
let jackpotWheelRotation = 0;

function renderJackpotIdle(){
  document.getElementById("jackpotPot").textContent = "Pot: $0";
  document.getElementById("jackpotEntries").innerHTML = "";
}
renderJackpotIdle();

document.getElementById("jackpotJoinBtn").addEventListener("click", ()=>{
  const betInput = document.getElementById("jackpotBet");
  const bet = Math.max(1, Math.round(Number(betInput.value)||0));
  if(STATE.money < bet){ toast("❌ Not enough money"); return; }
  STATE.money -= bet;
  STATE.stats.totalSpent += bet;
  updateTopbar();

  // build entrants: user + 1-3 random bots with random wagers.
  // Bot wagers are centered on the player's own bet (0.5x-1.5x, avg
  // 1.0x) rather than skewed upward — win chance is your share of the
  // pot, so keeping bot bets from systematically outweighing yours
  // keeps this a fair, genuinely winnable game instead of stacking
  // the odds against the player by design.
  const entrants = [{ name: STATE.username, bet, isUser:true }];
  const botCount = 1 + Math.floor(Math.random()*3); // 1-3 bots
  const usedBots = [...JACKPOT_BOTS].sort(()=>Math.random()-0.5).slice(0,botCount);
  usedBots.forEach(name=>{
    entrants.push({ name, bet: Math.max(1, Math.round(bet*(0.5+Math.random()*1.0))), isUser:false });
  });

  const totalPot = entrants.reduce((a,b)=>a+b.bet,0);
  document.getElementById("jackpotPot").textContent = `Pot: ${formatMoney(totalPot)}`;

  // build colored wheel segments proportional to bet share
  let angleAcc = 0;
  const colors = ["#eb4b4b","#8847ff","#4b69ff","#3ddc84"];
  const segments = entrants.map((e,i)=>{
    const share = e.bet/totalPot;
    const deg = share*360;
    const seg = { start:angleAcc, end:angleAcc+deg, color:colors[i%colors.length], entrant:e };
    angleAcc += deg;
    return seg;
  });

  document.getElementById("jackpotEntries").innerHTML = entrants.map((e,i)=>
    `<div class="entry-chip" style="border-color:${colors[i%colors.length]}">${e.isUser?"👤 ":"🤖 "}${e.name}: ${formatMoney(e.bet)}</div>`
  ).join("");

  const gradientStops = segments.map(s=>`${s.color} ${s.start}deg ${s.end}deg`).join(", ");
  const wheel = document.getElementById("jackpotWheel");
  wheel.style.background = `conic-gradient(${gradientStops})`;

  // pick winner proportional to bet share
  let roll = Math.random()*totalPot;
  let winner = entrants[0];
  for(const e of entrants){
    if(roll < e.bet){ winner = e; break; }
    roll -= e.bet;
  }
  const winnerSeg = segments.find(s=>s.entrant===winner);
  const targetAngle = (winnerSeg.start+winnerSeg.end)/2;
  const spins = 5;
  jackpotWheelRotation += spins*360 + (360-targetAngle);
  wheel.style.transform = `rotate(${jackpotWheelRotation}deg)`;

  STATE.stats.jackpotsPlayed++;
  sfx("spin");

  setTimeout(()=>{
    if(winner.isUser){
      STATE.money += totalPot;
      STATE.stats.totalEarned += totalPot - bet;
      STATE.stats.jackpotsWon++;
      toast(`🎉 You won the jackpot! +${formatMoney(totalPot)}`);
      sfx("win");
      burstParticles(window.innerWidth/2, window.innerHeight/2, "#ffd700", 80);
    } else {
      toast(`💀 ${winner.name} won the pot.`);
      sfx("lose");
    }
    const ballIdx = activePlinkoBalls.indexOf(ball);
    if(ballIdx>=0) activePlinkoBalls.splice(ballIdx,1);
    updateTopbar();
    checkAchievements();
    saveState(true);
  }, 3100);
});

/* ============================================================
   COINFLIP
   ============================================================ */
let selectedCoinSide = null;
document.querySelectorAll(".side-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll(".side-btn").forEach(b=>b.classList.remove("picked"));
    btn.classList.add("picked");
    selectedCoinSide = btn.dataset.side;
    flipCoin();
  });
});

function flipCoin(){
  if(!selectedCoinSide) return;
  const betInput = document.getElementById("coinflipBet");
  const bet = Math.max(1, Math.round(Number(betInput.value)||0));
  if(STATE.money < bet){ toast("❌ Not enough money"); return; }
  STATE.money -= bet;
  updateTopbar();

  const coin = document.getElementById("coin");
  const win = Math.random() < 0.48; // slight house edge
  const outcomeSide = win ? selectedCoinSide : (selectedCoinSide==="heads"?"tails":"heads");
  const baseSpins = 4;
  const extraTurn = outcomeSide==="tails" ? 180 : 0;
  const currentRot = (parseFloat(coin.dataset.rot)||0);
  const newRot = currentRot + baseSpins*360 + extraTurn - (currentRot%360);
  coin.dataset.rot = newRot;
  coin.style.transform = `rotateY(${newRot}deg)`;
  sfx("coin");

  STATE.stats.coinflipsPlayed++;
  const resultEl = document.getElementById("coinflipResult");
  resultEl.textContent = "Flipping...";
  resultEl.className = "game-result";

  setTimeout(()=>{
    if(win){
      const payout = bet*2;
      STATE.money += payout;
      STATE.stats.totalEarned += bet;
      STATE.stats.coinflipsWon++;
      resultEl.textContent = `🎉 ${outcomeSide.toUpperCase()}! You won ${formatMoney(payout)}`;
      resultEl.className = "game-result win";
      sfx("win");
      burstParticles(window.innerWidth/2, window.innerHeight/2, "#3ddc84", 40);
    } else {
      resultEl.textContent = `💀 ${outcomeSide.toUpperCase()}! You lost ${formatMoney(bet)}`;
      resultEl.className = "game-result lose";
      sfx("lose");
    }
    updateTopbar();
    checkAchievements();
    saveState(true);
  }, 1850);
}

/* ============================================================
   ROULETTE
   ============================================================ */
let rouletteRotation = 0;
document.querySelectorAll(".roul-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>spinRoulette(btn.dataset.color));
});

// Roulette wheel: 37 segments total (European style)
// 1 green (0), 18 red, 18 black — laid out alternating red/black after green
// Segment size in degrees: 360/37 ≈ 9.73°
// Green = segment 0 (starts at 0°), then alternating red/black
const ROUL_SEGMENTS = (() => {
  const segs = [{ color:"green", idx:0 }];
  const redNums  = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
  const blackNums= [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
  // interleave around the wheel
  const order = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
  for(let i=1;i<order.length;i++){
    const n = order[i];
    segs.push({ color: redNums.includes(n)?"red":"black", idx:i });
  }
  return segs;
})();
const ROUL_SEG_DEG = 360 / ROUL_SEGMENTS.length;
let rouletteSpinning = false;

function spinRoulette(color){
  if(rouletteSpinning){ toast("⏳ Wheel is spinning..."); return; }
  const betInput = document.getElementById("rouletteBet");
  const bet = Math.max(1, Math.round(Number(betInput.value)||0));
  if(STATE.money < bet){ toast("❌ Not enough money"); return; }
  STATE.money -= bet;
  updateTopbar();

  // odds: green ~7%, red ~46.5%, black ~46.5%
  const roll = Math.random();
  let outcome = roll < 0.07 ? "green" : (roll < 0.535 ? "red" : "black");
  const win = outcome===color;
  const payoutMult = color==="green" ? 14 : 2;

  // pick a random segment of the outcome color
  const matchingSegs = ROUL_SEGMENTS.filter(s=>s.color===outcome);
  const targetSeg = matchingSegs[Math.floor(Math.random()*matchingSegs.length)];
  // the pointer is at top (0°). We want targetSeg.idx * ROUL_SEG_DEG to land under pointer.
  // Wheel rotates clockwise. To land segment X under top pointer,
  // we rotate so that segment X's center aligns with 0°:
  // needed rotation = 360 - (targetSeg.idx * ROUL_SEG_DEG + ROUL_SEG_DEG/2) + jitter
  const jitter = (Math.random()-0.5)*ROUL_SEG_DEG*0.6;
  const targetAngle = 360 - (targetSeg.idx * ROUL_SEG_DEG + ROUL_SEG_DEG/2) + jitter;
  const fullSpins = (6 + Math.floor(Math.random()*4)) * 360;
  // normalize rouletteRotation to 0-360 first to avoid giant numbers
  rouletteRotation = rouletteRotation % 360;
  const finalRotation = rouletteRotation + fullSpins + targetAngle - (rouletteRotation % 360);
  rouletteRotation = finalRotation;

  const wheel = document.getElementById("rouletteWheel");
  wheel.style.transition = "transform 3.2s cubic-bezier(.17,.67,.12,1)";
  wheel.style.transform = `rotate(${rouletteRotation}deg)`;
  sfx("spin");
  rouletteSpinning = true;

  STATE.stats.roulettePlayed++;
  const resultEl = document.getElementById("rouletteResult");
  resultEl.textContent = "Spinning...";
  resultEl.className = "game-result";

  setTimeout(()=>{
    rouletteSpinning = false;
    wheel.style.transition = "";
    if(win){
      const payout = bet*payoutMult;
      STATE.money += payout;
      STATE.stats.totalEarned += payout-bet;
      STATE.stats.rouletteWon++;
      resultEl.textContent = `🎉 Landed on ${outcome.toUpperCase()}! You won ${formatMoney(payout)}`;
      resultEl.className = "game-result win";
      sfx("win");
      burstParticles(window.innerWidth/2, window.innerHeight/2, outcome==="green"?"#3ddc84":outcome==="red"?"#ff5252":"#aaa", 50);
    } else {
      resultEl.textContent = `💀 Landed on ${outcome.toUpperCase()}. You lost ${formatMoney(bet)}`;
      resultEl.className = "game-result lose";
      sfx("lose");
    }
    updateTopbar();
    checkAchievements();
    saveState(true);
  }, 3300);
}

/* ============================================================
   CRASH GAME
   ============================================================ */
const crashCanvas = document.getElementById("crashCanvas");
const crashCtx = crashCanvas.getContext("2d");
function resizeCrashCanvas(){
  const rect = crashCanvas.parentElement.getBoundingClientRect();
  crashCanvas.width = rect.width;
  crashCanvas.height = rect.height;
}
window.addEventListener("resize", resizeCrashCanvas);

let crashRunning = false;
let crashCashedOut = false;
let crashStartTime = 0;
let crashPoint = 1;
let crashBetAmount = 0;
let crashAnimFrame = null;
let crashPath = [];

// classic crash-game curve: fast-ish exponential climb
function crashMultiplierAt(elapsedSec){
  return Math.exp(elapsedSec*0.17);
}
// standard house-edge crash-point distribution
function generateCrashPoint(){
  const houseEdge = 0.04;
  const r = Math.random();
  if(r < houseEdge) return 1.00;
  let point = 0.99/(1-r);
  point = Math.floor(point*100)/100;
  return Math.max(1.00, Math.min(point, 500));
}

function drawCrashGraph(){
  resizeCrashCanvas();
  const w = crashCanvas.width, h = crashCanvas.height;
  crashCtx.clearRect(0,0,w,h);
  if(crashPath.length<2) return;
  const maxT = Math.max(crashPath[crashPath.length-1].t*1.08, 1);
  const maxM = Math.max(...crashPath.map(p=>p.m), 1.4) * 1.12;
  crashCtx.beginPath();
  crashPath.forEach((p,i)=>{
    const x = (p.t/maxT)*w;
    const y = h - (( p.m-1)/(maxM-1))*h;
    if(i===0) crashCtx.moveTo(x,y); else crashCtx.lineTo(x,y);
  });
  const grad = crashCtx.createLinearGradient(0,0,w,0);
  const col = crashCashedOut ? "#3ddc84" : "#f2a93b";
  grad.addColorStop(0, col);
  grad.addColorStop(1, crashRunning ? col : (crashCashedOut? "#3ddc84":"#ff4d5e"));
  crashCtx.strokeStyle = grad;
  crashCtx.lineWidth = 3;
  crashCtx.lineJoin = "round";
  crashCtx.stroke();
  // fill under the curve for a bit of drama
  const last = crashPath[crashPath.length-1];
  crashCtx.lineTo((last.t/maxT)*w, h);
  crashCtx.lineTo(0,h);
  crashCtx.closePath();
  crashCtx.fillStyle = col.replace(")", ",0.12)").replace("rgb","rgba");
  crashCtx.globalAlpha = 0.14;
  crashCtx.fillStyle = col;
  crashCtx.fill();
  crashCtx.globalAlpha = 1;
}

function updateCrashDisplay(m){
  const el = document.getElementById("crashMultiplier");
  el.textContent = m.toFixed(2)+"x";
}

function crashTick(now){
  if(!crashRunning && !crashCashedOut) return;
  const elapsed = (now - crashStartTime)/1000;
  const m = Math.min(crashMultiplierAt(elapsed), crashPoint);
  updateCrashDisplay(m);
  crashPath.push({ t:elapsed, m });
  drawCrashGraph();
  if(m >= crashPoint){
    endCrashRound();
    return;
  }
  crashAnimFrame = requestAnimationFrame(crashTick);
}

function startCrash(){
  if(crashRunning) return;
  const betInput = document.getElementById("crashBet");
  const bet = Math.max(1, Math.round(Number(betInput.value)||0));
  if(STATE.money < bet){ toast("❌ Not enough money"); return; }
  STATE.money -= bet;
  STATE.stats.totalSpent += bet;
  crashBetAmount = bet;
  crashPoint = generateCrashPoint();
  crashRunning = true;
  crashCashedOut = false;
  crashPath = [{t:0,m:1}];
  crashStartTime = performance.now();
  document.getElementById("crashStartBtn").disabled = true;
  document.getElementById("crashCashoutBtn").disabled = false;
  document.getElementById("crashMessage").textContent = "";
  document.getElementById("crashMultiplier").className = "crash-multiplier";
  STATE.stats.crashesPlayed++;
  updateTopbar();
  crashAnimFrame = requestAnimationFrame(crashTick);
}

function cashOutCrash(){
  if(!crashRunning || crashCashedOut) return;
  crashCashedOut = true;
  const elapsed = (performance.now() - crashStartTime)/1000;
  const m = Math.min(crashMultiplierAt(elapsed), crashPoint);
  const payout = Math.round(crashBetAmount*m);
  STATE.money += payout;
  STATE.stats.totalEarned += payout - crashBetAmount;
  STATE.stats.crashesWon++;
  document.getElementById("crashMultiplier").classList.add("cashed");
  document.getElementById("crashMessage").textContent = `💸 Cashed out at ${m.toFixed(2)}x for ${formatMoney(payout)}`;
  document.getElementById("crashCashoutBtn").disabled = true;
  sfx("win");
  burstParticles(window.innerWidth/2, window.innerHeight/2, "#3ddc84", 40);
  addCrashHistory(m, true);
  updateTopbar();
  checkAchievements();
  saveState(true);
}

function endCrashRound(){
  crashRunning = false;
  cancelAnimationFrame(crashAnimFrame);
  document.getElementById("crashStartBtn").disabled = false;
  document.getElementById("crashCashoutBtn").disabled = true;
  if(!crashCashedOut){
    document.getElementById("crashMultiplier").classList.add("crashed");
    document.getElementById("crashMessage").textContent = `💥 Crashed at ${crashPoint.toFixed(2)}x — you lost ${formatMoney(crashBetAmount)}`;
    sfx("lose");
    addCrashHistory(crashPoint, false);
    checkAchievements();
    saveState(true);
  }
  crashCashedOut = false;
  updateTopbar();
}

function addCrashHistory(m, win){
  const hist = document.getElementById("crashHistory");
  const chip = document.createElement("div");
  chip.className = "crash-history-chip " + (win?"win":"loss");
  chip.textContent = m.toFixed(2)+"x";
  hist.insertBefore(chip, hist.firstChild);
  while(hist.children.length>12) hist.removeChild(hist.lastChild);
}

document.getElementById("crashStartBtn").addEventListener("click", startCrash);
document.getElementById("crashCashoutBtn").addEventListener("click", cashOutCrash);
resizeCrashCanvas();

/* ============================================================
   PLINKO
   ============================================================ */
const PLINKO_ROWS = 12;
const PLINKO_RISK_TABLES = {
  // 13 slots (rows+1), symmetric edge-to-center payouts.
  low:    [8, 4, 2, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 2, 4, 8],
  medium: [22, 9, 4, 2, 1.2, 0.6, 0.3, 0.6, 1.2, 2, 4, 9, 22],
  high:   [110, 32, 11, 4, 1.4, 0.3, 0.2, 0.3, 1.4, 4, 11, 32, 110],
};
const plinkoCanvas = document.getElementById("plinkoCanvas");
const plinkoCtx = plinkoCanvas.getContext("2d");
let plinkoRunning = false;
const activePlinkoBalls = [];

function resizePlinkoCanvas(){
  const rect = plinkoCanvas.parentElement.getBoundingClientRect();
  plinkoCanvas.width = rect.width;
  plinkoCanvas.height = rect.height;
}
window.addEventListener("resize", resizePlinkoCanvas);

function plinkoBoostMult(){
  return 1 + (STATE.upgrades.plinkoBoost||0)*0.08 + (STATE.upgrades.plinko_singularity||0)*0.6;
}

function renderPlinkoSlots(){
  const risk = document.getElementById("plinkoRisk").value;
  const table = PLINKO_RISK_TABLES[risk];
  const boost = plinkoBoostMult();
  const wrap = document.getElementById("plinkoSlots");
  wrap.innerHTML = table.map((m,i)=>{
    const eff = (m*boost);
    const hue = m>=10 ? 8 : m>=2 ? 42 : m>=1 ? 172 : 0;
    const light = m>=10 ? 52 : m>=2 ? 55 : m>=1 ? 45 : 34;
    return `<div class="plinko-slot" data-i="${i}" style="background:hsl(${hue},80%,${light}%)">${eff.toFixed(2)}x</div>`;
  }).join("");
}
document.getElementById("plinkoRisk").addEventListener("change", renderPlinkoSlots);

function plinkoPegPositions(){
  const w = plinkoCanvas.width, h = plinkoCanvas.height;
  const marginTop = h*0.10, marginBottom = h*0.18;
  const usableH = h - marginTop - marginBottom;
  const rowGap = usableH / PLINKO_ROWS;
  const rows = [];
  for(let r=0;r<PLINKO_ROWS;r++){
    const count = r+2;
    const gapX = (w*0.86) / (PLINKO_ROWS+1);
    const rowWidth = gapX*(count-1);
    const startX = (w-rowWidth)/2;
    const y = marginTop + r*rowGap;
    const pegs = [];
    for(let i=0;i<count;i++) pegs.push({ x:startX+i*gapX, y });
    rows.push(pegs);
  }
  return { rows, marginTop, marginBottom, rowGap, gapX:(w*0.86)/(PLINKO_ROWS+1) };
}

function drawPlinkoBoard(ball){
  const w = plinkoCanvas.width, h = plinkoCanvas.height;
  plinkoCtx.clearRect(0,0,w,h);
  const board = plinkoPegPositions();
  plinkoCtx.fillStyle = "rgba(255,255,255,.35)";
  board.rows.forEach(pegs=>{
    pegs.forEach(p=>{
      plinkoCtx.beginPath();
      plinkoCtx.arc(p.x, p.y, 3.4, 0, Math.PI*2);
      plinkoCtx.fill();
    });
  });
  // render all active balls
  activePlinkoBalls.forEach(b=>{
    const grad = plinkoCtx.createRadialGradient(b.x,b.y,0,b.x,b.y,9);
    grad.addColorStop(0,"#fff8e0"); grad.addColorStop(1,"#f2a93b");
    plinkoCtx.fillStyle = grad;
    plinkoCtx.beginPath(); plinkoCtx.arc(b.x, b.y, 7, 0, Math.PI*2); plinkoCtx.fill();
    plinkoCtx.save(); plinkoCtx.shadowColor="#f2a93b"; plinkoCtx.shadowBlur=16; plinkoCtx.fill(); plinkoCtx.restore();
  });
  if(ball){
    const grad = plinkoCtx.createRadialGradient(ball.x,ball.y,0,ball.x,ball.y,9);
    grad.addColorStop(0,"#fff8e0");
    grad.addColorStop(1,"#f2a93b");
    plinkoCtx.fillStyle = grad;
    plinkoCtx.beginPath();
    plinkoCtx.arc(ball.x, ball.y, 7, 0, Math.PI*2);
    plinkoCtx.fill();
    plinkoCtx.save();
    plinkoCtx.shadowColor = "#f2a93b";
    plinkoCtx.shadowBlur = 16;
    plinkoCtx.fill();
    plinkoCtx.restore();
  }
  return board;
}

// binomial random walk: at each of the 12 rows the ball bounces left(0)
// or right(1) off a peg with 50/50 odds, landing in slot = sum of rights.
function plinkoDrop(onSettled){
  const betInput = document.getElementById("plinkoBet");
  const bet = Math.floor(Number(betInput.value));
  if(!bet || bet<1){ toast("❌ Enter a valid bet"); return false; }
  if(STATE.money < bet){ toast("❌ Not enough money"); return false; }
  const risk = document.getElementById("plinkoRisk").value;
  const table = PLINKO_RISK_TABLES[risk];

  STATE.money -= bet;
  STATE.stats.totalSpent += bet;
  updateTopbar();

  const moves = [];
  let slot = 0;
  for(let i=0;i<PLINKO_ROWS;i++){
    const right = Math.random()<0.5 ? 1 : 0;
    moves.push(right);
    slot += right;
  }

  const board = plinkoPegPositions();
  const w = plinkoCanvas.width, h = plinkoCanvas.height;
  const ball = { x:w/2, y:board.marginTop-14 };
  activePlinkoBalls.push(ball);
  let row = 0;
  const rowGap = board.rowGap;

  function stepRow(){
    if(row>=PLINKO_ROWS){
      finishPlinko();
      return;
    }
    const pegs = board.rows[row];
    const cumRight = moves.slice(0,row+1).reduce((a,b)=>a+b,0);
    const targetX = pegs[cumRight].x;
    const targetY = pegs[0].y;
    const startX = ball.x, startY = ball.y;
    const dur = 130;
    const t0 = performance.now();
    function anim(now){
      const t = Math.min(1, (now-t0)/dur);
      ball.x = startX + (targetX-startX)*t;
      ball.y = startY + (targetY-startY)*t + Math.sin(t*Math.PI)*6;
      drawPlinkoBoard(ball);
      if(t<1){ requestAnimationFrame(anim); }
      else { sfx("spin"); row++; stepRow(); }
    }
    requestAnimationFrame(anim);
  }

  function finishPlinko(){
    // settle into the bottom slot
    const slotCount = table.length;
    const usableW = w*0.86;
    const slotW = usableW/slotCount;
    const finalX = (w-usableW)/2 + slotW*(slot+0.5);
    const finalY = h - board.marginBottom*0.4;
    const startX = ball.x, startY = ball.y;
    const dur = 220;
    const t0 = performance.now();
    function anim(now){
      const t = Math.min(1, (now-t0)/dur);
      ball.x = startX + (finalX-startX)*t;
      ball.y = startY + (finalY-startY)*t;
      drawPlinkoBoard(ball);
      if(t<1){ requestAnimationFrame(anim); }
      else {
        settlePlinko();
        // remove the settled ball so balls stop piling up in the bottom slots
        const idx = activePlinkoBalls.indexOf(ball);
        if(idx>=0) activePlinkoBalls.splice(idx,1);
        drawPlinkoBoard(null);
      }
    }
    requestAnimationFrame(anim);
  }

  function settlePlinko(){
    const boost = plinkoBoostMult();
    const mult = table[slot]*boost;
    const payout = Math.round(bet*mult);
    const win = payout >= bet;
    STATE.money += payout;
    STATE.stats.totalEarned += Math.max(0, payout-bet);
    STATE.stats.plinkoDropped = (STATE.stats.plinkoDropped||0)+1;
    if(win) STATE.stats.plinkoWon = (STATE.stats.plinkoWon||0)+1;
    const resultEl = document.getElementById("plinkoResult");
    resultEl.textContent = win
      ? `🎉 Landed ${mult.toFixed(2)}x — won ${formatMoney(payout)}`
      : `💀 Landed ${mult.toFixed(2)}x — only got ${formatMoney(payout)} back`;
    resultEl.className = "game-result " + (win?"win":"lose");
    sfx(win?"win":"lose");
    if(mult>=10){
      burstParticles(ball.x + plinkoCanvas.getBoundingClientRect().left, ball.y + plinkoCanvas.getBoundingClientRect().top, "#f2a93b", 70);
      broadcastRareEvent(`💥 ${STATE.username} hit a ${mult.toFixed(0)}x Plinko drop for ${formatMoney(payout)}!`);
    }
    const slotEls = document.querySelectorAll("#plinkoSlots .plinko-slot");
    if(slotEls[slot]){
      slotEls[slot].classList.add("hit");
      setTimeout(()=>slotEls[slot] && slotEls[slot].classList.remove("hit"), 600);
    }
    updateTopbar();
    checkAchievements();
    saveState(true);
    if(typeof onSettled==="function") onSettled();
  }

  stepRow();
  return true;
}

document.getElementById("plinkoDropBtn").addEventListener("click", ()=>plinkoDrop());
resizePlinkoCanvas();
renderPlinkoSlots();
drawPlinkoBoard(null);

// "Max" toggles a live-sync mode: while active, the bet field is continuously
// kept pinned to the player's current money balance as it changes.
let plinkoAutoMaxActive = false;
let plinkoAutoMaxTimer = null;

function syncPlinkoMax(){
  const betInput = document.getElementById("plinkoBet");
  betInput.value = Math.max(1, Math.floor(STATE.money));
}

document.getElementById("plinkoMaxBtn").addEventListener("click", ()=>{
  const btn = document.getElementById("plinkoMaxBtn");
  const betInput = document.getElementById("plinkoBet");
  plinkoAutoMaxActive = !plinkoAutoMaxActive;
  btn.classList.toggle("active", plinkoAutoMaxActive);
  betInput.disabled = plinkoAutoMaxActive;
  if(plinkoAutoMaxActive){
    syncPlinkoMax();
    plinkoAutoMaxTimer = setInterval(syncPlinkoMax, 200);
  } else if(plinkoAutoMaxTimer){
    clearInterval(plinkoAutoMaxTimer);
    plinkoAutoMaxTimer = null;
  }
});

let plinkoAutoActive = false;
let plinkoAutoTimer = null;

function setPlinkoAutoUI(active){
  const btn = document.getElementById("plinkoAutoBtn");
  const dropBtn = document.getElementById("plinkoDropBtn");
  const maxBtn = document.getElementById("plinkoMaxBtn");
  const countInput = document.getElementById("plinkoAutoCount");
  if(!btn) return;
  btn.textContent = active ? "Stop Auto" : "Auto Drop";
  btn.classList.toggle("danger", active);
  dropBtn.disabled = active;
  maxBtn.disabled = active;
  countInput.disabled = active;
}

function stopPlinkoAuto(reason){
  plinkoAutoActive = false;
  if(plinkoAutoTimer){ clearInterval(plinkoAutoTimer); plinkoAutoTimer = null; }
  setPlinkoAutoUI(false);
  if(reason) toast(reason);
}

document.getElementById("plinkoAutoCount").addEventListener("change", (e)=>{
  let v = Math.floor(Number(e.target.value));
  if(!v || v<1) v = 1;
  if(v>100) v = 100;
  e.target.value = v;
});

document.getElementById("plinkoAutoBtn").addEventListener("click", ()=>{
  if(plinkoAutoActive){
    stopPlinkoAuto();
  } else {
    const countInput = document.getElementById("plinkoAutoCount");
    let rate = Math.floor(Number(countInput.value));
    if(!rate || rate<1) rate = 1;
    if(rate>100) rate = 100;
    countInput.value = rate;

    plinkoAutoActive = true;
    setPlinkoAutoUI(true);

    const intervalMs = 1000/rate;
    plinkoAutoTimer = setInterval(()=>{
      if(!plinkoAutoActive) return;
      const started = plinkoDrop();
      if(started===false){
        stopPlinkoAuto("🛑 Auto Drop stopped — not enough money");
      }
    }, intervalMs);
  }
});

/* ============================================================
   PROFILE
   ============================================================ */
function renderProfile(){
  document.getElementById("usernameInput").value = STATE.username;
  document.getElementById("avatarUrlInput").value = STATE.avatarUrl || "";
  document.getElementById("avatarColorInput").value = STATE.avatarColor;
  const avatar = document.getElementById("profileAvatar");
  if(STATE.avatarUrl){
    avatar.style.background = STATE.avatarColor;
    avatar.innerHTML = `<img src="${STATE.avatarUrl}" alt="" onerror="this.parentElement.textContent='${(STATE.username||"?").charAt(0).toUpperCase()}';">`;
  } else {
    avatar.style.background = STATE.avatarColor;
    avatar.textContent = (STATE.username||"?").charAt(0).toUpperCase();
  }
  renderPinnedGrid();
  renderAchievements();
}

function renderPinnedGrid(){
  const grid = document.getElementById("profilePinnedGrid");
  const items = STATE.pinned.map(u=>STATE.inventory.find(i=>i.uid===u)).filter(Boolean);
  grid.innerHTML = items.map(it=>skinCardHTML(it,{sellable:false})).join("");
}
document.getElementById("profilePinnedGrid").addEventListener("click", e=>{
  if(e.target.classList.contains("pin-star")){
    togglePin(e.target.dataset.uid);
    renderPinnedGrid();
    renderInventory();
    return;
  }
  if(e.target.classList.contains("fav-star")){
    toggleFavorite(e.target.dataset.uid);
    renderPinnedGrid();
    renderInventory();
    return;
  }
  const card = e.target.closest(".skin-card");
  if(card) openItemInspect(card.dataset.uid);
});

document.getElementById("saveProfileBtn").addEventListener("click", ()=>{
  const name = document.getElementById("usernameInput").value.trim();
  STATE.username = name || defaultUsername();
  STATE.avatarColor = document.getElementById("avatarColorInput").value;
  const url = document.getElementById("avatarUrlInput").value.trim();
  STATE.avatarUrl = /^https?:\/\//i.test(url) ? url : "";
  updateTopbar();
  renderProfile();
  toast("👤 Profile saved");
  saveState(true);
  if(window.CloudSync && typeof window.CloudSync.forceSyncNow==="function"){
    window.CloudSync.forceSyncNow();
  }
});

document.getElementById("exportSaveBtn").addEventListener("click", ()=>{
  const data = JSON.stringify(STATE);
  const blob = new Blob([data], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "black-market-cases-save.json";
  a.click();
  URL.revokeObjectURL(url);
  toast("📤 Save exported");
});

document.getElementById("importSaveBtn").addEventListener("click", ()=>{
  document.getElementById("importSaveInput").click();
});
document.getElementById("importSaveInput").addEventListener("change", (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      const parsed = JSON.parse(reader.result);
      if(typeof parsed !== "object" || parsed===null) throw new Error("bad format");
      if(!confirm("Import this save? It will replace your CURRENT progress (local and cloud, if signed in). This cannot be undone.")) return;
      applyImportedState(parsed);
      // an explicit import should push to the cloud right away rather
      // than waiting for the normal throttled auto-sync
      if(window.CloudSync && typeof window.CloudSync.forceSyncNow==="function"){
        window.CloudSync.forceSyncNow();
      }
    }catch(err){
      console.error(err);
      toast("⚠️ That file doesn't look like a valid save");
    }
    e.target.value = "";
  };
  reader.readAsText(file);
});

document.getElementById("resetSaveBtn").addEventListener("click", ()=>{
  if(!confirm("Reset ALL progress? This cannot be undone.")) return;
  STATE = defaultState();
  updateTopbar();
  renderAll();
  saveState(true);
  // Push the reset immediately rather than waiting for the throttled
  // autosave, so the cloud save (the only copy that exists) reflects
  // it right away.
  if(window.CloudSync && typeof window.CloudSync.forceSyncNow==="function"){
    window.CloudSync.forceSyncNow();
  }
  toast("🗑️ Progress reset");
});

/* ============================================================
   ACHIEVEMENTS
   ============================================================ */
function checkAchievements(){
  let newlyUnlocked = [];
  ACHIEVEMENT_DEFS.forEach(a=>{
    if(!STATE.achievementsUnlocked.includes(a.id) && a.check(STATE)){
      STATE.achievementsUnlocked.push(a.id);
      newlyUnlocked.push(a);
    }
  });
  if(newlyUnlocked.length){
    newlyUnlocked.forEach(a=> toast(`🏆 Achievement unlocked: ${a.name}`));
    if(document.getElementById("tab-profile").classList.contains("active")) renderAchievements();
  }
}

function renderAchievements(){
  const grid = document.getElementById("achievementsGrid");
  grid.innerHTML = ACHIEVEMENT_DEFS.map(a=>{
    const unlocked = STATE.achievementsUnlocked.includes(a.id);
    return `
    <div class="achv-card ${unlocked?"unlocked":""}">
      <div class="achv-icon">${a.icon}</div>
      <div>
        <div class="achv-name">${a.name}</div>
        <div class="achv-desc">${a.desc}</div>
      </div>
    </div>`;
  }).join("");
}

/* ============================================================
   STATS
   ============================================================ */
function renderStats(){
  const s = STATE.stats;
  const grid = document.getElementById("statsGrid");
  const invValue = STATE.inventory.reduce((a,b)=>a+b.value,0);
  const cards = [
    ["📦 Cases Opened", s.casesOpened],
    ["🗡️ Knives Found", s.knivesFound],
    ["👑 Exclusives Found", s.exclusivesFound],
    ["💰 Total Earned", formatMoney(s.totalEarned)],
    ["💸 Total Spent", formatMoney(s.totalSpent)],
    ["🎒 Inventory Value", formatMoney(invValue)],
    ["🔄 Trade-Ups", s.tradeUps],
    ["🎰 Jackpots Won", `${s.jackpotsWon} / ${s.jackpotsPlayed}`],
    ["🪙 Coinflips Won", `${s.coinflipsWon} / ${s.coinflipsPlayed}`],
    ["🎡 Roulette Won", `${s.rouletteWon} / ${s.roulettePlayed}`],
    ["📈 Crash Cashouts", `${s.crashesWon} / ${s.crashesPlayed}`],
    ["🟣 Plinko Won", `${s.plinkoWon||0} / ${s.plinkoDropped||0}`],
    ["🏷️ Skins Sold", s.skinsSold],
    ["⭐ Best Drop", s.bestDrop ? s.bestDrop.name : "—"],
  ];
  grid.innerHTML = cards.map(([lbl,val])=>`
    <div class="stat-card"><div class="val">${val}</div><div class="lbl">${lbl}</div></div>
  `).join("");
}

/* ============================================================
   LEADERBOARD (real players, from the public cloud leaderboard)
   ============================================================ */
// Small circular avatar (image if set, else initial-on-color) used in
// the leaderboard rows and the profile-view modal header.
function avatarCircleHTML(profile, size){
  const cls = size==="large" ? "avatar-circle large" : "avatar-circle";
  if(profile.avatarUrl){
    return `<span class="${cls}" style="background:${profile.avatarColor||"#ffb300"}">
      <img src="${profile.avatarUrl}" alt="" onerror="this.parentElement.textContent='${(profile.username||"?").charAt(0).toUpperCase()}';this.parentElement.style.background='${profile.avatarColor||"#ffb300"}';">
    </span>`;
  }
  return `<span class="${cls}" style="background:${profile.avatarColor||"#ffb300"}">${(profile.username||"?").charAt(0).toUpperCase()}</span>`;
}

let leaderboardCache = [];

async function renderLeaderboard(){
  const tbody = document.getElementById("leaderboardBody");
  if(!window.CloudSync || typeof window.CloudSync.fetchLeaderboard!=="function"){
    tbody.innerHTML = `<tr><td colspan="3" class="leaderboard-empty">⚠️ Cloud connection not available — the leaderboard needs an internet connection.</td></tr>`;
    return;
  }
  tbody.innerHTML = `<tr><td colspan="3" class="leaderboard-empty">Loading leaderboard…</td></tr>`;
  let entries;
  try{
    entries = await window.CloudSync.fetchLeaderboard(50);
  }catch(e){
    console.error("Leaderboard fetch failed", e);
    tbody.innerHTML = `<tr><td colspan="3" class="leaderboard-empty">⚠️ Couldn't load the leaderboard — try again shortly.</td></tr>`;
    return;
  }
  leaderboardCache = entries || [];
  if(!leaderboardCache.length){
    tbody.innerHTML = `<tr><td colspan="3" class="leaderboard-empty">No players yet — be the first to appear here!</td></tr>`;
    return;
  }
  const myUid = window.CloudSync.getUser ? (window.CloudSync.getUser()||{}).uid : null;
  tbody.innerHTML = leaderboardCache.map((p,i)=>`
    <tr class="${p.uid===myUid?"you":""}" data-uid="${p.uid}">
      <td>#${i+1}</td>
      <td><span class="lb-player-cell">${avatarCircleHTML(p)}${p.username||defaultUsername()}</span></td>
      <td>${formatMoney(p.netWorth||0)}</td>
    </tr>
  `).join("");
}

document.getElementById("leaderboardBody").addEventListener("click", e=>{
  const row = e.target.closest("tr[data-uid]");
  if(!row) return;
  const profile = leaderboardCache.find(p=>p.uid===row.dataset.uid);
  if(profile) openProfileViewModal(profile);
});

function openProfileViewModal(profile){
  const content = document.getElementById("profileViewContent");
  const pinnedItems = profile.pinnedItems || [];
  content.innerHTML = `
    <div class="profile-view-header">
      ${avatarCircleHTML(profile, "large")}
      <div>
        <div class="profile-view-name">${profile.username||defaultUsername()}</div>
        <div class="profile-view-worth">💰 ${formatMoney(profile.netWorth||0)} net worth</div>
      </div>
    </div>
    <h3>📌 Pinned Items</h3>
    <div class="grid pinned-grid">
      ${pinnedItems.length ? pinnedItems.map(publicPinnedCardHTML).join("") : ""}
    </div>
  `;
  document.getElementById("profileViewModal").classList.remove("hidden");
}
document.getElementById("closeProfileViewBtn").addEventListener("click", ()=>{
  document.getElementById("profileViewModal").classList.add("hidden");
});
document.getElementById("profileViewModal").addEventListener("click", e=>{
  if(e.target.id==="profileViewModal") document.getElementById("profileViewModal").classList.add("hidden");
});

/* ============================================================
   INIT
   ============================================================ */
function renderAll(){
  renderCases();
  renderKnifeCases();
  renderLimitedCases();
  renderVoidCases();
  renderInventory();
  renderTradeup();
  renderUpgrades();
  renderGenerators();
  renderPrestige();
  renderProfile();
  renderStats();
  renderLeaderboard();
  updateTopbar();
}

function init(){
  applyOfflineEarnings();
  renderAll();
  checkAchievements();
  saveState(true);
}
init();

/* ============================================================
   ANIMATED FAVICON — alternates between two icons every 5s
   ============================================================ */
const FAVICON_URLS = [
  "https://avatars.githubusercontent.com/u/283798280?v=4",
  "https://avatars.githubusercontent.com/u/151978475?v=4",
];
(function animateFavicon(){
  const link = document.getElementById("faviconLink");
  if(!link) return;
  let i = 0;
  setInterval(()=>{
    i = (i+1) % FAVICON_URLS.length;
    link.href = FAVICON_URLS[i];
  }, 5000);
})();

// keep the daily-free-case / limited-case countdowns ticking while
// the Cases tab is visible
setInterval(()=>{
  if(document.getElementById("tab-cases").classList.contains("active")){
    renderCases();
    renderLimitedCases();
  }
}, 1000);

// autosave every 15s — schedules a throttled push to Firestore (the
// only save target now that there's no local storage)
setInterval(()=>saveState(true), 15000);
window.addEventListener("beforeunload", ()=>{
  // Best-effort: bypass the normal throttle and fire the Firestore
  // write immediately, since a closing tab won't wait around for it.
  if(window.CloudSync && typeof window.CloudSync.forceSyncNow==="function"){
    window.CloudSync.forceSyncNow();
  } else {
    saveState(true);
  }
});

/* ============================================================
   LOGIN GATE
   Pure-DOM open/close logic that never depends on firebase-sync.js
   having loaded successfully. An account is required to play — the
   gate only closes once firebase-sync.js confirms a signed-in user,
   and reopens (openLoginGate) if that account signs out again, since
   there's no local/guest fallback to keep playing on.
   ============================================================ */
function closeLoginGate(){
  const root = document.getElementById("loginGate");
  if(root) root.classList.add("gate-closed");
}
function openLoginGate(){
  const root = document.getElementById("loginGate");
  if(root) root.classList.remove("gate-closed");
}
function revealLoginGateForm(){
  const loading = document.getElementById("gateLoading");
  const content = document.getElementById("gateContent");
  if(loading) loading.classList.add("hidden");
  if(content) content.classList.remove("hidden");
}
window.closeLoginGate = closeLoginGate;
window.openLoginGate = openLoginGate;
window.revealLoginGateForm = revealLoginGateForm;

// safety net: if firebase-sync.js never loads (blocked CDN, offline,
// ad-blocker) don't leave anyone stuck on a spinner forever — reveal
// the sign-in form so they at least see what's wrong.
setTimeout(revealLoginGateForm, 4000);

/* ============================================================
   SPACEBAR FLASH
   ============================================================ */
(()=>{
  const flashEl = document.createElement("img");
  flashEl.src = "https://cdn.discordapp.com/attachments/1361234857241477131/1541017684508942396/images.jpg?ex=6a8c100e&is=6a8abe8e&hm=f29d1fa08eece3d62b6b2f7009cb5e7d61cd5cc9ac4aa84800ff61be5a858265&";
  Object.assign(flashEl.style, {
    position: "fixed", top: "0", left: "0", width: "100vw", height: "100vh",
    objectFit: "cover", zIndex: "99999", pointerEvents: "none",
    opacity: "0", transition: "none"
  });
  document.body.appendChild(flashEl);

  document.addEventListener("keydown", e => {
    if(e.code === "Space" && e.target === document.body || e.code === "Space" && !["INPUT","TEXTAREA","SELECT"].includes(e.target.tagName)){
      flashEl.style.opacity = "1";
      setTimeout(() => { flashEl.style.opacity = "0"; }, 80);
    }
  });
})();
