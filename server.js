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

// --- Almacenamiento: usa Postgres si hay DATABASE_URL, si no usa un archivo JSON local ---
const USE_DB = !!process.env.DATABASE_URL;
let pool;

if (USE_DB) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

const VISITS_FILE = path.join(__dirname, 'data', 'visits.json');

async function initDb() {
  if (!USE_DB) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      link TEXT,
      image TEXT,
      date TIMESTAMPTZ NOT NULL
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stats (
      id INTEGER PRIMARY KEY DEFAULT 1,
      visits BIGINT NOT NULL DEFAULT 0
    );
  `);
  await pool.query(`
    INSERT INTO stats (id, visits) VALUES (1, 0)
    ON CONFLICT (id) DO NOTHING;
  `);
}

async function incrementVisits() {
  if (USE_DB) {
    const { rows } = await pool.query(
      'UPDATE stats SET visits = visits + 1 WHERE id = 1 RETURNING visits'
    );
    return Number(rows[0].visits);
  }
  let count = 0;
  try {
    count = JSON.parse(fs.readFileSync(VISITS_FILE, 'utf-8')).count || 0;
  } catch (err) {
    count = 0;
  }
  count += 1;
  fs.writeFileSync(VISITS_FILE, JSON.stringify({ count }), 'utf-8');
  return count;
}

// --- Helpers de datos (JSON, solo para desarrollo local sin base de datos) ---
function readPostsFile() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function writePostsFile(posts) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}

// --- Capa de datos unificada ---
async function getAllPosts() {
  if (USE_DB) {
    const { rows } = await pool.query('SELECT * FROM posts ORDER BY date DESC');
    return rows;
  }
  return readPostsFile().sort((a, b) => new Date(b.date) - new Date(a.date));
}

async function createPost({ title, content, link, image }) {
  const post = {
    id: Date.now().toString(),
    title,
    content,
    link: link || '',
    image: image || '',
    date: new Date().toISOString(),
  };
  if (USE_DB) {
    await pool.query(
      'INSERT INTO posts (id, title, content, link, image, date) VALUES ($1,$2,$3,$4,$5,$6)',
      [post.id, post.title, post.content, post.link, post.image, post.date]
    );
  } else {
    const posts = readPostsFile();
    posts.push(post);
    writePostsFile(posts);
  }
  return post;
}

async function updatePost(id, { title, content, link, image }) {
  if (USE_DB) {
    const { rows } = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (!rows[0]) return null;
    const current = rows[0];
    const updated = {
      title: title ?? current.title,
      content: content ?? current.content,
      link: link ?? current.link,
      image: image ?? current.image,
    };
    await pool.query(
      'UPDATE posts SET title=$1, content=$2, link=$3, image=$4 WHERE id=$5',
      [updated.title, updated.content, updated.link, updated.image, id]
    );
    return { ...current, ...updated };
  }
  const posts = readPostsFile();
  const idx = posts.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  posts[idx] = {
    ...posts[idx],
    title: title ?? posts[idx].title,
    content: content ?? posts[idx].content,
    link: link ?? posts[idx].link,
    image: image ?? posts[idx].image,
  };
  writePostsFile(posts);
  return posts[idx];
}

async function deletePost(id) {
  if (USE_DB) {
    const { rowCount } = await pool.query('DELETE FROM posts WHERE id = $1', [id]);
    return rowCount > 0;
  }
  let posts = readPostsFile();
  const exists = posts.some((p) => p.id === id);
  if (!exists) return false;
  posts = posts.filter((p) => p.id !== id);
  writePostsFile(posts);
  return true;
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
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await getAllPosts();
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al leer publicaciones' });
  }
});

app.post('/api/posts', requireAuth, async (req, res) => {
  const { title, content, link, image } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ error: 'Título y contenido son obligatorios' });
  }
  try {
    const post = await createPost({ title, content, link, image });
    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar la publicación' });
  }
});

app.put('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const updated = await updatePost(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'No encontrado' });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar' });
  }
});

app.delete('/api/posts/:id', requireAuth, async (req, res) => {
  try {
    const ok = await deletePost(req.params.id);
    if (!ok) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al borrar' });
  }
});

app.post('/api/visits', async (req, res) => {
  try {
    const visits = await incrementVisits();
    res.json({ visits });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar visita' });
  }
});

// --- Archivos estáticos (deben ir después de las rutas /api) ---
app.use(express.static(path.join(__dirname, 'public')));

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en el puerto ${PORT}`);
      console.log(USE_DB ? 'Usando base de datos Postgres' : 'Usando archivo local data/posts.json');
    });
  })
  .catch((err) => {
    console.error('Error al iniciar la base de datos:', err);
    process.exit(1);
  });