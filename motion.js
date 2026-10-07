'use strict';
(() => {
  // The document stays visible even without JavaScript or animation support.
  if (typeof Element.prototype.animate !== 'function') return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const active = new Map();
  const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';

  function arrive(element, { duration = 560, delay = 0, distance = 0 } = {}) {
    if (preference.matches || !element || element.hidden) return;
    active.get(element)?.cancel();
    const from = { opacity: .5 };
    const to = { opacity: 1 };
    if (distance) {
      from.transform = `translateY(${distance}px)`;
      to.transform = 'translateY(0)';
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
    // The four directions appear as one collection; the total stagger is only 180 ms.
    add('.home-service-grid .service-card', index => ({ distance: 12, delay: index * 60 }));
    add('.about-visual', { duration: 640 });
    add('.about-copy', { duration: 480, distance: 8 });
    add('.project-card', index => ({ duration: 600, delay: (index % 2) * 80 }));
    add('.album-photo, .service-page-photo, .catalogue-intro-grid > img', { duration: 640 });
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

  // Filtering replaces a set of rows, rather than restarting scroll entrances.
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
