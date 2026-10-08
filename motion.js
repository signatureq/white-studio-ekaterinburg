'use strict';
(() => {
  // The document stays visible even without JavaScript or animation support.
  if (typeof Element.prototype.animate !== 'function') return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map();
  const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';

  function arrive(element, { duration = 680, delay = 0, distance = 0, axis = 'y' } = {}) {
    if (preference.matches || !element || element.hidden) return;
    active.get(element)?.cancel();
    element.dataset.motionEntered = 'true';
    const from = { opacity: 0 };
    const to = { opacity: 1 };
    if (distance) {
      const translate = axis === 'x' ? 'translateX' : 'translateY';
      from.transform = `${translate}(${distance}px)`;
      to.transform = `${translate}(0)`;
    }
    const animation = element.animate([from, to], { duration, delay, easing: ease, fill: 'backwards' });
    active.set(element, animation);
    const cleanUp = () => { if (active.get(element) === animation) active.delete(element); };
    animation.finished.then(cleanUp, cleanUp);
  }

  let observer;
  if (!preference.matches && 'IntersectionObserver' in window) {
    const entrances = new Map();
    const add = (selector, options) => {
      document.querySelectorAll(selector).forEach((element, index) => {
        entrances.set(element, typeof options === 'function' ? options(index) : options);
      });
    };
    // The opening has one finite sequence. Each later element enters only once.
    add('.hero-brand-line', { duration: 760, distance: 24 });
    add('.hero-slogan', { duration: 800, delay: 80, distance: 24 });
    add('.hero-description', { duration: 720, delay: 140, distance: 18 });
    add('.hero-actions', { duration: 680, delay: 180, distance: 14 });
    add('.section-heading h2, .about-copy h2, .contacts-copy h2, .reviews-grid h2, .faq-grid h2', { duration: 760, distance: -24, axis: 'x' });
    add('.catalogue-intro h1, .service-page-lead h1, .project-intro h1', { duration: 760, distance: 24 });
    add('.about-copy > p', index => ({ duration: 700, distance: 18, delay: Math.min(index * 60, 120) }));
    add('.about-visual, .album-photo, .catalogue-intro-grid > img', { duration: 800 });
    add('.service-image', index => ({ duration: 740, delay: (index % 3) * 60 }));
    add('.service-content h2, .service-content h3', { duration: 660, distance: 16 });
    // Prices have their own observer targets: a tall mobile card must not reveal
    // its price before the visitor actually reaches its footer.
    add('.catalogue-price, .service-page-price', { duration: 720, distance: 18, delay: 80 });
    add('.service-reading h2', { duration: 600, distance: 14 });
    add('.project-card', index => ({ duration: 720, delay: (index % 3) * 60 }));
    add('.contact-address, .contact-phone, .contact-socials', index => ({ duration: 680, distance: 16, delay: index * 60 }));
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        arrive(entry.target, entrances.get(entry.target));
        observer.unobserve(entry.target);
        entrances.delete(entry.target);
      }
      if (!entrances.size) observer.disconnect();
    }, { rootMargin: '0px 0px -5% 0px', threshold: 0 });
    entrances.forEach((options, element) => observer.observe(element));
  }

  // Native disclosure remains immediate; its newly opened answer settles gently.
  document.querySelectorAll('.faq-list details').forEach(details => {
    details.addEventListener('toggle', () => {
      if (details.open) arrive(details.querySelector('div'), { duration: 240, distance: 4 });
    });
  });

  // Filtering acknowledges the new result set without replaying entered prices.
  let filterFrame;
  function acknowledgeFilter() {
    if (preference.matches) return;
    cancelAnimationFrame(filterFrame);
    filterFrame = requestAnimationFrame(() => {
      document.querySelectorAll('.catalogue-card:not([hidden])').forEach(card => {
        const bounds = card.getBoundingClientRect();
        if (bounds.bottom > 0 && bounds.top < window.innerHeight) arrive(card, { duration: 220 });
      });
    });
  }
  document.querySelectorAll('.filter, #reset-search').forEach(button => {
    button.addEventListener('click', acknowledgeFilter);
  });
  document.querySelector('#service-search')?.addEventListener('input', acknowledgeFilter);

  // Keyboard focus and a changed motion preference always take priority over an entrance.
  document.addEventListener('focusin', event => {
    active.forEach((animation, element) => {
      if (element.contains(event.target)) animation.finish();
    });
  });
  preference.addEventListener('change', event => {
    if (!event.matches) return;
    observer?.disconnect();
    cancelAnimationFrame(filterFrame);
    active.forEach(animation => animation.cancel());
    active.clear();
  });
})();
