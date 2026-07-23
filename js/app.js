import {
  db,
  collection,
  addDoc,
  doc,
  deleteDoc,
  onSnapshot,
  updateDoc,
  writeBatch,
  query,
  orderBy,
  limit,
  arrayUnion,
} from "./firebase.js";
import {
  TMDB_API_KEY,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_PRESET,
} from "./config.js";

const state = {
mainView: localStorage.getItem("allieflix_main_view") || "home",
  categories: [],
  allFilmsMap: {},
  allFilmsFlatCache: [],
  allCategoryListeners: {},
  drawSelectedCats: [],
  librarySelectedCats: [],
  globalSearchTerm: "",
  editingFilm: null,
  currentLibraryView: localStorage.getItem("allieflix_view_mode") || "grid",
  sortMode: localStorage.getItem("allieflix_sort_mode") || "alpha",
  activeProfile: localStorage.getItem("allieflix_active_profile") || "Kathie",
  drawHistory: [],
  pendingImageFile: null,
  pendingImageUrl: "",
  libraryFilter: localStorage.getItem("allieflix_library_filter") || "all",
  lastDrawResult: null,
  cinemaFilter: "all",
  ourFilmsFilter: "all",
  expandedSummaries: {},
  focusedFilm: null,
highlightedMustWatch: null,
editingComments: {},
libraryScrollY: 0,
statsDrilldown: null,
  isDrawing: false,
  lastDrawMode: "all",
  drawRejectedIds: new Set(),
  recentDrawSessionKeys: [],
  duelRound: [],
  duelNextRound: [],
  duelPair: [],
  duelChampion: null,
  duelRoundNumber: 1,
  wrappedYear: Number(localStorage.getItem("allieflix_wrapped_year")) || new Date().getFullYear(),
  pendingPrediction: null,
  pendingTmdbId: null,
  platformRefreshRunning: false,
  platformRefreshScheduled: false,
};

const DRAW_REPEAT_COOLDOWN_MAX = 12;
const PLATFORM_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const PLATFORM_REFRESH_BATCH_SIZE = 30;

  const els = {
    homePage: document.getElementById("homePage"),
    appPage: document.getElementById("appPage"),
    goHomeBtn: document.getElementById("goHomeBtn"),
    toast: document.getElementById("toast"),
    activeProfileSelect: document.getElementById("activeProfileSelect"),
    drawCatsWrap: document.getElementById("drawCatsWrap"),
    libraryCatsWrap: document.getElementById("libraryCatsWrap"),
    filmCategory: document.getElementById("filmCategory"),
    imagePreview: document.getElementById("imagePreview"),
    globalSearchInput: document.getElementById("globalSearchInput"),
clearSearchMiniBtn: document.getElementById("clearSearchMiniBtn"),
searchSuggestionBox: document.getElementById("searchSuggestionBox"),
    filmFormPanel: document.getElementById("filmFormPanel"),
    toggleFilmFormBtn: document.getElementById("toggleFilmFormBtn"),
    filmFormTitle: document.getElementById("filmFormTitle"),
    editBanner: document.getElementById("editBanner"),
    seenKathie: document.getElementById("seenKathie"),
    seenAlyssia: document.getElementById("seenAlyssia"),
    seenBoth: document.getElementById("seenBoth"),
    seenTogether: document.getElementById("seenTogether"),
    sortSelect: document.getElementById("sortSelect"),
    historyList: document.getElementById("historyList"),
    mobileHistoryList: document.getElementById("mobileHistoryList"),
sideStats: document.getElementById("sideStats"),
appSidebar: document.getElementById("appSidebar"),
films: document.getElementById("films"),
    cinemaList: document.getElementById("cinemaList"),
homeCinemaAlerts: document.getElementById("homeCinemaAlerts"),
cinemaAlerts: document.getElementById("cinemaAlerts"),
   categoryFormPanel: document.getElementById("categoryFormPanel"),
categoryManageList: document.getElementById("categoryManageList"),
statsContent: document.getElementById("statsContent"),
ourFilmsList: document.getElementById("ourFilmsList"),
    toggleDrawCatsBtn: document.getElementById("toggleDrawCatsBtn"),
    toggleLibraryCatsBtn: document.getElementById("toggleLibraryCatsBtn"),
    uploadStatus: document.getElementById("uploadStatus"),
    tirageView: document.getElementById("tirageView"),
    ajoutView: document.getElementById("ajoutView"),
    bibliothequeView: document.getElementById("bibliothequeView"),
    cinemaView: document.getElementById("cinemaView"),
    statsView: document.getElementById("statsView"),
    nosfilmsView: document.getElementById("nosfilmsView"),
    drawResultSection: document.getElementById("drawResultSection"),
   filterAllBtn: document.getElementById("filterAllBtn"),
filterUnseenBtn: document.getElementById("filterUnseenBtn"),
filterSeenTogetherBtn: document.getElementById("filterSeenTogetherBtn"),
filterSeenKathieBtn: document.getElementById("filterSeenKathieBtn"),
filterSeenAlyssiaBtn: document.getElementById("filterSeenAlyssiaBtn"),
filterFavoritesBtn: document.getElementById("filterFavoritesBtn"),
filterMustWatchBtn: document.getElementById("filterMustWatchBtn"),
    cinemaAllBtn: document.getElementById("cinemaAllBtn"),
    cinemaUpcomingBtn: document.getElementById("cinemaUpcomingBtn"),
    ourFilmsAllBtn: document.getElementById("ourFilmsAllBtn"),
    ourFilmsHomeBtn: document.getElementById("ourFilmsHomeBtn"),
    ourFilmsCinemaBtn: document.getElementById("ourFilmsCinemaBtn"),
filmTitle: document.getElementById("filmTitle"),
scrollTopBtn: document.getElementById("scrollTopBtn"),
titleSuggestions: document.getElementById("titleSuggestions"),
    homeGreeting: document.getElementById("homeGreeting"),
    homeMustWatchCount: document.getElementById("homeMustWatchCount"),
    homeCinemaCount: document.getElementById("homeCinemaCount"),
    homeTogetherCount: document.getElementById("homeTogetherCount"),
    homeDrawBtn: document.getElementById("homeDrawBtn"),
    homeLibraryBtn: document.getElementById("homeLibraryBtn"),
    topQuickAddBtn: document.getElementById("topQuickAddBtn"),
    mobileHomeBtn: document.getElementById("mobileHomeBtn"),
    mobileMoreBtn: document.getElementById("mobileMoreBtn"),
    moreSheet: document.getElementById("moreSheet"),
    moreSheetBackdrop: document.getElementById("moreSheetBackdrop"),
    closeMoreSheetBtn: document.getElementById("closeMoreSheetBtn"),
    appBootLoader: document.getElementById("appBootLoader"),
    homeMoodBanner: document.getElementById("homeMoodBanner"),
    homeSagaSection: document.getElementById("homeSagaSection"),
    duelView: document.getElementById("duelView"),
    duelArena: document.getElementById("duelArena"),
    duelCategorySelect: document.getElementById("duelCategorySelect"),
    startDuelBtn: document.getElementById("startDuelBtn"),
    duoView: document.getElementById("duoView"),
    duoContent: document.getElementById("duoContent"),
    wrappedView: document.getElementById("wrappedView"),
    wrappedContent: document.getElementById("wrappedContent"),
    wrappedYearSelect: document.getElementById("wrappedYearSelect"),
    challengesView: document.getElementById("challengesView"),
    challengesContent: document.getElementById("challengesContent"),
    installAppBtn: document.getElementById("installAppBtn"),
    predictionBackdrop: document.getElementById("predictionBackdrop"),
    predictionSheet: document.getElementById("predictionSheet"),
    predictionTitle: document.getElementById("predictionTitle"),
    predictionSubtitle: document.getElementById("predictionSubtitle"),
    predictionChoices: document.getElementById("predictionChoices"),
    closePredictionBtn: document.getElementById("closePredictionBtn"),
    predictionLaterBtn: document.getElementById("predictionLaterBtn"),
  };
  els.sortSelect.value = state.sortMode;
  els.activeProfileSelect.value = state.activeProfile;
  document.getElementById("filmAddedBy").value = state.activeProfile;

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#039;");
  }

  let toastTimer = null;
  function showToast(msg, isError = false) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.style.background = isError
      ? "linear-gradient(135deg,#ff7d97,#ffb1c0)"
      : "linear-gradient(135deg,#32d6c6,#7ef6ef)";
    els.toast.style.color = isError ? "#2b0710" : "#042023";
    els.toast.classList.toggle("toast-error", isError);
    els.toast.classList.toggle("toast-success", !isError);
    els.toast.classList.remove("hidden");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.add("hidden"), 2500);
  }

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

  function hideBootLoader() {
    if (!els.appBootLoader || els.appBootLoader.classList.contains("is-ready")) return;
    els.appBootLoader.classList.add("is-ready");
  }

  function formatDate(ms) {
    if (!ms) return "";
    try { return new Date(ms).toLocaleString("fr-FR"); }
    catch { return ""; }
  }

  function formatDateOnly(ms) {
    if (!ms) return "";
    try { return new Date(ms).toLocaleDateString("fr-FR"); }
    catch { return ""; }
  }
function saveDraftFields(){
  const fields = document.querySelectorAll("input, textarea, select");
  const draft = {};

  fields.forEach(el => {
    if (!el.id) return;
    if (el.type === "file") return;

    draft[el.id] = {
      value: el.value,
      checked: el.checked,
      selectionStart: el.selectionStart ?? null,
      selectionEnd: el.selectionEnd ?? null,
      isFocused: document.activeElement === el
    };
  });

  return draft;
}

function restoreDraftFields(draft){
  if (!draft) return;

  Object.entries(draft).forEach(([id, data]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === "file") return;

    if (el.type === "checkbox") {
      el.checked = data.checked;
    } else {
      el.value = data.value;
    }

    if (data.isFocused) {
  el.focus();
  if (data.selectionStart !== null && data.selectionEnd !== null) {
    try {
      el.setSelectionRange(data.selectionStart, data.selectionEnd);
    } catch {}
  }
}
  });
}

function getReleaseCountdown(ms) {
  if (!ms) return "";

  const today = new Date();
  const target = new Date(ms);

  today.setHours(0,0,0,0);
  target.setHours(0,0,0,0);

  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86400000);

   if (diffDays > 1) return `Sortie dans ${diffDays} jours`;
  if (diffDays === 1) return "Sortie demain";
  if (diffDays === 0) return "Sortie aujourd’hui";

  return "";
}
  function parseDateInputToMs(value) {
    if (!value) return null;
    const d = new Date(value + "T12:00:00");
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  }

  function msToDateInput(ms) {
    if (!ms) return "";
    const d = new Date(ms);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function setUploadLoading(isLoading) {
    els.uploadStatus.classList.toggle("hidden", !isLoading);
  }
function resetPageScroll() {
  els.scrollTopBtn?.classList.add("hidden");
  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
}

function closeMoreSheet() {
  els.moreSheet?.classList.add("hidden");
  els.moreSheetBackdrop?.classList.add("hidden");
  document.body.style.overflow = "";
}

let deferredInstallPrompt = null;

function isStandaloneApp() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function isIosBrowser() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent || "");
}

function updateInstallAppButton() {
  if (!els.installAppBtn) return;
  const canSuggestInstall = !isStandaloneApp() && (deferredInstallPrompt || isIosBrowser());
  els.installAppBtn.classList.toggle("hidden", !canSuggestInstall);
}

function setupMobileAppInstall() {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(error => {
        console.warn("Service worker non enregistré", error);
      });
    }, { once:true });
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    updateInstallAppButton();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    updateInstallAppButton();
    closeMoreSheet();
    showToast("AllieFlix est installée sur ton téléphone 📱✨");
  });

  els.installAppBtn?.addEventListener("click", async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      try { await deferredInstallPrompt.userChoice; } catch {}
      deferredInstallPrompt = null;
      updateInstallAppButton();
      return;
    }

    if (isIosBrowser()) {
      showToast("Sur iPhone : Safari → Partager → Sur l’écran d’accueil 📱");
      return;
    }

    showToast("L’installation sera proposée dès que ton navigateur la permet.");
  });

  updateInstallAppButton();
}

const LEGENDARY_RATING = 6;
const MAX_LEGENDARY_PER_PROFILE = 3;
const PREDICTION_CHOICES = [
  { value:0, label:"🤢 0/5", short:"🤢" },
  { value:1, label:"1/5", short:"★" },
  { value:2, label:"2/5", short:"★★" },
  { value:3, label:"3/5", short:"★★★" },
  { value:4, label:"4/5", short:"★★★★" },
  { value:5, label:"5/5", short:"★★★★★" },
  { value:6, label:"LE FILM · 6/5", short:"👑" },
];

function ratingField(person) {
  return person === "Alyssia" ? "ratingAlyssia" : "ratingKathie";
}

function predictionField(person) {
  return person === "Alyssia" ? "predictionAlyssia" : "predictionKathie";
}

function predictionDateField(person) {
  return person === "Alyssia" ? "predictionAlyssiaAtMs" : "predictionKathieAtMs";
}

function getPersonalRating(film, person) {
  return film?.[ratingField(person)] ?? null;
}

function getPrediction(film, person) {
  const value = film?.[predictionField(person)];
  return value === null || value === undefined || value === "" ? null : Number(value);
}

function hasSeenFilm(film, person) {
  return person === "Alyssia"
    ? !!(film?.alyssiaSeen || film?.seenTogether)
    : !!(film?.kathieSeen || film?.seenTogether);
}

function getLegendaryCount(person, excludeId = "") {
  const field = ratingField(person);
  return getAllFilmsFlat().filter(f =>
    f.id !== excludeId && Number(f[field]) === LEGENDARY_RATING
  ).length;
}

function getLegendaryRemaining(person, excludeId = "") {
  return Math.max(0, MAX_LEGENDARY_PER_PROFILE - getLegendaryCount(person, excludeId));
}

function formatPredictionValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  const number = Number(value);
  if (number === LEGENDARY_RATING) return "6/5 · LE FILM";
  if (number === 0) return "🤢 0/5";
  return `${number}/5`;
}

function closePredictionPrompt() {
  state.pendingPrediction = null;
  els.predictionSheet?.classList.add("hidden");
  els.predictionBackdrop?.classList.add("hidden");
  document.body.classList.remove("prediction-sheet-open");
}

function openPredictionPrompt(cat, id, person = state.activeProfile) {
  const film = getFilmByIds(cat, id);
  if (!film) return;

  const safePerson = person === "Alyssia" ? "Alyssia" : "Kathie";
  const actualRating = getPersonalRating(film, safePerson);

  if (actualRating !== null && actualRating !== undefined && actualRating !== "") {
    showToast(`La vraie note de ${safePerson} est déjà enregistrée : la prédiction est verrouillée.`, true);
    return;
  }

  if (hasSeenFilm(film, safePerson)) {
    showToast(`${safePerson} a déjà vu ce film. La prédiction se fait avant la séance 🎯`, true);
    return;
  }

  state.pendingPrediction = { cat:film.cat, id:film.id, person:safePerson };

  if (els.predictionTitle) els.predictionTitle.textContent = `${safePerson}, tu penses lui mettre combien ?`;
  if (els.predictionSubtitle) {
    els.predictionSubtitle.textContent = `${film.title} · ta prédiction restera affichée à côté de ta vraie note après le film.`;
  }

  if (els.predictionChoices) {
    const current = getPrediction(film, safePerson);
    els.predictionChoices.innerHTML = PREDICTION_CHOICES.map(item => `
      <button class="prediction-choice ${current === item.value ? "selected" : ""} ${item.value === LEGENDARY_RATING ? "legendary" : ""}"
        type="button" data-prediction-value="${item.value}" aria-label="${escapeHtml(item.label)}">
        <span>${item.short}</span><small>${escapeHtml(item.label)}</small>
      </button>
    `).join("");

    els.predictionChoices.querySelectorAll("[data-prediction-value]").forEach(button => {
      button.addEventListener("click", () => savePrediction(Number(button.dataset.predictionValue)));
    });
  }

  els.predictionBackdrop?.classList.remove("hidden");
  els.predictionSheet?.classList.remove("hidden");
  document.body.classList.add("prediction-sheet-open");
}

async function savePrediction(value) {
  const pending = state.pendingPrediction;
  if (!pending || !PREDICTION_CHOICES.some(item => item.value === value)) return;

  try {
    await patchFilm(pending.cat, pending.id, {
      [predictionField(pending.person)]: value,
      [predictionDateField(pending.person)]: Date.now()
    });
    closePredictionPrompt();
    showToast(`🎯 Prédiction de ${pending.person} enregistrée : ${formatPredictionValue(value)}`);
  } catch (error) {
    console.error(error);
    showToast("Impossible d’enregistrer la prédiction", true);
  }
}

function renderPredictionSection(film) {
  const profiles = ["Kathie", "Alyssia"];

  return `
    <section class="prediction-panel">
      <div class="memory-head">
        <div><span>🎯 Prédictions avant le film</span><strong>Aviez-vous vu juste ?</strong></div>
      </div>
      <div class="prediction-duo">
        ${profiles.map(person => {
          const prediction = getPrediction(film, person);
          const actual = getPersonalRating(film, person);
          const hasActual = actual !== null && actual !== undefined && actual !== "";
          const canPredict = !hasActual && !hasSeenFilm(film, person);
          const gap = prediction !== null && hasActual ? Math.abs(Number(actual) - Number(prediction)) : null;
          const verdict = gap === null
            ? (prediction !== null ? "Verdict en attente" : "Pas encore de prédiction")
            : gap === 0 ? "Dans le mille ✨"
            : gap <= 1 ? "Presque parfait"
            : `Écart de ${gap} point${gap > 1 ? "s" : ""}`;

          return `<article class="prediction-person ${person === state.activeProfile ? "is-active-profile" : ""}">
            <div class="prediction-person-head">
              <span class="review-avatar ${person.toLowerCase()}">${person[0]}</span>
              <div><strong>${person}</strong><small>${escapeHtml(verdict)}</small></div>
            </div>
            <div class="prediction-score-line">
              <span><small>Prédiction</small><b>${formatPredictionValue(prediction)}</b></span>
              <i>→</i>
              <span><small>Vraie note</small><b>${hasActual ? `${displayRating(actual)}/5` : "?"}</b></span>
            </div>
            ${canPredict ? `<button class="secondary prediction-open-btn" type="button"
              onclick="window.openPredictionPrompt('${film.cat}','${film.id}','${person}')">
              ${prediction === null ? "Faire ma prédiction" : "Changer ma prédiction"}
            </button>` : ""}
          </article>`;
        }).join("")}
      </div>
    </section>`;
}

let historyReady = false;
let restoringHistory = false;

function historySnapshot(view = state.mainView) {
  return {
    allieflix:true,
    view:view || "home",
    focusedFilm:state.focusedFilm ? { ...state.focusedFilm } : null,
  };
}

function syncNavigationHistory(view = state.mainView, { replace = false, guard = false } = {}) {
  if (!historyReady || restoringHistory) return;
  const snapshot = { ...historySnapshot(view), guard };
  const current = history.state;
  const same = current?.allieflix
    && current.view === snapshot.view
    && JSON.stringify(current.focusedFilm || null) === JSON.stringify(snapshot.focusedFilm || null)
    && !!current.guard === !!snapshot.guard;
  if (same) return;
  history[replace ? "replaceState" : "pushState"](snapshot, "", window.location.href);
}

function initMobileNavigationHistory() {
  const initialView = els.homePage && !els.homePage.classList.contains("hidden") ? "home" : (state.mainView || "home");
  state.mainView = initialView;
  history.replaceState({ ...historySnapshot(initialView), guard:false }, "", window.location.href);
  history.pushState({ ...historySnapshot(initialView), guard:true }, "", window.location.href);
  historyReady = true;

  window.addEventListener("popstate", event => {
    if (els.predictionSheet && !els.predictionSheet.classList.contains("hidden")) {
      closePredictionPrompt();
      history.pushState({ ...historySnapshot(), guard:true }, "", window.location.href);
      return;
    }

    if (els.moreSheet && !els.moreSheet.classList.contains("hidden")) {
      closeMoreSheet();
      history.pushState({ ...historySnapshot(), guard:true }, "", window.location.href);
      return;
    }

    const nav = event.state;
    if (!nav?.allieflix) {
      history.pushState({ ...historySnapshot(), guard:true }, "", window.location.href);
      showToast("Retour à l’accueil AllieFlix 🎬");
      return;
    }

    restoringHistory = true;
    state.focusedFilm = nav.focusedFilm || null;
    if (nav.view === "home") showHome();
    else setMainView(nav.view || "home");
    restoringHistory = false;

    if (nav.view === "home" && !nav.guard) {
      history.pushState({ ...historySnapshot("home"), guard:true }, "", window.location.href);
    }
  });
}

function showHome() {
  state.mainView = "home";
  localStorage.setItem("allieflix_main_view", "home");
  closeMoreSheet();
  els.homePage.classList.remove("hidden");
  els.homePage.style.display = "";
  els.appPage.classList.add("hidden");
  els.appPage.style.display = "none";
  document.querySelectorAll(".mobile-nav button").forEach(btn => btn.classList.remove("active"));
  els.mobileHomeBtn?.classList.add("active");
  renderHomeExperience();
  resetPageScroll();
  syncNavigationHistory("home");
}

 function showApp() {
  els.homePage.classList.add("hidden");
  els.homePage.style.display = "none";
  els.appPage.classList.remove("hidden");
  els.appPage.style.display = "";
}

  function getCategoryName(id) {
    return state.categories.find(c => c.id === id)?.name || "Catégorie";
  }


  function rebuildFilmsCache() {
    state.allFilmsFlatCache = Object.values(state.allFilmsMap).flat();
    scheduleStreamingPlatformRefresh();
  }

  function getAllFilmsFlat() {
    return state.allFilmsFlatCache;
  }

  function getFilmByIds(cat, id) {
    const films = getAllFilmsFlat();
    return films.find(f => f.cat === cat && f.id === id)
      || films.find(f => f.id === id)
      || null;
  }

  function shouldAppearInLibrary(film) {
    if (isHomeFilm(film)) return true;
    return isCinemaFilm(film) && (
      film.missed ||
      film.seenTogether ||
      film.kathieSeen ||
      film.alyssiaSeen
    );
  }

  function averageRating(f) {
  const values = [f.ratingKathie, f.ratingAlyssia]
    .filter(v => v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v)));

  const numbers = values.map(v => Number(v));
  return numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null;
}
function displayRating(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (Number(value) === 0) return "🤢";
  return Number(value).toFixed(1);
}

function isZeroRating(value) {
  return value !== null && value !== undefined && value !== "" && Number(value) === 0;
}

  function isCinemaFilm(f) {
    return f.type === "cinema";
  }

  function isActiveCinemaFilm(f) {
    return isCinemaFilm(f) && !f.seenTogether && !f.missed;
  }

  function isHomeFilm(f) {
    return !isCinemaFilm(f);
  }

  function getSearchSuggestions(q){
    const qq = q.trim().toLowerCase();
    if(!qq) return [];
    return getAllFilmsFlat()
      .filter(f => [f.title, f.platform, f.summary, f.trailerUrl, getCategoryName(f.cat)].join(" ").toLowerCase().includes(qq))
      .slice(0,5);
  }
let titleSuggestTimeout = null;

function hideTitleSuggestions() {
  els.titleSuggestions.classList.add("hidden");
  els.titleSuggestions.innerHTML = "";
}

function buildTmdbPosterUrl(path) {
  return path ? `https://image.tmdb.org/t/p/w185${path}` : "";
}

async function searchTmdbTitles(queryText) {
  if (!TMDB_API_KEY) return [];
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&language=fr-FR&query=${encodeURIComponent(queryText)}&page=1&include_adult=false`;
  const res = await fetch(url);
  const data = await res.json();
  return Array.isArray(data.results) ? data.results.slice(0, 6) : [];
}

async function fetchTmdbMovieDetails(movieId) {
  if (!TMDB_API_KEY) return null;

  const [detailsRes, videosRes, watchRes] = await Promise.all([
    fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=fr-FR`),
    fetch(`https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=fr-FR`),
    fetch(`https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`)
  ]);

  const details = await detailsRes.json();
  const videos = await videosRes.json();
  const watchProviders = await watchRes.json();

  return { details, videos, watchProviders };
}

function extractFrenchPlatformName(watchProviders) {
  const fr = watchProviders?.results?.FR;
  if (!fr) return "Indisponible actuellement";

  const streamingProvider =
    fr.flatrate?.[0] ||
    fr.free?.[0] ||
    fr.ads?.[0] ||
    null;

  if (streamingProvider?.provider_name) return streamingProvider.provider_name;

  const rentalProvider = fr.rent?.[0] || null;
  if (rentalProvider?.provider_name) return `Location : ${rentalProvider.provider_name}`;

  const buyProvider = fr.buy?.[0] || null;
  if (buyProvider?.provider_name) return `Achat : ${buyProvider.provider_name}`;

  return "Indisponible actuellement";
}

function extractTrailerUrl(videos) {
  const results = Array.isArray(videos?.results) ? videos.results : [];
  const trailer = results.find(v =>
    v.site === "YouTube" &&
    (v.type === "Trailer" || v.type === "Teaser")
  );
 return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : "";
}

function normalizeTmdbMatchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function pickBestTmdbMatch(results, film) {
  if (!Array.isArray(results) || !results.length) return null;
  const wantedTitle = normalizeTmdbMatchText(film.title);
  const wantedYear = String(film.year || "").trim();

  return results.find(movie => {
    const titleMatches = [movie.title, movie.original_title].some(title => normalizeTmdbMatchText(title) === wantedTitle);
    const yearMatches = !wantedYear || String(movie.release_date || "").slice(0, 4) === wantedYear;
    return titleMatches && yearMatches;
  }) ||
  results.find(movie => String(movie.release_date || "").slice(0, 4) === wantedYear) ||
  results[0];
}

async function resolveTmdbIdForFilm(film) {
  if (film.tmdbId) return Number(film.tmdbId);
  if (!TMDB_API_KEY || !film.title) return null;

  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    language: "fr-FR",
    query: film.title,
    page: "1",
    include_adult: "false"
  });
  if (film.year) params.set("year", String(film.year));

  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params.toString()}`);
  if (!res.ok) throw new Error(`TMDB search failed (${res.status})`);
  const data = await res.json();
  return pickBestTmdbMatch(data.results, film)?.id || null;
}

async function refreshOneStreamingPlatform(film) {
  const checkedAt = Date.now();
  const tmdbId = await resolveTmdbIdForFilm(film);
  const ref = doc(db, "categories", film.cat, "films", film.id);

  if (!tmdbId) {
    await updateDoc(ref, {
      platformCheckedAtMs: checkedAt,
      platformSyncStatus: "tmdb_not_found"
    });
    return false;
  }

  const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${TMDB_API_KEY}`);
  if (!res.ok) throw new Error(`TMDB providers failed (${res.status})`);
  const providers = await res.json();
  const nextPlatform = extractFrenchPlatformName(providers);

  const patch = {
    tmdbId,
    platformCheckedAtMs: checkedAt,
    platformSyncStatus: "ok",
    platformSource: "JustWatch via TMDB"
  };

  if (nextPlatform && nextPlatform !== (film.platform || "")) {
    patch.platform = nextPlatform;
  }

  await updateDoc(ref, patch);
  return Object.prototype.hasOwnProperty.call(patch, "platform");
}

async function refreshStreamingPlatformsInBackground() {
  if (state.platformRefreshRunning || !TMDB_API_KEY) return;

  const now = Date.now();
  const candidates = getAllFilmsFlat()
    .filter(film => isHomeFilm(film))
    .filter(film => !film.platformCheckedAtMs || now - Number(film.platformCheckedAtMs) >= PLATFORM_REFRESH_INTERVAL_MS)
    .sort((a, b) => Number(a.platformCheckedAtMs || 0) - Number(b.platformCheckedAtMs || 0))
    .slice(0, PLATFORM_REFRESH_BATCH_SIZE);

  if (!candidates.length) return;

  state.platformRefreshRunning = true;
  let updatedCount = 0;

  try {
    for (const film of candidates) {
      try {
        if (await refreshOneStreamingPlatform(film)) updatedCount += 1;
      } catch (error) {
        console.warn(`Mise à jour plateforme impossible pour ${film.title}`, error);
      }
      await sleep(90);
    }

    if (updatedCount > 0) {
      showToast(`${updatedCount} plateforme${updatedCount > 1 ? "s" : ""} mise${updatedCount > 1 ? "s" : ""} à jour automatiquement 📺`);
    }
  } finally {
    state.platformRefreshRunning = false;
  }
}

function scheduleStreamingPlatformRefresh() {
  if (state.platformRefreshRunning || state.platformRefreshScheduled || !TMDB_API_KEY) return;
  state.platformRefreshScheduled = true;
  window.setTimeout(() => {
    state.platformRefreshScheduled = false;
    refreshStreamingPlatformsInBackground().catch(error => console.warn("Synchronisation des plateformes interrompue", error));
  }, 2200);
}


function renderTitleSuggestions(results) {
  if (!results.length) {
    hideTitleSuggestions();
    return;
  }

  els.titleSuggestions.innerHTML = results.map(movie => {
    const poster = buildTmdbPosterUrl(movie.poster_path);
    const year = movie.release_date ? movie.release_date.slice(0, 4) : "Année ?";
    return `
      <div class="title-suggestion-item" data-id="${movie.id}">
        ${poster
          ? `<img class="title-suggestion-poster" src="${poster}" alt="${escapeHtml(movie.title)}" />`
          : `<div class="title-suggestion-fallback">Pas d'image</div>`
        }
        <div>
          <div class="title-suggestion-name">${escapeHtml(movie.title || "Sans titre")}</div>
          <div class="title-suggestion-meta">${escapeHtml(year)}</div>
        </div>
      </div>
    `;
  }).join("");

  els.titleSuggestions.classList.remove("hidden");

  els.titleSuggestions.querySelectorAll(".title-suggestion-item").forEach(item => {
    item.addEventListener("click", async () => {
      const movieId = item.dataset.id;
      try {
        const payload = await fetchTmdbMovieDetails(movieId);
        if (!payload?.details) {
          showToast("Impossible de récupérer les infos du film", true);
          return;
        }

        const { details, videos, watchProviders } = payload;
        state.pendingTmdbId = Number(movieId) || null;

        document.getElementById("filmTitle").value = details.title || "";
        document.getElementById("filmSummary").value = details.overview || "";
        document.getElementById("filmYear").value = details.release_date ? details.release_date.slice(0, 4) : "";
        document.getElementById("filmReleaseDate").value = details.release_date || "";

        const platformName = extractFrenchPlatformName(watchProviders);
        if (platformName) {
          document.getElementById("filmPlatform").value = platformName;
        }

        const trailerUrl = extractTrailerUrl(videos);
        if (trailerUrl) {
          document.getElementById("filmTrailerUrl").value = trailerUrl;
        }

        if (details.poster_path) {
          const posterUrl = `https://image.tmdb.org/t/p/w500${details.poster_path}`;
          state.pendingImageFile = null;
          state.pendingImageUrl = posterUrl;
          els.imagePreview.innerHTML = `<img src="${posterUrl}" alt="Prévisualisation" style="width:120px;height:170px;border-radius:18px;object-fit:cover;border:1px solid rgba(255,255,255,.08);" />`;
        }

        hideTitleSuggestions();
        showToast("Film rempli automatiquement ✨");
      } catch (error) {
        console.error(error);
        showToast("Erreur pendant le remplissage auto", true);
      }
    });
  });
}
  function setMainView(view){
if (view === "home") {
  showHome();
  return;
}
state.mainView = view;
localStorage.setItem("allieflix_main_view", view);
closeMoreSheet();
if (view !== "bibliotheque" && view !== "cinema") {
  state.focusedFilm = null;
}
    showApp();
    document.querySelectorAll(".nav-card").forEach(card => {
      card.classList.toggle("active", card.dataset.view === view);
    });
    document.querySelectorAll(".mobile-nav button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mobileView === view);
    });
    els.mobileHomeBtn?.classList.remove("active");
    els.mobileMoreBtn?.classList.toggle("active", ["ajout", "nosfilms", "stats", "challenges", "duel", "duo", "wrapped"].includes(view));
    document.body.dataset.view = view;
    els.tirageView.classList.toggle("hidden", view !== "tirage");
    els.ajoutView.classList.toggle("hidden", view !== "ajout");
    els.bibliothequeView.classList.toggle("hidden", view !== "bibliotheque");
    els.cinemaView.classList.toggle("hidden", view !== "cinema");
    els.statsView.classList.toggle("hidden", view !== "stats");
    els.nosfilmsView.classList.toggle("hidden", view !== "nosfilms");
    els.challengesView?.classList.toggle("hidden", view !== "challenges");
    els.duelView?.classList.toggle("hidden", view !== "duel");
    els.duoView?.classList.toggle("hidden", view !== "duo");
    els.wrappedView?.classList.toggle("hidden", view !== "wrapped");
    els.appPage?.classList.toggle("immersive-view", ["challenges", "duel", "duo", "wrapped"].includes(view));
const isMobile = window.innerWidth <= 980;

if (els.appSidebar) {
  if (isMobile || ["challenges", "duel", "duo", "wrapped"].includes(view)) {
    els.appSidebar.classList.add("hidden");
    els.appSidebar.style.display = "none";
  } else {
    els.appSidebar.classList.remove("hidden");
    els.appSidebar.style.display = "";
  }
}

    renderCurrentMainView();
    resetPageScroll();
    syncNavigationHistory(view);
  }

  function normalizeSeenState({ kathieSeen = false, alyssiaSeen = false, seenTogether = false }) {
    let k = !!kathieSeen;
    let a = !!alyssiaSeen;
    let t = !!seenTogether;
    if (t) { k = true; a = true; }
    const bothSeen = k && a;
    if (!bothSeen) t = false;
    return { kathieSeen:k, alyssiaSeen:a, bothSeen, seenTogether:t };
  }

  function applySeenCheckboxLogic(source = "") {
    if (source === "both" && els.seenBoth.checked) {
      els.seenKathie.checked = true;
      els.seenAlyssia.checked = true;
    }
    if (source === "together" && els.seenTogether.checked) {
      els.seenKathie.checked = true;
      els.seenAlyssia.checked = true;
    }
    const bothSeen = els.seenKathie.checked && els.seenAlyssia.checked;
    els.seenBoth.checked = bothSeen;
    if (!bothSeen) els.seenTogether.checked = false;
  }

  function ensureDefaultSelections() {
    if (!state.categories.length) return;
    if (!state.drawSelectedCats.length) state.drawSelectedCats = state.categories.map(c => c.id);
    if (!state.librarySelectedCats.length) state.librarySelectedCats = state.categories.map(c => c.id);
  }

 function renderStatsCards(targetEl){
  if(!targetEl) return;

  const all = getAllFilmsFlat();
  const kathieAdds = all.filter(f => (f.createdBy || f.addedBy) === "Kathie").length;
  const alyssiaAdds = all.filter(f => (f.createdBy || f.addedBy) === "Alyssia").length;
  const togetherSeen = all.filter(f => f.seenTogether).length;
 const cinemaCount = all.filter(f =>
  isCinemaFilm(f) && !f.seenTogether && !f.missed
).length;
const cinemaSeenTogether = all.filter(f =>
  isCinemaFilm(f) && f.seenTogether
).length;

  targetEl.innerHTML = `
    <div class="stat-card">
      <div class="stat-left"><span class="stat-icon">🎬</span> Ajouts Kathie</div>
      <div class="stat-value">${kathieAdds}</div>
    </div>

    <div class="stat-card">
      <div class="stat-left"><span class="stat-icon">🎬</span> Ajouts Alyssia</div>
      <div class="stat-value">${alyssiaAdds}</div>
    </div>

    <div class="stat-card">
      <div class="stat-left"><span class="stat-icon">👯</span> Vus ensemble</div>
      <div class="stat-value">${togetherSeen}</div>
    </div>
<div class="stat-card">
  <div class="stat-left"><span class="stat-icon">🍿</span> Vus ensemble au ciné</div>
  <div class="stat-value">${cinemaSeenTogether}</div>
</div>

  <div class="stat-card">
  <div class="stat-left"><span class="stat-icon">🍿</span> À voir au cinéma</div>
  <div class="stat-value">${cinemaCount}</div>
</div>
  `;
}


  function getAmbientExperience() {
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();
    const weekday = now.getDay();
    const hour = now.getHours();

    if (month === 9 && day === 31) return { icon:"🎃", title:"Soirée Halloween", text:"Les lumières s’éteignent. Les films d’horreur prennent le contrôle d’AllieFlix." };
    if (month === 11 && [24,25].includes(day)) return { icon:"🎄", title:"Cinéma sous le plaid", text:"Ce soir, le programme officiel autorise les films de Noël, même les vraiment mauvais." };
    if (month === 1 && day === 14) return { icon:"💌", title:"Saint-Valentin sur grand écran", text:"Une romance, un film qui fait pleurer ou un choix totalement chaotique. À vous de jouer." };
    if (month === 3 && day === 4) return { icon:"✨", title:"Votre journée à vous", text:"Une date spéciale mérite peut-être un film qui finira dans votre histoire AllieFlix." };
    if ((weekday === 5 || weekday === 6) && hour >= 17) return { icon:"🍿", title:"Le week-end a officiellement commencé", text:"Le canapé réclame un film. La roulette est prête à prendre une décision à votre place." };
    if (weekday === 0 && hour >= 16) return { icon:"🌙", title:"Dimanche douceur", text:"Le moment parfait pour finir une saga, ressortir un favori ou découvrir quelque chose de nouveau." };
    if (hour >= 21) return { icon:"🌌", title:"Session cinéma nocturne", text:"Les notifications peuvent attendre. AllieFlix a gardé quelques films pour la nuit." };
    return { icon:"🎬", title:`Bienvenue ${state.activeProfile}`, text:"Votre cinéma privé est prêt : un tirage, un duel ou une prochaine sortie ?" };
  }

  function renderAmbientExperience() {
    if (!els.homeMoodBanner) return;
    const mood = getAmbientExperience();
    els.homeMoodBanner.innerHTML = `
      <span class="allie-mood-icon">${mood.icon}</span>
      <div><strong>${escapeHtml(mood.title)}</strong><small>${escapeHtml(mood.text)}</small></div>
      <button type="button" onclick="window.navigateAllieFlix('tirage')">Tirer un film →</button>
    `;
  }

  function normalizeSagaText(value) {
    return String(value || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[’']/g, " ")
      .replace(/[^a-z0-9\s:-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function inferSagaKey(title) {
    const normalized = normalizeSagaText(title);
    if (!normalized) return "";
    const known = [
      "harry potter", "scream", "conjuring", "insidious", "saw", "paranormal activity",
      "destination finale", "final destination", "twilight", "hunger games", "john wick",
      "fast and furious", "mission impossible", "jurassic", "avatar", "dune", "matrix",
      "alien", "predator", "avengers", "iron man", "captain america", "thor", "deadpool",
      "spider man", "guardians of the galaxy", "gardiens de la galaxie", "toy story", "shrek",
      "frozen", "la reine des neiges", "moi moche et mechant", "minions", "creed", "rocky",
      "pirates des caraibes", "le seigneur des anneaux", "lord of the rings", "hobbit"
    ];
    const knownMatch = known.find(key => normalized.includes(key));
    if (knownMatch) return knownMatch;

    let base = normalized.split(/\s[:\-–]\s/)[0]
      .replace(/\b(chapitre|chapter|partie|part|episode|épisode|volume|vol)\s*[0-9ivx]+\b/g, "")
      .replace(/\b[0-9ivx]+\b$/g, "")
      .trim();
    return base.split(" ").length >= 2 ? base : "";
  }

  function getSagaProgress() {
    const groups = new Map();
    getAllFilmsFlat().forEach(film => {
      const key = inferSagaKey(film.title);
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(film);
    });

    return [...groups.entries()]
      .map(([key, films]) => {
        const sorted = [...films].sort((a,b) => (Number(a.year)||9999) - (Number(b.year)||9999) || (a.title||"").localeCompare(b.title||"", "fr"));
        const seen = sorted.filter(f => f.seenTogether || (f.kathieSeen && f.alyssiaSeen));
        const unseen = sorted.filter(f => !(f.seenTogether || (f.kathieSeen && f.alyssiaSeen)));
        return { key, films:sorted, seen, unseen, next:unseen[0] || null };
      })
      .filter(group => group.films.length >= 2 && group.seen.length > 0 && group.unseen.length > 0)
      .sort((a,b) => (b.seen.length / b.films.length) - (a.seen.length / a.films.length));
  }

  function sagaDisplayName(group) {
    const title = group.films[0]?.title || group.key;
    const key = group.key;
    if (["scream","conjuring","insidious","saw","twilight","avatar","dune","matrix","alien","predator","deadpool","shrek","creed","rocky"].includes(key)) {
      return key.replace(/\b\w/g, c => c.toUpperCase());
    }
    return title.split(/\s[:\-–]\s/)[0];
  }

  function renderSagaRail() {
    if (!els.homeSagaSection) return;
    const sagas = getSagaProgress().slice(0,3);
    if (!sagas.length) {
      els.homeSagaSection.innerHTML = "";
      return;
    }
    els.homeSagaSection.innerHTML = `
      <div class="home-section-head">
        <div><span class="section-kicker">▶ Continuer l’aventure</span><h2>Vos sagas en cours</h2></div>
      </div>
      <div class="saga-progress-grid">
        ${sagas.map(group => {
          const percent = Math.round((group.seen.length / group.films.length) * 100);
          const next = group.next;
          return `<button class="saga-progress-card" type="button" onclick="window.openFilmDetails('${next.cat}','${next.id}')">
            <div class="saga-poster-stack">
              ${group.films.slice(0,3).map((f,i) => f.imageUrl ? `<img src="${escapeHtml(f.imageUrl)}" alt="" style="--stack:${i}" loading="lazy" />` : "").join("")}
            </div>
            <div class="saga-progress-copy">
              <span>${escapeHtml(sagaDisplayName(group))}</span>
              <strong>${group.seen.length}/${group.films.length} vus</strong>
              <div class="saga-progress-bar"><i style="width:${percent}%"></i></div>
              <small>Prochain : ${escapeHtml(next.title)}</small>
            </div>
            <b>→</b>
          </button>`;
        }).join("")}
      </div>`;
  }

  function calendarDayKey(ms) {
    if (!ms) return "";
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function currentMonthBounds() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
    return { start, end, label: now.toLocaleDateString("fr-FR", { month:"long", year:"numeric" }) };
  }

  function getMonthlyChallenges() {
    const { start, end, label } = currentMonthBounds();
    const all = getAllFilmsFlat();
    const togetherThisMonth = all.filter(f => {
      const ms = Number(f.seenTogetherAtMs) || 0;
      return f.seenTogether && ms >= start && ms < end;
    });

    const cinemaCount = togetherThisMonth.filter(isCinemaFilm).length;
    const before2000Count = togetherThisMonth.filter(f => {
      const year = Number.parseInt(f.year, 10);
      return Number.isFinite(year) && year < 2000;
    }).length;
    const categoriesCount = new Set(togetherThisMonth.map(f => f.cat).filter(Boolean)).size;
    const horrorCount = togetherThisMonth.filter(f => /horreur|horror/i.test(getCategoryName(f.cat))).length;

    const dayCounts = {};
    togetherThisMonth.forEach(f => {
      const key = calendarDayKey(f.seenTogetherAtMs);
      if (key) dayCounts[key] = (dayCounts[key] || 0) + 1;
    });
    const maxSameDay = Math.max(0, ...Object.values(dayCounts));

    const items = [
      {
        icon:"🍿",
        title:"Trois séances, un mois",
        desc:"Regardez 3 films ensemble ce mois-ci.",
        value:togetherThisMonth.length,
        target:3,
      },
      {
        icon:"🎟️",
        title:"Grand écran",
        desc:"Faites au moins une sortie cinéma ensemble.",
        value:cinemaCount,
        target:1,
      },
      {
        icon:"📼",
        title:"Voyage dans le temps",
        desc:"Regardez ensemble un film sorti avant 2000.",
        value:before2000Count,
        target:1,
      },
      {
        icon:"🎨",
        title:"Changer d’ambiance",
        desc:"Explorez 3 catégories différentes dans le mois.",
        value:categoriesCount,
        target:3,
      },
      {
        icon:"😱",
        title:"Soirée frissons",
        desc:"Regardez au moins un film d’horreur ensemble.",
        value:horrorCount,
        target:1,
      },
      {
        icon:"🌙",
        title:"Double séance",
        desc:"Regardez 2 films ensemble le même jour.",
        value:maxSameDay,
        target:2,
      },
    ].map(item => ({
      ...item,
      complete:item.value >= item.target,
      progress:Math.min(100, Math.round((item.value / item.target) * 100)),
    }));

    return { label, items };
  }

  function renderChallengesPage() {
    if (!els.challengesContent) return;
    const { label, items } = getMonthlyChallenges();
    const completed = items.filter(item => item.complete).length;
    const overall = Math.round(items.reduce((sum, item) => sum + item.progress, 0) / items.length);

    els.challengesContent.innerHTML = `
      <section class="challenge-hero">
        <div class="challenge-month">
          <span class="section-kicker">${escapeHtml(label)}</span>
          <h2>${completed === items.length ? "Mission accomplie ✨" : `${completed}/${items.length} défis terminés`}</h2>
          <p>${completed === items.length ? "Vous avez plié le mois. Le générique peut défiler." : "Tout se met à jour automatiquement quand vous marquez vos films comme vus ensemble."}</p>
        </div>
        <div class="challenge-score" style="--challenge-score:${overall * 3.6}deg">
          <strong>${overall}%</strong><small>du mois</small>
        </div>
      </section>
      <div class="challenge-grid">
        ${items.map(item => `
          <article class="challenge-card ${item.complete ? "is-complete" : ""}">
            <div class="challenge-card-top">
              <span class="challenge-icon">${item.complete ? "✓" : item.icon}</span>
              <span class="challenge-status">${item.complete ? "Terminé" : `${Math.min(item.value,item.target)}/${item.target}`}</span>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.desc)}</p>
            <div class="challenge-progress"><i style="width:${item.progress}%"></i></div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function getAchievements() {
    const all = getAllFilmsFlat();
    const togetherFilms = all.filter(f => f.seenTogether);
    const ratedTogether = all.filter(f =>
      f.ratingKathie !== null && f.ratingKathie !== undefined && f.ratingKathie !== ""
      && f.ratingAlyssia !== null && f.ratingAlyssia !== undefined && f.ratingAlyssia !== ""
    );

    const exactMatches = ratedTogether.filter(f => Number(f.ratingKathie) === Number(f.ratingAlyssia)).length;
    const closeMatches = ratedTogether.filter(f => Math.abs(Number(f.ratingKathie) - Number(f.ratingAlyssia)) <= 1).length;
    const vomits = all.reduce((n,f) => n + (Number(f.ratingKathie) === 0 ? 1 : 0) + (Number(f.ratingAlyssia) === 0 ? 1 : 0), 0);
    const mutualFives = ratedTogether.filter(f => Number(f.ratingKathie) >= 5 && Number(f.ratingAlyssia) >= 5).length;
    const comments = all.reduce((n,f) => n + (Array.isArray(f.comments) ? f.comments.length : 0), 0);
    const horrorTogether = togetherFilms.filter(f => /horreur|horror/i.test(getCategoryName(f.cat))).length;
    const cinemaTogether = togetherFilms.filter(isCinemaFilm).length;
    const together = togetherFilms.length;
    const categoriesTogether = new Set(togetherFilms.map(f => f.cat).filter(Boolean)).size;
    const favorites = all.filter(f => f.favorite).length;
    const classicsBefore2000 = togetherFilms.filter(f => Number.parseInt(f.year, 10) < 2000).length;
    const classicsBefore1980 = togetherFilms.filter(f => Number.parseInt(f.year, 10) < 1980).length;
    const legendaryK = all.filter(f => Number(f.ratingKathie) === LEGENDARY_RATING).length;
    const legendaryA = all.filter(f => Number(f.ratingAlyssia) === LEGENDARY_RATING).length;
    const doubleLegendary = all.filter(f => Number(f.ratingKathie) === LEGENDARY_RATING && Number(f.ratingAlyssia) === LEGENDARY_RATING).length;
    const predictionCount = all.reduce((n,f) =>
      n + (getPrediction(f, "Kathie") !== null ? 1 : 0) + (getPrediction(f, "Alyssia") !== null ? 1 : 0), 0);
    const predictionExact = all.reduce((n,f) => {
      return n + ["Kathie","Alyssia"].reduce((sum, person) => {
        const prediction = getPrediction(f, person);
        const actual = getPersonalRating(f, person);
        return sum + (prediction !== null && actual !== null && actual !== undefined && actual !== "" && Number(prediction) === Number(actual) ? 1 : 0);
      }, 0);
    }, 0);
    const predictionClose = all.reduce((n,f) => {
      return n + ["Kathie","Alyssia"].reduce((sum, person) => {
        const prediction = getPrediction(f, person);
        const actual = getPersonalRating(f, person);
        return sum + (prediction !== null && actual !== null && actual !== undefined && actual !== "" && Math.abs(Number(prediction)-Number(actual)) <= 1 ? 1 : 0);
      }, 0);
    }, 0);

    const dayCounts = {};
    togetherFilms.filter(f => f.seenTogetherAtMs).forEach(f => {
      const key = calendarDayKey(f.seenTogetherAtMs);
      dayCounts[key] = (dayCounts[key] || 0) + 1;
    });
    const marathonMax = Math.max(0, ...Object.values(dayCounts));
    const lateNightFilms = togetherFilms.filter(f => {
      const ms = Number(f.seenTogetherAtMs) || 0;
      if (!ms) return false;
      const hour = new Date(ms).getHours();
      return hour >= 0 && hour < 5;
    }).length;
    const drawCount = Array.isArray(state.drawHistory) ? state.drawHistory.length : 0;
    const duelWins = Object.values(getDuelScores()).reduce((sum,value) => sum + Number(value || 0), 0);
    const challengeCompleted = getMonthlyChallenges().items.filter(item => item.complete).length;

    const list = [
      ["🎬","Premier générique","Voir votre premier film ensemble.",together,1],
      ["🎟️","Premier grand écran","Voir votre premier film ensemble au cinéma.",cinemaTogether,1],
      ["🧠","Même cerveau","Donner exactement la même note à 10 films.",exactMatches,10],
      ["🧬","Cerveaux fusionnés","Donner exactement la même note à 25 films.",exactMatches,25],
      ["🤝","Presque toujours d’accord","Être à un point maximum d’écart sur 50 films.",closeMatches,50],
      ["🍿","Double programme","Voir 2 films ensemble le même jour.",marathonMax,2],
      ["🔥","Marathoniennes","Voir 3 films ensemble le même jour.",marathonMax,3],
      ["🚀","Journée sans fin","Voir 5 films ensemble le même jour.",marathonMax,5],
      ["🌙","Nuit blanche","Regarder 5 films ensemble après minuit.",lateNightFilms,5],
      ["🤢","Aucun respect","Distribuer 10 notes 🤢 à vous deux.",vomits,10],
      ["☠️","Massacre critique","Distribuer 25 notes 🤢 à vous deux.",vomits,25],
      ["❤️","Coup de cœur commun","Mettre toutes les deux au moins 5/5 au même film.",mutualFives,1],
      ["💞","Valeurs sûres","Partager 10 coups de cœur notés au moins 5/5 chacune.",mutualFives,10],
      ["📝","Premières critiques","Écrire 10 commentaires sur vos films.",comments,10],
      ["✍️","Critiques professionnelles","Écrire 50 commentaires sur vos films.",comments,50],
      ["📚","Encyclopédie AllieFlix","Écrire 100 commentaires sur vos films.",comments,100],
      ["😱","Frissons garantis","Voir 10 films d’horreur ensemble.",horrorTogether,10],
      ["🔥","Expertes en frissons","Voir 25 films d’horreur ensemble.",horrorTogether,25],
      ["🎟️","Habituées du grand écran","Voir 10 films ensemble au cinéma.",cinemaTogether,10],
      ["🍿","Reines du cinéma","Voir 25 films ensemble au cinéma.",cinemaTogether,25],
      ["💑","Cinéphiles inséparables","Atteindre 50 films vus ensemble.",together,50],
      ["💯","Cent génériques","Atteindre 100 films vus ensemble.",together,100],
      ["🗃️","Collectionneuses","Ajouter 100 films à AllieFlix.",all.length,100],
      ["🏛️","Archives nationales","Ajouter 250 films à AllieFlix.",all.length,250],
      ["🧭","Exploratrices","Voir ensemble des films de 5 catégories différentes.",categoriesTogether,5],
      ["🌍","Tour du catalogue","Voir ensemble des films de 10 catégories différentes.",categoriesTogether,10],
      ["📼","Nostalgie","Voir 5 films sortis avant 2000.",classicsBefore2000,5],
      ["🕰️","Archéologues du cinéma","Voir 10 films sortis avant 1980.",classicsBefore1980,10],
      ["❤️","Bibliothèque chouchou","Mettre 10 films en favoris.",favorites,10],
      ["💎","Coffre aux trésors","Mettre 25 films en favoris.",favorites,25],
      ["🎯","Je le savais","Faire 5 prédictions avant un film.",predictionCount,5],
      ["🔮","Madame Irma","Faire 25 prédictions avant un film.",predictionCount,25],
      ["✨","Dans le mille","Prédire exactement sa vraie note.",predictionExact,1],
      ["🪄","Oracle du canapé","Prédire exactement 10 vraies notes.",predictionExact,10],
      ["👀","Pas loin du tout","Être à un point maximum de sa prédiction 25 fois.",predictionClose,25],
      ["👑","L’Intouchable","Attribuer une première note « LE FILM ».",legendaryK + legendaryA,1],
      ["🌟","Le Panthéon","Attribuer 3 notes « LE FILM » à vous deux.",legendaryK + legendaryA,3],
      ["👸","Trio sacré","Utiliser les 3 places « LE FILM » d’un même profil.",Math.max(legendaryK,legendaryA),3],
      ["👑","Double couronne","Classer le même film « LE FILM » toutes les deux.",doubleLegendary,1],
      ["🎲","Le hasard fait bien les choses","Accumuler 25 tirages dans l’historique.",drawCount,25],
      ["🥊","Reines du ring","Cumuler 25 victoires dans les duels.",duelWins,25],
      ["🎯","Mois maîtrisé","Terminer les 6 défis du mois.",challengeCompleted,6],
    ];

    return list.map(([icon,title,desc,value,target]) => ({
      icon, title, desc, value, target,
      unlocked:value >= target,
      progress:Math.min(100, Math.round((value / target) * 100))
    }));
  }

  function getTopRatedCategory(person) {
    const field = person === "Kathie" ? "ratingKathie" : "ratingAlyssia";
    const groups = {};
    getAllFilmsFlat().forEach(f => {
      const value = f[field];
      if (value === null || value === undefined || value === "") return;
      const key = getCategoryName(f.cat);
      if (!groups[key]) groups[key] = [];
      groups[key].push(Number(value));
    });
    return Object.entries(groups)
      .filter(([,values]) => values.length >= 2)
      .map(([name,values]) => ({ name, avg:values.reduce((a,b)=>a+b,0)/values.length, count:values.length }))
      .sort((a,b) => b.avg-a.avg || b.count-a.count)[0] || null;
  }

  function renderAchievementsHtml() {
    const achievements = getAchievements();
    const unlocked = achievements.filter(a => a.unlocked).length;
    return `
      <section class="duo-section">
        <div class="home-section-head"><div><span class="section-kicker">🏆 Succès</span><h2>${unlocked}/${achievements.length} débloqués</h2></div></div>
        <div class="achievement-grid">
          ${achievements.map(a => `<article class="achievement-card ${a.unlocked ? "unlocked" : "locked"}">
            <div class="achievement-icon">${a.unlocked ? a.icon : "🔒"}</div>
            <div><strong>${escapeHtml(a.title)}</strong><p>${escapeHtml(a.desc)}</p>
              <div class="achievement-progress"><i style="width:${a.progress}%"></i></div>
              <small>${Math.min(a.value,a.target)}/${a.target}${a.unlocked ? " · Débloqué ✨" : ""}</small>
            </div>
          </article>`).join("")}
        </div>
      </section>`;
  }

  function renderDuoPage() {
    if (!els.duoContent) return;
    const all = getAllFilmsFlat();
    const rated = all.filter(f => f.ratingKathie !== null && f.ratingKathie !== undefined && f.ratingAlyssia !== null && f.ratingAlyssia !== undefined);
    const close = rated.filter(f => Math.abs(Number(f.ratingKathie)-Number(f.ratingAlyssia)) <= 1).length;
    const compatibility = rated.length ? Math.round(close / rated.length * 100) : 0;
    const biggest = [...rated].sort((a,b) => Math.abs(Number(b.ratingKathie)-Number(b.ratingAlyssia)) - Math.abs(Number(a.ratingKathie)-Number(a.ratingAlyssia)))[0] || null;
    const kRatings = all.map(f => f.ratingKathie).filter(v => v !== null && v !== undefined && v !== "").map(Number);
    const aRatings = all.map(f => f.ratingAlyssia).filter(v => v !== null && v !== undefined && v !== "").map(Number);
    const avgK = kRatings.length ? kRatings.reduce((a,b)=>a+b,0)/kRatings.length : 0;
    const avgA = aRatings.length ? aRatings.reduce((a,b)=>a+b,0)/aRatings.length : 0;
    const topK = getTopRatedCategory("Kathie");
    const topA = getTopRatedCategory("Alyssia");
    const vomitK = all.filter(f => Number(f.ratingKathie) === 0).length;
    const vomitA = all.filter(f => Number(f.ratingAlyssia) === 0).length;

    els.duoContent.innerHTML = `
      <section class="compatibility-hero">
        <div class="compatibility-ring" style="--score:${compatibility * 3.6}deg"><span>${compatibility}%</span><small>d’accord</small></div>
        <div><span class="section-kicker">Votre compatibilité cinéma</span><h2>${compatibility >= 80 ? "Même cerveau, ou presque." : compatibility >= 60 ? "Le canapé survit encore à vos débats." : "Vos goûts aiment se battre."}</h2>
          <p>Calculé sur ${rated.length} film${rated.length>1?"s":""} noté${rated.length>1?"s":""} par vous deux, avec un écart maximal d’un point pour être considérées d’accord.</p></div>
      </section>
      <div class="versus-grid">
        <article class="versus-person kathie"><span>K</span><h3>Kathie</h3><strong>${avgK.toFixed(1)}/5</strong><small>note moyenne</small><p>Genre chouchou : <b>${escapeHtml(topK?.name || "À découvrir")}</b></p><p>🤢 distribués : <b>${vomitK}</b></p></article>
        <div class="versus-badge">VS</div>
        <article class="versus-person alyssia"><span>A</span><h3>Alyssia</h3><strong>${avgA.toFixed(1)}/5</strong><small>note moyenne</small><p>Genre chouchou : <b>${escapeHtml(topA?.name || "À découvrir")}</b></p><p>🤢 distribués : <b>${vomitA}</b></p></article>
      </div>
      ${biggest ? `<section class="biggest-disagreement" onclick="window.openFilmDetails('${biggest.cat}','${biggest.id}')">
        ${biggest.imageUrl ? `<img src="${escapeHtml(biggest.imageUrl)}" alt="Affiche de ${escapeHtml(biggest.title)}" loading="lazy" />` : ""}
        <div><span class="section-kicker">⚡ Votre plus gros désaccord</span><h2>${escapeHtml(biggest.title)}</h2><div class="disagreement-scores"><b>Kathie ${displayRating(biggest.ratingKathie)}/5</b><i>contre</i><b>Alyssia ${displayRating(biggest.ratingAlyssia)}/5</b></div><small>Cliquez pour rouvrir le dossier de ce scandale cinématographique.</small></div>
      </section>` : '<div class="empty">Notez quelques films toutes les deux pour découvrir votre plus gros désaccord.</div>'}
      ${renderAchievementsHtml()}
    `;
  }

  function getFilmSeenYear(film) {
    if (!film.seenTogether) return null;
    const ms = film.seenTogetherAtMs || film.updatedAtMs || film.createdAtMs;
    if (!ms) return null;
    const year = new Date(ms).getFullYear();
    return Number.isFinite(year) ? year : null;
  }

  function renderWrappedYearOptions() {
    if (!els.wrappedYearSelect) return;
    const years = [...new Set(getAllFilmsFlat().map(getFilmSeenYear).filter(Boolean))].sort((a,b)=>b-a);
    const current = new Date().getFullYear();
    if (!years.includes(current)) years.unshift(current);
    if (!years.includes(state.wrappedYear)) state.wrappedYear = years[0] || current;
    els.wrappedYearSelect.innerHTML = years.map(y => `<option value="${y}" ${y===state.wrappedYear?"selected":""}>${y}</option>`).join("");
  }

  function renderWrappedPage() {
    if (!els.wrappedContent) return;
    renderWrappedYearOptions();
    const year = state.wrappedYear;
    const films = getAllFilmsFlat().filter(f => getFilmSeenYear(f) === year);
    if (!films.length) {
      els.wrappedContent.innerHTML = `<div class="wrapped-empty"><span>🎞️</span><h2>Pas encore de bobine pour ${year}</h2><p>Les films vus ensemble cette année apparaîtront ici automatiquement.</p></div>`;
      return;
    }
    const cinema = films.filter(isCinemaFilm).length;
    const home = films.length - cinema;
    const comments = films.reduce((n,f)=>n+(Array.isArray(f.comments)?f.comments.length:0),0);
    const vomits = films.reduce((n,f)=>n+(Number(f.ratingKathie)===0?1:0)+(Number(f.ratingAlyssia)===0?1:0),0);
    const favorites = films.filter(f=>f.favorite).length;
    const categoryMap = {};
    const monthMap = {};
    films.forEach(f => {
      const cat = getCategoryName(f.cat); categoryMap[cat]=(categoryMap[cat]||0)+1;
      const ms = f.seenTogetherAtMs || f.updatedAtMs || f.createdAtMs;
      const month = new Date(ms).toLocaleDateString("fr-FR", { month:"long" });
      monthMap[month]=(monthMap[month]||0)+1;
    });
    const topCategory = Object.entries(categoryMap).sort((a,b)=>b[1]-a[1])[0];
    const topMonth = Object.entries(monthMap).sort((a,b)=>b[1]-a[1])[0];
    const ratedBoth = films.filter(f => f.ratingKathie !== null && f.ratingKathie !== undefined && f.ratingAlyssia !== null && f.ratingAlyssia !== undefined);
    const biggest = [...ratedBoth].sort((a,b)=>Math.abs(Number(b.ratingKathie)-Number(b.ratingAlyssia))-Math.abs(Number(a.ratingKathie)-Number(a.ratingAlyssia)))[0] || null;
    const favoriteFilm = [...films].filter(f=>averageRating(f)!==null).sort((a,b)=>averageRating(b)-averageRating(a))[0] || null;

    els.wrappedContent.innerHTML = `
      <section class="wrapped-hero"><span>ALLIEFLIX ${year}</span><h2>${films.length} film${films.length>1?"s":""}. Une seule histoire : la vôtre.</h2><p>${cinema} au cinéma · ${home} à la maison · ${comments} commentaire${comments>1?"s":""}</p></section>
      <div class="wrapped-number-grid">
        <article><span>🎬</span><strong>${films.length}</strong><small>films vus ensemble</small></article>
        <article><span>🍿</span><strong>${cinema}</strong><small>sorties cinéma</small></article>
        <article><span>❤️</span><strong>${favorites}</strong><small>favoris dans l’année</small></article>
        <article><span>🤢</span><strong>${vomits}</strong><small>verdicts sans pitié</small></article>
      </div>
      <div class="wrapped-story-grid">
        <article><span class="section-kicker">Genre de l’année</span><h3>${escapeHtml(topCategory?.[0] || "Mystère")}</h3><p>${topCategory?.[1] || 0} film${(topCategory?.[1]||0)>1?"s":""}</p></article>
        <article><span class="section-kicker">Mois le plus cinéphile</span><h3>${escapeHtml(topMonth?.[0] || "Mystère")}</h3><p>${topMonth?.[1] || 0} film${(topMonth?.[1]||0)>1?"s":""} partagé${(topMonth?.[1]||0)>1?"s":""}</p></article>
        ${favoriteFilm ? `<article class="clickable" onclick="window.openFilmDetails('${favoriteFilm.cat}','${favoriteFilm.id}')"><span class="section-kicker">Film le mieux noté</span><h3>${escapeHtml(favoriteFilm.title)}</h3><p>${averageRating(favoriteFilm).toFixed(1)}/5 de moyenne</p></article>` : ""}
        ${biggest ? `<article class="clickable" onclick="window.openFilmDetails('${biggest.cat}','${biggest.id}')"><span class="section-kicker">Le débat de l’année</span><h3>${escapeHtml(biggest.title)}</h3><p>${displayRating(biggest.ratingKathie)} vs ${displayRating(biggest.ratingAlyssia)}</p></article>` : ""}
      </div>
      <section class="wrapped-poster-wall">${films.slice(0,12).map(f => f.imageUrl ? `<img src="${escapeHtml(f.imageUrl)}" alt="${escapeHtml(f.title)}" loading="lazy" />` : "").join("")}</section>
      <div class="wrapped-final-line">${films.length} films, ${comments} commentaires, et probablement encore vingt minutes perdues à choisir le prochain. 🍿</div>
    `;
  }

  function renderDuelCategoryOptions() {
    if (!els.duelCategorySelect) return;
    const current = els.duelCategorySelect.value || "all";
    els.duelCategorySelect.innerHTML = `<option value="all">Tous les films</option>` + state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    if ([...els.duelCategorySelect.options].some(o => o.value === current)) els.duelCategorySelect.value = current;
  }

  function getDuelScores() {
    try { return JSON.parse(localStorage.getItem("allieflix_duel_scores") || "{}"); }
    catch { return {}; }
  }

  function saveDuelWin(film) {
    const scores = getDuelScores();
    scores[film.id] = (scores[film.id] || 0) + 1;
    localStorage.setItem("allieflix_duel_scores", JSON.stringify(scores));
  }

  function renderDuelPage() {
    if (!els.duelArena) return;
    if (state.duelChampion) {
      const f = state.duelChampion;
      els.duelArena.innerHTML = `<section class="duel-champion">
        <div class="duel-crown">👑</div>
        ${f.imageUrl ? `<img src="${escapeHtml(f.imageUrl)}" alt="Affiche de ${escapeHtml(f.title)}" />` : ""}
        <span>Champion du tournoi</span><h2>${escapeHtml(f.title)}</h2>
        <div class="control-strip"><button class="primary" type="button" onclick="window.startAllieDuel()">Rejouer</button><button class="secondary" type="button" onclick="window.openFilmDetails('${f.cat}','${f.id}')">Voir la fiche</button></div>
      </section>`;
      return;
    }
    if (!state.duelPair.length) {
      els.duelArena.innerHTML = `<div class="duel-empty"><span>🥊</span><h3>Prêtes pour le face-à-face ?</h3><p>Choisissez une catégorie puis lancez le tournoi. À chaque manche, cliquez sur le film que vous préférez.</p></div>`;
      return;
    }
    const [a,b] = state.duelPair;
    els.duelArena.innerHTML = `<div class="duel-round-label">Manche ${state.duelRoundNumber} · choisissez votre gagnant</div><div class="duel-match">
      ${[a,b].map((f,i) => `<button class="duel-film" type="button" onclick="window.chooseDuelWinner('${f.id}')">
        <div class="duel-film-poster">${f.imageUrl ? `<img src="${escapeHtml(f.imageUrl)}" alt="Affiche de ${escapeHtml(f.title)}" />` : '<span>🎬</span>'}<i>Choisir</i></div>
        <h3>${escapeHtml(f.title)}</h3><small>${escapeHtml(getCategoryName(f.cat))}</small>
      </button>${i===0?'<div class="duel-vs">VS</div>':''}`).join("")}
    </div>`;
  }

  function prepareNextDuelMatch() {
    while (true) {
      if (state.duelRound.length >= 2) {
        state.duelPair = state.duelRound.splice(0,2);
        renderDuelPage();
        return;
      }
      if (state.duelRound.length === 1) state.duelNextRound.push(state.duelRound.shift());
      if (state.duelNextRound.length === 1) {
        state.duelChampion = state.duelNextRound[0];
        state.duelPair = [];
        renderDuelPage();
        return;
      }
      if (!state.duelNextRound.length) {
        state.duelPair = [];
        renderDuelPage();
        return;
      }
      state.duelRound = [...state.duelNextRound].sort(() => Math.random() - .5);
      state.duelNextRound = [];
      state.duelRoundNumber += 1;
    }
  }

  function startAllieDuel() {
    const cat = els.duelCategorySelect?.value || "all";
    let pool = getAllFilmsFlat().filter(f => shouldAppearInLibrary(f) || isActiveCinemaFilm(f));
    if (cat !== "all") pool = pool.filter(f => f.cat === cat);
    if (pool.length < 2) { showToast("Il faut au moins deux films pour lancer un duel", true); return; }
    pool = [...pool].sort(() => Math.random() - .5).slice(0,32);
    state.duelRound = pool;
    state.duelNextRound = [];
    state.duelPair = [];
    state.duelChampion = null;
    state.duelRoundNumber = 1;
    prepareNextDuelMatch();
  }

  function renderFilmMemorySection(f) {
    if (!f.seenTogether) return "";
    const place = f.memoryPlace || (isCinemaFilm(f) ? "cinema" : "");
    return `<section class="film-memory-box">
      <div class="film-memory-head"><span>💌</span><div><strong>Le souvenir de cette séance</strong><small>Gardez le petit détail que vous voudrez retrouver dans quelques années.</small></div></div>
      <div class="memory-fields">
        <select id="memoryPlace-${f.cat}-${f.id}">
          <option value="" ${!place?"selected":""}>Où étiez-vous ?</option>
          <option value="cinema" ${place==="cinema"?"selected":""}>🍿 Au cinéma</option>
          <option value="kathie" ${place==="kathie"?"selected":""}>🏠 Chez Kathie</option>
          <option value="alyssia" ${place==="alyssia"?"selected":""}>🏠 Chez Alyssia</option>
          <option value="voyage" ${place==="voyage"?"selected":""}>🧳 En voyage</option>
          <option value="autre" ${place==="autre"?"selected":""}>✨ Autre</option>
        </select>
        <input id="memoryLocation-${f.cat}-${f.id}" value="${escapeHtml(f.memoryLocation || "")}" placeholder="Ville, cinéma, canapé légendaire…" />
      </div>
      <textarea id="memoryNote-${f.cat}-${f.id}" placeholder="Un souvenir de cette soirée ?">${escapeHtml(f.memoryNote || "")}</textarea>
      <button class="secondary" type="button" onclick="window.saveFilmMemory('${f.cat}','${f.id}')">💾 Enregistrer ce souvenir</button>
    </section>`;
  }

  function renderDuoReviews(f) {
    const kathie = getLatestCommentByAuthor(f, "Kathie");
    const alyssia = getLatestCommentByAuthor(f, "Alyssia");
    if (!kathie?.text && !alyssia?.text && f.ratingKathie == null && f.ratingAlyssia == null) return "";
    return `<section class="duo-review-panel">
      <article><span class="review-avatar kathie">K</span><div><strong>Kathie <b>${displayRating(f.ratingKathie)}/5</b></strong><p>${escapeHtml(kathie?.text || "Pas encore de critique écrite.")}</p></div></article>
      <article><span class="review-avatar alyssia">A</span><div><strong>Alyssia <b>${displayRating(f.ratingAlyssia)}/5</b></strong><p>${escapeHtml(alyssia?.text || "Pas encore de critique écrite.")}</p></div></article>
    </section>`;
  }

  function renderHomeExperience() {
    const all = getAllFilmsFlat();
    const togetherCount = all.filter(f => f.seenTogether).length;
    const activeCinemaCount = all.filter(f => isActiveCinemaFilm(f)).length;
    const mustWatchCount = all.filter(f => f.mustWatch).length;

    if (els.homeGreeting) els.homeGreeting.textContent = `${state.activeProfile}, on regarde quoi ce soir ?`;
    if (els.homeMustWatchCount) els.homeMustWatchCount.textContent = String(mustWatchCount);
    if (els.homeCinemaCount) els.homeCinemaCount.textContent = String(activeCinemaCount);
    if (els.homeTogetherCount) els.homeTogetherCount.textContent = String(togetherCount);
    renderAmbientExperience();
    renderSagaRail();
  }
 
  function sortFilms(list, forcedMode = null){
    const mode = forcedMode || state.sortMode;
    const copy = [...list];
    if(mode === "alpha") copy.sort((a,b)=>(a.title||"").localeCompare(b.title||"", "fr"));
    if(mode === "recent") copy.sort((a,b)=>(b.createdAtMs||0)-(a.createdAtMs||0));
    if(mode === "oldest") copy.sort((a,b)=>(a.createdAtMs||0)-(b.createdAtMs||0));
    if (mode === "rating_desc") {
  copy.sort((a, b) => {
    const avA = averageRating(a);
    const avB = averageRating(b);
    const scoreA = avA === null ? -Infinity : avA;
    const scoreB = avB === null ? -Infinity : avB;
    return (scoreB - scoreA) || (a.title || "").localeCompare(b.title || "", "fr");
  });
}

if (mode === "rating_asc") {
  copy.sort((a, b) => {
    const avA = averageRating(a);
    const avB = averageRating(b);
    const scoreA = avA === null ? Infinity : avA;
    const scoreB = avB === null ? Infinity : avB;
    return (scoreA - scoreB) || (a.title || "").localeCompare(b.title || "", "fr");
  });
}
    return copy;
  }

  function getVisibleFilms() {
  let list = [];

  if (state.globalSearchTerm.trim()) {
    const q = state.globalSearchTerm.trim().toLowerCase();
    list = getAllFilmsFlat().filter(f =>
      shouldAppearInLibrary(f) &&
      [f.title, f.summary, f.platform, f.trailerUrl, getCategoryName(f.cat)].join(" ").toLowerCase().includes(q)
    );
  } else {
    if (!state.librarySelectedCats.length) return [];
    list = getAllFilmsFlat().filter(f =>
      shouldAppearInLibrary(f) &&
      state.librarySelectedCats.includes(f.cat)
    );
  }

if (state.libraryFilter === "unseen") list = list.filter(f => !f.kathieSeen && !f.alyssiaSeen);
if (state.libraryFilter === "seenTogether") list = list.filter(f => f.seenTogether);
if (state.libraryFilter === "seenKathie") list = list.filter(f => f.kathieSeen);
if (state.libraryFilter === "seenAlyssia") list = list.filter(f => f.alyssiaSeen);
if (state.libraryFilter === "favorites") list = list.filter(f => f.favorite);
if (state.libraryFilter === "mustWatch") list = list.filter(f => f.mustWatch);
  return sortFilms(list);
}

  function getCinemaFilms() {
  let list = getAllFilmsFlat().filter(f => isActiveCinemaFilm(f));

  list.sort((a, b) => {
    const aDate = a.releaseDateMs || 9999999999999;
    const bDate = b.releaseDateMs || 9999999999999;
    return aDate - bDate;
  });

  if (state.cinemaFilter === "upcoming") {
    const now = new Date();
    now.setHours(0,0,0,0);
    const todayMs = now.getTime();

    list = list.filter(f => (f.releaseDateMs || 0) >= todayMs);
  }

  return list;
}

  function getOurFilms() {
    let list = getAllFilmsFlat()
      .filter(f => f.seenTogether)
      .sort((a, b) =>
        (b.seenTogetherAtMs || b.updatedAtMs || b.createdAtMs || 0) -
        (a.seenTogetherAtMs || a.updatedAtMs || a.createdAtMs || 0)
      );
    if (state.ourFilmsFilter === "home") list = list.filter(f => isHomeFilm(f));
    if (state.ourFilmsFilter === "cinema") list = list.filter(f => isCinemaFilm(f));
    return list;
  }

  function renderCategoryCards(container, selectedArray, mode){
    if (!container) return;
    if (!state.categories.length) {
      container.innerHTML = '<div class="empty">Aucune catégorie pour le moment.</div>';
      return;
    }
    const sourceFilms = getAllFilmsFlat().filter(f =>
      mode === "draw" ? isHomeFilm(f) : shouldAppearInLibrary(f)
    );
    const allSelected = selectedArray.length === state.categories.length && state.categories.length > 0;
    container.innerHTML =
      `<label class="filter-chip ${allSelected ? "active" : ""}">
        <input type="checkbox" style="display:none" data-mode="${mode}" data-select-all="true" ${allSelected ? "checked" : ""} />
        <span>🌊</span><strong>Toutes</strong><small>${sourceFilms.length} films</small>
      </label>` +
      state.categories.map(cat => {
        const active = selectedArray.includes(cat.id);
        const count = sourceFilms.filter(f => f.cat === cat.id).length;
        return `
          <label class="filter-chip ${active ? "active" : ""}">
            <input type="checkbox" style="display:none" data-mode="${mode}" data-id="${cat.id}" ${active ? "checked" : ""} />
            <span>🎞️</span><strong>${escapeHtml(cat.name)}</strong><small>${count}</small>
          </label>
        `;
      }).join("");

    container.querySelectorAll('input[type="checkbox"]').forEach(box => {
      box.addEventListener("change", () => {
        let target = box.dataset.mode === "draw" ? state.drawSelectedCats : state.librarySelectedCats;
        if (box.dataset.selectAll === "true") {
          target = box.checked ? state.categories.map(cat => cat.id) : [];
        } else {
          const id = box.dataset.id;
          target = target.includes(id) ? target.filter(catId => catId !== id) : [...target, id];
        }
        if (box.dataset.mode === "draw") state.drawSelectedCats = target;
        else state.librarySelectedCats = target;
        renderDrawCategories();
        renderLibraryCategories();
        renderFilms();
      });
    });
  }

  function renderDrawCategories(){ renderCategoryCards(els.drawCatsWrap, state.drawSelectedCats, "draw"); }
  function renderLibraryCategories(){ renderCategoryCards(els.libraryCatsWrap, state.librarySelectedCats, "library"); }

  function renderCategorySelect() {
    els.filmCategory.innerHTML = state.categories.length
      ? state.categories.map(cat => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`).join("")
      : '<option value="">Aucune catégorie</option>';
  }

function renderCategoryManager() {
  if (!els.categoryManageList) return;

  if (!state.categories.length) {
    els.categoryManageList.innerHTML = '<div class="empty">Aucune catégorie pour le moment.</div>';
    return;
  }

  els.categoryManageList.innerHTML = state.categories.map(cat => {
    const filmCount = (state.allFilmsMap[cat.id] || []).length;

    return `
      <div class="category-manager-item">
        <div class="category-manager-meta">
          <strong>${escapeHtml(cat.name)}</strong>
          <div class="small muted">${filmCount} film${filmCount > 1 ? "s" : ""}</div>
        </div>

        <div class="category-manager-actions">
          <button class="secondary" type="button" onclick="window.renameCategory('${cat.id}')">Renommer</button>
          <button class="danger" type="button" onclick="window.deleteCategorySafely('${cat.id}')">Supprimer</button>
        </div>
      </div>
    `;
  }).join("");
}

window.renameCategory = async (catId) => {
  const category = state.categories.find(cat => cat.id === catId);
  if (!category) return;

  const nextName = window.prompt("Nouveau nom de la catégorie :", category.name);
  if (nextName === null) return;

  const cleanName = nextName.trim();
  if (!cleanName) {
    showToast("Le nom de la catégorie ne peut pas être vide", true);
    return;
  }

  const duplicate = state.categories.some(cat =>
    cat.id !== catId && cat.name.trim().toLowerCase() === cleanName.toLowerCase()
  );

  if (duplicate) {
    showToast("Une catégorie avec ce nom existe déjà", true);
    return;
  }

  try {
    await updateDoc(doc(db, "categories", catId), {
      name: cleanName,
      updatedAtMs: Date.now(),
      updatedBy: state.activeProfile
    });
    showToast("Catégorie renommée ✏️");
renderCategoryManager();
  } catch (error) {
    console.error(error);
    showToast("Impossible de renommer la catégorie", true);
  }
};

window.deleteCategorySafely = async (catId) => {
  const category = state.categories.find(cat => cat.id === catId);
  if (!category) return;

  const filmsInCategory = (state.allFilmsMap[catId] || []).length;

  if (filmsInCategory > 0) {
    showToast("Impossible de supprimer une catégorie qui contient encore des films", true);
    return;
  }

  const ok = window.confirm(`Supprimer définitivement la catégorie "${category.name}" ?`);
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "categories", catId));
    showToast("Catégorie supprimée 🗑️");
renderCategoryManager();
  } catch (error) {
    console.error(error);
    showToast("Impossible de supprimer la catégorie", true);
  }
};

function getLatestCommentTimestampByAuthor(film, author) {
  if (!Array.isArray(film.comments)) return 0;

  const matches = film.comments.filter(c => c.author === author);

  if (!matches.length) return 0;

  return Math.max(
    ...matches.map(c =>
      Number(c.editedAtMs || c.updatedAtMs || c.createdAtMs || c.dateMs || 0)
    )
  );
}

function getLatestCommentByAuthor(film, author) {
  if (!Array.isArray(film.comments)) return null;
  return film.comments
    .filter(c => c.author === author)
    .sort((a, b) =>
      Number(b.editedAtMs || b.updatedAtMs || b.createdAtMs || b.dateMs || 0) -
      Number(a.editedAtMs || a.updatedAtMs || a.createdAtMs || a.dateMs || 0)
    )[0] || null;
}

function getStatsDrilldownFilms() {
  const all = getAllFilmsFlat();

  if (state.statsDrilldown === "trashKathie") {
    return all.filter(f => isZeroRating(f.ratingKathie));
  }

  if (state.statsDrilldown === "trashAlyssia") {
    return all.filter(f => isZeroRating(f.ratingAlyssia));
  }

  if (state.statsDrilldown === "commentsKathie") {
  return all
    .filter(f =>
      Array.isArray(f.comments) &&
      f.comments.some(c => c.author === "Kathie")
    )
    .sort((a, b) =>
      getLatestCommentTimestampByAuthor(b, "Kathie") -
      getLatestCommentTimestampByAuthor(a, "Kathie")
    );
}

if (state.statsDrilldown === "commentsAlyssia") {
  return all
    .filter(f =>
      Array.isArray(f.comments) &&
      f.comments.some(c => c.author === "Alyssia")
    )
    .sort((a, b) =>
      getLatestCommentTimestampByAuthor(b, "Alyssia") -
      getLatestCommentTimestampByAuthor(a, "Alyssia")
    );
}

  if (state.statsDrilldown === "sameRating") {
    return all.filter(f =>
      f.ratingKathie !== null &&
      f.ratingAlyssia !== null &&
      Number(f.ratingKathie) === Number(f.ratingAlyssia)
    );
  }

  return [];
}

function getStatsDrilldownTitle() {
  if (state.statsDrilldown === "trashKathie") return "🤢 distribués par Kathie";
  if (state.statsDrilldown === "trashAlyssia") return "🤢 distribués par Alyssia";

  if (state.statsDrilldown === "commentsKathie") return "💬 Commentaires de Kathie";
  if (state.statsDrilldown === "commentsAlyssia") return "💬 Commentaires de Alyssia";

  if (state.statsDrilldown === "sameRating") return "🤝 Même note";

  return "";
}

function renderStatsDrilldownHtml() {
  if (!state.statsDrilldown) return "";

  const films = getStatsDrilldownFilms();
  const title = getStatsDrilldownTitle();

  return `
    <section id="statsDrilldownPanel" class="panel" style="margin-top:16px;">
      <div class="stats-drilldown-head">
        <div>
          <h2 style="margin:0;">${escapeHtml(title)}</h2>
          <div class="small muted">Clique sur une fiche si tu veux ouvrir le film.</div>
        </div>
        <button class="secondary" type="button" onclick="window.closeStatsDrilldown()">Fermer</button>
      </div>

      <div class="film-list list">
        ${films.length
          ? films.map(f => renderFilmCard(f, { clickable: true })).join("")
          : '<div class="empty">Aucun film pour cette stat.</div>'
        }
      </div>
    </section>
  `;
}

window.openStatsDrilldown = (type) => {
  state.statsDrilldown = type;
  renderStatsPage();

  requestAnimationFrame(() => {
    document.getElementById("statsDrilldownPanel")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
};

window.closeStatsDrilldown = () => {
  state.statsDrilldown = null;
  renderStatsPage();
};

  function getShortSummary(text, max = 120){
    const clean = String(text || "").trim();
    if (!clean) return "Pas de résumé.";
    return clean.length > max ? clean.slice(0, max).trim() + "…" : clean;
  }

  function isExpandedSummary(key){
    return !!state.expandedSummaries[key];
  }

  function getSummaryHtml(text, key, max = 240){
    const clean = String(text || "").trim();
    if (!clean) return `<div class="film-summary">Pas de résumé pour ce film.</div>`;
    const expanded = isExpandedSummary(key);
    const displayText = expanded ? clean : getShortSummary(clean, max);
    const shouldToggle = clean.length > max;
    return `
      <div class="film-summary">${escapeHtml(displayText)}</div>
      ${shouldToggle ? `<button class="summary-toggle" type="button" onclick="window.toggleSummary('${key}')">${expanded ? "Voir moins" : "Voir plus"}</button>` : ""}
    `;
  }

function renderPosterCard(f){
  const commentCount = Array.isArray(f.comments) ? f.comments.length : 0;

  return `
    <article class="poster-card" onclick="window.openFilmDetails('${f.cat}','${f.id}')" title="Ouvrir la fiche">
      <div class="poster-quick-actions">
        <button
          class="poster-quick-btn ${f.mustWatch ? 'active-mustwatch' : ''}"
          type="button"
          title="${f.mustWatch ? 'Retirer de À voir absolument' : 'Ajouter à À voir absolument'}"
          onclick="event.stopPropagation(); window.quickToggleMustWatch('${f.cat}','${f.id}')"
        >⭐</button>

        <button
          class="poster-quick-btn ${f.favorite ? 'active-favorite' : ''}"
          type="button"
          title="${f.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}"
          onclick="event.stopPropagation(); window.quickToggleFavorite('${f.cat}','${f.id}')"
        >❤️</button>
      </div>

      ${f.imageUrl
        ? `<img src="${escapeHtml(f.imageUrl)}" alt="Affiche de ${escapeHtml(f.title)}" loading="lazy" decoding="async" />`
        : `<div class="poster-fallback">Pas d'image</div>`
      }
      <div class="poster-overlay">
        <div class="poster-title">${escapeHtml(f.title)}</div>
        <div class="poster-meta">
          <span class="chip">${escapeHtml(f.platform || "Plateforme ?")}</span>
          ${f.favorite ? '<span class="chip favorite">❤️ Favori</span>' : ""}
          ${f.mustWatch ? '<span class="chip mustwatch">⭐ À voir absolument</span>' : ""}
          ${f.seenTogether ? '<span class="chip">🎬 Ensemble</span>' : ""}
          <span class="chip">💬 ${commentCount}</span>
        </div>
        <div class="poster-sub">${escapeHtml(getShortSummary(f.summary, 95))}</div>
      </div>
    </article>
  `;
}


  function renderOurFilmStoryCard(f) {
    const date = f.seenTogetherDateLabel || formatDateOnly(f.seenTogetherAtMs);
    const memory = String(f.memoryNote || "").trim();
    return `<article class="our-film-story-card" onclick="window.openFilmDetails('${f.cat}','${f.id}')">
      <div class="our-film-story-poster">${f.imageUrl ? `<img src="${escapeHtml(f.imageUrl)}" alt="Affiche de ${escapeHtml(f.title)}" loading="lazy" />` : '<span>🎬</span>'}</div>
      <div class="our-film-story-main">
        <div class="our-film-story-top"><div><span class="section-kicker">${isCinemaFilm(f) ? "🍿 Vu au cinéma" : "🏠 Vu ensemble"}</span><h3>${escapeHtml(f.title)}</h3></div><b>→</b></div>
        <div class="film-meta">
          ${date ? `<span class="chip">🗓️ ${escapeHtml(date)}</span>` : ""}
          <span class="chip">🟣 ${displayRating(f.ratingKathie)}</span>
          <span class="chip">🟢 ${displayRating(f.ratingAlyssia)}</span>
          ${f.memoryLocation ? `<span class="chip">📍 ${escapeHtml(f.memoryLocation)}</span>` : ""}
        </div>
        ${memory ? `<p class="our-film-memory-preview">“${escapeHtml(getShortSummary(memory, 125))}”</p>` : `<p class="our-film-memory-preview muted">Ajoutez un souvenir à cette séance depuis la fiche du film.</p>`}
      </div>
    </article>`;
  }

  function renderFilmCard(f, options = {}) {
  const key = `${f.cat}_${f.id}`;
  const bothSeen = f.kathieSeen && f.alyssiaSeen;
  const includeComments = !!options.includeComments;
  const clickable = !!options.clickable;
  const premiumDetail = !!options.detail;
  const commentCount = Array.isArray(f.comments) ? f.comments.length : 0;
  const avgValue = averageRating(f);
  const avg = avgValue === null ? "—" : avgValue.toFixed(1);
  const togetherDate = f.seenTogetherDateLabel || formatDate(f.seenTogetherAtMs);
  const releaseDateLabel = f.releaseDateMs ? formatDateOnly(f.releaseDateMs) : "";
  const isCinemaView = !els.cinemaView.classList.contains("hidden");

  const releaseCountdown =
    isCinemaFilm(f) && isCinemaView && !f.seenTogether
      ? getReleaseCountdown(f.releaseDateMs)
      : "";

let drilldownExtraHtml = "";

if (state.statsDrilldown === "sameRating") {
  drilldownExtraHtml = `
    <div class="summary-box" style="margin-top:12px;">
      <div class="small muted">🤝 Même note</div>
      <div class="film-summary">Note commune : ${escapeHtml(String(f.ratingKathie))}/5</div>
    </div>
  `;
}

if (state.statsDrilldown === "commentsKathie") {
  const comment = getLatestCommentByAuthor(f, "Kathie");

  if (comment?.text) {
    drilldownExtraHtml = `
      <div class="summary-box" style="margin-top:12px;">
        <div class="small muted">💬 Commentaire de Kathie</div>
        <div class="film-summary">${escapeHtml(comment.text)}</div>
      </div>
    `;
  }
}

if (state.statsDrilldown === "commentsAlyssia") {
  const comment = getLatestCommentByAuthor(f, "Alyssia");

  if (comment?.text) {
    drilldownExtraHtml = `
      <div class="summary-box" style="margin-top:12px;">
        <div class="small muted">💬 Commentaire de Alyssia</div>
        <div class="film-summary">${escapeHtml(comment.text)}</div>
      </div>
    `;
  }
}

  return `
    <article
  class="film-card${f.missed ? ' is-missed' : ''}${clickable ? ' clickable' : ' premium-film-card'}"
  ${clickable ? `onclick="if(event.target.closest('button,a,select,textarea,input,label')) return; window.openFilmDetails('${f.cat}','${f.id}')"` : ""}
>
        <div class="film-banner">
          ${f.imageUrl
            ? `<img src="${escapeHtml(f.imageUrl)}" alt="Bandeau de ${escapeHtml(f.title)}" loading="lazy" decoding="async" />`
            : `<div class="film-banner-fallback">Pas d'image de bandeau</div>`
          }
          <div class="film-banner-overlay"></div>
          <div class="film-banner-content">
            <div class="film-banner-title">${escapeHtml(f.title)}</div>
            <div class="film-meta">
              <span class="chip">${isCinemaFilm(f) ? "🍿 Cinéma" : "🏠 Maison"}</span>
              <span class="chip">📁 ${escapeHtml(getCategoryName(f.cat))}</span>
             ${releaseDateLabel ? `<span class="chip">🗓️ ${escapeHtml(releaseDateLabel)}</span>` : ""}
${releaseCountdown ? `<span class="chip countdown">⏳ ${escapeHtml(releaseCountdown)}</span>` : ""}
              ${f.favorite ? '<span class="chip favorite">❤️ Favori</span>' : ''}
${f.mustWatch ? '<span class="chip mustwatch">À voir absolument</span>' : ''}
${f.missed ? '<span class="chip missed">😔 Raté</span>' : ''}
            </div>
          </div>
        </div>

        <div class="film-layout">
          <div class="poster-wrap">
            ${f.imageUrl ? `<img src="${escapeHtml(f.imageUrl)}" alt="Affiche de ${escapeHtml(f.title)}" class="poster-large" loading="lazy" decoding="async" />` : `<div class="poster-large-placeholder">Pas d'image</div>`}
            <div class="poster-glow"></div>
          </div>

          <div>
            <h3 class="film-title">${escapeHtml(f.title)}</h3>

            <div class="film-meta">
  <span class="chip">📺 ${escapeHtml(f.platform || "Plateforme ?")}</span>
  <span class="chip">⭐ Moyenne ${avg}/5</span>
  <span class="chip">🟣 K ${displayRating(f.ratingKathie)}</span>
  <span class="chip">🟢 A ${displayRating(f.ratingAlyssia)}</span>
  ${Number(f.ratingKathie) === LEGENDARY_RATING ? '<span class="chip legendary-chip">👑 LE FILM · Kathie</span>' : ''}
  ${Number(f.ratingAlyssia) === LEGENDARY_RATING ? '<span class="chip legendary-chip">👑 LE FILM · Alyssia</span>' : ''}
  <span class="chip">💬 ${commentCount} commentaire${commentCount > 1 ? "s" : ""}</span>
  <span class="chip">👤 Créé par ${escapeHtml(f.createdBy || f.addedBy || "Inconnu")}</span>
  ${f.seenTogether ? '<span class="chip">🎬 Vu ensemble</span>' : ''}
  ${togetherDate ? `<span class="chip">🕒 ${escapeHtml(togetherDate)}</span>` : ''}
  ${f.trailerUrl ? `<a class="chip" href="${escapeHtml(f.trailerUrl)}" target="_blank" rel="noopener noreferrer">▶️ Bande-annonce</a>` : ''}
</div>

            <div class="summary-box">
              ${getSummaryHtml(f.summary, key, 240)}
            </div>

${drilldownExtraHtml}
${premiumDetail ? renderDuoReviews(f) : ""}
${premiumDetail ? renderPredictionSection(f) : ""}
${premiumDetail ? renderFilmMemorySection(f) : ""}

            <div class="status-row">
              <span class="status-pill ${f.kathieSeen ? '' : 'off'}">Kathie ${f.kathieSeen ? 'a vu ✅' : 'pas vu ❌'}</span>
              <span class="status-pill ${f.alyssiaSeen ? '' : 'off'}">Alyssia ${f.alyssiaSeen ? 'a vu ✅' : 'pas vu ❌'}</span>
              ${bothSeen ? '<span class="status-pill">👯 Vues toutes les deux</span>' : ''}
              ${f.seenTogether ? '<span class="status-pill">🎬 Vu ensemble</span>' : ''}
              ${f.missed ? '<span class="status-pill missed">😔 Raté au ciné</span>' : ''}
            </div>

            <div class="rating-row">
  <span class="small muted" style="margin-right:6px;">Note Kathie</span>

  <button
    class="rating-trash ${isZeroRating(f.ratingKathie) ? 'active' : ''}"
    onclick="window.setPersonalRating('${f.cat}','${f.id}','Kathie',0)"
    type="button"
    title="0/5 — nul à chier"
  >
    🤢
  </button>

  ${[1,2,3,4,5].map(i => `
    <button class="star ${(Number(f.ratingKathie) || 0) >= i && Number(f.ratingKathie) > 0 ? 'active' : ''}"
      onclick="window.setPersonalRating('${f.cat}','${f.id}','Kathie',${i})"
      type="button">★</button>
  `).join("")}

  <button class="legendary-rating ${Number(f.ratingKathie) === LEGENDARY_RATING ? 'active' : ''}"
    onclick="window.setPersonalRating('${f.cat}','${f.id}','Kathie',${LEGENDARY_RATING})"
    type="button" title="Une des 3 notes ultimes de Kathie">
    👑 LE FILM <small>${getLegendaryRemaining("Kathie")}/3 dispo</small>
  </button>

  <button
    class="ghost"
    onclick="window.clearPersonalRating('${f.cat}','${f.id}','Kathie')"
    type="button"
  >
    Retirer
  </button>
</div>

<div class="rating-row">
  <span class="small muted" style="margin-right:6px;">Note Alyssia</span>

  <button
    class="rating-trash ${isZeroRating(f.ratingAlyssia) ? 'active' : ''}"
    onclick="window.setPersonalRating('${f.cat}','${f.id}','Alyssia',0)"
    type="button"
    title="0/5 — nul à chier"
  >
    🤢
  </button>

  ${[1,2,3,4,5].map(i => `
    <button class="star ${(Number(f.ratingAlyssia) || 0) >= i && Number(f.ratingAlyssia) > 0 ? 'active' : ''}"
      onclick="window.setPersonalRating('${f.cat}','${f.id}','Alyssia',${i})"
      type="button">★</button>
  `).join("")}

  <button class="legendary-rating ${Number(f.ratingAlyssia) === LEGENDARY_RATING ? 'active' : ''}"
    onclick="window.setPersonalRating('${f.cat}','${f.id}','Alyssia',${LEGENDARY_RATING})"
    type="button" title="Une des 3 notes ultimes d’Alyssia">
    👑 LE FILM <small>${getLegendaryRemaining("Alyssia")}/3 dispo</small>
  </button>

  <button
    class="ghost"
    onclick="window.clearPersonalRating('${f.cat}','${f.id}','Alyssia')"
    type="button"
  >
    Retirer
  </button>
</div>


<div class="action-groups">
  <div class="action-group">
    <div class="action-label">Fiche</div>
    <div class="film-actions">
      <button class="secondary" onclick="window.startEditFilm('${f.cat}','${f.id}')" type="button">✏️ Modifier</button>
      <button class="${f.favorite ? 'ok' : 'ghost'}" onclick="window.toggleFavorite('${f.cat}','${f.id}',${!f.favorite})" type="button">
        ${f.favorite ? '❤️ Retirer des favoris' : '❤️ Ajouter aux favoris'}
      </button>
      <button
        class="warning ${state.highlightedMustWatch === `${f.cat}_${f.id}` ? 'mustwatch-flash' : ''}"
        onclick="window.toggleMustWatch('${f.cat}','${f.id}',${!f.mustWatch})"
        type="button">
        ${f.mustWatch ? '⭐ Retirer des incontournables' : '⭐ À voir absolument'}
      </button>
    </div>
  </div>

  <div class="action-group">
    <div class="action-label">Visionnage</div>
    <div class="film-actions">
      <button class="secondary" onclick="window.toggleK('${f.cat}','${f.id}',${!f.kathieSeen})" type="button">
        ${f.kathieSeen ? '↩️ Retirer vu Kathie' : 'Vu par Kathie'}
      </button>
      <button class="secondary" onclick="window.toggleA('${f.cat}','${f.id}',${!f.alyssiaSeen})" type="button">
        ${f.alyssiaSeen ? '↩️ Retirer vu Alyssia' : 'Vu par Alyssia'}
      </button>
      <button class="ghost" onclick="window.toggleTogether('${f.cat}','${f.id}',${!f.seenTogether})" type="button">
        ${f.seenTogether ? '↩️ Retirer vu ensemble' : (isCinemaFilm(f) ? 'Vu ensemble au cinéma' : 'Vu ensemble')}
      </button>
      ${isCinemaFilm(f) ? `
        <button class="${f.missed ? 'danger' : 'ghost'}" onclick="window.toggleMissed('${f.cat}','${f.id}',${!f.missed})" type="button">
          ${f.missed ? '↩️ Pas raté finalement' : '😔 Raté au ciné'}
        </button>
      ` : ''}
    </div>
  </div>

  <div class="action-group">
    <div class="action-label">Organisation</div>
    <div class="film-actions">
      <button class="ok" onclick="window.toggleMoveBox('${f.cat}','${f.id}')" type="button">Déplacer</button>
      <button class="danger" onclick="window.removeFilm('${f.cat}','${f.id}')" type="button">Supprimer</button>
    </div>
  </div>
</div>

<div id="moveBox-${f.cat}-${f.id}" class="move-box hidden">
  <select id="moveSelect-${f.cat}-${f.id}">
    ${state.categories.map(c => `<option value="${c.id}" ${c.id===f.cat ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join("")}
  </select>
  <button class="primary" onclick="window.confirmMoveFilm('${f.cat}','${f.id}')" type="button">Valider</button>
</div>

${includeComments ? `
  <div class="comment-box">
    <textarea id="commentInput-${f.cat}-${f.id}" placeholder="Ajouter un commentaire sur ce film..."></textarea>
    <div class="control-strip">
      <button class="primary" onclick="window.addComment('${f.cat}','${f.id}')" type="button">Ajouter le commentaire</button>
    </div>
    <div class="comment-list">
      ${Array.isArray(f.comments) && f.comments.length ? f.comments.map(c => {
        const commentKeyId = c.id || `${c.author || "unknown"}_${c.createdAtMs || 0}`;
        const commentKey = `${f.cat}_${f.id}_${commentKeyId}`;
        const canEdit = c.author === state.activeProfile;
        const isEditing = canEdit && !!state.editingComments[commentKey];

        return `
          <div class="comment-item">
            <strong>${escapeHtml(c.author || "Commentaire")}</strong>
            <div class="small muted">${escapeHtml(c.dateLabel || formatDate(c.createdAtMs) || "")}</div>

            ${isEditing ? `
              <textarea id="editCommentInput-${f.cat}-${f.id}-${commentKeyId}" style="margin-top:8px;">${escapeHtml(c.text || "")}</textarea>
              <div class="control-strip" style="margin-top:8px;">
                <button class="primary" onclick="window.saveEditedComment('${f.cat}','${f.id}','${commentKeyId}')" type="button">Enregistrer</button>
                <button class="secondary" onclick="window.cancelEditComment('${f.cat}','${f.id}','${commentKeyId}')" type="button">Annuler</button>
              </div>
            ` : `
              <div style="margin-top:6px;">${escapeHtml(c.text || "")}</div>
              ${canEdit ? `
                <div class="control-strip" style="margin-top:8px;">
                  <button class="ghost" onclick="window.startEditComment('${f.cat}','${f.id}','${commentKeyId}')" type="button">✏️ Modifier mon commentaire</button>
                </div>
              ` : ''}
            `}
          </div>
        `;
      }).join("") : '<div class="empty">Aucun commentaire pour le moment.</div>'}
    </div>
  </div>
` : ''}
          </div>
        </div>
      </article>
    `;
  }

  function renderFilms() {
  els.films.className = state.currentLibraryView === "grid" ? "netflix-grid" : "film-list list";

  if (state.focusedFilm) {
  const film = getFilmByIds(state.focusedFilm.cat, state.focusedFilm.id);

  if (!film) {
    state.focusedFilm = null;
  } else {
    els.films.className = "film-list list";
    els.films.innerHTML = `
  <div class="control-strip" style="margin-bottom:12px;">
    <button class="secondary" type="button" onclick="window.closeFocusedFilm()">← Retour à la liste</button>
  </div>
  ${renderFilmCard(film, { includeComments:true, detail:true })}
`;
    return;
  }
}

  const visibleFilms = getVisibleFilms();

  if (!state.globalSearchTerm.trim() && state.librarySelectedCats.length === 0) {
    els.films.innerHTML = '<div class="empty">Choisis une ou plusieurs catégories dans Bibliothèque.</div>';
    return;
  }

  if (visibleFilms.length === 0) {
    els.films.innerHTML = state.globalSearchTerm.trim()
      ? '<div class="empty">Aucun film ne correspond à cette recherche.</div>'
      : '<div class="empty">Aucun film dans la sélection actuelle.</div>';
    return;
  }

  if (state.currentLibraryView === "grid") {
    els.films.innerHTML = visibleFilms.map(f => renderPosterCard(f)).join("");
  } else {
    els.films.innerHTML = visibleFilms.map(f => renderFilmCard(f, { clickable: true })).join("");
  }
}

function renderCinemaAlerts() {
  const now = new Date();
  now.setHours(0,0,0,0);

  const alerts = getAllFilmsFlat()
    .filter(f => isCinemaFilm(f) && !f.seenTogether && !f.missed && f.releaseDateMs)
    .map(f => {
      const target = new Date(f.releaseDateMs);
      target.setHours(0,0,0,0);
      const days = Math.round((target.getTime() - now.getTime()) / 86400000);
      return { ...f, days };
    })
    .filter(f => f.days >= 0 && f.days <= 14)
    .sort((a,b) => a.days - b.days);

  const html = alerts.length
    ? `
      <h2>🍿 Sorties cinéma imminentes</h2>
      <div class="history-list">
        ${alerts.map(f => `
          <div class="history-item clickable-history" onclick="window.openFilmDetails('${f.cat}','${f.id}')">
            <strong>${escapeHtml(f.title)}</strong>
            <div class="small muted">
              ${f.days === 0 ? "Sort aujourd’hui" : f.days === 1 ? "Sort demain" : `Sort dans ${f.days} jours`}
              ${f.releaseDateMs ? ` • ${escapeHtml(formatDateOnly(f.releaseDateMs))}` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    `
    : `<div class="empty">Aucune sortie cinéma dans les 14 prochains jours.</div>`;

  if (els.cinemaAlerts) els.cinemaAlerts.innerHTML = html;
  if (els.homeCinemaAlerts) {
    els.homeCinemaAlerts.innerHTML = alerts.length
      ? `<div class="home-cinema-alert"><span>🍿</span><div><strong>${alerts.length === 1 ? "Une sortie arrive très vite" : `${alerts.length} sorties arrivent très vite`}</strong><small>${alerts.slice(0,2).map(f => escapeHtml(f.title)).join(" • ")}</small></div><button type="button" onclick="window.navigateAllieFlix('cinema')">Voir →</button></div>`
      : "";
  }
}

 function renderCinema() {
  if (state.focusedFilm) {
    const film = getFilmByIds(state.focusedFilm.cat, state.focusedFilm.id);

    if (film && isActiveCinemaFilm(film)) {
      els.cinemaList.innerHTML = `
        <div class="control-strip" style="margin-bottom:14px;">
          <button class="secondary" type="button" onclick="window.closeFocusedCinemaFilm()">← Retour aux sorties cinéma</button>
        </div>
        ${renderFilmCard(film, { includeComments:true, detail:true })}
      `;
      return;
    }
  }

  const list = getCinemaFilms();
  if (!list.length) {
    els.cinemaList.innerHTML = '<div class="empty">Rien à l’affiche pour le moment. Les films vus ou ratés sont bien rangés dans votre bibliothèque.</div>';
    return;
  }

  const today = new Date();
  today.setHours(0,0,0,0);
  const sectionFor = ms => {
    if (!ms) return "Date à définir";
    const d = new Date(ms); d.setHours(0,0,0,0);
    const diff = Math.round((d.getTime()-today.getTime())/86400000);
    if (diff < 0) return "Déjà sorti";
    if (diff <= 7) return "Cette semaine";
    if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) return "Plus tard ce mois-ci";
    return d.toLocaleDateString("fr-FR", { month:"long", year:"numeric" });
  };

  let currentSection = "";
  const cards = list.map(f => {
    const d = f.releaseDateMs ? new Date(f.releaseDateMs) : null;
    const section = sectionFor(f.releaseDateMs);
    const sectionLabel = section !== currentSection ? `<div class="cinema-month-label cinema-section-label"><span>${escapeHtml(section)}</span></div>` : "";
    currentSection = section;
    const day = d ? d.toLocaleDateString("fr-FR", { day:"2-digit" }) : "?";
    const month = d ? d.toLocaleDateString("fr-FR", { month:"short" }).replace(".","") : "date";
    const countdown = getReleaseCountdown(f.releaseDateMs);
    const diffDays = f.releaseDateMs ? Math.round((new Date(f.releaseDateMs).setHours(0,0,0,0)-today.getTime())/86400000) : null;
    const urgent = diffDays !== null && diffDays >= 0 && diffDays <= 7;
    return `${sectionLabel}
      <article class="cinema-timeline-card ${urgent ? "cinema-urgent" : ""} ${f.mustWatch ? "cinema-priority" : ""}" onclick="window.openFilmDetails('${f.cat}','${f.id}')">
        <div class="cinema-date-badge"><strong>${escapeHtml(day)}</strong><small>${escapeHtml(month)}</small></div>
        ${f.imageUrl ? `<img class="cinema-thumb" src="${escapeHtml(f.imageUrl)}" alt="Affiche de ${escapeHtml(f.title)}" loading="lazy" decoding="async" />` : `<div class="cinema-thumb poster-fallback">🎬</div>`}
        <div class="cinema-card-main">
          <div class="cinema-title-line"><h3>${escapeHtml(f.title)}</h3>${f.mustWatch ? '<span class="cinema-priority-label">⭐ À ne pas rater</span>' : ""}</div>
          <div class="cinema-card-meta">
            ${countdown ? `<span class="chip countdown">⏳ ${escapeHtml(countdown)}</span>` : ""}
            <span class="chip">📁 ${escapeHtml(getCategoryName(f.cat))}</span>
          </div>
          <div class="cinema-card-summary">${escapeHtml(getShortSummary(f.summary || "", 150) || "Touchez la fiche pour voir les détails et marquer votre séance.")}</div>
        </div>
        <button class="cinema-quick-star ${f.mustWatch ? "active" : ""}" type="button" aria-label="À voir absolument" onclick="event.stopPropagation(); window.quickToggleMustWatch('${f.cat}','${f.id}')">⭐</button>
        <div class="cinema-card-arrow">→</div>
      </article>`;
  }).join("");

  els.cinemaList.innerHTML = `<div class="cinema-live-intro"><span>🎟️</span><div><strong>${list.length} sortie${list.length>1?"s":""} dans votre radar</strong><small>Les films vus ensemble ou ratés quittent automatiquement cette liste.</small></div></div><div class="cinema-timeline">${cards}</div>`;
}

  function renderOurFilms() {
    const list = getOurFilms();
    if (!list.length) {
      els.ourFilmsList.innerHTML = '<div class="empty">Aucun film vu ensemble pour le moment.</div>';
      return;
    }
    els.ourFilmsList.innerHTML = `<div class="our-film-story-list">${list.map(renderOurFilmStoryCard).join("")}</div>`;
  }

  function getPlatformStatsHtml(all) {
    const map = {};
    all.forEach(f => {
      const key = (f.platform || "Non précisée").trim() || "Non précisée";
      map[key] = (map[key] || 0) + 1;
    });
    const entries = Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8);
    if (!entries.length) return '<div class="empty">Aucune plateforme pour le moment.</div>';
    return entries.map(([platform,count]) => `
      <div class="history-item">
        <strong>${escapeHtml(platform)}</strong>
        <div class="small muted">${count} film${count > 1 ? 's' : ''}</div>
      </div>
    `).join("");
  }
function renderHistory(targetEl){
  if(!targetEl) return;

  if(!state.drawHistory.length){
    targetEl.innerHTML = '<div class="empty">Aucun tirage pour l\'instant.</div>';
    return;
  }

  targetEl.innerHTML = state.drawHistory.map(item => {
    const linkedFilm = item.filmId ? getFilmByIds(item.cat, item.filmId) : null;
    const currentCat = linkedFilm?.cat || item.cat || "";
    const currentCategoryName = linkedFilm ? getCategoryName(linkedFilm.cat) : item.categoryName;
    const canOpen = !!(currentCat && item.filmId && linkedFilm);

    return `
      <div
        class="history-item ${canOpen ? "clickable-history" : ""}"
        ${canOpen ? `onclick="window.openFilmDetails('${currentCat}','${item.filmId}')"` : ""}
        title="${canOpen ? "Ouvrir la fiche" : "Ancien tirage sans lien"}"
      >
        <strong>${escapeHtml(item.title)}</strong>
        <div class="small muted">
          ${escapeHtml(item.mode || "")}${currentCategoryName ? " • " + escapeHtml(currentCategoryName) : ""}${item.timeLabel ? " • " + escapeHtml(item.timeLabel) : ""}
        </div>
      </div>
    `;
  }).join("");
}

  function renderStatsPage(){
    const all = getAllFilmsFlat();
const kathieAdds = all.filter(f => (f.createdBy || f.addedBy) === "Kathie").length;
const alyssiaAdds = all.filter(f => (f.createdBy || f.addedBy) === "Alyssia").length;
    const kathieSeen = all.filter(f => f.kathieSeen).length;
    const alyssiaSeen = all.filter(f => f.alyssiaSeen).length;
    const favorites = all.filter(f => f.favorite).length;
    const unseen = all.filter(f => !f.kathieSeen && !f.alyssiaSeen && isHomeFilm(f)).length;
    const togetherSeen = all.filter(f => f.seenTogether).length;
    const cinemaCount = all.filter(f => isCinemaFilm(f)).length;
    const cinemaSeenTogether = all.filter(f => isCinemaFilm(f) && f.seenTogether).length;
    const cinemaMissed = all.filter(f => isCinemaFilm(f) && f.missed).length;
    const topRated = sortFilms(all.filter(f => averageRating(f) !== null), "rating_desc").slice(0,5);
    const recentEdits = [...all].filter(f => f.updatedAtMs).sort((a,b)=>(b.updatedAtMs||0)-(a.updatedAtMs||0)).slice(0,5);
const kathieCommentsCount = all.reduce((sum, f) => {
  const comments = Array.isArray(f.comments) ? f.comments : [];
  return sum + comments.filter(c => c.author === "Kathie").length;
}, 0);

const alyssiaCommentsCount = all.reduce((sum, f) => {
  const comments = Array.isArray(f.comments) ? f.comments : [];
  return sum + comments.filter(c => c.author === "Alyssia").length;
}, 0);
const allCommentsCount = all.reduce((sum, f) => {
  return sum + (Array.isArray(f.comments) ? f.comments.length : 0);
}, 0);

  const kathieRatings = all
    .map(f => f.ratingKathie)
    .filter(v => v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v)))
    .map(Number);

  const alyssiaRatings = all
    .map(f => f.ratingAlyssia)
    .filter(v => v !== null && v !== undefined && v !== "" && !Number.isNaN(Number(v)))
    .map(Number);

  const kathieAverageRating = kathieRatings.length
    ? (kathieRatings.reduce((a, b) => a + b, 0) / kathieRatings.length).toFixed(1)
    : "—";

  const alyssiaAverageRating = alyssiaRatings.length
    ? (alyssiaRatings.reduce((a, b) => a + b, 0) / alyssiaRatings.length).toFixed(1)
    : "—";
const kathieTrashCount = all.filter(f => isZeroRating(f.ratingKathie)).length;
const alyssiaTrashCount = all.filter(f => isZeroRating(f.ratingAlyssia)).length;

  const sameRatingCount = all.filter(f => {
  const hasK = f.ratingKathie !== null && f.ratingKathie !== undefined && f.ratingKathie !== "";
  const hasA = f.ratingAlyssia !== null && f.ratingAlyssia !== undefined && f.ratingAlyssia !== "";
  if (!hasK || !hasA) return false;

  const k = Number(f.ratingKathie);
  const a = Number(f.ratingAlyssia);
  return !Number.isNaN(k) && !Number.isNaN(a) && k === a;
}).length;
    const averageGap = (() => {
  const ratedBoth = all.filter(f => {
    const hasK = f.ratingKathie !== null && f.ratingKathie !== undefined && f.ratingKathie !== "";
    const hasA = f.ratingAlyssia !== null && f.ratingAlyssia !== undefined && f.ratingAlyssia !== "";
    return hasK && hasA && !Number.isNaN(Number(f.ratingKathie)) && !Number.isNaN(Number(f.ratingAlyssia));
  });

  if (!ratedBoth.length) return "0.0";

  const gap = ratedBoth.reduce((sum, f) => {
    return sum + Math.abs(Number(f.ratingKathie) - Number(f.ratingAlyssia));
  }, 0) / ratedBoth.length;

  return gap.toFixed(1);
})();

    const lastTogether = [...all].filter(f => f.seenTogetherAtMs).sort((a,b)=>(b.seenTogetherAtMs||0)-(a.seenTogetherAtMs||0)).slice(0,5);

    els.statsContent.innerHTML = `
  <div class="stats-grid">
  <div class="stat-card"><div class="small muted">Ajouts Kathie</div><div style="font-size:1.5rem;font-weight:900;">${kathieAdds}</div></div>
  <div class="stat-card"><div class="small muted">Ajouts Alyssia</div><div style="font-size:1.5rem;font-weight:900;">${alyssiaAdds}</div></div>
  <div class="stat-card"><div class="small muted">Films vus par Kathie</div><div style="font-size:1.5rem;font-weight:900;">${kathieSeen}</div></div>
  <div class="stat-card"><div class="small muted">Films vus par Alyssia</div><div style="font-size:1.5rem;font-weight:900;">${alyssiaSeen}</div></div>
  <div class="stat-card"><div class="small muted">Favoris</div><div style="font-size:1.5rem;font-weight:900;">${favorites}</div></div>
  <div class="stat-card"><div class="small muted">Non vus maison</div><div style="font-size:1.5rem;font-weight:900;">${unseen}</div></div>
  <div class="stat-card"><div class="small muted">Vus ensemble</div><div style="font-size:1.5rem;font-weight:900;">${togetherSeen}</div></div>
  <div class="stat-card"><div class="small muted">Films cinéma</div><div style="font-size:1.5rem;font-weight:900;">${cinemaCount}</div></div>
  <div class="stat-card"><div class="small muted">Vus ensemble au cinéma</div><div style="font-size:1.5rem;font-weight:900;">${cinemaSeenTogether}</div></div>
  <div class="stat-card"><div class="small muted">Ratés au cinéma 😔</div><div style="font-size:1.5rem;font-weight:900;">${cinemaMissed}</div></div>
  <div class="stat-card clickable-stat" onclick="window.openStatsDrilldown('sameRating')">
  <div class="small muted">Même note</div>
  <div style="font-size:1.5rem;font-weight:900;">${sameRatingCount}</div>
</div>
  <div class="stat-card"><div class="small muted">Total films</div><div style="font-size:1.5rem;font-weight:900;">${all.length}</div></div>
<div class="stat-card clickable-stat" onclick="window.openStatsDrilldown('trashKathie')">
  <div class="small muted">🤢 distribués par Kathie</div>
  <div style="font-size:1.5rem;font-weight:900;">${kathieTrashCount}</div>
</div>

<div class="stat-card clickable-stat" onclick="window.openStatsDrilldown('trashAlyssia')">
  <div class="small muted">🤢 distribués par Alyssia</div>
  <div style="font-size:1.5rem;font-weight:900;">${alyssiaTrashCount}</div>
</div>
  <div class="stat-card clickable-stat" onclick="window.openStatsDrilldown('commentsKathie')">
  <div class="small muted">Commentaires Kathie</div>
  <div style="font-size:1.5rem;font-weight:900;">${kathieCommentsCount}</div>
</div>
  <div class="stat-card clickable-stat" onclick="window.openStatsDrilldown('commentsAlyssia')">
  <div class="small muted">Commentaires Alyssia</div>
  <div style="font-size:1.5rem;font-weight:900;">${alyssiaCommentsCount}</div>
</div>
  <div class="stat-card"><div class="small muted">Total commentaires</div><div style="font-size:1.5rem;font-weight:900;">${allCommentsCount}</div></div>
    <div class="stat-card"><div class="small muted">Note moyenne Kathie</div><div style="font-size:1.5rem;font-weight:900;">${kathieAverageRating}/5</div></div>
  <div class="stat-card"><div class="small muted">Note moyenne Alyssia</div><div style="font-size:1.5rem;font-weight:900;">${alyssiaAverageRating}/5</div></div>
</div>

${renderStatsDrilldownHtml()}

      <section class="panel" style="margin-top:16px;">
        <h2>Top moyennes</h2>
        <div class="history-list">
          ${topRated.length ? topRated.map(f => `
  <div class="history-item">
    <strong>${escapeHtml(f.title)}</strong>
    <div class="small muted">
      ${escapeHtml(getCategoryName(f.cat))} •
      ⭐ ${averageRating(f) === null ? "—" : averageRating(f).toFixed(1)} •
      K ${displayRating(f.ratingKathie)} •
      A ${displayRating(f.ratingAlyssia)}
    </div>
  </div>
`).join("") : '<div class="empty">Aucune note pour le moment.</div>'}
        </div>
      </section>

      <section class="panel" style="margin-top:16px;">
        <h2>Plateformes les plus remplies</h2>
        <div class="history-list">${getPlatformStatsHtml(all)}</div>
      </section>

      <section class="panel" style="margin-top:16px;">
        <h2>Dernières modifications</h2>
        <div class="history-list">
          ${recentEdits.length ? recentEdits.map(f => `
            <div class="history-item">
              <strong>${escapeHtml(f.title)}</strong>
              <div class="small muted">Modifié par ${escapeHtml(f.updatedBy || 'Inconnu')} • ${escapeHtml(formatDate(f.updatedAtMs))}</div>
            </div>
          `).join("") : '<div class="empty">Aucune modification enregistrée pour le moment.</div>'}
        </div>
      </section>

      <section class="panel" style="margin-top:16px;">
        <h2>Dernières soirées à deux</h2>
        <div class="history-list">
         ${lastTogether.length ? lastTogether.map(f => `
  <div class="history-item clickable-history" onclick="window.openFilmDetails('${f.cat}','${f.id}')">
    <strong>${escapeHtml(f.title)}</strong>
    <div class="small muted">
      ${escapeHtml(isCinemaFilm(f) ? "Cinéma" : "Maison")} • ${escapeHtml(f.seenTogetherDateLabel || formatDate(f.seenTogetherAtMs))}
    </div>
  </div>
`).join("") : '<div class="empty">Aucune soirée duo enregistrée pour le moment.</div>'}
        </div>
      </section>

      <section class="panel" style="margin-top:16px;">
        <h2>Écart moyen des notes</h2>
        <div class="empty" style="text-align:left;">L'écart moyen entre vos notes est de <strong>${averageGap}</strong> point(s).</div>
      </section>
    `;
  }

  function renderDrawResult() {
    if (!state.lastDrawResult) {
      els.drawResultSection.innerHTML = `
        <div class="draw-result-panel">
          <div class="draw-placeholder">
            <div style="font-size:1.15rem;font-weight:900;margin-bottom:8px;">Prêtes à laisser le hasard choisir ?</div>
            <div class="small muted">Choisissez un mode juste au-dessus. La petite machine AllieFlix fera tourner les affiches.</div>
          </div>
        </div>
      `;
      return;
    }
    const { film, label } = state.lastDrawResult;
    els.drawResultSection.innerHTML = `
      <div class="draw-result-panel draw-anim final-reveal">
        <div class="draw-result-inner">
          <div>
            ${film.imageUrl
              ? `<img src="${escapeHtml(film.imageUrl)}" alt="Affiche de ${escapeHtml(film.title)}" class="draw-result-poster" />`
              : `<div class="draw-result-poster" style="display:flex;align-items:center;justify-content:center;color:#9bd0cb;">Pas d'image</div>`
            }
          </div>
          <div>
            <div class="chip" style="margin-bottom:10px;">${escapeHtml(label)}</div>
            <h3 style="margin:0 0 10px;font-size:2rem;letter-spacing:-.04em;line-height:1;">${escapeHtml(film.title)}</h3>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;">
              <span class="chip">📺 ${escapeHtml(film.platform || "Plateforme non précisée")}</span>
              <span class="chip">📁 ${escapeHtml(getCategoryName(film.cat))}</span>
              <span class="chip">⭐ Moyenne ${averageRating(film) === null ? "—" : averageRating(film).toFixed(1)}/5</span>
            	${film.favorite ? '<span class="chip favorite">❤️ Favori</span>' : ""}
		${film.mustWatch ? '<span class="chip mustwatch">À voir absolument</span>' : ""}
		${film.seenTogether ? '<span class="chip">🎬 Ensemble</span>' : ""}
              ${film.trailerUrl ? `<a class="chip" href="${escapeHtml(film.trailerUrl)}" target="_blank" rel="noopener noreferrer">▶️ Bande-annonce</a>` : ''}
            </div>
            <p style="margin:0 0 14px;line-height:1.72;color:#e8fffc;">${escapeHtml(film.summary || "Pas de résumé.")}</p>
            <div class="control-strip">
              ${!hasSeenFilm(film, state.activeProfile) && (getPersonalRating(film, state.activeProfile) === null || getPersonalRating(film, state.activeProfile) === undefined || getPersonalRating(film, state.activeProfile) === "")
                ? `<button class="secondary" type="button" onclick="window.openPredictionPrompt('${film.cat}','${film.id}','${state.activeProfile}')">🎯 Prédire ma note</button>`
                : ""}
              <button class="warning" type="button" onclick="window.markDrawResultSeenTonight('${film.cat}','${film.id}')">🍿 On le regarde</button>
              <button class="secondary" type="button" onclick="window.rejectDrawResult('${film.cat}','${film.id}')">🙄 Pas ce soir, relance</button>
              <button class="ghost" type="button" onclick="window.openFilmDetails('${film.cat}','${film.id}')">📖 Voir la fiche</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function updateSelectorButtons() {
    els.toggleDrawCatsBtn.textContent = els.drawCatsWrap.classList.contains("hidden") ? "Choisir" : "Masquer";
    els.toggleLibraryCatsBtn.textContent = els.libraryCatsWrap.classList.contains("hidden") ? "Filtres" : "Masquer";
  }

  function updateLibraryFilterButtons() {
  const mapping = {
    all: els.filterAllBtn,
    unseen: els.filterUnseenBtn,
    seenTogether: els.filterSeenTogetherBtn,
    seenKathie: els.filterSeenKathieBtn,
    seenAlyssia: els.filterSeenAlyssiaBtn,
    favorites: els.filterFavoritesBtn,
    mustWatch: els.filterMustWatchBtn
  };

  Object.entries(mapping).forEach(([key, el]) => {
    el.classList.toggle("primary", state.libraryFilter === key);
    el.classList.toggle("ghost", state.libraryFilter !== key);
  });
}

  function updateCinemaFilterButtons() {
    const mapping = { all: els.cinemaAllBtn, upcoming: els.cinemaUpcomingBtn };
    Object.entries(mapping).forEach(([key, el]) => {
      if (!el) return;
      el.classList.toggle("primary", state.cinemaFilter === key);
      el.classList.toggle("ghost", state.cinemaFilter !== key);
    });
  }

  function updateOurFilmsFilterButtons() {
    const mapping = { all: els.ourFilmsAllBtn, home: els.ourFilmsHomeBtn, cinema: els.ourFilmsCinemaBtn };
    Object.entries(mapping).forEach(([key, el]) => {
      el.classList.toggle("primary", state.ourFilmsFilter === key);
      el.classList.toggle("ghost", state.ourFilmsFilter !== key);
    });
  }

function renderCurrentMainView() {
  if (state.mainView === "bibliotheque") {
    renderFilms();
    return;
  }
  if (state.mainView === "cinema") {
    renderCinema();
    return;
  }
  if (state.mainView === "stats") {
    renderStatsPage();
    return;
  }
  if (state.mainView === "nosfilms") {
    renderOurFilms();
    return;
  }
  if (state.mainView === "tirage") {
    renderDrawResult();
    return;
  }
  if (state.mainView === "challenges") {
    renderChallengesPage();
    return;
  }
  if (state.mainView === "duel") {
    renderDuelPage();
    return;
  }
  if (state.mainView === "duo") {
    renderDuoPage();
    return;
  }
  if (state.mainView === "wrapped") {
    renderWrappedPage();
  }
}

let refreshUITimer = null;

function scheduleRefreshUI(delay = 70) {
  if (refreshUITimer) clearTimeout(refreshUITimer);
  refreshUITimer = setTimeout(() => {
    refreshUITimer = null;
    refreshUI();
  }, delay);
}

function refreshUI() {
  const draft = saveDraftFields();

  // Les petits éléments communs restent synchronisés.
  renderDrawCategories();
  renderLibraryCategories();
  renderCategorySelect();
  renderDuelCategoryOptions();
  renderWrappedYearOptions();
  renderStatsCards(els.sideStats);
  if (state.mainView === "home") renderHomeExperience();
  if (els.categoryFormPanel && !els.categoryFormPanel.classList.contains("hidden")) renderCategoryManager();

  if (typeof renderCinemaAlerts === "function") {
    renderCinemaAlerts();
  }

  // On ne reconstruit plus toutes les grosses pages à chaque changement Firebase.
  // Seule la vue réellement affichée est rendue.
  renderCurrentMainView();

  updateSelectorButtons();
  updateLibraryFilterButtons();
  updateCinemaFilterButtons();
  updateOurFilmsFilterButtons();

  document.getElementById("toggleLibraryViewBtn").textContent =
    state.currentLibraryView === "grid" ? "🖼️ Vue détails" : "🎞️ Vue affiches";

  restoreDraftFields(draft);
}

  let dataLoadErrorShown = false;
  function handleDataLoadError(error) {
    console.error("Erreur de synchronisation Firebase", error);
    hideBootLoader();
    if (!dataLoadErrorShown) {
      dataLoadErrorShown = true;
      showToast("Impossible de synchroniser les données. Vérifiez la connexion puis rechargez la page.", true);
    }
  }

  function syncAllCategoryCounts() {
    let cacheNeedsRebuild = false;

    Object.keys(state.allCategoryListeners).forEach(catId => {
      if (!state.categories.some(c => c.id === catId)) {
        state.allCategoryListeners[catId]();
        delete state.allCategoryListeners[catId];
        delete state.allFilmsMap[catId];
        cacheNeedsRebuild = true;
      }
    });

    if (cacheNeedsRebuild) rebuildFilmsCache();

    state.categories.forEach(cat => {
      if (!state.allCategoryListeners[cat.id]) {
        state.allCategoryListeners[cat.id] = onSnapshot(
          collection(db, "categories", cat.id, "films"),
          snap => {
            state.allFilmsMap[cat.id] = snap.docs.map(d => ({ id: d.id, cat: cat.id, ...d.data() }));
            rebuildFilmsCache();
            scheduleRefreshUI();
            setTimeout(hideBootLoader, 220);
          },
          handleDataLoadError
        );
      }
    });
  }

  function drawFilmKey(film) {
    if (film?.cat && film?.id) return `${film.cat}::${film.id}`;
    return `title::${normalizeTmdbMatchText(film?.title)}`;
  }

  function historyDrawKey(item) {
    if (item?.cat && item?.filmId) return `${item.cat}::${item.filmId}`;
    return `title::${normalizeTmdbMatchText(item?.title)}`;
  }

  function excludeRecentlyDrawnFilms(pool) {
    if (pool.length <= 1 || !state.drawHistory.length) return pool;

    const poolKeys = new Set(pool.map(drawFilmKey));
    const maxExcluded = Math.min(DRAW_REPEAT_COOLDOWN_MAX, pool.length - 1);
    const recentKeys = new Set(
      state.recentDrawSessionKeys
        .filter(key => poolKeys.has(key))
        .slice(0, maxExcluded)
    );

    for (const item of state.drawHistory) {
      const key = historyDrawKey(item);
      if (!poolKeys.has(key) || recentKeys.has(key)) continue;
      recentKeys.add(key);
      if (recentKeys.size >= maxExcluded) break;
    }

    const freshPool = pool.filter(film => !recentKeys.has(drawFilmKey(film)));
    return freshPool.length ? freshPool : pool;
  }

  function drawWeightForFilm(film) {
    let weight = 1;
    if (!film.kathieSeen && !film.alyssiaSeen) weight += 3;
    if (film.favorite) weight += 2;
    const recentIndex = state.drawHistory.findIndex(h => h.title === film.title);
    if (recentIndex === 0) weight -= 4;
    else if (recentIndex > 0 && recentIndex < 5) weight -= 2;
    return Math.max(1, weight);
  }

  function pickWeightedFilm(pool) {
    const expanded = [];
    pool.forEach(f => {
      const weight = drawWeightForFilm(f);
      for (let i = 0; i < weight; i++) expanded.push(f);
    });
    return expanded[Math.floor(Math.random() * expanded.length)];
  }

  async function compressImage(file, maxWidth = 800, quality = 0.78) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
          const width = Math.round(img.width * ratio);
          const height = Math.round(img.height * ratio);
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function uploadToCloudinaryIfConfigured(dataUrl) {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) return dataUrl;
    const formData = new FormData();
    formData.append("file", dataUrl);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok || !data.secure_url) throw new Error("Cloudinary upload failed");
    return data.secure_url;
  }

  async function uploadImageIfNeeded() {
    if (!state.pendingImageUrl && state.editingFilm?.imageUrl) return state.editingFilm.imageUrl || "";
    if (!state.pendingImageUrl) return "";
    return state.pendingImageUrl;
  }

async function autofillFromTMDB() {
  try {
    const titleInput = document.getElementById("filmTitle");
    const title = titleInput.value.trim();
    const year = document.getElementById("filmYear").value.trim();

    if (!TMDB_API_KEY) {
      showToast("Ajoute d'abord ta clé TMDB dans le code", true);
      return;
    }

    if (!title) {
      showToast("Entre un titre avant l'auto-remplissage", true);
      return;
    }

    const searchParams = new URLSearchParams({
      api_key: TMDB_API_KEY,
      query: title,
      language: "fr-FR"
    });

    if (year) {
      searchParams.set("year", year);
    }

    const searchRes = await fetch(`https://api.themoviedb.org/3/search/movie?${searchParams.toString()}`);
    const searchData = await searchRes.json();

    if (!searchData.results || !searchData.results.length) {
      showToast("Film introuvable", true);
      return;
    }

    const movie = searchData.results[0];
    const movieId = movie.id;
    state.pendingTmdbId = Number(movieId) || null;

    const detailsRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}?api_key=${TMDB_API_KEY}&language=fr-FR`
    );
    const details = await detailsRes.json();

    const providersRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`
    );
    const providersData = await providersRes.json();

    const videosRes = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${TMDB_API_KEY}&language=fr-FR`
    );
    const videosData = await videosRes.json();

    const posterUrl = details.poster_path
      ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
      : "";

    const releaseYear = details.release_date ? details.release_date.slice(0, 4) : "";
    const releaseDate = details.release_date || "";

    let platformName = "";
    const frProviders = providersData?.results?.FR;

    if (frProviders) {
      const provider =
        frProviders.flatrate?.[0] ||
        frProviders.rent?.[0] ||
        frProviders.buy?.[0];

      if (provider) {
        platformName = provider.provider_name || "";
      }
    }

    let trailerUrl = "";
    if (Array.isArray(videosData.results)) {
      const trailer =
        videosData.results.find(v =>
          v.site === "YouTube" &&
          v.type === "Trailer" &&
          v.official === true
        ) ||
        videosData.results.find(v =>
          v.site === "YouTube" &&
          v.type === "Trailer"
        ) ||
        videosData.results.find(v =>
          v.site === "YouTube"
        );

      if (trailer?.key) {
        trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
      }
    }

    document.getElementById("filmTitle").value = details.title || title;
    document.getElementById("filmSummary").value = details.overview || "";
    document.getElementById("filmYear").value = releaseYear;
    document.getElementById("filmPlatform").value = platformName;
    document.getElementById("filmTrailerUrl").value = trailerUrl;
    document.getElementById("filmReleaseDate").value = releaseDate;

    if (posterUrl) {
      state.pendingImageUrl = posterUrl;
      els.imagePreview.innerHTML = `
        <img
          src="${posterUrl}"
          alt="Prévisualisation"
          style="width:120px;height:170px;border-radius:18px;object-fit:cover;border:1px solid rgba(255,255,255,.08);"
        />
      `;
    }

    showToast("Film rempli automatiquement ✨");
  } catch (error) {
    console.error(error);
    showToast("Erreur pendant l'auto-remplissage", true);
  }
}
async function addDrawHistory(film, mode){
  await addDoc(collection(db, "drawHistory"), {
    title: film.title,
    mode,
    categoryName: getCategoryName(film.cat),
    cat: film.cat,
    filmId: film.id,
    author: state.activeProfile,
    createdAtMs: Date.now(),
    timeLabel: new Date().toLocaleString("fr-FR")
  });
}

  function watchDrawHistory() {
    const qHistory = query(collection(db, "drawHistory"), orderBy("createdAtMs", "desc"), limit(30));
    onSnapshot(qHistory, snap => {
      state.drawHistory = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderHistory(els.historyList);
      renderHistory(els.mobileHistoryList);
    }, handleDataLoadError);
  }

  function watchCategories() {
    onSnapshot(collection(db, "categories"), snap => {
      state.categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.drawSelectedCats = state.drawSelectedCats.filter(id => state.categories.some(c => c.id === id));
      state.librarySelectedCats = state.librarySelectedCats.filter(id => state.categories.some(c => c.id === id));
      ensureDefaultSelections();
      syncAllCategoryCounts();
      scheduleRefreshUI();
      if (!state.categories.length) setTimeout(hideBootLoader, 220);
    }, handleDataLoadError);
  }

  async function createCategory() {
    try {
      const input = document.getElementById("categoryName");
      const name = input.value.trim();
      if (!name) { showToast("Entre un nom de catégorie", true); return; }
      const exists = state.categories.some(c => (c.name || "").trim().toLowerCase() === name.toLowerCase());
      if (exists) { showToast("Cette catégorie existe déjà", true); return; }
      await addDoc(collection(db, "categories"), { name, createdAtMs: Date.now() });
      input.value = "";
      showToast("Catégorie ajoutée ✨");
    } catch (error) {
      console.error(error);
      showToast("Erreur pendant l'ajout de la catégorie", true);
    }
  }

  function findDuplicateFilm(title, currentId = null) {
    const cleanTitle = (title || "").trim().toLowerCase();
    return getAllFilmsFlat().find(f => (f.title || "").trim().toLowerCase() === cleanTitle && f.id !== currentId) || null;
  }

  async function saveFilm() {
    try {
      const title = document.getElementById("filmTitle").value.trim();
      const platform = document.getElementById("filmPlatform").value.trim();
      const summary = document.getElementById("filmSummary").value.trim();
      const trailerUrl = document.getElementById("filmTrailerUrl").value.trim();
      const year = document.getElementById("filmYear").value.trim();
      const cat = els.filmCategory.value;
      const type = document.getElementById("filmType").value;
      const releaseDateValue = document.getElementById("filmReleaseDate").value;
      const releaseDateMs = parseDateInputToMs(releaseDateValue);
      const selectedCreatedBy = document.getElementById("filmAddedBy").value;

      if (!title) { showToast("Le titre est obligatoire", true); return; }
      if (!cat) { showToast("Choisis une catégorie", true); return; }

      const duplicate = findDuplicateFilm(title, state.editingFilm?.id || null);
      if (duplicate) {
        const confirmDuplicate = confirm(`Un film nommé "${duplicate.title}" existe déjà. Tu veux quand même enregistrer ce doublon ?`);
        if (!confirmDuplicate) return;
      }

      const seenState = normalizeSeenState({ kathieSeen: els.seenKathie.checked, alyssiaSeen: els.seenAlyssia.checked, seenTogether: els.seenTogether.checked });
      const imageUrl = await uploadImageIfNeeded();
      const now = Date.now();
      const previousSeenTogether = !!state.editingFilm?.seenTogether;

      const togetherDateData = seenState.seenTogether
        ? {
            seenTogetherAtMs: previousSeenTogether ? (state.editingFilm?.seenTogetherAtMs || now) : now,
            seenTogetherDateLabel: previousSeenTogether
              ? (state.editingFilm?.seenTogetherDateLabel || formatDate(state.editingFilm?.seenTogetherAtMs || now))
              : formatDate(now)
          }
        : { seenTogetherAtMs: null, seenTogetherDateLabel: "" };

      const commonPayload = {
        title, platform, summary, trailerUrl, year, imageUrl, type, releaseDateMs,
        tmdbId: state.pendingTmdbId || state.editingFilm?.tmdbId || null,
        releaseDateLabel: releaseDateMs ? formatDateOnly(releaseDateMs) : "",
        kathieSeen: seenState.kathieSeen, alyssiaSeen: seenState.alyssiaSeen, seenTogether: seenState.seenTogether,
        ...togetherDateData
      };

      if (state.editingFilm) {
        const preservedFields = { ...state.editingFilm };
        delete preservedFields.id;
        delete preservedFields.cat;

        const payload = {
          ...preservedFields,
          ...commonPayload,
          missed: type === "cinema" && !seenState.seenTogether ? !!state.editingFilm.missed : false,
          mustWatch: (seenState.kathieSeen && seenState.alyssiaSeen) || seenState.seenTogether
            ? false
            : !!state.editingFilm.mustWatch,
          createdAtMs: state.editingFilm.createdAtMs || now,
          createdBy: state.editingFilm.createdBy || state.editingFilm.addedBy || selectedCreatedBy,
          addedBy: state.editingFilm.createdBy || state.editingFilm.addedBy || selectedCreatedBy,
          updatedAtMs: now,
          updatedBy: state.activeProfile
        };

        if (state.editingFilm.cat === cat) {
          await updateDoc(doc(db, "categories", state.editingFilm.cat, "films", state.editingFilm.id), payload);
        } else {
          const batch = writeBatch(db);
          batch.set(doc(db, "categories", cat, "films", state.editingFilm.id), payload);
          batch.delete(doc(db, "categories", state.editingFilm.cat, "films", state.editingFilm.id));
          await batch.commit();
        }
        showToast("Film modifié ✨");
      } else {
       const payload = {
  ...commonPayload,
  ratingKathie: null,
  ratingAlyssia: null,
  favorite: false,
  mustWatch: false,
  missed: false,
  comments: [],
  createdAtMs: now,
  createdBy: selectedCreatedBy,
  addedBy: selectedCreatedBy,
  updatedAtMs: null,
  updatedBy: null
};
        await addDoc(collection(db, "categories", cat, "films"), payload);
        showToast(type === "cinema" ? "Film cinéma ajouté 🍿" : "Film ajouté à la liste 🎉");
      }

      resetFilmForm();
      closeFilmForm();
    } catch (error) {
      console.error(error);
      setUploadLoading(false);
      showToast("Erreur pendant l'enregistrement du film", true);
    }
  }

  async function draw(mode) {
    if (state.isDrawing) return;
    state.lastDrawMode = mode;
    if (!state.drawSelectedCats.length) { showToast("Choisis au moins une catégorie pour le tirage", true); return; }
    const buildPool = () => {
      let result = getAllFilmsFlat().filter(f => isHomeFilm(f) && state.drawSelectedCats.includes(f.cat));
      if (mode === "seen") result = result.filter(f => f.kathieSeen || f.alyssiaSeen);
      if (mode === "unseen") result = result.filter(f => !f.kathieSeen && !f.alyssiaSeen);
      if (mode === "favorites") result = result.filter(f => f.favorite);
      if (mode === "mustWatch") result = result.filter(f => f.mustWatch);
      return result;
    };
    let pool = buildPool().filter(f => !state.drawRejectedIds.has(f.id));
    if (!pool.length && state.drawRejectedIds.size) {
      state.drawRejectedIds.clear();
      pool = buildPool();
    }
    if (!pool.length) { showToast("Aucun film disponible pour ce tirage", true); return; }

    pool = excludeRecentlyDrawnFilms(pool);

    const label =
      mode === "seen" ? "Déjà vus" :
      mode === "unseen" ? "Non vus" :
      mode === "favorites" ? "Favoris" :
      mode === "mustWatch" ? "À voir absolument" :
      "Vus + Non vus";

    state.isDrawing = true;
    document.querySelectorAll(".mode-btn").forEach(btn => btn.disabled = true);
    const shuffled = [...pool].sort(() => Math.random() - .5);
    const preview = shuffled.slice(0, Math.min(9, shuffled.length));

    els.drawResultSection.innerHTML = `
      <div class="draw-roulette-stage premium-roulette">
        <div class="roulette-countdown"><span>3</span><span>2</span><span>1</span></div>
        <div class="roulette-reel">
          ${preview.slice(0,5).map((f,i) => f.imageUrl ? `<img src="${escapeHtml(f.imageUrl)}" alt="" style="--reel-index:${i}" />` : `<div class="roulette-reel-fallback">🎬</div>`).join("")}
        </div>
        <div>
          <div class="roulette-label">Le destin cinématographique est en train de négocier</div>
          <div id="roulettePreviewTitle" class="roulette-title">${escapeHtml(preview[0]?.title || "Suspense…")}</div>
        </div>
      </div>`;
    els.drawResultSection.scrollIntoView({ behavior:"smooth", block:"center" });

    const previewTitle = document.getElementById("roulettePreviewTitle");
    const steps = Math.max(10, preview.length * 2);
    for (let i = 0; i < steps; i++) {
      const sample = preview[i % preview.length] || pool[Math.floor(Math.random() * pool.length)];
      if (previewTitle) previewTitle.textContent = sample.title || "…";
      await sleep(58 + i * 7);
    }

    const film = pickWeightedFilm(pool);
    const selectedKey = drawFilmKey(film);
    state.recentDrawSessionKeys = [selectedKey, ...state.recentDrawSessionKeys.filter(key => key !== selectedKey)]
      .slice(0, DRAW_REPEAT_COOLDOWN_MAX);
    state.lastDrawResult = { film, label };
    renderDrawResult();
    state.isDrawing = false;
    document.querySelectorAll(".mode-btn").forEach(btn => btn.disabled = false);
    addDrawHistory(film, label).catch(error => { console.error(error); showToast("Le tirage a marché, mais pas l'historique", true); });
  }

  async function patchFilm(cat, id, patch) {
    const film = getFilmByIds(cat, id);
    if (!film) return;

    const normalizedPatch = { ...patch };

    if (normalizedPatch.seenTogether === true) {
      normalizedPatch.kathieSeen = true;
      normalizedPatch.alyssiaSeen = true;
      normalizedPatch.missed = false;
    }

    if (normalizedPatch.missed === true) {
      normalizedPatch.seenTogether = false;
      normalizedPatch.seenTogetherAtMs = null;
      normalizedPatch.seenTogetherDateLabel = "";
    }

    const nextKathieSeen = normalizedPatch.kathieSeen ?? film.kathieSeen;
    const nextAlyssiaSeen = normalizedPatch.alyssiaSeen ?? film.alyssiaSeen;
    const nextSeenTogether = normalizedPatch.seenTogether ?? film.seenTogether;
    const shouldRemoveMustWatch = (nextKathieSeen && nextAlyssiaSeen) || nextSeenTogether;

    const finalPatch = {
      ...normalizedPatch,
      ...(shouldRemoveMustWatch ? { mustWatch: false } : {}),
      updatedAtMs: Date.now(),
      updatedBy: state.activeProfile
    };

    await updateDoc(doc(db, "categories", film.cat, "films", film.id), finalPatch);
  }

  function openFilmForm(editMode = false) {
    els.categoryFormPanel?.classList.add("hidden");
    els.filmFormPanel.classList.remove("hidden");
    els.toggleFilmFormBtn.textContent = editMode ? "✏️ Modifier le film" : "➖ Fermer le formulaire";
  }

  function closeFilmForm() {
    els.filmFormPanel.classList.add("hidden");
    els.toggleFilmFormBtn.textContent = "➕ Ajouter un film";
  }

  function resetFilmForm() {
    state.editingFilm = null;
    state.pendingImageFile = null;
    state.pendingImageUrl = "";
    state.pendingTmdbId = null;
    document.getElementById("filmTitle").value = "";
    document.getElementById("filmPlatform").value = "";
    document.getElementById("filmSummary").value = "";
    document.getElementById("filmTrailerUrl").value = "";
    document.getElementById("filmYear").value = "";
    document.getElementById("filmType").value = "home";
    document.getElementById("filmReleaseDate").value = "";
    document.getElementById("filmImage").value = "";
    document.getElementById("filmAddedBy").value = state.activeProfile;
    document.getElementById("filmAddedBy").disabled = false;
    els.imagePreview.textContent = "Aucune image sélectionnée.";
    els.seenKathie.checked = false;
    els.seenAlyssia.checked = false;
    els.seenBoth.checked = false;
    els.seenTogether.checked = false;
    els.filmFormTitle.textContent = "Ajouter un film";
    els.editBanner.classList.add("hidden");
    els.editBanner.textContent = "";
setUploadLoading(false);
hideTitleSuggestions();
}
  

  function bindEvents() {
    els.closePredictionBtn?.addEventListener("click", closePredictionPrompt);
    els.predictionLaterBtn?.addEventListener("click", closePredictionPrompt);
    els.predictionBackdrop?.addEventListener("click", closePredictionPrompt);

    els.activeProfileSelect.addEventListener("change", () => {
      state.activeProfile = els.activeProfileSelect.value;
      localStorage.setItem("allieflix_active_profile", state.activeProfile);
      if (!state.editingFilm) document.getElementById("filmAddedBy").value = state.activeProfile;
      showToast(`Profil actif : ${state.activeProfile}`);
      renderHomeExperience();
    });

window.addEventListener("scroll", () => {
  els.scrollTopBtn.classList.toggle("hidden", window.scrollY < 420);
});

els.scrollTopBtn.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

    els.seenBoth.addEventListener("change", () => applySeenCheckboxLogic("both"));
    els.seenTogether.addEventListener("change", () => applySeenCheckboxLogic("together"));
    els.seenKathie.addEventListener("change", () => applySeenCheckboxLogic("kathie"));
    els.seenAlyssia.addEventListener("change", () => applySeenCheckboxLogic("alyssia"));

    document.getElementById("addCategoryBtn").addEventListener("click", createCategory);
    document.getElementById("saveFilmBtn").addEventListener("click", saveFilm);
    document.getElementById("fetchPosterBtn").addEventListener("click", autofillFromTMDB);
els.filmTitle.addEventListener("input", () => {
  const value = els.filmTitle.value.trim();

  clearTimeout(titleSuggestTimeout);

  if (!TMDB_API_KEY || value.length < 2) {
    hideTitleSuggestions();
    return;
  }

  titleSuggestTimeout = setTimeout(async () => {
    try {
      const results = await searchTmdbTitles(value);
      renderTitleSuggestions(results);
    } catch (error) {
      console.error(error);
      hideTitleSuggestions();
    }
  }, 250);
});

els.filmTitle.addEventListener("blur", () => {
  setTimeout(() => hideTitleSuggestions(), 180);
});

    document.getElementById("cancelFilmFormBtn").addEventListener("click", () => { resetFilmForm(); closeFilmForm(); });

    els.toggleFilmFormBtn.addEventListener("click", () => {
      if (els.filmFormPanel.classList.contains("hidden")) { resetFilmForm(); openFilmForm(false); }
      else { resetFilmForm(); closeFilmForm(); }
    });

    document.getElementById("toggleCategoryFormBtn").addEventListener("click", () => {
      els.categoryFormPanel.classList.toggle("hidden");
      if (!els.categoryFormPanel.classList.contains("hidden")) {
        els.filmFormPanel.classList.add("hidden");
        els.toggleFilmFormBtn.textContent = "➕ Ajouter un film";
        renderCategoryManager();
      }
    });

    els.toggleDrawCatsBtn.addEventListener("click", () => { els.drawCatsWrap.classList.toggle("hidden"); updateSelectorButtons(); });
    els.toggleLibraryCatsBtn.addEventListener("click", () => { els.libraryCatsWrap.classList.toggle("hidden"); updateSelectorButtons(); });

const runLibrarySearch = (navigate = false) => {
  state.globalSearchTerm = els.globalSearchInput.value.trim();
  state.focusedFilm = null;
  state.librarySelectedCats = state.categories.map(c => c.id);
  if (navigate) setMainView("bibliotheque");
  renderLibraryCategories();
  renderFilms();
};

const clearLibrarySearch = () => {
  state.globalSearchTerm = "";
  state.focusedFilm = null;
  els.globalSearchInput.value = "";
  els.clearSearchMiniBtn.classList.add("hidden");
  els.searchSuggestionBox.textContent = "";
  state.librarySelectedCats = state.categories.map(c => c.id);
  if (state.mainView !== "bibliotheque") setMainView("bibliotheque");
  renderLibraryCategories();
  renderFilms();
};

let librarySearchTimer = null;
document.getElementById("globalSearchBtn").addEventListener("click", () => runLibrarySearch(true));
els.clearSearchMiniBtn.addEventListener("click", clearLibrarySearch);
document.getElementById("clearGlobalSearchBtn").addEventListener("click", clearLibrarySearch);

els.globalSearchInput.addEventListener("input", () => {
  const q = els.globalSearchInput.value.trim();
  els.clearSearchMiniBtn.classList.toggle("hidden", !q);
  clearTimeout(librarySearchTimer);

  if (!q) {
    els.searchSuggestionBox.innerHTML = "";
    state.globalSearchTerm = "";
    state.focusedFilm = null;
    if (state.mainView === "bibliotheque") renderFilms();
    return;
  }

  const suggestions = getSearchSuggestions(q);
  els.searchSuggestionBox.innerHTML = suggestions.length
    ? suggestions.map(f => `<button class="search-suggestion-chip" type="button" data-cat="${f.cat}" data-id="${f.id}">${escapeHtml(f.title)}</button>`).join("")
    : `<span class="small muted">Continuez à écrire pour affiner la recherche.</span>`;

  els.searchSuggestionBox.querySelectorAll(".search-suggestion-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const film = getFilmByIds(chip.dataset.cat, chip.dataset.id);
      if (!film) return;
      els.globalSearchInput.value = film.title || "";
      els.searchSuggestionBox.innerHTML = "";
      window.openFilmDetails(film.cat, film.id);
    });
  });

  librarySearchTimer = setTimeout(() => {
    state.globalSearchTerm = q;
    state.librarySelectedCats = state.categories.map(c => c.id);
    if (state.mainView === "bibliotheque") renderFilms();
  }, 240);
});

els.globalSearchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") runLibrarySearch(true);
});

    els.sortSelect.addEventListener("change", () => {
      state.sortMode = els.sortSelect.value;
      localStorage.setItem("allieflix_sort_mode", state.sortMode);
      renderFilms(); renderCinema(); renderOurFilms();
    });

    document.getElementById("toggleLibraryViewBtn").addEventListener("click", () => {
      state.currentLibraryView = state.currentLibraryView === "grid" ? "list" : "grid";
      localStorage.setItem("allieflix_view_mode", state.currentLibraryView);
      renderFilms();
      document.getElementById("toggleLibraryViewBtn").textContent = state.currentLibraryView === "grid" ? "🖼️ Vue détails" : "🎞️ Vue affiches";
    });

    els.filterAllBtn.addEventListener("click", () => { state.libraryFilter = "all"; localStorage.setItem("allieflix_library_filter", state.libraryFilter); updateLibraryFilterButtons(); renderFilms(); });
    els.filterUnseenBtn.addEventListener("click", () => { state.libraryFilter = "unseen"; localStorage.setItem("allieflix_library_filter", state.libraryFilter); updateLibraryFilterButtons(); renderFilms(); });
    els.filterSeenTogetherBtn.addEventListener("click", () => { state.libraryFilter = "seenTogether"; localStorage.setItem("allieflix_library_filter", state.libraryFilter); updateLibraryFilterButtons(); renderFilms(); });
    els.filterFavoritesBtn.addEventListener("click", () => { state.libraryFilter = "favorites"; localStorage.setItem("allieflix_library_filter", state.libraryFilter); updateLibraryFilterButtons(); renderFilms(); });
els.filterSeenKathieBtn.addEventListener("click", () => { state.libraryFilter = "seenKathie"; localStorage.setItem("allieflix_library_filter", state.libraryFilter); updateLibraryFilterButtons(); renderFilms(); });
els.filterSeenAlyssiaBtn.addEventListener("click", () => { state.libraryFilter = "seenAlyssia"; localStorage.setItem("allieflix_library_filter", state.libraryFilter); updateLibraryFilterButtons(); renderFilms(); });
els.filterMustWatchBtn.addEventListener("click", () => {
  state.libraryFilter = "mustWatch";
  localStorage.setItem("allieflix_library_filter", state.libraryFilter);
  updateLibraryFilterButtons();
  renderFilms();
});

    els.cinemaAllBtn.addEventListener("click", () => { state.cinemaFilter = "all"; updateCinemaFilterButtons(); renderCinema(); });
    els.cinemaUpcomingBtn.addEventListener("click", () => { state.cinemaFilter = "upcoming"; updateCinemaFilterButtons(); renderCinema(); });

    els.ourFilmsAllBtn.addEventListener("click", () => { state.ourFilmsFilter = "all"; updateOurFilmsFilterButtons(); renderOurFilms(); });
    els.ourFilmsHomeBtn.addEventListener("click", () => { state.ourFilmsFilter = "home"; updateOurFilmsFilterButtons(); renderOurFilms(); });
    els.ourFilmsCinemaBtn.addEventListener("click", () => { state.ourFilmsFilter = "cinema"; updateOurFilmsFilterButtons(); renderOurFilms(); });

    document.getElementById("drawAll").addEventListener("click", () => draw("all"));
    document.getElementById("drawSeen").addEventListener("click", () => draw("seen"));
    document.getElementById("drawUnseen").addEventListener("click", () => draw("unseen"));
    document.getElementById("drawFavorites").addEventListener("click", () => draw("favorites"));
    document.getElementById("drawMustWatch").addEventListener("click", () => draw("mustWatch"));
    els.startDuelBtn?.addEventListener("click", startAllieDuel);
    els.wrappedYearSelect?.addEventListener("change", () => {
      state.wrappedYear = Number(els.wrappedYearSelect.value) || new Date().getFullYear();
      localStorage.setItem("allieflix_wrapped_year", String(state.wrappedYear));
      renderWrappedPage();
    });

    els.goHomeBtn.addEventListener("click", showHome);
    els.homeDrawBtn?.addEventListener("click", () => setMainView("tirage"));
    els.homeLibraryBtn?.addEventListener("click", () => setMainView("bibliotheque"));
    const openAddFilmFlow = () => {
      resetFilmForm();
      setMainView("ajout");
      openFilmForm(false);
      requestAnimationFrame(() => els.filmTitle?.focus());
    };
    els.topQuickAddBtn?.addEventListener("click", openAddFilmFlow);
    document.querySelectorAll("[data-home-view]").forEach(el => el.addEventListener("click", () => {
      const view = el.dataset.homeView;
      const filter = el.dataset.homeFilter;
      if (filter) {
        state.libraryFilter = filter;
        localStorage.setItem("allieflix_library_filter", filter);
      }
      if (view === "ajout") openAddFilmFlow();
      else setMainView(view);
      if (view === "bibliotheque") updateLibraryFilterButtons();
    }));
    document.querySelectorAll(".nav-card").forEach(card => card.addEventListener("click", () => {
      if (card.dataset.view === "ajout") openAddFilmFlow();
      else setMainView(card.dataset.view);
    }));
    document.querySelectorAll(".mobile-nav button[data-mobile-view]").forEach(btn => btn.addEventListener("click", () => setMainView(btn.dataset.mobileView)));
    els.mobileHomeBtn?.addEventListener("click", showHome);

    const openMoreSheet = () => {
      els.moreSheet?.classList.remove("hidden");
      els.moreSheetBackdrop?.classList.remove("hidden");
      document.body.style.overflow = "hidden";
    };
    els.mobileMoreBtn?.addEventListener("click", openMoreSheet);
    els.closeMoreSheetBtn?.addEventListener("click", closeMoreSheet);
    els.moreSheetBackdrop?.addEventListener("click", closeMoreSheet);
    document.querySelectorAll("[data-extra-view]").forEach(btn => btn.addEventListener("click", () => {
      closeMoreSheet();
      if (btn.dataset.extraView === "ajout") openAddFilmFlow();
      else setMainView(btn.dataset.extraView);
    }));
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      if (!els.predictionSheet?.classList.contains("hidden")) {
        closePredictionPrompt();
        return;
      }
      if (!els.moreSheet?.classList.contains("hidden")) closeMoreSheet();
    });

    document.getElementById("filmImage").addEventListener("change", async e => {
      const file = e.target.files?.[0];
      if (!file) {
        state.pendingImageFile = null;
        const fallback = state.editingFilm?.imageUrl || "";
        state.pendingImageUrl = fallback;
        els.imagePreview.innerHTML = fallback
          ? `<img src="${escapeHtml(fallback)}" alt="Prévisualisation" style="width:120px;height:170px;border-radius:18px;object-fit:cover;border:1px solid rgba(255,255,255,.08);" />`
          : "Aucune image sélectionnée.";
        return;
      }
      try {
        setUploadLoading(true);
        const compressed = await compressImage(file, 800, 0.78);
        const finalUrl = await uploadToCloudinaryIfConfigured(compressed);
        state.pendingImageFile = file;
        state.pendingImageUrl = finalUrl;
        els.imagePreview.innerHTML = `<img src="${finalUrl}" alt="Prévisualisation" style="width:120px;height:170px;border-radius:18px;object-fit:cover;border:1px solid rgba(255,255,255,.08);" />`;
        showToast(CLOUDINARY_CLOUD_NAME ? "Image envoyée sur Cloudinary ✨" : "Image compressée automatiquement ✨");
      } catch (error) {
        console.error(error);
        showToast("Impossible de traiter cette image", true);
      } finally {
        setUploadLoading(false);
      }
    });
  }

  window.toggleSummary = key => {
    state.expandedSummaries[key] = !state.expandedSummaries[key];
    renderFilms(); renderCinema(); renderOurFilms();
  };
window.quickToggleFavorite = async (cat, id) => {
  const film = getFilmByIds(cat, id);
  if (!film) return;

  try {
    await updateDoc(
      doc(db, "categories", cat, "films", id),
      {
        favorite: !film.favorite,
        updatedAtMs: Date.now(),
        updatedBy: state.activeProfile
      }
    );
    showToast(!film.favorite ? "Cœur ajouté ❤️" : "Retiré des favoris");
  } catch (error) {
    console.error(error);
    showToast("Impossible de modifier les favoris", true);
  }
};

window.quickToggleMustWatch = async (cat, id) => {
  const film = getFilmByIds(cat, id);
  if (!film) return;

  const nextValue = !film.mustWatch;
  if (nextValue && ((film.kathieSeen && film.alyssiaSeen) || film.seenTogether)) {
    showToast("Ce film est déjà vu par vous deux 🎬", true);
    return;
  }

  try {
    await patchFilm(cat, id, { mustWatch: nextValue });
    showToast(nextValue ? "Promu dans les incontournables ⭐" : "Retiré des incontournables");
  } catch (error) {
    console.error(error);
    showToast("Impossible de modifier À voir absolument", true);
  }
};

window.navigateAllieFlix = view => setMainView(view);
window.openPredictionPrompt = openPredictionPrompt;

window.closeFocusedFilm = () => {
  if (history.state?.allieflix && history.state.focusedFilm) {
    history.back();
    return;
  }

  state.focusedFilm = null;
  renderFilms();

  requestAnimationFrame(() => {
    window.scrollTo({
      top: state.libraryScrollY || 0,
      behavior: "auto"
    });
  });
};

window.closeFocusedCinemaFilm = () => {
  if (history.state?.allieflix && history.state.focusedFilm) {
    history.back();
    return;
  }

  state.focusedFilm = null;
  state.cinemaFilter = "all";
  updateCinemaFilterButtons();
  renderCinema();
};

 window.openFilmDetails = (cat, id) => {
  const film = getFilmByIds(cat, id);
  if (!film) return;

if (shouldAppearInLibrary(film)) {
  state.libraryScrollY = window.scrollY;
  state.focusedFilm = { cat, id };
  state.currentLibraryView = "list";
  localStorage.setItem("allieflix_view_mode", state.currentLibraryView);
  setMainView("bibliotheque");
  renderFilms();
  window.scrollTo({ top: 0, behavior: "auto" });
  return;
}

 state.focusedFilm = { cat, id };
state.cinemaFilter = "all";
setMainView("cinema");
renderCinema();
window.scrollTo({ top: 0, behavior: "auto" });
};

  window.startEditFilm = (cat, id) => {
    const film = getFilmByIds(cat, id);
    if (!film) return;
    state.editingFilm = { ...film };
    state.pendingImageFile = null;
    state.pendingImageUrl = film.imageUrl || "";
    state.pendingTmdbId = film.tmdbId || null;
    document.getElementById("filmTitle").value = film.title || "";
    document.getElementById("filmPlatform").value = film.platform || "";
    document.getElementById("filmSummary").value = film.summary || "";
    document.getElementById("filmTrailerUrl").value = film.trailerUrl || "";
    document.getElementById("filmYear").value = film.year || "";
    document.getElementById("filmType").value = film.type || "home";
    document.getElementById("filmReleaseDate").value = msToDateInput(film.releaseDateMs);
    els.filmCategory.value = film.cat;
    document.getElementById("filmAddedBy").value = film.createdBy || film.addedBy || state.activeProfile;
    document.getElementById("filmAddedBy").disabled = true;
    els.imagePreview.innerHTML = film.imageUrl
      ? `<img src="${escapeHtml(film.imageUrl)}" alt="Prévisualisation" style="width:120px;height:170px;border-radius:18px;object-fit:cover;border:1px solid rgba(255,255,255,.08);" />`
      : "Aucune image sélectionnée.";
    const normalized = normalizeSeenState({ kathieSeen: film.kathieSeen, alyssiaSeen: film.alyssiaSeen, seenTogether: film.seenTogether });
    els.seenKathie.checked = normalized.kathieSeen;
    els.seenAlyssia.checked = normalized.alyssiaSeen;
    els.seenBoth.checked = normalized.bothSeen;
    els.seenTogether.checked = normalized.seenTogether;
    els.filmFormTitle.textContent = "Modifier un film";
    els.editBanner.textContent = `Modification de ${film.title}`;
    els.editBanner.classList.remove("hidden");
    setMainView("ajout");
    openFilmForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  window.startAllieDuel = startAllieDuel;

  window.chooseDuelWinner = id => {
    const winner = state.duelPair.find(f => f.id === id);
    if (!winner) return;
    saveDuelWin(winner);
    state.duelNextRound.push(winner);
    state.duelPair = [];
    prepareNextDuelMatch();
  };

  window.saveFilmMemory = async (cat, id) => {
    try {
      const place = document.getElementById(`memoryPlace-${cat}-${id}`)?.value || "";
      const location = document.getElementById(`memoryLocation-${cat}-${id}`)?.value.trim() || "";
      const note = document.getElementById(`memoryNote-${cat}-${id}`)?.value.trim() || "";
      await patchFilm(cat, id, {
        memoryPlace: place,
        memoryLocation: location,
        memoryNote: note,
        memoryUpdatedAtMs: Date.now()
      });
      showToast("Souvenir rangé dans votre bobine 💌");
    } catch (error) {
      console.error(error);
      showToast("Impossible d’enregistrer ce souvenir", true);
    }
  };

  window.toggleK = async (cat, id, value) => {
    try {
      const film = getFilmByIds(cat, id);
      if (!film) return;
      const normalized = normalizeSeenState({ kathieSeen: value, alyssiaSeen: film.alyssiaSeen, seenTogether: film.seenTogether });
      const patch = { kathieSeen: normalized.kathieSeen, alyssiaSeen: normalized.alyssiaSeen, seenTogether: normalized.seenTogether };
      if (!normalized.seenTogether) { patch.seenTogetherAtMs = null; patch.seenTogetherDateLabel = ""; }
      await patchFilm(cat, id, patch);
    } catch (error) { console.error(error); showToast("Erreur pendant la mise à jour", true); }
  };

  window.toggleA = async (cat, id, value) => {
    try {
      const film = getFilmByIds(cat, id);
      if (!film) return;
      const normalized = normalizeSeenState({ kathieSeen: film.kathieSeen, alyssiaSeen: value, seenTogether: film.seenTogether });
      const patch = { kathieSeen: normalized.kathieSeen, alyssiaSeen: normalized.alyssiaSeen, seenTogether: normalized.seenTogether };
      if (!normalized.seenTogether) { patch.seenTogetherAtMs = null; patch.seenTogetherDateLabel = ""; }
      await patchFilm(cat, id, patch);
    } catch (error) { console.error(error); showToast("Erreur pendant la mise à jour", true); }
  };

  window.setBoth = async (cat, id) => {
    try {
      const film = getFilmByIds(cat, id);
      if (!film) return;
      const normalized = normalizeSeenState({ kathieSeen: true, alyssiaSeen: true, seenTogether: film.seenTogether });
      await patchFilm(cat, id, { kathieSeen: normalized.kathieSeen, alyssiaSeen: normalized.alyssiaSeen, seenTogether: normalized.seenTogether });
      showToast("Film marqué vu par les deux ✨");
    } catch (error) { console.error(error); showToast("Erreur pendant la mise à jour", true); }
  };

  window.toggleTogether = async (cat, id, value) => {
    try {
      const film = getFilmByIds(cat, id);
      if (!film) return;
      const now = Date.now();
      const patch = value
        ? {
            kathieSeen: true,
            alyssiaSeen: true,
            seenTogether: true,
            seenTogetherAtMs: now,
            seenTogetherDateLabel: formatDate(now)
          }
        : {
            seenTogether: false,
            seenTogetherAtMs: null,
            seenTogetherDateLabel: ""
          };

      await patchFilm(cat, id, patch);
      if (value && isCinemaFilm(film)) showToast("Une séance de plus dans votre histoire 🍿");
      else showToast(value ? "Film ajouté à votre histoire à deux 🎬" : 'Statut "vu ensemble" retiré');
    } catch (error) { console.error(error); showToast("Erreur pendant la mise à jour", true); }
  };

  window.toggleMissed = async (cat, id, value) => {
    try {
      await patchFilm(cat, id, { missed: value });
      showToast(value ? "Raté, mais bien rangé dans la bibliothèque 😔" : "Le film revient dans vos sorties cinéma 🍿");
    } catch (error) { console.error(error); showToast("Erreur pendant la mise à jour", true); }
  };

window.setPersonalRating = async (cat, id, person, value) => {
  try {
    const film = getFilmByIds(cat, id);
    if (!film) return;

    const field = ratingField(person);
    const numericValue = Number(value);

    if (numericValue === LEGENDARY_RATING && Number(film[field]) !== LEGENDARY_RATING) {
      const used = getLegendaryCount(person, film.id);
      if (used >= MAX_LEGENDARY_PER_PROFILE) {
        showToast(`${person} a déjà utilisé ses 3 places « LE FILM » 👑`, true);
        return;
      }
    }

    await patchFilm(cat, id, { [field]: numericValue });

    if (numericValue === LEGENDARY_RATING) {
      const remaining = getLegendaryRemaining(person);
      showToast(`👑 ${film.title} entre dans le panthéon de ${person} · ${remaining} place${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}`);
    } else {
      showToast(`Note ${person} enregistrée ⭐`);
    }
  } catch (error) {
    console.error(error);
    showToast("Erreur pendant l'enregistrement de la note", true);
  }
};
window.clearPersonalRating = async (cat, id, person) => {
  try {
    await patchFilm(cat, id, { [ratingField(person)]: null });
    showToast(`Note ${person} retirée`);
  } catch (error) {
    console.error(error);
    showToast("Erreur pendant la suppression de la note", true);
  }
};

  window.toggleFavorite = async (cat, id, value) => {
    try {
      await patchFilm(cat, id, { favorite: value });
      showToast(value ? "Ajouté aux favoris ❤️" : "Retiré des favoris");
    } catch (error) { console.error(error); showToast("Erreur pendant la mise à jour du favori", true); }
  };
window.toggleMustWatch = async (cat, id, value) => {
  const film = getFilmByIds(cat, id);
  if (!film) return;

  if (value && ((film.kathieSeen && film.alyssiaSeen) || film.seenTogether)) {
    showToast("Ce film est déjà vu par vous deux 🎬", true);
    return;
  }

  try {
    await patchFilm(cat, id, { mustWatch: value });

    if (value) {
      state.highlightedMustWatch = `${film.cat}_${film.id}`;
      renderFilms();
      setTimeout(() => {
        state.highlightedMustWatch = null;
        renderFilms();
      }, 1000);
    }

    showToast(value ? "Ajouté à voir absolument ⭐" : "Retiré de la liste À voir absolument");
  } catch (error) {
    console.error(error);
    showToast("Erreur pendant la mise à jour", true);
  }
};

  window.toggleMoveBox = (cat, id) => {
    const el = document.getElementById(`moveBox-${cat}-${id}`);
    if (el) el.classList.toggle("hidden");
  };

  window.confirmMoveFilm = async (cat, id) => {
    try {
      const select = document.getElementById(`moveSelect-${cat}-${id}`);
      const targetCat = select?.value;
      const film = getFilmByIds(cat, id);
      if(!film || !targetCat) return;
      if(targetCat === cat) { showToast("Le film est déjà dans cette catégorie"); return; }
      const payload = { ...film, updatedAtMs: Date.now(), updatedBy: state.activeProfile };
      delete payload.id; delete payload.cat;
      const batch = writeBatch(db);
      batch.set(doc(db, "categories", targetCat, "films", film.id), payload);
      batch.delete(doc(db, "categories", film.cat, "films", film.id));
      await batch.commit();
      showToast("Film déplacé ✨");
    } catch (error) { console.error(error); showToast("Erreur pendant le déplacement du film", true); }
  };

  window.removeFilm = async (cat, id) => {
    try {
      const film = getFilmByIds(cat, id);
      if (!film) return;
      const ok = confirm(`Supprimer définitivement "${film.title}" ?`);
      if (!ok) return;
      await deleteDoc(doc(db, "categories", cat, "films", id));
      showToast("Film supprimé");
    } catch (error) { console.error(error); showToast("Erreur pendant la suppression", true); }
  };
window.addComment = async (cat, id) => {
  try {
    const input = document.getElementById(`commentInput-${cat}-${id}`);
    const text = input?.value.trim();
    if (!text) return;

    const comment = {
      author: state.activeProfile,
      createdAtMs: Date.now(),
      dateLabel: new Date().toLocaleString("fr-FR"),
      text
    };

    await patchFilm(cat, id, {
      comments: arrayUnion(comment)
    });

    input.value = "";
    showToast("Commentaire ajouté ✨");
  } catch (error) {
    console.error(error);
    showToast("Erreur pendant l'ajout du commentaire", true);
  }
};

window.startEditComment = (cat, id, commentId) => {
  const film = getFilmByIds(cat, id);
  if (!film || !Array.isArray(film.comments)) return;

  const targetComment = film.comments.find(c => {
    const currentCommentId = c.id || `${c.author || "unknown"}_${c.createdAtMs || 0}`;
    return currentCommentId === commentId;
  });

  if (!targetComment || targetComment.author !== state.activeProfile) return;

  state.editingComments[`${cat}_${id}_${commentId}`] = true;
  renderFilms();
  renderCinema();
  renderOurFilms();
};

window.cancelEditComment = (cat, id, commentId) => {
  delete state.editingComments[`${cat}_${id}_${commentId}`];
  renderFilms();
  renderCinema();
  renderOurFilms();
};

window.saveEditedComment = async (cat, id, commentId) => {
  try {
    const film = getFilmByIds(cat, id);
    if (!film || !Array.isArray(film.comments)) return;

    const input = document.getElementById(`editCommentInput-${cat}-${id}-${commentId}`);
    const newText = input?.value.trim();
    if (!newText) {
      showToast("Le commentaire ne peut pas être vide", true);
      return;
    }

    const comments = film.comments.map(c => {
  const currentCommentId = c.id || `${c.author || "unknown"}_${c.createdAtMs || 0}`;
  if (currentCommentId !== commentId) return c;
  if (c.author !== state.activeProfile) return c;

  return {
    ...c,
    text: newText,
    editedAtMs: Date.now(),
    dateLabel: new Date().toLocaleString("fr-FR")
  };
});
    delete state.editingComments[`${cat}_${id}_${commentId}`];

renderFilms();
renderCinema();
renderOurFilms();

await patchFilm(cat, id, { comments });

showToast("Commentaire modifié ✨");
  } catch (error) {
    console.error(error);
    showToast("Erreur pendant la modification du commentaire", true);
  }
};
  window.rejectDrawResult = async (cat, id) => {
    state.drawRejectedIds.add(id);
    showToast("Très bien, lui il attendra son heure 😌");
    state.lastDrawResult = null;
    await draw(state.lastDrawMode || "all");
  };

  window.markDrawResultSeenTonight = async (cat, id) => {
    try {
      const now = Date.now();
      const film = getFilmByIds(cat, id);
      await patchFilm(cat, id, { kathieSeen: true, alyssiaSeen: true, seenTogether: true, seenTogetherAtMs: now, seenTogetherDateLabel: formatDate(now) });
      showToast("Film marqué vu ce soir 🎬");
      setMainView("nosfilms");
    } catch (error) { console.error(error); showToast("Erreur pendant la mise à jour", true); }
  };

  bindEvents();
initMobileNavigationHistory();
setupMobileAppInstall();
watchCategories();
watchDrawHistory();
refreshUI();
resetFilmForm();
closeFilmForm();
updateSelectorButtons();
updateLibraryFilterButtons();
updateCinemaFilterButtons();
updateOurFilmsFilterButtons();

function restoreViewOnLoad(){
  const saved = state.mainView;

  if(saved === "home"){
    showHome();
  } else {
    setMainView(saved);
  }
}

restoreViewOnLoad();
setTimeout(hideBootLoader, 3500);
