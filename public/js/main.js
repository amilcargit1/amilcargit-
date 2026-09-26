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

// --- Contador de visitas ---
async function registerVisit() {
  const el = document.getElementById('visit-count');
  try {
    const res = await fetch('/api/visits', { method: 'POST' });
    const data = await res.json();
    el.textContent = data.visits;
  } catch (err) {
    el.textContent = '—';
  }
}
registerVisit();

// --- Formulario de contacto por WhatsApp ---
const WHATSAPP_NUMBER = '51910227479';
const contactForm = document.getElementById('contact-form');

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('c-name').value.trim();
    const message = document.getElementById('c-message').value.trim();

    const text = `Hola, soy ${name}. ${message}`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener');
  });
}