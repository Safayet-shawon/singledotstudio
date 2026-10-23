// Deployment settings. This file is plain JavaScript on purpose so it can be edited without any build step.
// apiBase: the origin of the Java API, with no trailing slash. Use https and your real API domain in production.
window.SDS_CONFIG = { apiBase: 'http://localhost:8080' };

// Marks the page as script-enabled as early as possible, so scroll-reveal styles only apply when scripts will run.
document.documentElement.classList.add('js-ready');
