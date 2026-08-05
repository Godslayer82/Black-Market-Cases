/* ============================================================
   BLACK MARKET CASES — CLOUD SYNC
   Firebase Auth (email/password) + Firestore cloud save backend.
   An account is REQUIRED to play — there is no guest mode. The
   login gate (in script.js) only closes once onAuthStateChanged
   below fires with a signed-in user.

   This file is loaded as a <script type="module"> AFTER script.js,
   so everything script.js defines at the top level (STATE, saveState,
   applyImportedState, toast, updateTopbar, renderAll, SAVE_KEY, ...)
   is already available here as ordinary global identifiers — no
   special wiring needed on the script.js side beyond the small
   window.CloudSync hook points it already calls.

   IMPORTANT — before you publish this:
   1. In the Firebase console, enable the "Email/Password" sign-in
      provider under Authentication → Sign-in method.
   2. Set Firestore security rules so people can only read/write
      their OWN private save document, and only write (never read
      others') their own PUBLIC leaderboard/profile document:

        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{uid} {
              allow read, write: if request.auth != null && request.auth.uid == uid;
            }
            match /leaderboard/{uid} {
              allow read: if request.auth != null;
              allow write: if request.auth != null && request.auth.uid == uid;
            }
          }
        }

      Without rule #2, anyone could read or overwrite anyone else's
      save data. The /leaderboard collection is intentionally public
      (readable by any signed-in user) since it powers the leaderboard
      and other players' profile views — it only ever contains the
      small denormalized snapshot from getPublicProfileSnapshot()
      (username, avatar, net worth, up to 3 pinned items), never the
      full save.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAnalytics, isSupported as analyticsIsSupported } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-analytics.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs
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
const els = {
  status:        $("acctStatus"),
  sub:           $("acctSub"),
  loggedOutForm: $("acctFormLoggedOut"),
  loggedInForm:  $("acctFormLoggedIn"),
  email:         $("acctEmail"),
  password:      $("acctPassword"),
  signInBtn:     $("acctSignInBtn"),
  signUpBtn:     $("acctSignUpBtn"),
  forgotLink:    $("acctForgotLink"),
  signOutBtn:    $("acctSignOutBtn"),
  syncNowBtn:    $("acctSyncNowBtn"),
  loggedInEmail: $("acctLoggedInEmail"),
};
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

function setStatus(msg, isError){
  if(!els.status) return;
  els.status.textContent = msg || "";
  els.status.classList.toggle("error", !!isError);
}
function setBusy(busy){
  [els.signInBtn, els.signUpBtn, els.syncNowBtn, els.signOutBtn].forEach(b=>{
    if(b) b.disabled = busy;
  });
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
      setStatus("☁️ Synced just now");
    }catch(e){
      console.error("Cloud sync failed", e);
      setStatus("⚠️ Cloud sync failed — will retry", true);
    }
  }, CLOUD_PUSH_MIN_INTERVAL_MS);
}

async function forceSyncNow(){
  if(!auth.currentUser){ return; }
  try{
    setBusy(true);
    setStatus("☁️ Syncing…");
    await pushAllToCloud(auth.currentUser.uid);
    setStatus("☁️ Synced just now");
    if(window.toast) window.toast("☁️ Cloud save updated");
  }catch(e){
    console.error(e);
    setStatus("⚠️ Sync failed", true);
    if(window.toast) window.toast("⚠️ Cloud sync failed");
  }finally{
    setBusy(false);
  }
}

/* ---------------- UI state ---------------- */
function renderLoggedOut(){
  if(els.loggedOutForm) els.loggedOutForm.classList.remove("hidden");
  if(els.loggedInForm) els.loggedInForm.classList.add("hidden");
  setStatus("Not signed in — progress is only saved on this device.");
}
function renderLoggedIn(user){
  if(els.loggedOutForm) els.loggedOutForm.classList.add("hidden");
  if(els.loggedInForm) els.loggedInForm.classList.remove("hidden");
  if(els.loggedInEmail) els.loggedInEmail.textContent = user.email;
}

/* ---------------- auth actions ---------------- */
// Distinguishes an explicit "Sign In" / "Create Account" click (where
// we may want to ask about conflicting local vs cloud progress) from
// Firebase silently restoring a previous session on page load (where
// we just want to load the cloud save without interrupting anyone).
let pendingExplicitAuth = false;

// Raw Firebase calls, shared by both the login-gate form and the
// Profile-tab account form. UI concerns (status text, busy state,
// which form to clear) stay with the caller.
async function performSignIn(email, password){
  pendingExplicitAuth = true;
  try{
    await signInWithEmailAndPassword(auth, email, password);
  }catch(e){
    pendingExplicitAuth = false;
    throw e;
  }
}
async function performSignUp(email, password){
  pendingExplicitAuth = true;
  try{
    await createUserWithEmailAndPassword(auth, email, password);
  }catch(e){
    pendingExplicitAuth = false;
    throw e;
  }
}
async function performForgotPassword(email){
  return sendPasswordResetEmail(auth, email);
}

/* ----- Profile-tab account form ----- */
async function handleSignIn(){
  const email = (els.email.value||"").trim();
  const password = els.password.value||"";
  if(!email || !password){ setStatus("Enter an email and password", true); return; }
  try{
    setBusy(true);
    setStatus("Signing in…");
    await performSignIn(email, password);
  }catch(e){
    console.error(e);
    setStatus(friendlyAuthError(e), true);
  }finally{
    setBusy(false);
  }
}
async function handleSignUp(){
  const email = (els.email.value||"").trim();
  const password = els.password.value||"";
  if(!email || !password){ setStatus("Enter an email and password", true); return; }
  if(password.length < 6){ setStatus("Password must be at least 6 characters", true); return; }
  try{
    setBusy(true);
    setStatus("Creating account…");
    await performSignUp(email, password);
  }catch(e){
    console.error(e);
    setStatus(friendlyAuthError(e), true);
  }finally{
    setBusy(false);
  }
}
async function handleSignOut(){
  try{
    await signOut(auth);
    if(window.toast) window.toast("👋 Signed out — you're still saved locally on this device");
  }catch(e){
    console.error(e);
  }
}
async function handleForgotPassword(e){
  e.preventDefault();
  const email = (els.email.value||"").trim();
  if(!email){ setStatus("Enter your email above first, then click this link", true); return; }
  try{
    await performForgotPassword(email);
    setStatus("📧 Password reset email sent");
  }catch(err){
    console.error(err);
    setStatus(friendlyAuthError(err), true);
  }
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
onAuthStateChanged(auth, async (user)=>{
  if(!user){
    renderLoggedOut();
    // We now know for sure there's no session to restore — reveal
    // the gate's sign-in form instead of leaving people on a spinner.
    window.revealLoginGateForm();
    return;
  }
  renderLoggedIn(user);
  els.password && (els.password.value = "");
  gate.password && (gate.password.value = "");
  window.closeLoginGate();

  const isExplicit = pendingExplicitAuth;
  pendingExplicitAuth = false;

  try{
    setStatus("☁️ Checking cloud save…");
    const cloudState = await pullStateFromCloud(user.uid);

    if(!cloudState){
      // Brand-new account, or an existing account with no cloud save
      // yet — seed the cloud from whatever local progress exists.
      await pushAllToCloud(user.uid);
      setStatus("☁️ Cloud save created from your local progress");
      if(window.toast) window.toast("☁️ Cloud backup created");
      return;
    }

    if(isExplicit){
      // A deliberate sign-in action — ask, since the person may be
      // switching devices/accounts and local progress might matter.
      const loadCloud = confirm(
        "A cloud save was found for this account.\n\n" +
        "Press OK to load your cloud save (replaces progress currently on this device).\n" +
        "Press Cancel to keep this device's progress and overwrite the cloud save with it instead."
      );
      if(loadCloud){
        window.applyImportedState(cloudState, { silent:true });
        await pushPublicProfile(user.uid);
        setStatus("☁️ Cloud save loaded");
        if(window.toast) window.toast("☁️ Cloud save loaded");
      } else {
        await pushAllToCloud(user.uid);
        setStatus("☁️ Cloud save overwritten with this device's progress");
        if(window.toast) window.toast("☁️ Cloud save updated");
      }
    } else {
      // Silent session restore (page refresh while already signed
      // in) — the cloud is the source of truth, no interruption.
      window.applyImportedState(cloudState, { silent:true });
      setStatus("☁️ Synced");
    }
  }catch(e){
    console.error("Cloud sync error", e);
    setStatus("⚠️ Couldn't reach the cloud save — playing on local progress", true);
  }
});

/* ---------------- wire up UI ---------------- */
els.signInBtn && els.signInBtn.addEventListener("click", handleSignIn);
els.signUpBtn && els.signUpBtn.addEventListener("click", handleSignUp);
els.signOutBtn && els.signOutBtn.addEventListener("click", handleSignOut);
els.forgotLink && els.forgotLink.addEventListener("click", handleForgotPassword);
els.syncNowBtn && els.syncNowBtn.addEventListener("click", forceSyncNow);

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
};

