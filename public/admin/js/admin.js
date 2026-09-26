const form = document.getElementById('post-form');
const idField = document.getElementById('post-id');
const titleField = document.getElementById('title');
const contentField = document.getElementById('content');
const linkField = document.getElementById('link');
const imageField = document.getElementById('image');
const formError = document.getElementById('form-error');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const listEl = document.getElementById('posts-list');

// Requiere sesión activa
fetch('/api/session')
  .then((r) => r.json())
  .then((data) => {
    if (!data.loggedIn) window.location.href = '/admin/index.html';
    else loadPosts();
  });

document.getElementById('logout-btn').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/admin/index.html';
});

async function loadPosts() {
  const res = await fetch('/api/posts');
  const posts = await res.json();
  if (!posts.length) {
    listEl.innerHTML = '<p class="empty">No hay publicaciones todavía.</p>';
    return;
  }
  listEl.innerHTML = posts
    .map(
      (p) => `
    <div class="post-row" data-id="${p.id}">
      <div>
        <strong>${escapeHtml(p.title)}</strong>
        <p style="color:var(--muted); font-size:0.85rem; margin:4px 0 0;">${escapeHtml(p.content).slice(0, 100)}</p>
      </div>
      <div class="actions">
        <button class="edit">Editar</button>
        <button class="delete">Borrar</button>
      </div>
    </div>
  `
    )
    .join('');

  listEl.querySelectorAll('.edit').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      const id = e.target.closest('.post-row').dataset.id;
      const post = posts.find((p) => p.id === id);
      startEdit(post);
    })
  );

  listEl.querySelectorAll('.delete').forEach((btn) =>
    btn.addEventListener('click', async (e) => {
      const id = e.target.closest('.post-row').dataset.id;
      if (!confirm('¿Borrar esta publicación?')) return;
      await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      loadPosts();
    })
  );
}

function startEdit(post) {
  idField.value = post.id;
  titleField.value = post.title;
  contentField.value = post.content;
  linkField.value = post.link || '';
  imageField.value = post.image || '';
  formTitle.textContent = 'Editar publicación';
  submitBtn.textContent = 'Guardar cambios';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  form.reset();
  idField.value = '';
  formTitle.textContent = 'Nueva publicación';
  submitBtn.textContent = 'Publicar';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';

  const payload = {
    title: titleField.value,
    content: contentField.value,
    link: linkField.value,
    image: imageField.value,
  };

  const id = idField.value;
  const url = id ? `/api/posts/${id}` : '/api/posts';
  const method = id ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json();
    formError.textContent = data.error || 'Error al guardar';
    return;
  }

  resetForm();
  loadPosts();
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
