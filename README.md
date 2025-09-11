## Takumi Kan Portfolio (Astro)

Personal site built with Astro. Pages: Home, About, Blog, Works.

### Setup

1. Install dependencies:

```bash
npm install
```

2. Set environment variables (create a `.env` in project root):

```bash
PUBLIC_MICROCMS_SERVICE_DOMAIN=your-service-domain
MICROCMS_API_KEY=your-api-key
```

3. Run dev server:

```bash
npm run dev
```

Open `http://localhost:4321`.

### Blog data (microCMS)

- Endpoint: `blog`
- Fields used: `id`, `title`, `body`, `publishedAt`
- Detail route: `/blog/[id]`
