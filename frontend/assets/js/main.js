// Entry point for every public page. Each feature checks for its own markup, so pages only pay for what they use.
import { initNavigation } from './navigation.js';
import { initSplash, initReveal, initCarousel, initSwitcher, initGallery, initBeforeAfter } from './animations.js';
import { initConsultForms } from './forms.js';
import { initCalculator } from './calculator.js';

initSplash();
initNavigation();
initReveal();
initCarousel();
initSwitcher();
initGallery();
initBeforeAfter();
initConsultForms();
initCalculator();
