import { apiRequest } from './api.js';
import { clearSession, getStoredUser, getToken, saveSession } from './auth.js';

const guestActions = document.getElementById('guest-actions');
const userSession = document.getElementById('user-session');
const firstNameEl = document.getElementById('user-firstname');
const logoutBtn = document.getElementById('logout-btn');

function showGuest() {
  guestActions.hidden = false;
  userSession.hidden = true;
  firstNameEl.textContent = '';
}

function showUser(user) {
  guestActions.hidden = true;
  userSession.hidden = false;
  firstNameEl.textContent = user.primeiroNome || user.nome?.split(/\s+/)[0] || 'Usuário';
}

async function bootstrap() {
  const token = getToken();
  const stored = getStoredUser();

  if (!token) {
    showGuest();
    return;
  }

  if (stored) {
    showUser(stored);
  }

  const { status, data } = await apiRequest('/me', { method: 'GET', token });
  if (status === 200 && data.ok) {
    saveSession({ token, user: data.user });
    showUser(data.user);
    return;
  }

  clearSession();
  showGuest();
}

logoutBtn?.addEventListener('click', () => {
  clearSession();
  showGuest();
});

bootstrap();
