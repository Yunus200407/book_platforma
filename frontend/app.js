const API = 'http://localhost:8000';
let token = localStorage.getItem('token') || '';
let currentUser = localStorage.getItem('username') || '';
let deleteTargetId = null;

window.onload = () => {
  if (token) showApp();
};

// ── AUTH ──
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', (i === 0) === (tab === 'login'));
  });
  document.getElementById('loginForm').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? '' : 'none';
  document.getElementById('authMsg').innerHTML = '';
}

async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!username || !password) return showMsg('authMsg', 'Barcha maydonlarni to\'ldiring', 'err');

  const body = new URLSearchParams({ username, password });
  const res = await fetch(`${API}/auth/login`, { method: 'POST', body });
  const data = await res.json();

  if (!res.ok) return showMsg('authMsg', data.detail || 'Xato parol yoki login', 'err');
  token = data.access_token;
  currentUser = username;
  localStorage.setItem('token', token);
  localStorage.setItem('username', username);
  showApp();
}

async function register() {
  const username = document.getElementById('regUsername').value.trim();
  const password = document.getElementById('regPassword').value;
  if (!username || !password) return showMsg('authMsg', 'Barcha maydonlarni to\'ldiring', 'err');

  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) return showMsg('authMsg', data.detail || 'Xato yuz berdi', 'err');

  showMsg('authMsg', 'Muvaffaqiyatli ro\'yxatdan o\'tildi! Kiring.', 'ok');
  switchTab('login');
}

function logout() {
  token = ''; currentUser = '';
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  document.getElementById('authPage').style.display = '';
  document.getElementById('appPage').classList.remove('visible');
}

function showApp() {
  document.getElementById('authPage').style.display = 'none';
  document.getElementById('appPage').classList.add('visible');
  document.getElementById('topbarUser').textContent = currentUser;
  loadBooks();
}

// ── BOOKS ──
async function loadBooks() {
  document.getElementById('booksContainer').innerHTML =
    '<div class="loading-wrap"><div class="spinner"></div></div>';

  try {
    const res = await fetch(`${API}/books`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) return logout();
    if (!res.ok) {
      showMsg('appMsg', 'Kitoblarni yuklashda xatolik yuz berdi', 'err');
      document.getElementById('booksContainer').innerHTML = '';
      return;
    }

    const books = await res.json();
    renderBooks(books);
  } catch {
    showMsg('appMsg', 'Server bilan ulanishda xatolik yuz berdi', 'err');
    document.getElementById('booksContainer').innerHTML = '';
  }
}

function renderBooks(books) {
  const el = document.getElementById('booksContainer');
  if (!books.length) {
    el.innerHTML = `<div class="empty">
      <div class="empty-icon">&#x1F4DA;</div>
      <p>Hali kitoblar yo'q</p>
    </div>`;
    return;
  }
  el.innerHTML = `<div class="books-grid">${books.map(b => `
    <div class="book-card">
      <div class="book-spine">${esc((b.title?.[0] || '?').toUpperCase())}</div>
      <div class="book-title">${esc(b.title)}</div>
      <div class="book-author">${esc(b.author)}</div>
      ${b.description ? `<div class="book-desc">${esc(b.description)}</div>` : ''}
      <div class="book-actions">
        <button class="btn btn-ghost btn-sm js-download-btn" data-id="${b.id}" data-title="${escAttr(b.title)}">&#x2193; Yuklab olish</button>
        <button class="btn btn-ghost btn-sm" onclick="openEditModal(${b.id})">&#x270E;</button>
        <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${b.id})">&#x2715;</button>
      </div>
    </div>
  `).join('')}</div>`;

  el.querySelectorAll('.js-download-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number(btn.dataset.id);
      const title = btn.dataset.title || 'book';
      downloadBook(id, title);
    });
  });
}

async function downloadBook(id, title) {
  showMsg('appMsg', `"${title}" yuklanmoqda...`, 'ok');
  const res = await fetch(`${API}/books/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) { showMsg('appMsg', 'Yuklab bo\'lmadi', 'err'); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${title}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
  setTimeout(() => showMsg('appMsg', '', ''), 2000);
}

// ── MODAL ──
function openAddModal() {
  document.getElementById('editBookId').value = '';
  document.getElementById('modalTitle').textContent = 'Kitob qo\'shish';
  document.getElementById('modalSaveBtn').textContent = 'Qo\'shish';
  ['bookTitle','bookAuthor','bookDesc','bookPath'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('modalMsg').innerHTML = '';
  document.getElementById('bookModal').classList.add('open');
}

async function openEditModal(id) {
  const res = await fetch(`${API}/books/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.status === 401) return logout();
  if (!res.ok) {
    showMsg('appMsg', 'Kitob ma\'lumotini olishda xato', 'err');
    return;
  }

  const b = await res.json();
  document.getElementById('editBookId').value = id;
  document.getElementById('modalTitle').textContent = 'Kitobni tahrirlash';
  document.getElementById('modalSaveBtn').textContent = 'Saqlash';
  document.getElementById('bookTitle').value = b.title;
  document.getElementById('bookAuthor').value = b.author;
  document.getElementById('bookDesc').value = b.description || '';
  document.getElementById('bookPath').value = b.path;
  document.getElementById('modalMsg').innerHTML = '';
  document.getElementById('bookModal').classList.add('open');
}

function closeModal() { document.getElementById('bookModal').classList.remove('open'); }

async function saveBook() {
  const id = document.getElementById('editBookId').value;
  const payload = {
    title: document.getElementById('bookTitle').value.trim(),
    author: document.getElementById('bookAuthor').value.trim(),
    description: document.getElementById('bookDesc').value.trim(),
    path: document.getElementById('bookPath').value.trim(),
  };

  if (!payload.title || !payload.author || !payload.path)
    return showMsg('modalMsg', 'Sarlavha, muallif va yo\'l majburiy', 'err');

  const url = id ? `${API}/books/${id}` : `${API}/books`;
  const method = id ? 'PATCH' : 'POST';
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const d = await res.json();
    return showMsg('modalMsg', d.detail || 'Xato', 'err');
  }
  closeModal();
  loadBooks();
}

// ── DELETE ──
function openDeleteModal(id) {
  deleteTargetId = id;
  document.getElementById('deleteModal').classList.add('open');
}

function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById('deleteModal').classList.remove('open');
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  const res = await fetch(`${API}/books/${deleteTargetId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.status === 401) return logout();
  if (!res.ok) {
    showMsg('appMsg', 'O\'chirishda xatolik yuz berdi', 'err');
    return;
  }

  closeDeleteModal();
  loadBooks();
}

// ── HELPERS ──
function showMsg(id, text, type) {
  const el = document.getElementById(id);
  if (!text) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="msg msg-${type === 'err' ? 'err' : 'ok'}">${text}</div>`;
}

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

function escAttr(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

document.getElementById('bookModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('deleteModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeDeleteModal();
});
