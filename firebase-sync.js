/* ============================================================
   BLACK MARKET CASES — CLOUD SYNC
   Firebase Auth (email/password) + Firestore cloud save backend.
   An account is REQUIRED to play — there is no guest mode. The
   login gate (in script.js) only closes once onAuthStateChanged
   below fires with a signed-in user.

   This file is loaded as a <script type="module"> AFTER script.js,
   so everything script.js defines at the top level (STATE, saveState,
   applyImportedState, toast, updateTopbar, renderAll, ...)
   is already available here as ordinary global identifiers — no
   special wiring needed on the script.js side beyond the small
   window.CloudSync hook points it already calls.

   IMPORTANT — before you publish this:
   1. In the Firebase console, enable the "Email/Password" sign-in
      provider under Authentication → Sign-in method.
   2. Deploy the rules in firestore.rules (next to this file) with
      `firebase deploy --only firestore:rules`, or paste its contents
      into the Firebase console under Firestore Database → Rules.
      Without published rules, Firestore denies everything by default
      — that's what causes "Missing or insufficient permissions" on
      cloud sync / the leaderboard. The rules let people read/write
      only their OWN private save doc, and only write (never read
      others') their own PUBLIC leaderboard/profile doc — that
      collection is intentionally readable by any signed-in player
      since it powers the leaderboard and other players' profile
      views. It only ever contains the small denormalized snapshot
      from getPublicProfileSnapshot() (username, avatar, net worth,
      up to 3 pinned items), never the full save.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBB1BnVB4vhEPj48O1LtjpPi6qXPcLF57c",
  authDomain: "case-662d7.firebaseapp.com",
  projectId: "case-662d7",
  storageBucket: "case-662d7.firebasestorage.app",
  messagingSenderId: "951994499147",
  appId: "1:951994499147:web:ad4ce6de7663e70d780dce",
  measurementId: "G-1YFNHL2D04"
};

const app = initializeApp(firebaseConfig);

// Analytics can fail to load in some contexts (ad blockers, file://,
// unsupported browsers) — never let that break auth/saving.
analyticsIsSupported().then(ok=>{ if(ok) getAnalytics(app); }).catch(()=>{});

const auth = getAuth(app);
const db = getFirestore(app);

/* ---------------- DOM ---------------- */
const $ = id => document.getElementById(id);
const gate = {
  tabSignIn: $("gateTabSignIn"),
  tabSignUp: $("gateTabSignUp"),
  status:    $("gateStatus"),
  email:     $("gateEmail"),
  password:  $("gatePassword"),
  submitBtn: $("gateSubmitBtn"),
  forgotLink:$("gateForgotLink"),
};
let gateMode = "signin"; // or "signup"

function setGateMode(mode){
  gateMode = mode;
  const isSignIn = mode==="signin";
  gate.tabSignIn && gate.tabSignIn.classList.toggle("active", isSignIn);
  gate.tabSignUp && gate.tabSignUp.classList.toggle("active", !isSignIn);
  if(gate.submitBtn) gate.submitBtn.textContent = isSignIn ? "Sign In" : "Create Account";
  setGateStatus("");
}
function setGateStatus(msg, isError){
  if(!gate.status) return;
  gate.status.textContent = msg||"";
  gate.status.classList.toggle("error", !!isError);
}
function setGateBusy(busy){
  [gate.submitBtn, gate.tabSignIn, gate.tabSignUp].forEach(b=>{ if(b) b.disabled = busy; });
}

/* ---------------- Firestore helpers ---------------- */
function userDocRef(uid){
  return doc(db, "users", uid);
}
function leaderboardDocRef(uid){
  return doc(db, "leaderboard", uid);
}
async function pushStateToCloud(uid){
  const snapshot = window.getSaveSnapshot ? window.getSaveSnapshot() : null;
  if(!snapshot) return;
  await setDoc(userDocRef(uid), {
    state: snapshot,
    email: auth.currentUser ? auth.currentUser.email : null,
    updatedAt: serverTimestamp()
  });
}
async function pullStateFromCloud(uid){
  const snap = await getDoc(userDocRef(uid));
  if(!snap.exists()) return null;
  const data = snap.data();
  return data.state || null;
}
// Pushes the small PUBLIC snapshot (username, avatar, net worth, pinned
// items) that powers the leaderboard and other players' profile views.
// Kept separate from the private save doc above.
async function pushPublicProfile(uid){
  const publicSnapshot = window.getPublicProfileSnapshot ? window.getPublicProfileSnapshot() : null;
  if(!publicSnapshot) return;
  await setDoc(leaderboardDocRef(uid), {
    ...publicSnapshot,
    updatedAt: serverTimestamp()
  });
}
async function pushAllToCloud(uid){
  await Promise.all([pushStateToCloud(uid), pushPublicProfile(uid)]);
}
async function _fetchLeaderboard(topN){
  const q = query(collection(db, "leaderboard"), orderBy("netWorth", "desc"), limit(topN || 5000));
  const snap = await getDocs(q);
  const out = [];
  snap.forEach(docSnap=>{
    out.push({ uid: docSnap.id, ...docSnap.data() });
  });
  return out;
}

/* ---------------- global rare-drop announcements ----------------
   Small shared feed: anyone signed in can create an announcement
   doc (never update/delete one — see firestore.rules) and everyone
   signed in can read the collection. Powers the ticker at the top
   of the page for extremely rare drops across ALL players. */
const announcementsColRef = collection(db, "announcements");
async function announceDrop(text){
  if(!auth.currentUser) return;
  await addDoc(announcementsColRef, {
    text,
    uid: auth.currentUser.uid,
    ts: serverTimestamp()
  });
}
let announcementsUnsub = null;
function startAnnouncementsListener(){
  if(announcementsUnsub) return;
  try{
    const q = query(announcementsColRef, orderBy("ts", "desc"), limit(30));
    announcementsUnsub = onSnapshot(q, snap=>{
      const list = [];
      snap.forEach(docSnap=>{
        const d = docSnap.data();
        list.push({ text: d.text, ts: d.ts && d.ts.toMillis ? d.ts.toMillis() : Date.now() });
      });
      if(window.onCloudAnnouncements) window.onCloudAnnouncements(list);
    }, err=>{ console.error("Announcements listener failed", err); });
  }catch(e){ console.error(e); }
}
function stopAnnouncementsListener(){
  if(announcementsUnsub){ announcementsUnsub(); announcementsUnsub = null; }
}

/* ---------------- throttled auto-sync ---------------- */
let cloudPushTimer = null;
const CLOUD_PUSH_MIN_INTERVAL_MS = 20000;

function scheduleCloudPush(){
  if(!auth.currentUser) return;
  if(cloudPushTimer) return; // already scheduled
  cloudPushTimer = setTimeout(async ()=>{
    cloudPushTimer = null;
    try{
      await pushAllToCloud(auth.currentUser.uid);
    }catch(e){
      console.error("Cloud sync failed", e);
    }
  }, CLOUD_PUSH_MIN_INTERVAL_MS);
}

// Still used for the explicit-immediate pushes after a profile save or
// a save import — the Account card (and its manual "Sync Now" button)
// is gone, but those two spots still want the push to happen right
// away instead of waiting for the throttled auto-sync above.
async function forceSyncNow(){
  if(!auth.currentUser){ return; }
  try{
    await pushAllToCloud(auth.currentUser.uid);
    if(window.toast && !window.suppressSaveToast) window.toast("☁️ Cloud save updated");
  }catch(e){
    console.error(e);
    if(window.toast) window.toast("⚠️ Cloud sync failed");
  }
}

/* ---------------- auth actions ---------------- */
// Raw Firebase calls, used by the login-gate form (the only place
// sign-in/sign-up/forgot-password happen — an account is required to
// play, so there's no separate "logged out" form elsewhere).
async function performSignIn(email, password){
  return signInWithEmailAndPassword(auth, email, password);
}
async function performSignUp(email, password){
  return createUserWithEmailAndPassword(auth, email, password);
}
async function performForgotPassword(email){
  return sendPasswordResetEmail(auth, email);
}

/* ----- login-gate form ----- */
async function handleGateSubmit(){
  const email = (gate.email.value||"").trim();
  const password = gate.password.value||"";
  if(!email || !password){ setGateStatus("Enter an email and password", true); return; }
  if(gateMode==="signup" && password.length < 6){ setGateStatus("Password must be at least 6 characters", true); return; }
  try{
    setGateBusy(true);
    setGateStatus(gateMode==="signin" ? "Signing in…" : "Creating account…");
    if(gateMode==="signin") await performSignIn(email, password);
    else await performSignUp(email, password);
    // onAuthStateChanged takes it from here and closes the gate
  }catch(e){
    console.error(e);
    setGateStatus(friendlyAuthError(e), true);
  }finally{
    setGateBusy(false);
  }
}
async function handleGateForgot(e){
  e.preventDefault();
  const email = (gate.email.value||"").trim();
  if(!email){ setGateStatus("Enter your email above first, then click this link", true); return; }
  try{
    await performForgotPassword(email);
    setGateStatus("📧 Password reset email sent");
  }catch(err){
    console.error(err);
    setGateStatus(friendlyAuthError(err), true);
  }
}

function friendlyAuthError(e){
  const code = e && e.code || "";
  const map = {
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/email-already-in-use": "An account with that email already exists — try Sign In instead.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts — please wait a moment and try again.",
    "auth/network-request-failed": "Network error — check your connection.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

/* ---------------- the core sync-on-login flow ---------------- */
// NOTE: play is fully blocked behind the login gate until this fires
// with a signed-in user, and there's no local storage anymore — so
// there is never legitimate "progress on this device" that predates
// a sign-in. The cloud save (or a fresh default state, for a brand
// new account) is always the single source of truth; no merge/
// conflict prompt is needed.
onAuthStateChanged(auth, async (user)=>{
  if(!user){
    // No account signed in (fresh visit, or a sign-out mid-session) —
    // clear whatever was in memory (it belongs to whoever was just
    // signed in, if anyone) and re-block play behind the gate, since
    // there's no local/guest fallback to keep playing on.
    stopAnnouncementsListener();
    if(window.resetToDefaultState) window.resetToDefaultState();
    window.openLoginGate();
    window.revealLoginGateForm();
    return;
  }
  gate.password && (gate.password.value = "");
  window.closeLoginGate();
  startAnnouncementsListener();

  try{
    const cloudState = await pullStateFromCloud(user.uid);

    if(!cloudState){
      // Brand-new account — seed its cloud save from the freshly
      // started game (there's nothing else to pull it from now that
      // there's no local storage).
      // Pre-fill username from the email local-part so new players
      // aren't shown as "Player" until they visit their profile.
      if(user.email && window.STATE){
        const emailLocal = user.email.split("@")[0];
        if(emailLocal && window.STATE.username === "Player"){
          window.STATE.username = emailLocal;
          if(window.updateTopbar) window.updateTopbar();
        }
      }
      await pushAllToCloud(user.uid);
      if(window.toast) window.toast("☁️ Cloud save created");
      return;
    }

    window.applyImportedState(cloudState, { silent:true });
  }catch(e){
    console.error("Cloud sync error", e);
    if(window.toast) window.toast("⚠️ Couldn't reach the cloud save — playing on local progress");
  }
});

/* ============================================================
   ADMIN PANEL — GHOST ACCOUNT FACTORY
   Right Alt opens a floating admin menu (admin only).
   Invisible/silent for every other signed-in user.
   ============================================================ */

const ADMIN_EMAIL   = "detlaffcameron@gmail.com";
const STAGGER_DELAY = 20;  // ms between Firestore writes in bulk mode

// ── Utility helpers ────────────────────────────────────────────────────────
function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
function randFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function ghostFormatMoney(n){
  if(window.formatMoney) return window.formatMoney(n);
  if(n>=1e12) return "$"+(n/1e12).toFixed(2)+"T";
  if(n>=1e9)  return "$"+(n/1e9).toFixed(2)+"B";
  if(n>=1e6)  return "$"+(n/1e6).toFixed(2)+"M";
  if(n>=1e3)  return "$"+(n/1e3).toFixed(1)+"K";
  return "$"+Math.round(n).toLocaleString();
}

// ── Ghost state generators ─────────────────────────────────────────────────
// Maps a ghost's generated username to a thematically matching avatar color
// and emoji icon. Keywords in the name are checked first; if none match we
// derive a deterministic hue from the name's hash so the same username always
// produces the same color.
function ghostAvatarFromName(username) {
  const u = username.toLowerCase();

  // [keyword cluster, hex color, emoji]
  const themes = [
    [["shadow","dark","abyss","night","eclipse","phantom","wraith","specter","noir","obsidian"],
      "#5b21b6", "\u{1F311}"],
    [["fire","flame","blaze","inferno","crimson","blood","rage","wrath","ember","lava","hell","devil"],
      "#dc2626", "\u{1F525}"],
    [["ice","frost","arctic","cryo","frozen","blizzard","snow","winter","cold","glacier","azure"],
      "#0ea5e9", "\u2744\uFE0F"],
    [["hunter","wolf","fox","bear","hawk","eagle","forest","wild","beast","alpha","apex","feral","predator"],
      "#15803d", "\u{1F43A}"],
    [["gold","king","queen","crown","royal","elite","prime","ace","emperor","supreme","lord","sovereign"],
      "#ca8a04", "\u{1F451}"],
    [["cyber","neon","tech","matrix","pixel","digital","byte","glitch","pulse","circuit","code","hack"],
      "#0891b2", "\u26A1"],
    [["death","skull","reaper","grim","dead","grave","cursed","poison","venom","viper","plague","lich"],
      "#374151", "\u{1F480}"],
    [["cosmos","cosmic","star","nova","astro","galaxy","solar","lunar","nebula","orbit","space"],
      "#4338ca", "\u{1F30C}"],
    [["rogue","ninja","blade","dagger","stealth","silent","sneak","strike","thief"],
      "#1e293b", "\u{1F5E1}\uFE0F"],
    [["storm","thunder","lightning","volt","surge","shock"],
      "#7c3aed", "\u26A1"],
    [["player"],
      "#64748b", "\u{1F3AE}"],
  ];

  // Simple deterministic hash from username
  const nameHash = [...username].reduce((h,c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0);
  const absHash  = Math.abs(nameHash);

  // Helper: hex -> hsl string with optional hue jitter
  function hexToHslShifted(hex, jitter) {
    const r=parseInt(hex.slice(1,3),16)/255,
          g=parseInt(hex.slice(3,5),16)/255,
          b=parseInt(hex.slice(5,7),16)/255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
    let h=0;
    if(d){
      if(max===r)      h=((g-b)/d+6)%6;
      else if(max===g) h=(b-r)/d+2;
      else             h=(r-g)/d+4;
    }
    const hDeg = (Math.round(h*60) + jitter + 360) % 360;
    const s    = max===0 ? 0 : Math.round(d/max*100);
    const l    = Math.round((max+min)/2*100);
    return "hsl("+hDeg+","+s+"%,"+l+"%)";
  }

  for (const [keys, hex, emoji] of themes) {
    if (keys.some(k => u.includes(k))) {
      const jitter = (absHash % 21) - 10;   // -10 … +10 deg so siblings differ slightly
      return { avatarColor: hexToHslShifted(hex, jitter), avatarEmoji: emoji };
    }
  }

  // No keyword match — pure hash-based fallback
  const hue  = absHash % 360;
  const sat  = 55 + ((absHash >> 8) % 20);
  const lit  = 42 + ((absHash >> 4) % 14);
  const emojis = ["\u{1F3AF}","\u{1F48E}","\u{1F52E}","\u{1F3B2}","\u{1F0CF}","\u{1F3B0}","\u{1F9FF}","\u2699\uFE0F"];
  return { avatarColor: "hsl("+hue+","+sat+"%,"+lit+"%)", avatarEmoji: emojis[(absHash >> 12) % emojis.length] };
}

function ghostUsername(){
  // 80% chance: just "Player" + numbers (most common game default name)
  if(Math.random() < 0.80){
    return "Player" + randInt(1000, 99999);
  }
  // 5% chance: LazarBeam-inspired username
  if(Math.random() < 0.05){
    const lazerPrefixes = ["Lazar","LazarBeam","Lanan","FreshLazar","FreshBrawler","FreshYT",
      "LazerBeamFan","LazarGang","Lazar_Beam","LazerSkins","LazarSquad","MrFresh","FreshKicks",
      "LazerBoy","LazerFan","FreshMerch","LazarYT","TheLazar","LazerBeamAU","FreshAU"];
    const lazerSuffix = ["","_YT","_AU","_Real","_Fan",""+randInt(1,999),"_Official","_TV","_OG",
      "_G","_Pro","_CSGO","_Cases","_Skins"];
    return randFrom(lazerPrefixes) + randFrom(lazerSuffix);
  }
  // 20% chance: realistic first name + optional last initial or number
  const first = ["James","Liam","Noah","Oliver","Elijah","Lucas","Mason","Ethan","Aiden","Logan",
    "Jackson","Sebastian","Jack","Owen","Samuel","Ryan","Nathan","Adam","Tyler","Brandon",
    "Dylan","Jayden","Kevin","Austin","Zack","Jake","Hunter","Connor","Caleb","Jordan",
    "Emma","Olivia","Ava","Isabella","Sophia","Mia","Charlotte","Amelia","Harper","Evelyn",
    "Abigail","Emily","Ella","Elizabeth","Camila","Luna","Sofia","Avery","Mila","Aria",
    "Alex","Taylor","Morgan","Riley","Casey","Jamie","Skyler","Reese","Avery","Quinn"];
  const last = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson",
    "Martinez","Anderson","Taylor","Thomas","Moore","Jackson","Martin","Lee","White","Harris",
    "Clark","Lewis","Robinson","Walker","Hall","Young","Allen","King","Scott","Green","Baker"];
  const name = randFrom(first);
  const r = Math.random();
  if(r < 0.4)  return name + randFrom(last).charAt(0) + randInt(10,99);   // JamesS42
  if(r < 0.7)  return name + randInt(100,9999);                            // James2847
  return name + randFrom(last);                                             // JamesSmith
}

function ghostBalance(){
  const t = Math.random();
  if(t < 0.40) return randInt(500, 100000);
  if(t < 0.65) return randInt(100000, 10000000);
  if(t < 0.82) return randInt(10000000, 1000000000);
  if(t < 0.93) return randInt(1000000000, 100000000000);
  return randInt(100000000000, 50000000000000);
}

function ghostPickSkin(){
  if(!window.pickSkinFromRarity) return null;
  const pool    = ["consumer","industrial","milspec","restricted","classified","covert","knife","exclusive","contraband"];
  const weights = [20,15,15,12,10,8,8,7,5];
  const total   = weights.reduce((a,b)=>a+b,0);
  let roll = Math.random()*total;
  for(let i=0;i<pool.length;i++){ if(roll<weights[i]) return window.pickSkinFromRarity(pool[i]); roll-=weights[i]; }
  return window.pickSkinFromRarity("consumer");
}

function ghostInventoryItem(skin){
  const uidFn = window.uid || (()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8));
  return {
    uid:uidFn(), skinId:skin.id, name:skin.name, weapon:skin.weapon,
    suffix:skin.suffix, rarity:skin.rarity, icon:skin.icon, value:skin.value,
    float:Math.round(Math.random()*99999999)/100000000,
    stattrak:Math.random()<0.10, pattern:Math.floor(Math.random()*1000), stickers:[]
  };
}

function buildGhostState(){
  const username  = ghostUsername();
  const money     = ghostBalance();
  const inventory = [];
  for(let i=0;i<randInt(3,30);i++){ const s=ghostPickSkin(); if(s) inventory.push(ghostInventoryItem(s)); }
  const sorted   = [...inventory].sort((a,b)=>b.value-a.value);
  const pinned   = sorted.slice(0,Math.min(randInt(1,3),sorted.length)).map(i=>i.uid);
  const stats    = {
    casesOpened:randInt(0,50000), totalSpent:0, totalEarned:0,
    knivesFound:randInt(0,200), exclusivesFound:randInt(0,50),
    rarityFound:{}, bestDrop:sorted[0]?{name:sorted[0].name,value:sorted[0].value,rarity:sorted[0].rarity}:null,
    retireCount:randInt(0,5), longestSession:randInt(0,14400), totalPlaytime:randInt(0,1000000)
  };
  // 30% chance the ghost gets a real generated avatar image via DiceBear.
  // The seed is the username so the same account always gets the same face.
  // We pick from several styles so bots look varied on the leaderboard.
  const ghostAvatarData = ghostAvatarFromName(username);
  const DICEBEAR_STYLES = ["adventurer","avataaars","big-smile","bottts","croodles","fun-emoji","lorelei","micah","miniavs","personas","pixel-art","thumbs"];
  const styleIdx = Math.abs([...username].reduce((h,c)=>(Math.imul(31,h)+c.charCodeAt(0))|0,0)) % DICEBEAR_STYLES.length;
  const ghostAvatarUrl = Math.random() < 0.30
    ? `https://api.dicebear.com/9.x/${DICEBEAR_STYLES[styleIdx]}/svg?seed=${encodeURIComponent(username)}&size=80`
    : "";
  return { username, money, inventory, pinned, favorites:[], upgrades:{}, generators:{},
    stats, prestige:0, prestigePoints:0, achievements:[], lastSaved:Date.now(),
    ...ghostAvatarData, avatarUrl:ghostAvatarUrl };
}

// ── Core ghost writer ──────────────────────────────────────────────────────
async function createGhostAccount({ silent=false }={}){
  const user = auth.currentUser;
  if(!user || user.email!==ADMIN_EMAIL) return;

  const ghostUid    = "ghost_"+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
  const state       = buildGhostState();
  const invValue    = state.inventory.reduce((a,b)=>a+(b.value||0),0);
  const netWorth    = state.money+invValue;
  const pinnedItems = state.pinned
    .map(u=>state.inventory.find(i=>i.uid===u)).filter(Boolean)
    .map(item=>({uid:item.uid,name:item.name,rarity:item.rarity,icon:item.icon,value:item.value,
      weapon:item.weapon||"",suffix:item.suffix||"",float:item.float||0,
      stattrak:!!item.stattrak,pattern:item.pattern||0,stickers:item.stickers||[]}));

  await setDoc(doc(db,"users",ghostUid),{ state, email:ghostUid+"@ghost.local", updatedAt:serverTimestamp() });
  await setDoc(doc(db,"leaderboard",ghostUid),{
    username:state.username, avatarColor:state.avatarColor, avatarUrl:state.avatarUrl||"", avatarEmoji:state.avatarEmoji||"",
    netWorth, pinnedItems, updatedAt:serverTimestamp()
  });

  // Occasionally fire a live-feed announcement so ghost activity shows in the ticker.
  // ~25% chance per ghost, but only for notable net worths to keep it believable.
  if(Math.random() < 0.25 && state.stats.bestDrop) {
    const bd = state.stats.bestDrop;
    const tier = bd.rarity || "covert";
    const tierEmojis = {
      exclusive:"✨", contraband:"☠️", mythical:"🔥", divine:"💫",
      cosmic:"🌌", singularity:"🌀", celestial:"⭐", abyssal:"💀",
      ethereal:"🔮", godlike:"⚡", transcendent:"♾️", eternal:"🌠",
      omniscient:"🧿", covert:"🎯", knife:"🔪"
    };
    const icon = tierEmojis[tier] || "🎲";
    try {
      await addDoc(announcementsColRef, {
        text: `${icon} ${state.username} just unboxed <b>${bd.name}</b> (${tier.charAt(0).toUpperCase()+tier.slice(1)}) worth ${ghostFormatMoney(bd.value)}!`,
        uid: ghostUid,
        ts: serverTimestamp()
      });
    } catch(e) { /* non-critical */ }
  }

  if(!silent && window.toast)
    window.toast(`👤 ${state.username} — 💰 ${ghostFormatMoney(netWorth)}, ${state.pinned.length} pinned`);
  console.log("[ADMIN] Ghost created", ghostUid, state.username, netWorth);
  return { username:state.username, netWorth };
}

// ── Bulk spawner ───────────────────────────────────────────────────────────
let ghostBusy = false;

async function spawnGhosts(count){
  if(ghostBusy) return;
  ghostBusy = true;
  closeAdminPanel();

  const toast = window.toast || console.log;
  let ok=0, fail=0;

  // Live progress bar toast
  const prog = document.createElement("div");
  prog.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
    background:#1d222c;border:1px solid #272c38;border-radius:12px;padding:14px 20px;
    font-size:.88em;color:#eef0f4;z-index:9999;min-width:260px;text-align:center;
    box-shadow:0 10px 30px rgba(0,0,0,.6);`;
  document.body.appendChild(prog);

  const updateProg = (i) => {
    const pct = Math.round((i/count)*100);
    prog.innerHTML = `<div style="margin-bottom:8px">👻 Spawning ghosts… <b>${i}/${count}</b></div>
      <div style="background:#272c38;border-radius:6px;height:6px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:#f2a93b;border-radius:6px;transition:width .2s"></div>
      </div>`;
  };

  updateProg(0);
  for(let i=0;i<count;i++){
    updateProg(i);
    try{ await createGhostAccount({silent:true}); ok++; }
    catch(e){ console.error("[ADMIN] Ghost fail #"+i, e); fail++; }
    if(i<count-1) await new Promise(r=>setTimeout(r,STAGGER_DELAY));
  }

  prog.remove();
  ghostBusy = false;

  toast(fail===0
    ? `✅ Done — ${ok} ghost${ok!==1?"s":""} created`
    : `⚠️ Done — ${ok} ok, ${fail} failed (check console)`);
}

// ── Admin panel UI ─────────────────────────────────────────────────────────
let adminPanelEl = null;

function buildAdminPanel(){
  if(adminPanelEl) return;

  adminPanelEl = document.createElement("div");
  adminPanelEl.id = "adminPanel";
  adminPanelEl.innerHTML = `
    <div id="adminPanelInner">
      <div id="adminPanelHeader">
        <span>⚙️ Admin Panel</span>
        <button id="adminPanelClose" title="Close">✕</button>
      </div>
      <div id="adminPanelBody">
        <p class="admin-hint">Manage ghost accounts on the leaderboard.</p>

        <button class="admin-btn primary" id="adminQuickSpawn">
          👤 Quick Spawn
          <span class="admin-btn-sub">Create 1 random ghost instantly</span>
        </button>

        <div class="admin-divider"></div>

        <label class="admin-label" for="adminBulkInput">Bulk Spawn</label>
        <div class="admin-row">
          <input id="adminBulkInput" type="number" min="1" max="5000" value="20" class="admin-input" placeholder="Count">
          <button class="admin-btn" id="adminBulkSpawn">🚀 Spawn</button>
        </div>
        <p class="admin-hint small">Ghosts are staggered ~80 ms apart to avoid Firestore quota limits.</p>
      </div>
    </div>
  `;
  document.body.appendChild(adminPanelEl);

  document.getElementById("adminPanelClose").addEventListener("click", closeAdminPanel);
  adminPanelEl.addEventListener("click", e=>{ if(e.target===adminPanelEl) closeAdminPanel(); });

  document.getElementById("adminQuickSpawn").addEventListener("click", ()=>{
    if(ghostBusy){ window.toast && window.toast("⏳ Spawn in progress…"); return; }
    closeAdminPanel();
    createGhostAccount({silent:false}).catch(e=>{
      console.error("[ADMIN]",e);
      window.toast && window.toast("⚠️ Ghost creation failed — check console");
    });
  });

  document.getElementById("adminBulkSpawn").addEventListener("click", ()=>{
    if(ghostBusy){ window.toast && window.toast("⏳ Spawn in progress…"); return; }
    const raw = parseInt(document.getElementById("adminBulkInput").value,10);
    const count = isNaN(raw)||raw<1 ? 1 : Math.min(raw,5000);
    spawnGhosts(count);
  });

  // Also allow Enter in the bulk input
  document.getElementById("adminBulkInput").addEventListener("keydown", e=>{
    if(e.key==="Enter") document.getElementById("adminBulkSpawn").click();
  });
}

function openAdminPanel(){
  buildAdminPanel();
  adminPanelEl.classList.add("open");
}
function closeAdminPanel(){
  adminPanelEl && adminPanelEl.classList.remove("open");
}

// Right Alt toggles panel (admin only, silently ignored otherwise)
document.addEventListener("keydown", e=>{
  if(e.code!=="AltRight") return;
  e.preventDefault();
  const user = auth.currentUser;
  if(!user || user.email!==ADMIN_EMAIL) return;
  if(adminPanelEl && adminPanelEl.classList.contains("open")) closeAdminPanel();
  else openAdminPanel();
});

// ── Leaderboard stats bar ──────────────────────────────────────────────────
// Injected above the leaderboard table. Shows total users (leaderboard
// count) and "active players" — a seeded-random value always between
// 8-15% of total, stable between refreshes so it doesn't flicker.
function injectLeaderboardStats(totalUsers){
  let bar = document.getElementById("lbStatsBar");
  if(!bar){
    bar = document.createElement("div");
    bar.id = "lbStatsBar";
    const panel = document.getElementById("tab-leaderboard");
    const table = panel && panel.querySelector(".leaderboard-table");
    if(table) panel.insertBefore(bar, table);
  }
  // Seeded "active" count — floor(total * pct) where pct is stable for
  // this total count so refreshes don't flicker a different number.
  const seed   = totalUsers * 2654435761; // Knuth multiplicative hash
  const pct    = 0.08 + ((seed % 1000) / 1000) * 0.07; // 8% – 15%
  const active = Math.max(1, Math.floor(totalUsers * pct));

  bar.innerHTML = `
    <div class="lb-stat">
      <span class="lb-stat-value">${totalUsers.toLocaleString()}</span>
      <span class="lb-stat-label">Total Players</span>
    </div>
    <div class="lb-stat-divider"></div>
    <div class="lb-stat">
      <span class="lb-stat-value active">${active.toLocaleString()}</span>
      <span class="lb-stat-label">🟢 Active Now</span>
    </div>
  `;
}

// Wrapper: runs the real fetch then updates the stats bar
async function fetchLeaderboard(topN){
  const entries = await _fetchLeaderboard(topN);
  injectLeaderboardStats(entries ? entries.length : 0);
  return entries;
}

/* ---------------- wire up UI ---------------- */
gate.tabSignIn && gate.tabSignIn.addEventListener("click", ()=>setGateMode("signin"));
gate.tabSignUp && gate.tabSignUp.addEventListener("click", ()=>setGateMode("signup"));
gate.submitBtn && gate.submitBtn.addEventListener("click", handleGateSubmit);
gate.forgotLink && gate.forgotLink.addEventListener("click", handleGateForgot);
gate.password && gate.password.addEventListener("keydown", e=>{ if(e.key==="Enter") handleGateSubmit(); });

/* ---------------- expose the hook points script.js calls ---------------- */
window.CloudSync = {
  onLocalSave: scheduleCloudPush,
  forceSyncNow: forceSyncNow,
  fetchLeaderboard: fetchLeaderboard,
  getUser: ()=> auth.currentUser,
  announceDrop: announceDrop,
};
