/* ============================================================
   BLACK MARKET CASES — CLOUD SYNC
   Firebase Auth (email/password) + Firestore cloud save backend.

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
      their OWN save document, e.g.:

        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{uid} {
              allow read, write: if request.auth != null && request.auth.uid == uid;
            }
          }
        }

      Without rule #2, anyone could read or overwrite anyone else's
      save data.
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
  serverTimestamp
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

/* ---------------- throttled auto-sync ---------------- */
let cloudPushTimer = null;
const CLOUD_PUSH_MIN_INTERVAL_MS = 20000;

function scheduleCloudPush(){
  if(!auth.currentUser) return;
  if(cloudPushTimer) return; // already scheduled
  cloudPushTimer = setTimeout(async ()=>{
    cloudPushTimer = null;
    try{
      await pushStateToCloud(auth.currentUser.uid);
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
    await pushStateToCloud(auth.currentUser.uid);
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

async function handleSignIn(){
  const email = (els.email.value||"").trim();
  const password = els.password.value||"";
  if(!email || !password){ setStatus("Enter an email and password", true); return; }
  try{
    setBusy(true);
    setStatus("Signing in…");
    pendingExplicitAuth = true;
    await signInWithEmailAndPassword(auth, email, password);
  }catch(e){
    pendingExplicitAuth = false;
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
    pendingExplicitAuth = true;
    await createUserWithEmailAndPassword(auth, email, password);
  }catch(e){
    pendingExplicitAuth = false;
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
    await sendPasswordResetEmail(auth, email);
    setStatus("📧 Password reset email sent");
  }catch(err){
    console.error(err);
    setStatus(friendlyAuthError(err), true);
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
    return;
  }
  renderLoggedIn(user);
  els.password && (els.password.value = "");

  const isExplicit = pendingExplicitAuth;
  pendingExplicitAuth = false;

  try{
    setStatus("☁️ Checking cloud save…");
    const cloudState = await pullStateFromCloud(user.uid);

    if(!cloudState){
      // Brand-new account, or an existing account with no cloud save
      // yet — treat local progress (guest play, if any) as the seed.
      await pushStateToCloud(user.uid);
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
        setStatus("☁️ Cloud save loaded");
        if(window.toast) window.toast("☁️ Cloud save loaded");
      } else {
        await pushStateToCloud(user.uid);
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

/* ---------------- expose the hook points script.js calls ---------------- */
window.CloudSync = {
  onLocalSave: scheduleCloudPush,
  forceSyncNow: forceSyncNow,
  getUser: ()=> auth.currentUser,
};
