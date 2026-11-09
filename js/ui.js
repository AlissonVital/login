const EYE_OFF = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 3l18 18" />
    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.9 5.1A10.5 10.5 0 0 1 12 5c5 0 9.3 3.1 11 7-.5 1.2-1.2 2.3-2.1 3.3" />
    <path d="M6.7 6.7C4.7 8 3.2 9.8 2 12c1.7 3.9 6 7 10 7 1.4 0 2.7-.3 3.9-.8" />
  </svg>
`;

const EYE_ON = `
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
`;

export function setupPasswordToggles(root = document) {
  root.querySelectorAll('[data-toggle-password]').forEach((btn) => {
    const targetId = btn.getAttribute('data-toggle-password');
    const input = document.getElementById(targetId);
    if (!input) return;

    const sync = () => {
      const visible = input.type === 'text';
      btn.innerHTML = visible ? EYE_ON : EYE_OFF;
      btn.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
      btn.setAttribute('aria-pressed', String(visible));
    };

    sync();
    btn.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      sync();
    });
  });
}

function ensureModalHost() {
  let host = document.getElementById('modal-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'modal-host';
    document.body.appendChild(host);
  }
  return host;
}

export function closeModal() {
  const host = document.getElementById('modal-host');
  if (!host) return;
  const backdrop = host.querySelector('.modal-backdrop');
  if (backdrop) {
    backdrop.classList.remove('open');
    setTimeout(() => {
      host.innerHTML = '';
    }, 180);
  }
}

export function showModal({
  title = 'Aviso',
  message = '',
  confirmText = 'OK',
  cancelText = null,
  input = null,
}) {
  return new Promise((resolve) => {
    const host = ensureModalHost();
    host.innerHTML = `
      <div class="modal-backdrop open" role="presentation">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <h2 id="modal-title">${title}</h2>
          ${message ? `<p id="modal-message">${message}</p>` : ''}
          ${
            input
              ? `<div class="field">
                  <label for="modal-input">${input.label || 'E-mail'}</label>
                  <input id="modal-input" type="${input.type || 'email'}" placeholder="${input.placeholder || ''}" value="${input.value || ''}" autocomplete="${input.autocomplete || 'email'}" />
                </div>`
              : ''
          }
          <div class="modal-actions">
            ${cancelText ? `<button type="button" class="btn btn-neutral" data-modal-cancel>${cancelText}</button>` : ''}
            <button type="button" class="btn btn-submit" data-modal-confirm>${confirmText}</button>
          </div>
        </div>
      </div>
    `;

    const backdrop = host.querySelector('.modal-backdrop');
    const confirmBtn = host.querySelector('[data-modal-confirm]');
    const cancelBtn = host.querySelector('[data-modal-cancel]');
    const inputEl = host.querySelector('#modal-input');

    const finish = (result) => {
      closeModal();
      resolve(result);
    };

    confirmBtn.addEventListener('click', () => {
      if (input) {
        finish({ confirmed: true, value: inputEl ? inputEl.value.trim() : '' });
      } else {
        finish({ confirmed: true });
      }
    });

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => finish({ confirmed: false }));
    }

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop && cancelText) {
        finish({ confirmed: false });
      }
    });

    document.addEventListener(
      'keydown',
      function onKey(e) {
        if (e.key === 'Escape' && cancelText) {
          document.removeEventListener('keydown', onKey);
          finish({ confirmed: false });
        }
      },
      { once: true }
    );

    if (inputEl) {
      inputEl.focus();
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmBtn.click();
      });
    } else {
      confirmBtn.focus();
    }
  });
}

export function showAlert(message, title = 'Aviso') {
  return showModal({ title, message, confirmText: 'OK' });
}

export function showConfirm(message, title = 'Confirmação') {
  return showModal({
    title,
    message,
    confirmText: 'SIM',
    cancelText: 'NÃO',
  });
}
