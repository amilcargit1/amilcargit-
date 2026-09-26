const form = document.getElementById('login-form');
const errorEl = document.getElementById('error');

// Si ya hay sesión activa, ir directo al panel
fetch('/api/session')
  .then((r) => r.json())
  .then((data) => {
    if (data.loggedIn) window.location.href = '/admin/dashboard.html';
  });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  const user = document.getElementById('user').value;
  const pass = document.getElementById('pass').value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, pass }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Error al iniciar sesión';
      return;
    }
    window.location.href = '/admin/dashboard.html';
  } catch (err) {
    errorEl.textContent = 'No se pudo conectar con el servidor';
  }
});
