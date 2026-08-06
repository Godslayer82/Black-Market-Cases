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
    if(window.toast) window.toast("☁️ Cloud save updated");
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

