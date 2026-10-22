(() => {
  'use strict';
  const form = document.querySelector('#quick-contact-form');
  if (!form) return;
  const name = form.querySelector('#quick-name');
  const whatsapp = form.querySelector('#quick-whatsapp');
  const location = form.querySelector('#quick-location');
  const error = form.querySelector('#quick-contact-error');
  const success = form.querySelector('#quick-contact-success');
  const fields = [name, whatsapp, location].filter(Boolean);
  const phoneDigits = value => String(value || '').replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  const labels = new Map([
    [name, 'seu nome com pelo menos duas letras'],
    [whatsapp, 'um WhatsApp válido com DDD'],
    [location, 'sua cidade e estado'],
  ]);
  const setError = message => { if (error) error.textContent = message; };
  fields.forEach(field => field?.addEventListener('input', () => {
    field.removeAttribute('aria-invalid');
    setError('');
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    fields.forEach(field => field?.removeAttribute('aria-invalid'));
    if (success) success.hidden = true;
    if (name) name.value = name.value.trim().replace(/\s+/g, ' ');
    if (location) location.value = location.value.trim().replace(/\s+/g, ' ');
    if (whatsapp) whatsapp.value = whatsapp.value.trim().replace(/\s+/g, ' ');
    const invalid = fields.find(field => {
      const value = field?.value.trim() || '';
      const validPhone = field !== whatsapp || /^[1-9]\d{9,10}$/.test(phoneDigits(value));
      return !value || value.length < 2 || !validPhone;
    });
    if (invalid) {
      invalid.setAttribute('aria-invalid', 'true');
      setError(`Informe ${labels.get(invalid) || 'os dados solicitados'}.`);
      invalid.focus({ preventScroll: true });
      return;
    }
    setError('');
    if (success) {
      success.hidden = false;
      success.textContent = 'Demonstração concluída. Nenhum dado foi enviado. Quando o contato real for conectado, combinaremos seu diagnóstico gratuito pelo WhatsApp, sem compromisso financeiro.';
    }
    form.querySelector('button[type="submit"]')?.setAttribute('disabled', 'true');
    form.dispatchEvent(new CustomEvent('engrena:contact-demo-complete', { bubbles: true }));
  });
  form.dataset.ready = 'true';
  form.querySelector('button[type="submit"]')?.removeAttribute('disabled');
})();
