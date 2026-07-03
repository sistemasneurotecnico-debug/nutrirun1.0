# Despliegue en Cloudflare Pages

## Requisitos previos

- Cuenta en [Cloudflare](https://dash.cloudflare.com) (gratis)
- Node.js instalado
- Wrangler CLI (ya incluido en devDependencies)

---

## Opción A — Despliegue por Git (recomendado)

1. Sube el proyecto a un repositorio de GitHub o GitLab.
2. En el dashboard de Cloudflare → **Pages** → **Create a project** → **Connect to Git**.
3. Selecciona tu repositorio.
4. Configura el build:
   - **Framework preset:** None
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. Agrega el secreto de entorno:
   - En **Settings → Environment variables → Production**
   - Nombre: `GEMINI_API_KEY`
   - Valor: tu clave de la API de Google AI Studio
   - Marca como **Secret (encrypted)**
6. Haz clic en **Save and Deploy**.

Cloudflare detecta automáticamente la carpeta `functions/` y despliega los endpoints de API.

---

## Opción B — Despliegue manual con Wrangler CLI

```bash
# 1. Autenticarse en Cloudflare
npx wrangler login

# 2. Hacer el build del frontend
npm run build

# 3. Desplegar a Cloudflare Pages
npx wrangler pages deploy dist --project-name=nutrirun-pro
```

Tras el primer despliegue, agrega el secreto:

```bash
npx wrangler pages secret put GEMINI_API_KEY --project-name=nutrirun-pro
# Te pedirá que pegues el valor de la clave
```

---

## Desarrollo local con Cloudflare

Para probar las funciones de API localmente con el runtime de Workers:

```bash
npm run dev:cf
```

Necesitas un archivo `.dev.vars` (ya incluido en `.gitignore`) con:

```
GEMINI_API_KEY=tu_clave_aqui
```

---

## Estructura de las Functions

```
functions/
  api/
    analyze-food.ts          → POST /api/analyze-food
    analyze-manual-food.ts   → POST /api/analyze-manual-food
```

Cloudflare Pages mapea automáticamente cada archivo en `functions/` a su ruta correspondiente.
