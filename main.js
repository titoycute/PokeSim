import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { initAuthListeners } from './js/auth.js';
import { initMap, movePlayer } from './js/map.js';
import { loadStarterGrid } from './js/pokemon.js';

window.gameState = {
    user: null,
    playerMon: null,
    currentBattle: null,
    trainerSprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/trainers/1.png"
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists() && userDoc.data().hasStarter) {
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('game-screen').classList.remove('hidden');
            initMap();
        } else {
            document.getElementById('starter-overlay').classList.remove('hidden');
            loadStarterGrid();
        }
    } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('game-screen').classList.add('hidden');
    }
});

// Navigation logic
const switchView = (viewId) => {
    document.querySelectorAll('.sub-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${viewId}`).classList.remove('hidden');
    if (viewId !== 'explore') document.getElementById('battle-area').classList.add('hidden');
};

// Bind Events
document.getElementById('nav-explore').onclick = () => switchView('explore');
document.getElementById('nav-team').onclick = () => switchView('team');
document.getElementById('nav-collection').onclick = () => switchView('collection');
document.getElementById('nav-records').onclick = () => switchView('records');
document.getElementById('btn-logout').onclick = () => signOut(auth);

document.getElementById('move-up').onclick = () => movePlayer(0, -1);
document.getElementById('move-down').onclick = () => movePlayer(0, 1);
document.getElementById('move-left').onclick = () => movePlayer(-1, 0);
document.getElementById('move-right').onclick = () => movePlayer(1, 0);

initAuthListeners();