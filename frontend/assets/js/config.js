// Deployment settings. This file is plain JavaScript on purpose so it can be edited without any build step.
// apiBase: the origin of the Java API, with no trailing slash. An empty string means "same origin". For a separate API
// domain, put its https origin here and list the site's origin in the API's APP_FRONTEND_ORIGINS.
// On localhost the API runs on port 8080; anywhere else the API is served from the same origin under /api (Vercel Services).
window.SDS_CONFIG = { apiBase: ['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:8080' : '' };

// Marks the page as script-enabled as early as possible, so scroll-reveal styles only apply when scripts will run.
document.documentElement.classList.add('js-ready');
