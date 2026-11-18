(function () {
  'use strict';
  var form = document.getElementById('signup');
  var input = document.getElementById('signup-email');
  var btn = document.getElementById('signup-btn');
  var label = btn.querySelector('.btn-label');
  var status = document.getElementById('signup-status');
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var yr = document.getElementById('year');
  if (yr) yr.textContent = new Date().getFullYear();

  function show(msg, type) {
    status.textContent = msg;
    status.className = 'status' + (type ? ' ' + type : '');
  }
  function validate(value) {
    if (!value) return 'Please enter your email address.';
    if (value.length > 254 || !EMAIL_RE.test(value)) return 'That email doesn’t look right. Please check it and try again.';
    return '';
  }
  function check() {
    var err = validate(input.value.trim());
    input.setAttribute('aria-invalid', err ? 'true' : 'false');
    show(err, err ? 'error' : '');
    return !err;
  }
  function setLoading(on) {
    btn.disabled = on;
    btn.setAttribute('aria-busy', on ? 'true' : 'false');
    label.textContent = on ? 'Sending…' : 'Notify me';
  }

  input.addEventListener('blur', function () { if (input.value.trim()) check(); });
  input.addEventListener('input', function () {
    if (input.getAttribute('aria-invalid') === 'true') { input.setAttribute('aria-invalid', 'false'); show('', ''); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (btn.disabled) return;
    if (!check()) { input.focus(); return; }
    setLoading(true);
    show('Adding you to the list…', '');
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 15000) : null;
    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email: input.value.trim() }),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      if (res.status === 200 || res.status === 201) {
        show('You’re on the list ☁️ We’ll be in touch soon.', 'success');
        input.value = '';
        input.setAttribute('aria-invalid', 'false');
      } else if (res.status === 400) {
        input.setAttribute('aria-invalid', 'true');
        show('That email doesn’t look right. Please check it and try again.', 'error');
        input.focus();
      } else if (res.status === 429) {
        show('Whoa, slow down a little. Please try again in a minute.', 'error');
      } else {
        show('Something went wrong, please try again.', 'error');
      }
    }).catch(function () {
      show('Something went wrong, please try again.', 'error');
    }).then(function () {
      if (timer) clearTimeout(timer);
      setLoading(false);
    });
  });
})();
