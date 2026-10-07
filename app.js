'use strict';
(() => {
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));
  const services = window.WHITE_STUDIO_SERVICES;
  const config = window.WHITE_STUDIO_CONFIG;
  const contactDetails = $('#contact-details');
  if (contactDetails && (config.phone || config.address || config.hours)) {
    contactDetails.replaceChildren();
    if (config.address) { const p = document.createElement('p'); p.textContent = config.address; contactDetails.append(p); }
    if (config.hours) { const p = document.createElement('p'); p.textContent = config.hours; contactDetails.append(p); }
    if (config.phone) { const a = document.createElement('a'); a.href = 'tel:' + String(config.phone).replace(/[^+\d]/g, ''); a.textContent = config.phone; a.className = 'contact-phone'; contactDetails.append(a); }
    const links = [['telegram','Telegram'],['whatsapp','WhatsApp'],['mapUrl','Проложить маршрут']];
    for (const [key,label] of links) {
      if (typeof config[key] !== 'string' || !config[key].startsWith('https://')) continue;
      const a = document.createElement('a'); a.href = config[key]; a.textContent = label; a.className = 'text-link contact-external'; a.target = '_blank'; a.rel = 'noopener noreferrer'; contactDetails.append(a);
    }
    $('.contact-status').textContent = 'Ждём вас в студии';
  }
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
    const draft = ['WHITE STUDIO — черновик запроса', 'ВАЖНО: этот запрос не отправлен в студию.', '', `Имя: ${name}`, `Телефон: ${phone}`, `Автомобиль: ${car}`, `Услуга: ${title}`, `Комментарий: ${String(data.get('comment')).trim() || 'Не указан'}`, '', 'Доступность услуги и стоимость нужно согласовать со студией.'].join('\n');
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
