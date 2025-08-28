// Simple shared password gate (NOT secure, just obfuscation for casual access)
// Change this value to update the shared password.
const ACCESS_PASSWORD = 'PibouPibou1234';
const STORAGE_FLAG = 'bbslAuthOk';

export async function ensureAuth() {
  if (localStorage.getItem(STORAGE_FLAG) === '1') return true;
  injectOverlay();
  return new Promise(resolve => {
    const form = document.getElementById('authForm');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const pw = form.querySelector('input[type="password"]').value.trim();
      if (pw === ACCESS_PASSWORD) {
        localStorage.setItem(STORAGE_FLAG, '1');
        removeOverlay();
        resolve(true);
      } else {
        const err = document.getElementById('authError');
        err.textContent = 'Password errata';
      }
    });
  });
}

function injectOverlay() {
  const div = document.createElement('div');
  div.className = 'auth-overlay';
  div.innerHTML = `
    <div class="auth-box">
      <h2>Accesso</h2>
      <p>Inserisci la password condivisa</p>
      <form id="authForm">
        <input type="password" placeholder="Password" required autofocus />
        <button>Entra</button>
        <div id="authError" class="auth-error"></div>
      </form>
      <small>Protezione semplice lato client.</small>
    </div>`;
  document.body.appendChild(div);
}

function removeOverlay() {
  const ov = document.querySelector('.auth-overlay');
  if (ov) ov.remove();
}
