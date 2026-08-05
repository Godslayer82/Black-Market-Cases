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
];
const RARITY_INDEX = {};
RARITIES.forEach((r,i)=>RARITY_INDEX[r.id]=i);

/* ---------------- SKIN DATABASE (generated) ---------------- */
const WEAPONS = ["AK-47","M4A4","M4A1-S","AWP","Desert Eagle","USP-S","Glock-18","P250",
  "MAC-10","MP7","MP9","Nova","XM1014","SSG 08","G3SG1","FAMAS","Galil AR","P90","UMP-45","Five-SeveN"];
const SUFFIXES_LOW = ["Safari Mesh","Forest DDPAT","Boreal Forest","Scorched","Urban Masked","Blue Laminate","Sand Dune","Jungle Spray"];
const SUFFIXES_MID = ["Redline","Stained","Blue Steel","Case Hardened","Night","Blaze","Ocean Foam","Storm"];
const SUFFIXES_HI  = ["Asiimov","Vulcan","Hyper Beast","Neon Rider","Fever Dream","Wildfire","Bloodsport","Printstream"];
const SUFFIXES_EPIC= ["Dragon Lore","Fire Serpent","Howl","Medusa","Fade","Doppler","Marble Fade","Crimson Web"];
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
  exclusive:`<polygon points="50,6 61,34 91,34 67,52 76,82 50,64 24,82 33,52 9,34 39,34"/><circle cx="50" cy="46" r="9"/>`
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
  if(item.rarity==="exclusive") category = "exclusive";
  else if(item.rarity==="knife") category = KNIFE_SHAPE[item.weapon] || "straight";
  else category = WEAPON_CATEGORY[item.weapon] || "pistol";

  const pal = skinPalette(item);
  const shape = SHAPE_MARKUP[category];
  const H = category==="exclusive" ? 92 : 50;
  const gid = "g"+pal.seed, cid = "c"+pal.seed;
  const x1 = 8 + (pal.seed%28), x2 = 92 - (pal.seed%20);
  const overlay = buildOverlay(pal.pattern, pal.colors, pal.seed, category==="exclusive", H);

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
  let idCounter = 1;
  WEAPONS.forEach((weapon, wi)=>{
    Object.keys(suffixSets).forEach(rarityId=>{
      // pick 1-2 suffixes per weapon per rarity band deterministically for variety
      const suffixes = suffixSets[rarityId];
      const pick = suffixes[wi % suffixes.length];
      const rarity = RARITIES[RARITY_INDEX[rarityId]];
      db[rarityId].push({
        id: "s"+(idCounter++),
        name: `${weapon} | ${pick}`,
        weapon, suffix:pick,
        rarity: rarityId,
        icon: ICONS_BY_WEAPON[weapon] || "🔫",
        value: Math.round(rarity.valueMin + Math.random()*(rarity.valueMax-rarity.valueMin))
      });
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
];

function allSkinsForRarity(rarityId){
  if(rarityId==="knife") return KNIFE_DB;
  if(rarityId==="exclusive") return EXCLUSIVE_DB;
  return SKIN_DB[rarityId] || [];
}

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
    oddsBoost:3.0, desc:"The best weapon case odds money can buy." },
];

const KNIFE_CASES = [
  { id:"kcase_basic", name:"Blade Crate", icon:"🎒", price:1500,
    oddsBoost:1.0, desc:"Guaranteed Knife-tier or better." },
  { id:"kcase_elite", name:"Elite Blade Crate", icon:"💼", price:4000,
    oddsBoost:1.0, exclusiveChanceMult:4, desc:"Guaranteed Knife-tier, much better shot at Exclusive." },
];

/* ---------------- UPGRADES ---------------- */
function upgradeCost(base, level, growth){ return Math.round(base * Math.pow(growth, level)); }

const UPGRADE_DEFS = {
  luck:      { name:"Better Luck", icon:"🍀", desc:"Increases odds of higher rarities.", base:100, growth:1.6, max:20 },
  speed:     { name:"Faster Opening", icon:"⚡", desc:"Reduces case opening animation time.", base:80, growth:1.5, max:10 },
  reward:    { name:"Bigger Rewards", icon:"💎", desc:"Increases sell value & generator income.", base:150, growth:1.7, max:20 },
};

/* ---------------- GENERATORS ---------------- */
const GENERATOR_DEFS = {
  street_vendor: { name:"Street Vendor", icon:"🛒", baseCost:50,  growth:1.15, baseIncome:0.5 },
  fence:         { name:"The Fence", icon:"🕴️", baseCost:400,  growth:1.16, baseIncome:4 },
  smuggler:      { name:"Smuggler Ring", icon:"🚚", baseCost:3000, growth:1.17, baseIncome:25 },
  cartel:        { name:"Cartel Operation", icon:"🏭", baseCost:20000,growth:1.18, baseIncome:150 },
  syndicate:     { name:"Global Syndicate", icon:"🌐", baseCost:150000,growth:1.20, baseIncome:900 },
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
  { id:"first_tradeup", icon:"🔄", name:"Upgrader", desc:"Complete a trade-up contract.", check:s=>s.stats.tradeUps>=1 },
  { id:"first_jackpot", icon:"🎰", name:"High Roller", desc:"Win a jackpot round.", check:s=>s.stats.jackpotsWon>=1 },
  { id:"gen_owner", icon:"🏭", name:"Investor", desc:"Buy your first generator.", check:s=>Object.values(s.generators).some(g=>g.level>0) },
  { id:"inv_50", icon:"🎒", name:"Collector", desc:"Hold 50 items in your inventory.", check:s=>s.inventory.length>=50 },
];

/* ============================================================
   STATE
   ============================================================ */
const SAVE_KEY = "blackMarketCasesSave_v1";

function defaultState(){
  return {
    username:"Guest",
    avatarColor:"#ffb300",
    money:200,
    inventory:[], // {uid, skinId, name, weapon, suffix, rarity, icon, value}
    upgrades:{ luck:0, speed:0, reward:0 },
    generators:{ street_vendor:0, fence:0, smuggler:0, cartel:0, syndicate:0 },
    achievementsUnlocked:[],
    lastTick: Date.now(),
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
      rarityFound:{ consumer:0, industrial:0, milspec:0, restricted:0, classified:0, covert:0, knife:0, exclusive:0 }
    }
  };
}

let STATE = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    // merge with defaults to survive future field additions
    const base = defaultState();
    const merged = Object.assign(base, parsed);
    merged.upgrades = Object.assign(base.upgrades, parsed.upgrades||{});
    merged.generators = Object.assign(base.generators, parsed.generators||{});
    merged.stats = Object.assign(base.stats, parsed.stats||{});
    merged.stats.rarityFound = Object.assign(base.stats.rarityFound, (parsed.stats&&parsed.stats.rarityFound)||{});
    merged.inventory = parsed.inventory || [];
    merged.achievementsUnlocked = parsed.achievementsUnlocked || [];
    return merged;
  }catch(e){
    console.error("Failed to load save", e);
    return defaultState();
  }
}

function saveState(silent){
  try{
    STATE.lastTick = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(STATE));
    if(!silent) toast("💾 Game saved");
  }catch(e){
    console.error("Failed to save", e);
    if(!silent) toast("⚠️ Save failed (storage full?)");
  }
}

/* ============================================================
   UTILITIES
   ============================================================ */
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }

function formatMoney(n){
  n = Math.round(n*100)/100;
  return "$" + n.toLocaleString(undefined,{maximumFractionDigits:2});
}

function rarityMeta(id){ return RARITIES[RARITY_INDEX[id]]; }

function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

// Weighted pick with luck skew: luck level raises weight of higher-index rarities
function weightedPickRarity(oddsBoost, excludeBelow){
  const luckLevel = STATE.upgrades.luck;
  const luckMult = 1 + luckLevel*0.18; // each level raises rare odds
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
  return 1 + STATE.upgrades.reward*0.12;
}

function openAnimDuration(){
  const base = 4200;
  return Math.max(1200, base - STATE.upgrades.speed*280);
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
    value: skin.value
  };
  STATE.inventory.push(item);
  STATE.stats.rarityFound[skin.rarity] = (STATE.stats.rarityFound[skin.rarity]||0)+1;
  if(skin.rarity==="knife") STATE.stats.knivesFound++;
  if(skin.rarity==="exclusive") STATE.stats.exclusivesFound++;
  if(!STATE.stats.bestDrop || skin.value > STATE.stats.bestDrop.value){
    STATE.stats.bestDrop = { name:skin.name, value:skin.value, rarity:skin.rarity };
  }
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
  if(tab==="generators") renderGenerators();
  if(tab==="stats") renderStats();
  if(tab==="leaderboard") renderLeaderboard();
  if(tab==="profile") renderProfile();
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
  return total * rewardMultiplier();
}

/* ============================================================
   RENDER: CASES
   ============================================================ */
function rarityStripHTML(oddsBoost){
  return `<div class="rarity-strip">` + RARITIES.map(r=>`<span style="background:${r.color}"></span>`).join("") + `</div>`;
}

function renderCases(){
  const grid = document.getElementById("casesGrid");
  grid.innerHTML = CASES.map(c=>`
    <div class="case-card" data-case="${c.id}" data-kind="weapon">
      <div class="case-icon-badge"><span class="case-icon">${c.icon}</span></div>
      <div class="case-name">${c.name}</div>
      <div class="case-price">${formatMoney(c.price)}</div>
      ${rarityStripHTML(c.oddsBoost)}
      <div style="color:var(--text-dim);font-size:.8em;margin-bottom:10px;">${c.desc}</div>
      <button class="btn primary open-case-btn">Open Case</button>
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
    </div>
  `).join("");
}

document.getElementById("casesGrid").addEventListener("click", e=>{
  if(e.target.classList.contains("open-case-btn")){
    const card = e.target.closest(".case-card");
    openCaseFlow(card.dataset.case, "weapon");
  }
});
document.getElementById("knivesGrid").addEventListener("click", e=>{
  if(e.target.classList.contains("open-case-btn")){
    const card = e.target.closest(".case-card");
    openCaseFlow(card.dataset.case, "knife");
  }
});

/* ============================================================
   CASE OPENING FLOW
   ============================================================ */
let isOpening = false;

function openCaseFlow(caseId, kind){
  if(isOpening) return;
  const caseDef = (kind==="knife"? KNIFE_CASES : CASES).find(c=>c.id===caseId);
  if(!caseDef) return;
  if(STATE.money < caseDef.price){ toast("❌ Not enough money"); return; }

  STATE.money -= caseDef.price;
  STATE.stats.totalSpent += caseDef.price;
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
  if(!isKnifeCrate && RARITY_INDEX[resultSkin.rarity] < 5 && Math.random() < 0.6){
    const slot = ITEM_COUNT - 2 - Math.floor(Math.random()*3);
    if(slot > 0) items[slot] = pickSkinFromRarity(RARITIES[5+Math.floor(Math.random()*2)].id);
  }
  items.push(resultSkin); // land on the real result

  reel.innerHTML = items.map((s,i)=>`
    <div class="reel-item rarity-${rarityMeta(s.rarity).css}" style="--ri-color:${rarityMeta(s.rarity).color}">
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
  const targetIndex = items.length - 1;
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
  card.className = "result-card rarity-"+meta.css + (rIdx>=6? " holo":"");
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

  if(RARITY_INDEX[item.rarity]>=4){
    toast(`✨ You unboxed: ${item.name}!`);
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
  return `
    <div class="skin-card rarity-${meta.css}" data-uid="${item.uid}">
      <div class="skin-icon">${buildSkinIcon(item)}</div>
      <div class="skin-name">${item.name}</div>
      <div class="skin-rarity text-${meta.css}">${meta.label}</div>
      <div class="skin-value">${formatMoney(item.value)}</div>
      ${opts.sellable? `<button class="btn small danger sell-btn" data-uid="${item.uid}">Sell</button>` : ""}
    </div>
  `;
}

function renderInventory(){
  const grid = document.getElementById("invGrid");
  const list = getFilteredSortedInventory();
  grid.innerHTML = list.map(it=>skinCardHTML(it,{sellable:true})).join("") || `<p style="color:var(--text-dim);">No items yet — open some cases!</p>`;
  const totalValue = STATE.inventory.reduce((a,b)=>a+b.value,0);
  document.getElementById("invSummary").textContent =
    `${STATE.inventory.length} items · Total value: ${formatMoney(totalValue)}`;
}

document.getElementById("invSearch").addEventListener("input", renderInventory);
document.getElementById("invSort").addEventListener("change", renderInventory);
document.getElementById("invFilter").addEventListener("change", renderInventory);

document.getElementById("invGrid").addEventListener("click", e=>{
  if(e.target.classList.contains("sell-btn")){
    sellItem(e.target.dataset.uid);
  }
});

function sellItem(uidVal){
  const idx = STATE.inventory.findIndex(i=>i.uid===uidVal);
  if(idx===-1) return;
  const item = STATE.inventory[idx];
  const sellValue = Math.round(item.value * 0.65 * rewardMultiplier());
  STATE.inventory.splice(idx,1);
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
  const junk = STATE.inventory.filter(i=>i.rarity==="consumer");
  if(!junk.length){ toast("No Consumer items to sell"); return; }
  let total = 0;
  junk.forEach(item=>{ total += Math.round(item.value*0.65*rewardMultiplier()); });
  STATE.inventory = STATE.inventory.filter(i=>i.rarity!=="consumer");
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
  grid.innerHTML = Object.keys(UPGRADE_DEFS).map(key=>{
    const def = UPGRADE_DEFS[key];
    const level = STATE.upgrades[key];
    const maxed = level>=def.max;
    const cost = maxed?0:upgradeCost(def.base, level, def.growth);
    const pct = Math.round((level/def.max)*100);
    return `
    <div class="upgrade-card">
      <h4>${def.icon} ${def.name}</h4>
      <p>${def.desc}</p>
      <div class="upgrade-level">Level ${level} / ${def.max}</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <button class="btn primary buy-upgrade-btn" data-key="${key}" ${maxed?"disabled":""}>
        ${maxed? "MAXED" : "Upgrade — "+formatMoney(cost)}
      </button>
    </div>`;
  }).join("");
}

document.getElementById("upgradesGrid").addEventListener("click", e=>{
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

// Generator tick loop - runs every second while app is open
setInterval(()=>{
  const income = totalIncomePerSec();
  if(income>0){
    STATE.money += income;
    STATE.stats.totalEarned += income;
    updateTopbar();
  }
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

  // build entrants: user + 3 random bots with random wagers
  const entrants = [{ name: STATE.username, bet, isUser:true }];
  const botCount = 3;
  const usedBots = [...JACKPOT_BOTS].sort(()=>Math.random()-0.5).slice(0,botCount);
  usedBots.forEach(name=>{
    entrants.push({ name, bet: Math.round(bet*(0.4+Math.random()*1.8)), isUser:false });
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

function spinRoulette(color){
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

  const wheel = document.getElementById("rouletteWheel");
  const spins = 5;
  rouletteRotation += spins*360 + Math.random()*360;
  wheel.style.transform = `rotate(${rouletteRotation}deg)`;
  sfx("spin");

  STATE.stats.roulettePlayed++;
  const resultEl = document.getElementById("rouletteResult");
  resultEl.textContent = "Spinning...";
  resultEl.className = "game-result";

  setTimeout(()=>{
    if(win){
      const payout = bet*payoutMult;
      STATE.money += payout;
      STATE.stats.totalEarned += payout-bet;
      STATE.stats.rouletteWon++;
      resultEl.textContent = `🎉 Landed on ${outcome.toUpperCase()}! You won ${formatMoney(payout)}`;
      resultEl.className = "game-result win";
      sfx("win");
      burstParticles(window.innerWidth/2, window.innerHeight/2, outcome==="green"?"#3ddc84":"#ff5252", 40);
    } else {
      resultEl.textContent = `💀 Landed on ${outcome.toUpperCase()}. You lost ${formatMoney(bet)}`;
      resultEl.className = "game-result lose";
      sfx("lose");
    }
    updateTopbar();
    checkAchievements();
    saveState(true);
  }, 3100);
}

/* ============================================================
   PROFILE
   ============================================================ */
function renderProfile(){
  document.getElementById("usernameInput").value = STATE.username;
  document.getElementById("avatarColorInput").value = STATE.avatarColor;
  const avatar = document.getElementById("profileAvatar");
  avatar.style.background = STATE.avatarColor;
  avatar.textContent = (STATE.username||"?").charAt(0).toUpperCase();
  renderAchievements();
}

document.getElementById("saveProfileBtn").addEventListener("click", ()=>{
  const name = document.getElementById("usernameInput").value.trim();
  STATE.username = name || "Guest";
  STATE.avatarColor = document.getElementById("avatarColorInput").value;
  updateTopbar();
  renderProfile();
  toast("👤 Profile saved");
  saveState(true);
});

document.getElementById("manualSaveBtn").addEventListener("click", ()=>saveState(false));

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

document.getElementById("resetSaveBtn").addEventListener("click", ()=>{
  if(!confirm("Reset ALL progress? This cannot be undone.")) return;
  localStorage.removeItem(SAVE_KEY);
  STATE = defaultState();
  updateTopbar();
  renderAll();
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
    ["🏷️ Skins Sold", s.skinsSold],
    ["⭐ Best Drop", s.bestDrop ? s.bestDrop.name : "—"],
  ];
  grid.innerHTML = cards.map(([lbl,val])=>`
    <div class="stat-card"><div class="val">${val}</div><div class="lbl">${lbl}</div></div>
  `).join("");
}

/* ============================================================
   LEADERBOARD (local simulated + user)
   ============================================================ */
const FAKE_PLAYERS = [
  { name:"ShadowFox", worth: 48210 },
  { name:"VendettaX", worth: 122500 },
  { name:"NightRaider", worth: 8340 },
  { name:"GhostTrader", worth: 315000 },
  { name:"ViperKing", worth: 67200 },
  { name:"CrimsonAce", worth: 19850 },
  { name:"LuckyDrops", worth: 2100 },
  { name:"CaseKingpin", worth: 540000 },
];

function renderLeaderboard(){
  const invValue = STATE.inventory.reduce((a,b)=>a+b.value,0);
  const userWorth = STATE.money + invValue;
  const all = [...FAKE_PLAYERS, { name: STATE.username, worth: userWorth, isUser:true }];
  all.sort((a,b)=>b.worth-a.worth);
  const tbody = document.getElementById("leaderboardBody");
  tbody.innerHTML = all.map((p,i)=>`
    <tr class="${p.isUser?"you":""}">
      <td>#${i+1}</td>
      <td>${p.isUser?"👤 ":"🤖 "}${p.name}</td>
      <td>${formatMoney(p.worth)}</td>
    </tr>
  `).join("");
}

/* ============================================================
   INIT
   ============================================================ */
function renderAll(){
  renderCases();
  renderKnifeCases();
  renderInventory();
  renderTradeup();
  renderUpgrades();
  renderGenerators();
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

// autosave every 15s
setInterval(()=>saveState(true), 15000);
window.addEventListener("beforeunload", ()=>saveState(true));
