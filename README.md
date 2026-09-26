# AMILCARGIT OFICIAL — Sitio + Panel de publicaciones

Sitio personal con panel para publicar sin tocar código, listo para Render.

## 1. Antes de subirlo

- Edita `public/index.html`: cambia los enlaces de TikTok, YouTube, WhatsApp, Facebook e Instagram por los tuyos, y la foto (`avatar`).
- Cambia la bio en el `<p class="bio">`.

## 2. Probar en tu computadora (opcional)

```bash
npm install
ADMIN_USER=amilcar ADMIN_PASS=tu-clave-segura SESSION_SECRET=algo-random npm start
```

Abre `http://localhost:3000` para la web, y `http://localhost:3000/admin` para el panel.

## 3. Subir a GitHub

```bash
git init
git add .
git commit -m "Sitio AMILCARGIT OFICIAL con panel"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

## 4. Desplegar en Render

**Importante:** este proyecto necesita un backend (para guardar publicaciones), así que en Render se crea como **Web Service**, no como "Static Site".

1. Entra a render.com → New → **Web Service**.
2. Conecta tu repositorio de GitHub.
3. Configuración:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. En "Environment", agrega estas variables:
   - `ADMIN_USER` → tu usuario de acceso al panel
   - `ADMIN_PASS` → tu contraseña (elige una segura)
   - `SESSION_SECRET` → cualquier texto largo y aleatorio
5. Crea el servicio. Render te dará una URL como `https://tu-sitio.onrender.com`.
6. Entra al panel en `https://tu-sitio.onrender.com/admin`.

## 5. Sobre guardar las publicaciones (importante)

Las publicaciones se guardan en el archivo `data/posts.json`. En el plan **gratuito** de Render, el disco no es permanente: si el servicio se reinicia o vuelves a desplegar, ese archivo puede regresar a su estado original (vacío).

Para que las publicaciones no se pierdan, más adelante puedes:
- Añadir un **Persistent Disk** en Render (de pago) montado en la carpeta `data/`, o
- Migrar el almacenamiento a una base de datos como **Render Postgres** (tiene plan gratuito).

Puedo ayudarte a hacer cualquiera de los dos cuando quieras.
