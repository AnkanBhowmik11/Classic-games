let STORE = { progress: {}, sessions: {}, settings: { dailyLimit: 60 } };
let DB = null;
let AUTH = null;
let USER = null;

// 🔴 1. PASTE YOUR FIREBASE CONFIG OBJECT HERE 🔴
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDia3aIuryb7TPCArmOnzkv9xC-RkY35uI",
  authDomain: "classic-games-97507.firebaseapp.com",
  projectId: "classic-games-97507",
  storageBucket: "classic-games-97507.firebasestorage.app",
  messagingSenderId: "1031541838766",
  appId: "1:1031541838766:web:ec92d906b61d2e8cbfae3f",
  measurementId: "G-WKHR87QFWE"
};

function initCommon() {
  loadLocalStore();
  startSessionTracker();
  if (FIREBASE_CONFIG.apiKey) {
      initFirebase();
      const authBtn = document.getElementById('authBtn');
      // Let Firebase onAuthStateChanged handle the button text
  } else {
      const authBtn = document.getElementById('authBtn');
      if(authBtn) {
        authBtn.innerText = "Setup DB First";
        authBtn.onclick = () => alert("Please open the html in a text editor and paste your Firebase config into the FIREBASE_CONFIG object.");
      }
  }
}

function loadLocalStore() {
  const raw = localStorage.getItem('classic_store');
  if (raw) STORE = JSON.parse(raw);
  if (!STORE.progress) STORE.progress = {};
  if (!STORE.sessions) STORE.sessions = {};
  if (!STORE.settings) STORE.settings = { dailyLimit: 60 };
}

function saveLocalStore() {
  localStorage.setItem('classic_store', JSON.stringify(STORE));
}

// ── Firebase ──
function initFirebase() {
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  AUTH = firebase.auth();
  DB = firebase.firestore();

  AUTH.onAuthStateChanged(user => {
    USER = user;
    const authBtn = document.getElementById('authBtn');
    if (user) {
      if(authBtn) {
        authBtn.innerText = "Profile";
        authBtn.classList.add('active');
      }
      DB.collection('users').doc(user.uid).collection('profile').doc('meta').get().then(doc => {
        if (doc.exists && document.getElementById('authDisplayName')) {
          document.getElementById('authDisplayName').innerText = doc.data().displayName;
        }
      });
      syncDown();
      closeAuthModal();
    } else {
      if(authBtn) {
        authBtn.innerText = "Sign In";
        authBtn.classList.remove('active');
      }
    }
  });
}

async function syncDown() {
  if (!USER) return;
  const doc = await DB.collection('users').doc(USER.uid).collection('data').doc('save').get();
  if (doc.exists) {
    const data = doc.data();
    // Smart merge progress (keep highest stars)
    if (data.progress) {
      for (const gameKey in data.progress) {
        if (data.progress[gameKey].stars !== undefined) {
           // Legacy flat structure
           if (!STORE.progress[gameKey] || data.progress[gameKey].stars > (STORE.progress[gameKey].stars || 0)) {
               STORE.progress[gameKey] = data.progress[gameKey];
           }
        } else {
           // Nested structure (e.g. data.progress.zip)
           if (!STORE.progress[gameKey]) STORE.progress[gameKey] = {};
           for (const lvl in data.progress[gameKey]) {
             if (!STORE.progress[gameKey][lvl] || data.progress[gameKey][lvl].stars > (STORE.progress[gameKey][lvl].stars || 0)) {
               STORE.progress[gameKey][lvl] = data.progress[gameKey][lvl];
             }
           }
        }
      }
    }
    if (data.sessions) {
      for (const d in data.sessions) {
        STORE.sessions[d] = Math.max(STORE.sessions[d] || 0, data.sessions[d]);
      }
    }
    if (data.settings) STORE.settings = { ...STORE.settings, ...data.settings };
    
    saveLocalStore();
    syncUp(); // Push merged progress back
    
    // Trigger UI updates if they exist on the current page
    if (typeof renderLevelSelect === 'function') renderLevelSelect();
    if (typeof renderWeeklyChart === 'function') renderWeeklyChart();
    updateProfileUI();
  }
}

async function syncUp() {
  if (!USER) return;
  try {
    await DB.collection('users').doc(USER.uid).collection('data').doc('save').set({
      progress: STORE.progress,
      sessions: STORE.sessions,
      settings: STORE.settings
    }, { merge: true });
  } catch(e) { console.error('Sync Error', e); }
}

function updateProfileUI() {
  const profileStars = document.getElementById('profileStars');
  if(!profileStars) return;
  
  let totalStars = 0;
  for (const gameKey in STORE.progress) {
    if (STORE.progress[gameKey].stars !== undefined) {
       totalStars += (STORE.progress[gameKey].stars || 0);
    } else {
       totalStars += Object.values(STORE.progress[gameKey]).reduce((sum, p) => sum + (p.stars || 0), 0);
    }
  }
  
  profileStars.innerText = totalStars;
  document.getElementById('dailyLimitInput').value = STORE.settings.dailyLimit || 60;
}

function saveDailyLimit() {
  const input = document.getElementById('dailyLimitInput');
  if(!input) return;
  const val = parseInt(input.value);
  if (val && val > 0) {
    STORE.settings.dailyLimit = val;
    saveLocalStore();
    syncUp();
    if (typeof renderWeeklyChart === 'function') renderWeeklyChart();
    
    // Check if we are now under the limit and can unfreeze
    const todayStr = getTodayDate();
    const tmins = Math.floor((STORE.sessions[todayStr]||0)/60);
    if (tmins < STORE.settings.dailyLimit) {
      const overlay = document.getElementById('timeLimitOverlay');
      if(overlay) overlay.classList.remove('active');
      if(typeof GAME !== 'undefined') GAME.frozen = false;
    }
  }
}

// ── Auth Modal ──
let authMode = 'signin';
function openAuthModal() {
  updateProfileUI();
  const modal = document.getElementById('authModal');
  if(!modal) return;
  modal.classList.add('active');
  if (USER) {
    document.getElementById('authLoggedOut').style.display = 'none';
    document.getElementById('authLoggedIn').style.display = 'block';
  } else {
    document.getElementById('authLoggedOut').style.display = 'block';
    document.getElementById('authLoggedIn').style.display = 'none';
    switchAuthTab('signin');
  }
}

function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if(modal) modal.classList.remove('active');
}

function switchAuthTab(mode) {
  authMode = mode;
  document.getElementById('tabSignIn').classList.toggle('active', mode === 'signin');
  document.getElementById('tabCreate').classList.toggle('active', mode === 'create');
  document.getElementById('createFields').style.display = mode === 'create' ? 'block' : 'none';
  document.getElementById('authActionBtn').innerText = mode === 'create' ? 'Create Account' : 'Sign In';
  document.getElementById('authError').innerText = "";
}

async function submitAuth() {
  const email = document.getElementById('authEmail').value;
  const pass = document.getElementById('authPass').value;
  const name = document.getElementById('authName') ? document.getElementById('authName').value : "Player";
  const errEl = document.getElementById('authError');
  errEl.innerText = "";
  
  if (!email || !pass) return errEl.innerText = "Fill all fields.";
  
  try {
    if (authMode === 'create') {
      try {
        const cred = await AUTH.createUserWithEmailAndPassword(email, pass);
        await DB.collection('users').doc(cred.user.uid).collection('profile').doc('meta').set({
          displayName: name, email: email, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        syncUp();
      } catch(e) {
        if (e.code === 'auth/email-already-in-use') {
          await AUTH.signInWithEmailAndPassword(email, pass);
        } else {
          throw e;
        }
      }
    } else {
      await AUTH.signInWithEmailAndPassword(email, pass);
    }
    closeAuthModal();
  } catch(e) {
    if (e.code === 'auth/wrong-password') errEl.innerText = "Incorrect password.";
    else errEl.innerText = e.message;
  }
}

function signOut() {
  if(AUTH) AUTH.signOut();
  closeAuthModal();
}

// ── Session Tracking ──
function getTodayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function startSessionTracker() {
  let lastTick = Date.now();
  let lastSync = Date.now();
  setInterval(() => {
    if (document.hidden) { lastTick = Date.now(); return; }
    const now = Date.now();
    const diff = now - lastTick;
    lastTick = now;
    if (diff > 5000) return; // ignore large jumps
    
    const today = getTodayDate();
    if (!STORE.sessions[today]) STORE.sessions[today] = 0;
    STORE.sessions[today] += diff / 1000;
    saveLocalStore();
    
    if (now - lastSync > 30000) {
      if (typeof syncUp === 'function') syncUp();
      lastSync = now;
    }
    
    const mins = Math.floor(STORE.sessions[today] / 60);
    if(typeof updateTodayPie === 'function') updateTodayPie(mins);
    
    // Check limit
    const limit = STORE.settings.dailyLimit || 60;
    if (mins >= limit && limit > 0) {
      const overlay = document.getElementById('timeLimitOverlay');
      if (overlay && !overlay.classList.contains('active')) {
        const disp = document.getElementById('limitDisplay');
        if(disp) disp.innerText = limit;
        overlay.classList.add('active');
      }
      if(typeof GAME !== 'undefined') GAME.frozen = true;
    }
  }, 1000);
  
  // Throttle sync to every minute
  setInterval(() => syncUp(), 60000);
}
