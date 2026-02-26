const API_KEY = 'f1ce187e6d723a0407cae43c90d3a70f';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/';

/* ─────────────────────────────
   ROWS CONFIG
───────────────────────────── */
const ROWS = [
  { title: 'Trending Now',         endpoint: '/trending/all/week',                 id: 'trending'  },
  { title: 'Top Rated Movies',     endpoint: '/movie/top_rated',                   id: 'movies'    },
  { title: 'Popular Movies',       endpoint: '/movie/popular',                     id: 'movies2'   },
  { title: 'Popular TV Shows',     endpoint: '/tv/popular',                        id: 'tvshows'   },
  { title: 'Action & Adventure',   endpoint: '/discover/movie?with_genres=28',     id: 'movies3'   },
  { title: 'Comedy',               endpoint: '/discover/movie?with_genres=35',     id: 'movies4'   },
  { title: 'Horror',               endpoint: '/discover/movie?with_genres=27',     id: 'movies5'   },
  { title: 'Science Fiction',      endpoint: '/discover/movie?with_genres=878',    id: 'movies6'   },
  { title: 'Romance',              endpoint: '/discover/movie?with_genres=10749',  id: 'movies7'   },
  { title: 'Now Playing',          endpoint: '/movie/now_playing',                 id: 'new'       },
  { title: 'Top Rated TV Shows',   endpoint: '/tv/top_rated',                      id: 'tvshows2'  },
  { title: 'Documentaries',        endpoint: '/discover/movie?with_genres=99',     id: 'movies8'   },
];

let heroMovie = null;

/* ─────────────────────────────
   INIT
───────────────────────────── */
async function init() {
  setupNavScroll();
  await loadHero();
  loadAllRows();
  renderFooter();
}

/* ─────────────────────────────
   NAVBAR SCROLL + NAV LINKS
───────────────────────────── */
function setupNavScroll() {
  const nav = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 80);
  });

  // Nav link filtering
  document.querySelectorAll('.nav-link[data-filter]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const filter = link.dataset.filter;
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      filterRows(filter);
    });
  });
}

function filterRows(filter) {
  const container = document.getElementById('rowsContainer');
  container.innerHTML = '';

  let filtered;
  if (filter === 'all') {
    filtered = ROWS;
  } else if (filter === 'tvshows') {
    filtered = ROWS.filter(r => r.id.startsWith('tvshows') || r.id === 'trending');
  } else if (filter === 'movies') {
    filtered = ROWS.filter(r => r.id.startsWith('movies') || r.id === 'trending');
  } else if (filter === 'new') {
    filtered = ROWS.filter(r => r.id === 'new' || r.id === 'trending');
  } else if (filter === 'mylist') {
    container.innerHTML = '<p style="padding:60px 4%;color:#aaa;font-size:1rem;">Your list is empty. Start adding titles!</p>';
    return;
  } else {
    filtered = ROWS;
  }

  renderRows(filtered);
}

async function renderRows(rows) {
  const container = document.getElementById('rowsContainer');
  for (const row of rows) {
    const idx = ROWS.indexOf(row);
    const rowEl = document.createElement('div');
    rowEl.className = 'row';
    rowEl.innerHTML = `
      <div class="row-title">${row.title}</div>
      <div class="row-track-wrap">
        <button class="row-arrow left" onclick="scrollRow(this, -1)">&#8249;</button>
        <div class="row-track" id="track-${idx}">
          ${Array(8).fill('<div class="card-skeleton"></div>').join('')}
        </div>
        <button class="row-arrow right" onclick="scrollRow(this, 1)">&#8250;</button>
      </div>`;
    container.appendChild(rowEl);

    fetchTMDB(row.endpoint).then(data => {
      const track = document.getElementById(`track-${idx}`);
      if (!track) return;
      track.innerHTML = '';
      data.results.forEach(item => {
        if (!item.backdrop_path && !item.poster_path) return;
        track.appendChild(createCard(item));
      });
    }).catch(() => {});
  }
}

/* ─────────────────────────────
   HERO
───────────────────────────── */
async function loadHero() {
  try {
    const data = await fetchTMDB('/trending/all/week');
    // Pick a random movie from top 10 that has a backdrop
    const candidates = data.results.filter(m => m.backdrop_path).slice(0, 10);
    heroMovie = candidates[Math.floor(Math.random() * candidates.length)];
    renderHero(heroMovie);
  } catch (e) {
    console.error('Hero load failed', e);
  }
}

async function renderHero(movie) {
  const backdrop = `${IMG_BASE}original${movie.backdrop_path}`;
  document.getElementById('heroBg').style.backgroundImage = `url('${backdrop}')`;

  const title = movie.title || movie.name || '';
  const overview = movie.overview || '';
  const score = Math.round((movie.vote_average || 0) * 10);
  const mediaType = movie.media_type === 'tv' ? 'tv' : 'movie';

  // Try to fetch title logo image from TMDB
  try {
    const images = await fetchTMDB(`/${mediaType}/${movie.id}/images`);
    const logos = images.logos?.filter(l => l.iso_639_1 === 'en') || [];
    const logo = logos[0];
    if (logo) {
      document.getElementById('heroTitle').innerHTML = `
        <img src="${IMG_BASE}w500${logo.file_path}" 
             alt="${escapeHtml(title)}" 
             class="hero-title-img"/>`;
    } else {
      document.getElementById('heroTitle').textContent = title;
    }
  } catch {
    document.getElementById('heroTitle').textContent = title;
  }

  // Netflix badge with logo + label
  document.getElementById('heroBadges').innerHTML = `
    <img src="netflix-logo.png" alt="N" class="hero-netflix-badge"/>
    ${mediaType === 'tv' ? '<span class="hero-badge-label">Series</span>' : '<span class="hero-badge-label">Film</span>'}
  `;

  document.getElementById('heroDesc').textContent = overview;
  document.getElementById('heroPlayBtn').onclick = () => openModal(movie.id, mediaType);
  document.getElementById('heroMoreBtn').onclick = () => openModal(movie.id, mediaType);

  document.getElementById('heroSkeleton').style.display = 'none';
  document.getElementById('heroInfo').style.display = 'block';
}

/* ─────────────────────────────
   ROWS
───────────────────────────── */
async function loadAllRows() {
  renderRows(ROWS);
}

function scrollRow(btn, dir) {
  const track = btn.parentElement.querySelector('.row-track');
  track.scrollBy({ left: dir * 600, behavior: 'smooth' });
}

/* ─────────────────────────────
   CARD
───────────────────────────── */
function createCard(item) {
  const card = document.createElement('div');
  card.className = 'card';

  const imgPath = item.backdrop_path
    ? `${IMG_BASE}w500${item.backdrop_path}`
    : `${IMG_BASE}w342${item.poster_path}`;

  const title = item.title || item.name || '';
  const mediaType = item.media_type || (item.first_air_date ? 'tv' : 'movie');

  card.innerHTML = `
    <img class="card-img" src="${imgPath}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.style.background='#2a2a2a'"/>
    <div class="card-overlay">
      <div class="card-title">${escapeHtml(title)}</div>
      <div class="card-actions">
        <button class="card-btn play" title="Play" onclick="event.stopPropagation(); openModal(${item.id}, '${mediaType}')">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <button class="card-btn" title="Add to list">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
        </button>
        <button class="card-btn" title="Like">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1.91l-.01-.01L23 10z"/></svg>
        </button>
      </div>
    </div>`;

  card.addEventListener('click', () => openModal(item.id, mediaType));
  return card;
}

/* ─────────────────────────────
   MODAL
───────────────────────────── */
async function openModal(id, type) {
  const overlay = document.getElementById('modalOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Reset
  document.getElementById('modalTitle').textContent = '';
  document.getElementById('modalTrailer').innerHTML = '<div style="width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;color:#666;font-size:0.9rem;">Loading...</div>';
  document.getElementById('modalBody').innerHTML = '';

  try {
    const mediaType = (type === 'tv' || type === 'movie') ? type : 'movie';
    const [details, videos] = await Promise.all([
      fetchTMDB(`/${mediaType}/${id}?append_to_response=credits`),
      fetchTMDB(`/${mediaType}/${id}/videos`)
    ]);

    // Title
    const title = details.title || details.name || '';
    document.getElementById('modalTitle').textContent = title;

    // Trailer
    const trailer = videos.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube')
      || videos.results?.find(v => v.site === 'YouTube');

    if (trailer) {
      document.getElementById('modalTrailer').innerHTML = `
        <iframe src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1"
          allow="autoplay; encrypted-media" allowfullscreen
          style="width:100%;height:100%;border:none;"></iframe>`;
    } else {
      const backdrop = details.backdrop_path
        ? `${IMG_BASE}original${details.backdrop_path}`
        : (details.poster_path ? `${IMG_BASE}w780${details.poster_path}` : '');
      document.getElementById('modalTrailer').innerHTML = backdrop
        ? `<img src="${backdrop}" style="width:100%;height:100%;object-fit:cover;" alt="${escapeHtml(title)}"/>`
        : `<div style="width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;color:#666;">No preview available</div>`;
    }

    // Play btn
    document.getElementById('modalPlayBtn').onclick = () => {
      if (trailer) {
        document.getElementById('modalTrailer').innerHTML = `
          <iframe src="https://www.youtube.com/embed/${trailer.key}?autoplay=1"
            allow="autoplay; encrypted-media" allowfullscreen
            style="width:100%;height:100%;border:none;"></iframe>`;
      }
    };

    // Body
    const year = (details.release_date || details.first_air_date || '').slice(0, 4);
    const runtime = details.runtime
      ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
      : (details.number_of_seasons ? `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? 's' : ''}` : '');
    const rating = details.vote_average ? `${Math.round(details.vote_average * 10)}% Match` : '';
    const genres = (details.genres || []).map(g => g.name);
    const cast = (details.credits?.cast || []).slice(0, 6).map(c => c.name).join(', ');
    const director = (details.credits?.crew || []).find(c => c.job === 'Director')?.name || '';

    document.getElementById('modalBody').innerHTML = `
      <div class="modal-meta">
        ${rating ? `<span class="modal-rating">${rating}</span>` : ''}
        ${year ? `<span class="modal-year">${year}</span>` : ''}
        ${runtime ? `<span class="modal-runtime">${runtime}</span>` : ''}
        <span class="modal-hd">HD</span>
      </div>
      <p class="modal-overview">${details.overview || 'No description available.'}</p>
      ${cast ? `<div class="modal-tags">Cast: <span>${cast}</span></div>` : ''}
      ${director ? `<div class="modal-tags">Director: <span>${director}</span></div>` : ''}
      ${genres.length ? `
        <div class="modal-genres">
          ${genres.map(g => `<span class="genre-pill">${g}</span>`).join('')}
        </div>` : ''}`;

  } catch (e) {
    document.getElementById('modalBody').innerHTML = '<p style="color:#888;padding:20px">Failed to load details.</p>';
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('modalTrailer').innerHTML = '';
  document.body.style.overflow = '';
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* ─────────────────────────────
   SEARCH
───────────────────────────── */
function toggleSearch() {
  const bar = document.getElementById('searchBar');
  bar.classList.toggle('open');
  if (bar.classList.contains('open')) document.getElementById('searchInput').focus();
}

async function handleSearch() {
  const query = document.getElementById('searchInput').value.trim();
  if (!query) return;

  const container = document.getElementById('rowsContainer');
  container.innerHTML = `<div style="padding:20px 4%;color:#888;font-size:0.9rem;">Searching for "<strong style="color:white">${escapeHtml(query)}</strong>"...</div>`;

  try {
    const data = await fetchTMDB(`/search/multi?query=${encodeURIComponent(query)}`);
    container.innerHTML = '';

    const rowEl = document.createElement('div');
    rowEl.className = 'row';
    rowEl.innerHTML = `
      <div class="row-title">Search results for "${escapeHtml(query)}"</div>
      <div class="row-track-wrap">
        <div class="row-track" id="searchTrack"></div>
      </div>`;
    container.appendChild(rowEl);

    const track = document.getElementById('searchTrack');
    const results = data.results.filter(r => r.backdrop_path || r.poster_path);
    if (results.length === 0) {
      track.innerHTML = '<p style="color:#888;padding:10px 0">No results found.</p>';
    } else {
      results.forEach(item => track.appendChild(createCard(item)));
    }
  } catch (e) {
    container.innerHTML = '<p style="color:#888;padding:20px 4%">Search failed. Try again.</p>';
  }
}

/* ─────────────────────────────
   FOOTER
───────────────────────────── */
function renderFooter() {
  document.getElementById('main').insertAdjacentHTML('afterend', `
    <footer>
      <div class="footer-links">
        <a href="#" class="footer-link">Audio Description</a>
        <a href="#" class="footer-link">Help Center</a>
        <a href="#" class="footer-link">Gift Cards</a>
        <a href="#" class="footer-link">Media Center</a>
        <a href="#" class="footer-link">Investor Relations</a>
        <a href="#" class="footer-link">Jobs</a>
        <a href="#" class="footer-link">Terms of Use</a>
        <a href="#" class="footer-link">Privacy</a>
        <a href="#" class="footer-link">Legal Notices</a>
        <a href="#" class="footer-link">Cookie Preferences</a>
        <a href="#" class="footer-link">Corporate Information</a>
        <a href="#" class="footer-link">Contact Us</a>
      </div>
      <p class="footer-copy">© 2026 Netflix Clone — Portfolio Project by Jeffrey Okhihie. Powered by TMDB.</p>
    </footer>`);
}

/* ─────────────────────────────
   TMDB FETCH
───────────────────────────── */
async function fetchTMDB(endpoint) {
  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${endpoint}${sep}api_key=${API_KEY}&language=en-US`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error ${res.status}`);
  return res.json();
}

/* ─────────────────────────────
   HELPERS
───────────────────────────── */
function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─────────────────────────────
   INIT
───────────────────────────── */
init();
