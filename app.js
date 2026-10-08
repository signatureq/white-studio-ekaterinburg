'use strict';
(() => {
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const services = window.WHITE_STUDIO_SERVICES;
  const config = window.WHITE_STUDIO_CONFIG;
  $$('[data-contact-link]').forEach(link => {
    const key = link.dataset.contactLink;
    if (key === 'phone' && config.phone) link.href = 'tel:' + config.phone.replace(/[^+\d]/g, '');
    else if (typeof config[key] === 'string' && config[key].startsWith('https://')) link.href = config[key];
  });
  const bookingDialog = $('#booking-dialog');
  const bookingForm = $('#booking-form');
  let draftUrl = null;
  let lastDialogTrigger = null;

  const openDialog = (dialog, trigger) => {
    closeMenu();
    lastDialogTrigger = trigger || document.activeElement;
    dialog.showModal();
    dialog.scrollTop = 0;
  };
  const closeDialog = (dialog) => dialog.close();
  const resetBooking = () => {
    bookingForm.reset();
    bookingForm.hidden = false;
    $('#form-success').hidden = true;
    $('#form-error').hidden = true;
    if (draftUrl) URL.revokeObjectURL(draftUrl);
    draftUrl = null;
    $('#download-draft').removeAttribute('href');
  };
  const openBooking = (service = 'consultation', trigger) => {
    $('#booking-service').value = services[service] ? service : 'consultation';
    openDialog(bookingDialog, trigger);
  };

  const menuButton = $('.menu-toggle');
  const mobileNav = $('#mobile-nav');
  function closeMenu() {
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Открыть меню');
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    mobileNav.hidden = !open;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  });
  $$('#mobile-nav a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  window.matchMedia('(min-width:981px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

  $$('[data-book]').forEach(button => button.addEventListener('click', () => openBooking(button.dataset.book || 'consultation', button)));
  $$('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(button.closest('dialog'))));
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
    });
    dialog.addEventListener('close', () => {
      if (dialog === bookingDialog) resetBooking();
      if (lastDialogTrigger?.isConnected) lastDialogTrigger.focus({ preventScroll: true });
    });
  });
  $$('[data-privacy]').forEach(button => button.addEventListener('click', () => openDialog($('#privacy-dialog'), button)));

  let activeCategory = 'all';
  function applyFilter(category) {
    activeCategory = category;
    const query = $('#service-search')?.value.trim().toLowerCase() || '';
    let shown = 0;
    $$('.filter').forEach(button => {
      const active = button.dataset.filter === category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $$('.service-card').forEach(card => {
      const service = services[card.dataset.service];
      const matchesSearch = !query || `${service?.title} ${service?.summary}`.toLowerCase().includes(query);
      const visible = (category === 'all' || card.dataset.category === category) && matchesSearch;
      card.hidden = !visible;
      if (visible) shown++;
    });
    if ($('#filter-status')) $('#filter-status').textContent = `Показано услуг: ${shown}`;
    if ($('#catalogue-count')) $('#catalogue-count').textContent = `${shown} из ${Object.keys(services).length}`;
    if ($('#catalogue-empty')) $('#catalogue-empty').hidden = shown !== 0;
  }
  $$('.filter').forEach(button => button.addEventListener('click', () => applyFilter(button.dataset.filter)));
  $$('[data-category-link]').forEach(link => link.addEventListener('click', () => applyFilter(link.dataset.categoryLink)));
  $('#service-search')?.addEventListener('input', () => applyFilter(activeCategory));
  $('#reset-search')?.addEventListener('click', () => { $('#service-search').value = ''; applyFilter('all'); $('#service-search').focus(); });
  const initialCategory = new URLSearchParams(location.search).get('category');
  if ($('#service-search') && ['body', 'protection', 'interior', 'style'].includes(initialCategory)) applyFilter(initialCategory);

  const projectSlider = $('#project-slider');
  if (projectSlider) {
    const previous = $('[data-project-prev]');
    const next = $('[data-project-next]');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let scrollFrame;
    const updateControls = () => {
      const end = projectSlider.scrollWidth - projectSlider.clientWidth;
      previous.disabled = projectSlider.scrollLeft <= 2;
      next.disabled = projectSlider.scrollLeft >= end - 2;
    };
    const move = direction => {
      const card = $('.project-card', projectSlider);
      const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(projectSlider).columnGap);
      projectSlider.scrollBy({left:step * direction, behavior:reducedMotion.matches ? 'instant' : 'smooth'});
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    projectSlider.addEventListener('scroll', () => {
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(updateControls);
    }, {passive:true});
    projectSlider.addEventListener('keydown', event => {
      if (event.target !== projectSlider) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        move(event.key === 'ArrowLeft' ? -1 : 1);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        projectSlider.scrollTo({left:event.key === 'Home' ? 0 : projectSlider.scrollWidth, behavior:reducedMotion.matches ? 'instant' : 'smooth'});
      }
    });
    window.addEventListener('resize', updateControls, {passive:true});
    updateControls();
  }

  const phoneInput = $('input[name="phone"]', bookingForm);
  phoneInput.addEventListener('input', () => {
    phoneInput.setCustomValidity('');
    $('#form-error').hidden = true;
  });
  bookingForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(bookingForm);
    const name = String(data.get('name')).trim();
    const car = String(data.get('car')).trim();
    const phone = String(data.get('phone')).trim();
    const digits = phone.replace(/\D/g, '');
    let error = '';
    if (!name || !car) error = 'Укажите имя и марку автомобиля. Поля не должны состоять только из пробелов.';
    else if (digits.length < 10 || digits.length > 15) error = 'Проверьте телефон: укажите от 10 до 15 цифр с кодом страны или города.';
    if (error) {
      $('#form-error').textContent = error;
      $('#form-error').hidden = false;
      if (digits.length < 10 || digits.length > 15) phoneInput.focus();
      return;
    }
    const title = services[data.get('service')]?.title || 'Консультация';
    const draft = ['WHITE STUDIO — запрос', '', `Имя: ${name}`, `Телефон: ${phone}`, `Автомобиль: ${car}`, `Услуга: ${title}`, `Комментарий: ${String(data.get('comment')).trim() || 'Не указан'}`, '', 'Состав работ и итоговая стоимость определяются после осмотра автомобиля.'].join('\n');
    if (draftUrl) URL.revokeObjectURL(draftUrl);
    draftUrl = URL.createObjectURL(new Blob(['\uFEFF' + draft], { type: 'text/plain;charset=utf-8' }));
    $('#download-draft').href = draftUrl;
    bookingForm.hidden = true;
    $('#form-success').hidden = false;
    $('#download-draft').focus();
  });
  $('#edit-draft').addEventListener('click', () => {
    bookingForm.hidden = false;
    $('#form-success').hidden = true;
    $('input[name="name"]', bookingForm).focus();
  });
  $('#year').textContent = new Date().getFullYear();
})();
