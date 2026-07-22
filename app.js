import {
  db,
  collection,
  addDoc,
  doc,
  deleteDoc,
  onSnapshot,
  updateDoc,
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
};

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
    homeHistory: document.getElementById("homeHistory"),
    homeStats: document.getElementById("homeStats"),
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
    cinemaSeenBtn: document.getElementById("cinemaSeenBtn"),
    cinemaMissedBtn: document.getElementById("cinemaMissedBtn"),
    ourFilmsAllBtn: document.getElementById("ourFilmsAllBtn"),
    ourFilmsHomeBtn: document.getElementById("ourFilmsHomeBtn"),
    ourFilmsCinemaBtn: document.getElementById("ourFilmsCinemaBtn"),
filmTitle: document.getElementById("filmTitle"),
scrollTopBtn: document.getElementById("scrollTopBtn"),
titleSuggestions: document.getElementById("titleSuggestions"),
  };
els.globalSearchInput.addEventListener("input", () => {
  const q = els.globalSearchInput.value.trim();

  // Affiche / cache la croix
  els.clearSearchMiniBtn.classList.toggle("hidden", !q);
});
els.clearSearchMiniBtn.addEventListener("click", () => {
  els.globalSearchInput.value = "";
  els.globalSearchInput.dispatchEvent(new Event("input"));
});

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

  function showToast(msg, isError = false) {
    els.toast.textContent = msg;
    els.toast.style.background = isError
      ? "linear-gradient(135deg,#ff7d97,#ffb1c0)"
      : "linear-gradient(135deg,#32d6c6,#7ef6ef)";
    els.toast.style.color = isError ? "#2b0710" : "#042023";
    els.toast.classList.remove("hidden");
    setTimeout(() => els.toast.classList.add("hidden"), 2400);
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
function showHome() {
  els.homePage.classList.remove("hidden");
  els.homePage.style.display = "";
  els.appPage.classList.add("hidden");
  els.appPage.style.display = "none";
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

  function getFilmCount(catId) {
    return (state.allFilmsMap[catId] || []).length;
  }

  function getAllFilmsFlat() {
    return Object.values(state.allFilmsMap).flat();
  }

  function getFilmByIds(cat, id) {
    return getAllFilmsFlat().find(f => f.cat === cat && f.id === id) || null;
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
  if (!fr) return "";

  const provider =
    fr.flatrate?.[0] ||
    fr.rent?.[0] ||
    fr.buy?.[0] ||
    null;

  return provider?.provider_name || "";
}

function extractTrailerUrl(videos) {
  const results = Array.isArray(videos?.results) ? videos.results : [];
  const trailer = results.find(v =>
    v.site === "YouTube" &&
    (v.type === "Trailer" || v.type === "Teaser")
  );
 return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : "";
}

function trailersafe(value) {
  return String(value || "").trim();
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
localStorage.setItem("allieflix_main_view", view);
if (view !== "bibliotheque" && view !== "cinema") {
  state.focusedFilm = null;
localStorage.setItem("mainView", view);
}
    showApp();
    document.querySelectorAll(".nav-card").forEach(card => {
      card.classList.toggle("active", card.dataset.view === view);
    });
    document.querySelectorAll(".mobile-nav button").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.mobileView === view);
    });
    els.tirageView.classList.toggle("hidden", view !== "tirage");
    els.ajoutView.classList.toggle("hidden", view !== "ajout");
    els.bibliothequeView.classList.toggle("hidden", view !== "bibliotheque");
    els.cinemaView.classList.toggle("hidden", view !== "cinema");
    els.statsView.classList.toggle("hidden", view !== "stats");
    els.nosfilmsView.classList.toggle("hidden", view !== "nosfilms");
const isMobile = window.innerWidth <= 980;

if (els.appSidebar) {
  if (isMobile) {
    els.appSidebar.classList.add("hidden");
    els.appSidebar.style.display = "none";
  } else {
    els.appSidebar.classList.remove("hidden");
    els.appSidebar.style.display = "";
  }
}

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

  const shouldAppearInLibrary = (f) => {
    if (isHomeFilm(f)) return true;

    return isCinemaFilm(f) && (
      f.seenTogether ||
      (f.kathieSeen && f.alyssiaSeen) ||
      f.kathieSeen ||
      f.alyssiaSeen
    );
  };

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
  let list = getAllFilmsFlat().filter(f => isCinemaFilm(f));

  list.sort((a, b) => {
    const aDate = a.releaseDateMs || 9999999999999;
    const bDate = b.releaseDateMs || 9999999999999;
    return aDate - bDate;
  });

  if (state.cinemaFilter === "upcoming") {
    const now = new Date();
    now.setHours(0,0,0,0);
    const todayMs = now.getTime();

    list = list.filter(f =>
      (f.releaseDateMs || 0) >= todayMs &&
      !f.seenTogether &&
      !f.missed
    );
  }

  if (state.cinemaFilter === "seen") {
    list = list.filter(f => f.seenTogether || (f.kathieSeen && f.alyssiaSeen));
  }

  if (state.cinemaFilter === "missed") {
    list = list.filter(f => f.missed === true);
  }

  return list;
}

  function getOurFilms() {
    let list = sortFilms(getAllFilmsFlat().filter(f => f.seenTogether), "recent");
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
    const sourceFilms = getAllFilmsFlat().filter(f => isHomeFilm(f));
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
    const filmCount = (state.allFilmsMap[cat.id] || []).filter(f => isHomeFilm(f)).length;

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
      Number(c.createdAtMs || c.updatedAtMs || c.dateMs || 0)
    )
  );
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
        ? `<img src="${escapeHtml(f.imageUrl)}" alt="Affiche de ${escapeHtml(f.title)}" loading="lazy" />`
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

  function renderFilmCard(f, options = {}) {
  const key = `${f.cat}_${f.id}`;
  const bothSeen = f.kathieSeen && f.alyssiaSeen;
  const includeComments = !!options.includeComments;
  const clickable = !!options.clickable;
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
  const comment = Array.isArray(f.comments)
    ? f.comments.find(c => c.author === "Kathie")
    : null;

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
  const comment = Array.isArray(f.comments)
    ? f.comments.find(c => c.author === "Alyssia")
    : null;

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
  class="film-card${f.missed ? ' is-missed' : ''}${clickable ? ' clickable' : ''}"
  ${clickable ? `onclick="if(event.target.closest('button,a,select,textarea,input,label')) return; window.openFilmDetails('${f.cat}','${f.id}')"` : ""}
>
        <div class="film-banner">
          ${f.imageUrl
            ? `<img src="${escapeHtml(f.imageUrl)}" alt="Bandeau de ${escapeHtml(f.title)}" loading="lazy" />`
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
            ${f.imageUrl ? `<img src="${escapeHtml(f.imageUrl)}" alt="Affiche de ${escapeHtml(f.title)}" class="poster-large" loading="lazy" />` : `<div class="poster-large-placeholder">Pas d'image</div>`}
            <div class="poster-glow"></div>
          </div>

          <div>
            <h3 class="film-title">${escapeHtml(f.title)}</h3>

            <div class="film-meta">
  <span class="chip">📺 ${escapeHtml(f.platform || "Plateforme ?")}</span>
  <span class="chip">⭐ Moyenne ${avg}/5</span>
  <span class="chip">🟣 K ${displayRating(f.ratingKathie)}</span>
  <span class="chip">🟢 A ${displayRating(f.ratingAlyssia)}</span>
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
  ${renderFilmCard(film, { includeComments:true })}
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
    .filter(f => f.days >= 0 && f.days <= 7)
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
    : `<div class="empty">Aucune sortie cinéma dans les 7 prochains jours.</div>`;

  if (els.cinemaAlerts) els.cinemaAlerts.innerHTML = html;
  if (els.homeCinemaAlerts) els.homeCinemaAlerts.innerHTML = html;
}

 function renderCinema() {
  if (state.focusedFilm) {
    const film = getFilmByIds(state.focusedFilm.cat, state.focusedFilm.id);

    if (film && isCinemaFilm(film)) {
      els.cinemaList.innerHTML = `
        <div class="control-strip" style="margin-bottom:14px;">
          <button class="secondary" type="button" onclick="window.closeFocusedCinemaFilm()">← Retour à la liste cinéma</button>
        </div>
        ${renderFilmCard(film)}
      `;
      return;
    }
  }

  const list = getCinemaFilms();
  if (!list.length) {
    els.cinemaList.innerHTML = '<div class="empty">Aucun film cinéma pour le moment.</div>';
    return;
  }
  els.cinemaList.innerHTML = list.map(f => renderFilmCard(f)).join("");
}

  function renderOurFilms() {
    const list = getOurFilms();
    if (!list.length) {
      els.ourFilmsList.innerHTML = '<div class="empty">Aucun film vu ensemble pour le moment.</div>';
      return;
    }
    els.ourFilmsList.innerHTML = list.map(f => renderFilmCard(f, { includeComments:true })).join("");
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

  targetEl.innerHTML = state.drawHistory.map(item => `
    <div
      class="history-item clickable-history"
      ${item.cat && item.filmId ? `onclick="window.openFilmDetails('${item.cat}','${item.filmId}')"` : ""}
      title="${item.cat && item.filmId ? "Ouvrir la fiche" : "Ancien tirage sans lien"}"
    >
      <strong>${escapeHtml(item.title)}</strong>
      <div class="small muted">
        ${escapeHtml(item.mode || "")}${item.categoryName ? " • " + escapeHtml(item.categoryName) : ""}${item.timeLabel ? " • " + escapeHtml(item.timeLabel) : ""}
      </div>
    </div>
  `).join("");
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
    const topRated = sortFilms([...all], "rating_desc").slice(0,5);
    const recentEdits = sortFilms([...all].filter(f => f.updatedAtMs), "recent").slice(0,5);
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
    return hasK && hasA;
  });

  if (!ratedBoth.length) return "0.0";

  const gap = ratedBoth.reduce((sum, f) => {
    return sum + Math.abs(Number(f.ratingKathie) - Number(f.ratingAlyssia));
  }, 0) / ratedBoth.length;

  return gap.toFixed(1);
})();

    const lastTogether = sortFilms([...all].filter(f => f.seenTogetherAtMs), "recent").slice(0,5);

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
            <div style="font-size:1.1rem;font-weight:900;margin-bottom:8px;">Le film tiré s'affichera ici</div>
            <div class="small muted">Plus de popup. Le résultat reste visible directement dans la page.</div>
          </div>
        </div>
      `;
      return;
    }
    const { film, label } = state.lastDrawResult;
    els.drawResultSection.innerHTML = `
      <div class="draw-result-panel draw-anim">
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
              <button class="warning" type="button" onclick="window.markDrawResultSeenTonight('${film.cat}','${film.id}')">🎬 Vu ce soir</button>
              <button class="secondary" type="button" onclick="window.startEditFilm('${film.cat}','${film.id}')">✏️ Modifier la fiche</button>
              <button class="ghost" type="button" onclick="window.openFilmDetails('${film.cat}','${film.id}')">📖 Voir la fiche</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function updateSelectorButtons() {
    els.toggleDrawCatsBtn.textContent = els.drawCatsWrap.classList.contains("hidden") ? "Afficher" : "Masquer";
    els.toggleLibraryCatsBtn.textContent = els.libraryCatsWrap.classList.contains("hidden") ? "Afficher" : "Masquer";
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
    const mapping = { all: els.cinemaAllBtn, upcoming: els.cinemaUpcomingBtn, seen: els.cinemaSeenBtn, missed: els.cinemaMissedBtn };
    Object.entries(mapping).forEach(([key, el]) => {
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

function captureTypingState() {
  const active = document.activeElement;

  const data = {
    activeId: active?.id || "",
    selectionStart: typeof active?.selectionStart === "number" ? active.selectionStart : null,
    selectionEnd: typeof active?.selectionEnd === "number" ? active.selectionEnd : null,
    values: {}
  };

  document.querySelectorAll("input, textarea, select").forEach(el => {
    if (el.id && el.type !== "file") {
      data.values[el.id] = el.value;
    }
  });

  return data;
}

function restoreTypingState(data) {
  if (!data) return;

  Object.entries(data.values || {}).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && el.type !== "file") {
      el.value = value;
    }
  });

  if (data.activeId) {
    const active = document.getElementById(data.activeId);
    if (active) {
      active.focus();

      if (
        data.selectionStart !== null &&
        data.selectionEnd !== null &&
        typeof active.setSelectionRange === "function"
      ) {
        active.setSelectionRange(data.selectionStart, data.selectionEnd);
      }
    }
  }
}

function refreshUI() {
  const draft = saveDraftFields();

  renderDrawCategories();
  renderLibraryCategories();
  renderCategorySelect();
  renderFilms();
  renderCinema();
  renderOurFilms();
  renderStatsCards(els.homeStats);
  renderStatsCards(els.sideStats);
  renderStatsPage();
renderHistory(els.historyList);
renderHistory(els.homeHistory);
renderHistory(els.mobileHistoryList);
  renderDrawResult();

  if (typeof renderCinemaAlerts === "function") {
    renderCinemaAlerts();
  }

  updateSelectorButtons();
  updateLibraryFilterButtons();
  updateCinemaFilterButtons();
  updateOurFilmsFilterButtons();

  document.getElementById("toggleLibraryViewBtn").textContent =
    state.currentLibraryView === "grid" ? "🖼️ Vue détails" : "🎞️ Vue affiches";

  restoreDraftFields(draft);
}

  function syncAllCategoryCounts() {
    Object.keys(state.allCategoryListeners).forEach(catId => {
      if (!state.categories.some(c => c.id === catId)) {
        state.allCategoryListeners[catId]();
        delete state.allCategoryListeners[catId];
        delete state.allFilmsMap[catId];
      }
    });
    state.categories.forEach(cat => {
      if (!state.allCategoryListeners[cat.id]) {
        state.allCategoryListeners[cat.id] = onSnapshot(collection(db, "categories", cat.id, "films"), snap => {
          state.allFilmsMap[cat.id] = snap.docs.map(d => ({ id: d.id, cat: cat.id, ...d.data() }));
          refreshUI();
        });
      }
    });
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
renderHistory(els.homeHistory);
renderHistory(els.mobileHistoryList);
    });
  }

  function watchCategories() {
    onSnapshot(collection(db, "categories"), snap => {
      state.categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.drawSelectedCats = state.drawSelectedCats.filter(id => state.categories.some(c => c.id === id));
      state.librarySelectedCats = state.librarySelectedCats.filter(id => state.categories.some(c => c.id === id));
      ensureDefaultSelections();
      syncAllCategoryCounts();
      refreshUI();
    });
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
        releaseDateLabel: releaseDateMs ? formatDateOnly(releaseDateMs) : "",
        kathieSeen: seenState.kathieSeen, alyssiaSeen: seenState.alyssiaSeen, seenTogether: seenState.seenTogether,
        ...togetherDateData
      };

      if (state.editingFilm) {
const payload = {
  ...commonPayload,
  missed: !!state.editingFilm.missed,
  createdAtMs: state.editingFilm.createdAtMs || now,
  createdBy: state.editingFilm.createdBy || state.editingFilm.addedBy || selectedCreatedBy,
  addedBy: state.editingFilm.createdBy || state.editingFilm.addedBy || selectedCreatedBy,
  updatedAtMs: now,
  updatedBy: state.activeProfile
};
        if (state.editingFilm.cat === cat) {
          await updateDoc(doc(db, "categories", state.editingFilm.cat, "films", state.editingFilm.id), payload);
        } else {
          await addDoc(collection(db, "categories", cat, "films"), payload);
          await deleteDoc(doc(db, "categories", state.editingFilm.cat, "films", state.editingFilm.id));
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

  function draw(mode) {
    if (!state.drawSelectedCats.length) { showToast("Choisis au moins une catégorie pour le tirage", true); return; }
    let pool = getAllFilmsFlat().filter(f => isHomeFilm(f) && state.drawSelectedCats.includes(f.cat));
    if (mode === "seen") pool = pool.filter(f => f.kathieSeen || f.alyssiaSeen);
if (mode === "unseen") pool = pool.filter(f => !f.kathieSeen && !f.alyssiaSeen);
if (mode === "favorites") pool = pool.filter(f => f.favorite);
if (mode === "mustWatch") pool = pool.filter(f => f.mustWatch);
    if (!pool.length) { showToast("Aucun film disponible pour ce tirage", true); return; }
    const film = pickWeightedFilm(pool);
    const label =
  mode === "seen" ? "Déjà vus" :
  mode === "unseen" ? "Non vus" :
  mode === "favorites" ? "Favoris" :
  mode === "mustWatch" ? "À voir absolument" :
  "Vus + Non vus";
    state.lastDrawResult = { film, label };
    renderDrawResult();
    els.drawResultSection.scrollIntoView({ behavior:"smooth", block:"start" });
    addDrawHistory(film, label).catch(error => { console.error(error); showToast("Le tirage a marché, mais pas l'historique", true); });
  }

  async function patchFilm(cat, id, patch) {
  const film = getFilmByIds(cat, id);
  if (!film) return;

  const nextKathieSeen = patch.kathieSeen ?? film.kathieSeen;
  const nextAlyssiaSeen = patch.alyssiaSeen ?? film.alyssiaSeen;
  const nextSeenTogether = patch.seenTogether ?? film.seenTogether;

 const shouldRemoveMustWatch = (nextKathieSeen && nextAlyssiaSeen) || nextSeenTogether;

  const finalPatch = {
    ...patch,
    ...(shouldRemoveMustWatch ? { mustWatch: false } : {}),
    updatedAtMs: Date.now(),
    updatedBy: state.activeProfile
  };

  await updateDoc(doc(db, "categories", cat, "films", id), finalPatch);
}

  function openFilmForm(editMode = false) {
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
    els.activeProfileSelect.addEventListener("change", () => {
      state.activeProfile = els.activeProfileSelect.value;
      localStorage.setItem("allieflix_active_profile", state.activeProfile);
      if (!state.editingFilm) document.getElementById("filmAddedBy").value = state.activeProfile;
      showToast(`Profil actif : ${state.activeProfile}`);
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
      }
    });

    els.toggleDrawCatsBtn.addEventListener("click", () => { els.drawCatsWrap.classList.toggle("hidden"); updateSelectorButtons(); });
    els.toggleLibraryCatsBtn.addEventListener("click", () => { els.libraryCatsWrap.classList.toggle("hidden"); updateSelectorButtons(); });

document.getElementById("globalSearchBtn").addEventListener("click", () => {
  state.globalSearchTerm = els.globalSearchInput.value.trim();
  els.searchSuggestionBox.textContent = "";
  state.focusedFilm = null;

els.clearSearchMiniBtn.addEventListener("click", () => {
  document.getElementById("clearGlobalSearchBtn").click();
});

els.globalSearchInput.addEventListener("input", () => {
  const q = els.globalSearchInput.value.trim();
  els.clearSearchMiniBtn.classList.toggle("hidden", !q);
});

  state.librarySelectedCats = state.categories.map(c => c.id);

  setMainView("bibliotheque");
  renderLibraryCategories();
  renderFilms();
});
els.globalSearchInput.addEventListener("input", () => {
  const q = els.globalSearchInput.value.trim();

  if (!q) {
    els.searchSuggestionBox.innerHTML = "";
    state.globalSearchTerm = "";
    state.focusedFilm = null;
    renderFilms();
    return;
  }

  const suggestions = getSearchSuggestions(q);

  els.searchSuggestionBox.innerHTML = suggestions.length
    ? "Suggestions : " + suggestions.map(f => `
        <span class="chip" style="cursor:pointer;" data-title="${escapeHtml(f.title)}">
          ${escapeHtml(f.title)}
        </span>
      `).join(" ")
    : "Aucun aperçu pour le moment.";

  els.searchSuggestionBox.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const title = chip.dataset.title;
      const film = getAllFilmsFlat().find(
        f => (f.title || "").trim().toLowerCase() === title.trim().toLowerCase()
      );

      els.globalSearchInput.value = title;
      state.globalSearchTerm = title;
      state.librarySelectedCats = state.categories.map(c => c.id);
      els.searchSuggestionBox.innerHTML = "";

      if (film && !isCinemaFilm(film)) {
        state.focusedFilm = { cat: film.cat, id: film.id };
        state.currentLibraryView = "list";
        localStorage.setItem("allieflix_view_mode", state.currentLibraryView);
        setMainView("bibliotheque");
        renderLibraryCategories();
        renderFilms();
        return;
      }

      if (film && isCinemaFilm(film)) {
        state.focusedFilm = null;
        state.cinemaFilter = "all";
        setMainView("cinema");
        renderCinema();
        return;
      }

      state.focusedFilm = null;
      setMainView("bibliotheque");
      renderLibraryCategories();
      renderFilms();
    });
  });
});
els.globalSearchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    document.getElementById("globalSearchBtn").click();
  }
});

document.getElementById("clearGlobalSearchBtn").addEventListener("click", () => {
  state.globalSearchTerm = "";
  state.focusedFilm = null;
  els.globalSearchInput.value = "";
  els.searchSuggestionBox.textContent = "";

  state.librarySelectedCats = state.categories.map(c => c.id);

  setMainView("bibliotheque");
  renderLibraryCategories();
  renderFilms();
});    els.sortSelect.addEventListener("change", () => {
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
    els.cinemaSeenBtn.addEventListener("click", () => { state.cinemaFilter = "seen"; updateCinemaFilterButtons(); renderCinema(); });
    els.cinemaMissedBtn.addEventListener("click", () => { state.cinemaFilter = "missed"; updateCinemaFilterButtons(); renderCinema(); });

    els.ourFilmsAllBtn.addEventListener("click", () => { state.ourFilmsFilter = "all"; updateOurFilmsFilterButtons(); renderOurFilms(); });
    els.ourFilmsHomeBtn.addEventListener("click", () => { state.ourFilmsFilter = "home"; updateOurFilmsFilterButtons(); renderOurFilms(); });
    els.ourFilmsCinemaBtn.addEventListener("click", () => { state.ourFilmsFilter = "cinema"; updateOurFilmsFilterButtons(); renderOurFilms(); });

    document.getElementById("drawAll").addEventListener("click", () => draw("all"));
    document.getElementById("drawSeen").addEventListener("click", () => draw("seen"));
    document.getElementById("drawUnseen").addEventListener("click", () => draw("unseen"));
    document.getElementById("drawFavorites").addEventListener("click", () => draw("favorites"));
    document.getElementById("drawMustWatch").addEventListener("click", () => draw("mustWatch"));

    els.goHomeBtn.addEventListener("click", showHome);
    document.querySelectorAll(".menu-card").forEach(el => el.addEventListener("click", () => setMainView(el.dataset.homeView)));
    document.querySelectorAll(".nav-card").forEach(card => card.addEventListener("click", () => setMainView(card.dataset.view)));
    document.querySelectorAll(".mobile-nav button").forEach(btn => btn.addEventListener("click", () => setMainView(btn.dataset.mobileView)));

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
    showToast(!film.favorite ? "Ajouté aux favoris ❤️" : "Retiré des favoris");
  } catch (error) {
    console.error(error);
    showToast("Impossible de modifier les favoris", true);
  }
};

window.quickToggleMustWatch = async (cat, id) => {
  const film = getFilmByIds(cat, id);
  if (!film) return;

  try {
    await updateDoc(
      doc(db, "categories", cat, "films", id),
      {
        mustWatch: !film.mustWatch,
        updatedAtMs: Date.now(),
        updatedBy: state.activeProfile
      }
    );
    showToast(!film.mustWatch ? "Ajouté à À voir absolument ⭐" : "Retiré de À voir absolument");
  } catch (error) {
    console.error(error);
    showToast("Impossible de modifier À voir absolument", true);
  }
};
window.closeFocusedFilm = () => {
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
  state.focusedFilm = null;
  state.cinemaFilter = "all";
  updateCinemaFilterButtons();
  renderCinema();
};

 window.openFilmDetails = (cat, id) => {
  const film = getFilmByIds(cat, id);
  if (!film) return;

  const shouldAppearInLibrary =
    isHomeFilm(film) ||
    (isCinemaFilm(film) && (
      film.seenTogether ||
      (film.kathieSeen && film.alyssiaSeen) ||
      film.kathieSeen ||
      film.alyssiaSeen
    ));

if (shouldAppearInLibrary) {
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
      const now = Date.now();
      const normalized = normalizeSeenState({ kathieSeen: value, alyssiaSeen: value, seenTogether: value });
      await patchFilm(cat, id, {
        kathieSeen: normalized.kathieSeen, alyssiaSeen: normalized.alyssiaSeen, seenTogether: normalized.seenTogether,
        seenTogetherAtMs: value ? now : null, seenTogetherDateLabel: value ? formatDate(now) : ""
      });
      showToast(value ? "Film marqué vu ensemble 🎬" : 'Statut "vu ensemble" retiré');
    } catch (error) { console.error(error); showToast("Erreur pendant la mise à jour", true); }
  };

  // NEW: toggle missed
  window.toggleMissed = async (cat, id, value) => {
    try {
      await patchFilm(cat, id, { missed: value });
      showToast(value ? "Film marqué comme raté 😔" : "Statut raté retiré");
    } catch (error) { console.error(error); showToast("Erreur pendant la mise à jour", true); }
  };

window.setPersonalRating = async (cat, id, person, value) => {
  try {
    const patch = person === "Kathie"
      ? { ratingKathie: value }
      : { ratingAlyssia: value };

    await patchFilm(cat, id, patch);
    showToast(`Note ${person} enregistrée ⭐`);
  } catch (error) {
    console.error(error);
    showToast("Erreur pendant l'enregistrement de la note", true);
  }
};
window.clearPersonalRating = async (cat, id, person) => {
  try {
    const patch = person === "Kathie"
      ? { ratingKathie: null }
      : { ratingAlyssia: null };

    await patchFilm(cat, id, patch);
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
  try {
    await patchFilm(cat, id, { mustWatch: value });

    if (value) {
      state.highlightedMustWatch = `${cat}_${id}`;
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
      await addDoc(collection(db, "categories", targetCat, "films"), payload);
      await deleteDoc(doc(db, "categories", cat, "films", id));
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
  window.markDrawResultSeenTonight = async (cat, id) => {
    try {
      const now = Date.now();
      await patchFilm(cat, id, { kathieSeen: true, alyssiaSeen: true, seenTogether: true, seenTogetherAtMs: now, seenTogetherDateLabel: formatDate(now) });
      showToast("Film marqué vu ce soir 🎬");
      setMainView("nosfilms");
    } catch (error) { console.error(error); showToast("Erreur pendant la mise à jour", true); }
  };

  bindEvents();
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
