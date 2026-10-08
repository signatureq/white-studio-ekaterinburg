'use strict';
(() => {
  // Progressive enhancement: no script, unsupported API or reduced motion leaves
  // the complete page visible. Already-visible content is never hidden again.
  if (typeof Element.prototype.animate !== 'function' || !('IntersectionObserver' in window)) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches) return;
  const ease = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
  const pending = new Map();
  const active = new Map();
  const decoded = new WeakMap();

  function preparePhoto(image) {
    if (!decoded.has(image)) {
      image.decoding = 'async';
      image.loading = 'eager';
      const ready = typeof image.decode === 'function' ? image.decode().catch(() => {}) : Promise.resolve();
      decoded.set(image, ready);
    }
    return decoded.get(image);
  }

  function finish(element) {
    pending.delete(element);
    element.removeAttribute('data-motion-pending');
    element.dataset.motionEntered = 'true';
    active.get(element)?.cancel();
    active.delete(element);
  }

  function reveal(element) {
    const options = pending.get(element);
    if (!options) return;
    if (preference.matches) { finish(element); return; }
    pending.delete(element);
    const from = { opacity: 0 };
    const to = { opacity: 1 };
    if (options.distance) {
      from.transform = `translateY(${options.distance}px)`;
      to.transform = 'translateY(0)';
    }
    try {
      // Install the animation before releasing its offscreen starting state.
      // No visible frame can switch from full opacity back to zero.
      const animation = element.animate([from, to], { duration: options.duration, easing: ease });
      active.set(element, animation);
      const cleanUp = () => { if (active.get(element) === animation) active.delete(element); };
      animation.finished.then(cleanUp, cleanUp);
    } finally {
      element.removeAttribute('data-motion-pending');
      element.dataset.motionEntered = 'true';
    }
  }

  const entrances = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entrances.unobserve(entry.target);
      if (entry.target.tagName === 'IMG') preparePhoto(entry.target).then(() => reveal(entry.target));
      else reveal(entry.target);
    }
  }, { rootMargin: '0px 0px 48px 0px', threshold: 0 });

  // Prepare pixels before they reach the screen. The entire small portfolio strip
  // is warmed together so swiping never also starts a second opacity animation.
  const photoSelector = '.service-image img, .about-visual img, .album-photo img, .catalogue-intro-grid > img';
  const warmer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const images = entry.target.tagName === 'IMG' ? [entry.target] : entry.target.querySelectorAll('img');
      images.forEach(preparePhoto);
      warmer.unobserve(entry.target);
    }
  }, { rootMargin: '600px 0px', threshold: 0 });
  document.querySelectorAll(photoSelector + ', .project-slider').forEach(element => warmer.observe(element));

  const candidates = new Map();
  const add = (selector, options) => document.querySelectorAll(selector).forEach(element => candidates.set(element, options));
  add(photoSelector, { duration: 560 });
  add('.section-heading h2, .about-copy h2, .contacts-copy h2, .reviews-grid h2, .faq-grid h2', { duration: 500, distance: 12 });
  add('.catalogue-intro h1, .service-page-lead h1, .project-intro h1', { duration: 500, distance: 12 });
  add('.about-copy > p, .service-content h2, .service-content h3, .service-reading h2', { duration: 460, distance: 8 });
  add('.catalogue-price, .service-page-price', { duration: 460, distance: 8 });
  add('.contact-address, .contact-phone, .contact-socials', { duration: 460, distance: 8 });

  // Read layout as one batch before changing any styles. Initial and restored
  // viewports remain fully visible, even when the script arrives late.
  const bounds = [...candidates].map(([element, options]) => ({ element, options, rect: element.getBoundingClientRect() }));
  for (const { element, options, rect } of bounds) {
    if (!rect.width || !rect.height || rect.top < window.innerHeight + 48 || element.closest('[hidden]')) {
      element.dataset.motionEntered = 'true';
      continue;
    }
    pending.set(element, options);
    element.setAttribute('data-motion-pending', '');
    entrances.observe(element);
  }

  // Filtering updates results directly; animating parent cards as well as their
  // pictures and prices multiplied opacity and caused flashes on every keystroke.
  function settleCatalogue() {
    for (const element of [...pending.keys(), ...active.keys()]) {
      if (element.closest('.catalogue-card')) {
        finish(element);
        entrances.unobserve(element);
      }
    }
  }
  document.querySelectorAll('.filter, #reset-search').forEach(button => button.addEventListener('click', settleCatalogue));
  document.querySelector('#service-search')?.addEventListener('input', settleCatalogue);

  document.addEventListener('focusin', event => {
    for (const element of [...pending.keys(), ...active.keys()]) {
      if (element.contains(event.target) || event.target.contains?.(element)) {
        finish(element);
        entrances.unobserve(element);
      }
    }
  });
  function settleAll() {
    entrances.disconnect();
    warmer.disconnect();
    for (const element of [...pending.keys(), ...active.keys()]) finish(element);
  }
  preference.addEventListener('change', event => { if (event.matches) settleAll(); });
  window.addEventListener('pageshow', event => { if (event.persisted) settleAll(); });
})();
