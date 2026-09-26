const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'posts.json');

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'cambia-esta-clave';
const SESSION_SECRET = process.env.SESSION_SECRET || 'cambia-este-secreto-en-produccion';

app.use(express.json());
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 12, // 12 horas
      httpOnly: true,
    },
  })
);

// --- Helpers de datos ---
function readPosts() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writePosts(posts) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}

function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) {
    return next();
  }
  return res.status(401).json({ error: 'No autorizado' });
}

// --- Rutas de sesión ---
app.post('/api/login', (req, res) => {
  const { user, pass } = req.body || {};
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    req.session.loggedIn = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/session', (req, res) => {
  res.json({ loggedIn: !!(req.session && req.session.loggedIn) });
});

// --- Rutas de publicaciones ---
app.get('/api/posts', (req, res) => {
  const posts = readPosts().sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(posts);
});

app.post('/api/posts', requireAuth, (req, res) => {
  const { title, content, link, image } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: 'Título y contenido son obligatorios' });
  }
  const posts = readPosts();
  const newPost = {
    id: Date.now().toString(),
    title,
    content,
    link: link || '',
    image: image || '',
    date: new Date().toISOString(),
  };
  posts.push(newPost);
  writePosts(posts);
  res.status(201).json(newPost);
});

app.put('/api/posts/:id', requireAuth, (req, res) => {
  const posts = readPosts();
  const idx = posts.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'No encontrado' });
  const { title, content, link, image } = req.body || {};
  posts[idx] = {
    ...posts[idx],
    title: title ?? posts[idx].title,
    content: content ?? posts[idx].content,
    link: link ?? posts[idx].link,
    image: image ?? posts[idx].image,
  };
  writePosts(posts);
  res.json(posts[idx]);
});

app.delete('/api/posts/:id', requireAuth, (req, res) => {
  let posts = readPosts();
  const exists = posts.some((p) => p.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'No encontrado' });
  posts = posts.filter((p) => p.id !== req.params.id);
  writePosts(posts);
  res.json({ ok: true });
});

// --- Archivos estáticos (deben ir después de las rutas /api) ---
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
