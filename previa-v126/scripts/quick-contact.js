(() => {
  'use strict';
  const form = document.querySelector('#qualification-form');
  const panel = document.querySelector('#diagnosis-panel');
  const home = document.querySelector('#contato-rapido');
  const dialog = document.querySelector('#contact-dialog');
  const slot = document.querySelector('#diagnosis-dialog-body');
  if (!form || !panel || !home || !dialog || !slot) return;
  const controls = [...form.querySelectorAll('input,select,textarea')];
  const error = form.querySelector('#diagnosis-error');
  const success = panel.querySelector('#diagnosis-success');
  const submit = form.querySelector('button[type="submit"]');
  const first = form.querySelector('#contact-name');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 899px)');
  const labels = {
    'contact-name': 'seu nome com pelo menos duas letras',
    whatsapp: 'um WhatsApp válido com DDD',
    workshop: 'o nome da oficina',
    revenue: 'a faixa de faturamento da oficina',
    city: 'a cidade da oficina',
    state: 'o estado da oficina',
    interest: 'o que você quer melhorar na oficina',
  };
  let opener = null;
  let scrollPosition = 0;
  let completed = false;
  let focusFrame = 0;
  const nationalPhone = value => String(value).replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  const inlineObserver = new IntersectionObserver(entries => {
    document.body.classList.toggle('diagnosis-inline-visible', entries.some(entry => entry.isIntersecting));
  });
  inlineObserver.observe(home);
  controls.forEach(control => control.addEventListener('input', () => {
    control.removeAttribute('aria-invalid');
    if (!form.querySelector('[aria-invalid="true"]')) error.textContent = '';
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (completed) return;
    controls.forEach(control => {
      control.removeAttribute('aria-invalid');
      if (control.tagName !== 'SELECT') control.value = control.value.trim();
    });
    const invalid = controls.filter(control => {
      const value = control.value;
      const valid = control.id === 'whatsapp'
        ? /^[1-9]\d{9,10}$/.test(nationalPhone(value))
        : Boolean(value) && control.checkValidity() && (control.tagName === 'SELECT' || value.length >= 2);
      if (!valid) control.setAttribute('aria-invalid', 'true');
      return !valid;
    });
    error.textContent = invalid.length ? `Informe ${labels[invalid[0].id]}.` : '';
    if (invalid.length) {
      invalid[0].focus();
      return;
    }
    // This preview neither transmits nor durably stores contact information.
    completed = true;
    form.hidden = true;
    success.hidden = false;
    success.focus();
    form.dispatchEvent(new CustomEvent('engrena:contact-demo-complete', { bubbles: true }));
  });

  panel.querySelector('[data-diagnosis-edit]').addEventListener('click', () => {
    completed = false;
    success.hidden = true;
    form.hidden = false;
    first.focus();
  });
  panel.querySelector('[data-diagnosis-return]').addEventListener('click', () => {
    if (dialog.open) dialog.close();
    else document.querySelector('.brand-link')?.focus();
  });

  function open(trigger) {
    if (dialog.open) return;
    opener = trigger;
    scrollPosition = scrollY;
    // Reserve the inline footprint so the page and its scroll-linked art do not jump.
    if (!compact.matches) home.style.minHeight = `${home.getBoundingClientRect().height}px`;
    slot.append(panel);
    dialog.showModal();
    dialog.scrollTop = 0;
    focusFrame = requestAnimationFrame(() => {
      focusFrame = 0;
      if (dialog.open) (completed ? success : first).focus({ preventScroll: true });
    });
  }
  dialog.addEventListener('close', () => {
    cancelAnimationFrame(focusFrame);
    focusFrame = 0;
    home.append(panel);
    home.style.removeProperty('min-height');
    scrollTo({ top: scrollPosition, behavior: 'instant' });
    const parentDialog = opener?.closest('dialog');
    let returnTarget = parentDialog && !parentDialog.open ? document.querySelector('#menu-trigger') : opener;
    const homeBox = home.getBoundingClientRect();
    if (returnTarget?.id === 'floating-contact' && homeBox.top < innerHeight && homeBox.bottom > 0) {
      returnTarget = completed ? success : first;
    }
    if (returnTarget?.isConnected) returnTarget.focus();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = [...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')]
      .filter(node => !node.disabled && node.tabIndex >= 0 && node.getClientRects().length);
    const head = focusable[0], tail = focusable[focusable.length - 1];
    if (!head) return;
    if (event.shiftKey && document.activeElement === head) {
      event.preventDefault(); tail.focus();
    } else if (!event.shiftKey && document.activeElement === tail) {
      event.preventDefault(); head.focus();
    }
  });

  document.querySelector('.dock-cta')?.addEventListener('click', event => {
    event.preventDefault();
    if (compact.matches) {
      open(event.currentTarget);
      return;
    }
    home.scrollIntoView({ behavior: reduced.matches ? 'instant' : 'smooth', block: 'start' });
    (completed ? success : first).focus({ preventScroll: true });
  });
  window.engrenaContact = Object.freeze({
    open,
    get state() { return { presentation: dialog.open ? 'dialog' : compact.matches ? 'button' : 'inline', completed, fields: controls.length }; },
  });
  form.dataset.ready = 'true';
  submit.disabled = false;
  document.body.classList.add('contact-enhanced');
  addEventListener('pagehide', event => {
    if (!event.persisted) { inlineObserver.disconnect(); cancelAnimationFrame(focusFrame); }
  });
})();
