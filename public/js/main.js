document.getElementById('year').textContent = new Date().getFullYear();

async function loadPosts() {
  const container = document.getElementById('posts');
  try {
    const res = await fetch('/api/posts');
    const posts = await res.json();

    if (!posts.length) {
      container.innerHTML = '<p class="empty">Todavía no hay publicaciones. ¡Vuelve pronto!</p>';
      return;
    }

    container.innerHTML = posts
      .map(
        (p) => `
      <article class="post-card">
        ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.title)}" />` : ''}
        <div class="body">
          <h3>${escapeHtml(p.title)}</h3>
          <p>${escapeHtml(p.content)}</p>
          ${p.link ? `<a class="cta" href="${escapeHtml(p.link)}" target="_blank" rel="noopener">Ver más →</a>` : ''}
        </div>
      </article>
    `
      )
      .join('');
  } catch (err) {
    container.innerHTML = '<p class="empty">No se pudieron cargar las publicaciones.</p>';
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

loadPosts();
