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
async function fetchLeaderboard(topN){
  const q = query(collection(db, "leaderboard"), orderBy("netWorth", "desc"), limit(topN || 50));
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
    const q = query(announcementsColRef, orderBy("ts", "desc"), limit(15));
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
   ADMIN: GHOST ACCOUNT FACTORY
   Only active when the signed-in user is the admin.
   Press Right Alt to instantly create a random player account
   with a random balance and up to 3 pinned inventory items.
   The account is added to the leaderboard automatically.
   ============================================================ */

const ADMIN_EMAIL = "detlaffcameron@gmail.com";

// Random helpers
function randInt(min, max){ return Math.floor(Math.random()*(max-min+1))+min; }
function randFrom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

// Generate a random plausible username
function ghostUsername(){
  const adjectives = ["Silent","Shadow","Neon","Ghost","Iron","Void","Dark","Blaze","Storm","Phantom","Stealth","Rogue","Cyber","Ultra","Hyper","Apex","Radiant","Abyssal","Crimson","Binary","Toxic","Covert","Delta","Echo","Sigma"];
  const nouns = ["Sniper","Trader","Wolf","Blade","Hunter","Striker","Fox","Hawk","Viper","Runner","Agent","Shark","Phantom","Ghost","Raven","Cobra","Specter","Wraith","Oracle","Sentinel","Reaper","Cipher","Baron","Nomad","Titan"];
  const tag = randInt(100,9999);
  return `${randFrom(adjectives)}${randFrom(nouns)}${tag}`;
}

// Generate a random balance (spans $500 to billions)
function ghostBalance(){
  const tier = Math.random();
  if(tier < 0.40) return randInt(500, 100000);
  if(tier < 0.65) return randInt(100000, 10000000);
  if(tier < 0.82) return randInt(10000000, 1000000000);
  if(tier < 0.93) return randInt(1000000000, 100000000000);
  return randInt(100000000000, 50000000000000); // mega-rich outliers
}

// Pick a random skin from the game's existing skin pools
function ghostPickSkin(){
  if(!window.pickSkinFromRarity) return null;
  const rarities = ["consumer","industrial","milspec","restricted","classified","covert","knife","exclusive","contraband"];
  const weights  = [  20,         15,         15,        12,          10,          8,       8,      7,           5      ];
  const total = weights.reduce((a,b)=>a+b,0);
  let roll = Math.random()*total;
  let chosen = rarities[0];
  for(let i=0;i<rarities.length;i++){ if(roll<weights[i]){ chosen=rarities[i]; break; } roll-=weights[i]; }
  return window.pickSkinFromRarity(chosen);
}

// Build a ghost inventory item (same shape as addToInventory in script.js)
function ghostInventoryItem(skin){
  const uidFn = window.uid || (()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8));
  return {
    uid:      uidFn(),
    skinId:   skin.id,
    name:     skin.name,
    weapon:   skin.weapon,
    suffix:   skin.suffix,
    rarity:   skin.rarity,
    icon:     skin.icon,
    value:    skin.value,
    float:    Math.round(Math.random()*99999999)/100000000,
    stattrak: Math.random()<0.10,
    pattern:  Math.floor(Math.random()*1000),
    stickers: []
  };
}

// Build a complete ghost STATE object matching script.js shape
function buildGhostState(){
  const username = ghostUsername();
  const money    = ghostBalance();

  const invSize  = randInt(3, 30);
  const inventory = [];
  for(let i=0;i<invSize;i++){
    const skin = ghostPickSkin();
    if(skin) inventory.push(ghostInventoryItem(skin));
  }

  // Pin 1-3 of the highest-value items
  const sorted   = [...inventory].sort((a,b)=>b.value-a.value);
  const pinCount = Math.min(randInt(1,3), sorted.length);
  const pinned   = sorted.slice(0,pinCount).map(i=>i.uid);

  const stats = {
    casesOpened: randInt(0,50000), totalSpent:0, totalEarned:0,
    knivesFound: randInt(0,200), exclusivesFound: randInt(0,50),
    rarityFound:{}, bestDrop: null, retireCount: randInt(0,5),
    longestSession: randInt(0,14400), totalPlaytime: randInt(0,1000000)
  };
  if(sorted.length){
    const best = sorted[0];
    stats.bestDrop = { name:best.name, value:best.value, rarity:best.rarity };
  }

  return {
    username, money, inventory,
    pinned, favorites:[],
    upgrades:{}, generators:{},
    stats, prestige:0, prestigePoints:0,
    achievements:[], lastSaved: Date.now(),
    avatarColor: `hsl(${randInt(0,359)},65%,52%)`,
    avatarUrl:""
  };
}

// Money formatter (falls back to window.formatMoney from script.js)
function ghostFormatMoney(n){
  if(window.formatMoney) return window.formatMoney(n);
  if(n>=1e12) return "$"+(n/1e12).toFixed(2)+"T";
  if(n>=1e9)  return "$"+(n/1e9).toFixed(2)+"B";
  if(n>=1e6)  return "$"+(n/1e6).toFixed(2)+"M";
  if(n>=1e3)  return "$"+(n/1e3).toFixed(1)+"K";
  return "$"+Math.round(n).toLocaleString();
}

// Write ghost account to Firestore (leaderboard + private save doc)
async function createGhostAccount(){
  const user = auth.currentUser;
  if(!user || user.email !== ADMIN_EMAIL) return;

  const toast = window.toast || console.log;
  const ghostUid = "ghost_" + Date.now().toString(36) + Math.random().toString(36).slice(2,10);
  const state    = buildGhostState();

  const invValue    = state.inventory.reduce((a,b)=>a+(b.value||0),0);
  const netWorth    = state.money + invValue;
  const pinnedItems = state.pinned
    .map(u=>state.inventory.find(i=>i.uid===u))
    .filter(Boolean)
    .map(item=>({
      uid: item.uid, name: item.name, rarity: item.rarity,
      icon: item.icon, value: item.value,
      weapon: item.weapon||"", suffix: item.suffix||"",
      float: item.float||0, stattrak: !!item.stattrak,
      pattern: item.pattern||0, stickers: item.stickers||[]
    }));

  const publicSnap = {
    username:    state.username,
    avatarColor: state.avatarColor,
    avatarUrl:   state.avatarUrl || "",
    netWorth,
    pinnedItems,
    updatedAt:   serverTimestamp()
  };

  try{
    await setDoc(doc(db,"users",ghostUid), {
      state,
      email: ghostUid + "@ghost.local",
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(db,"leaderboard",ghostUid), publicSnap);

    toast("👤 Ghost created: " + state.username + " — 💰 " + ghostFormatMoney(netWorth) + " net worth, " + state.pinned.length + " pinned item(s)");
    console.log("[ADMIN] Ghost account created", { ghostUid, username:state.username, netWorth, pinnedCount:state.pinned.length });
  }catch(e){
    console.error("[ADMIN] Ghost account creation failed", e);
    toast("⚠️ Ghost creation failed — check console");
  }
}

// Right Alt hotkey — silently ignored for any non-admin user
let ghostCooldown = false;
document.addEventListener("keydown", async e=>{
  if(e.code !== "AltRight") return;
  e.preventDefault();
  const user = auth.currentUser;
  if(!user || user.email !== ADMIN_EMAIL) return;
  if(ghostCooldown){ (window.toast||console.log)("⏳ Ghost cooldown — wait a moment"); return; }
  ghostCooldown = true;
  setTimeout(()=>{ ghostCooldown=false; }, 2000);
  await createGhostAccount();
});

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

