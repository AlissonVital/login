import { apiRequest } from './api.js';
import { setupPasswordToggles, showAlert } from './ui.js';

setupPasswordToggles();

const form = document.getElementById('recuperacao-form');
const senha = document.getElementById('nova-senha');
const confirmar = document.getElementById('confirma-senha');
const mismatch = document.getElementById('mismatch-error');
const btnCancel = document.getElementById('btn-cancel');
const btnSubmit = document.getElementById('btn-submit');

const params = new URLSearchParams(window.location.search);
const token = params.get('token') || '';

function lockPage(message) {
  mismatch.textContent = message;
  btnSubmit.disabled = true;
  senha.disabled = true;
  confirmar.disabled = true;
  form.querySelectorAll('.toggle-password').forEach((btn) => {
    btn.disabled = true;
  });
}

btnCancel.addEventListener('click', () => {
  window.location.href = 'index.html';
});

function passwordsMatch() {
  return senha.value === confirmar.value;
}

function updateMismatch() {
  if (!confirmar.value && !senha.value) {
    mismatch.textContent = '';
    return true;
  }
  if (!passwordsMatch()) {
    mismatch.textContent = 'As senhas não coincidem';
    return false;
  }
  mismatch.textContent = '';
  return true;
}

senha.addEventListener('input', updateMismatch);
confirmar.addEventListener('input', updateMismatch);

async function validateLink() {
  if (!token) {
    lockPage('Link de recuperação inválido ou ausente.');
    await showAlert('Esta página só pode ser acessada pelo link enviado no e-mail.', 'Recuperação');
    window.location.href = 'login.html';
    return false;
  }

  btnSubmit.disabled = true;
  mismatch.textContent = 'Validando link...';

  try {
    const { data } = await apiRequest(
      `/validate-recovery?token=${encodeURIComponent(token)}`,
      { method: 'GET' }
    );

    if (!data.ok) {
      const message =
        data.code === 'TOKEN_EXPIRED'
          ? 'Link de recuperação expirado. Solicite um novo.'
          : data.error || 'Link de recuperação inválido ou já utilizado';
      lockPage(message);
      await showAlert(message, 'Recuperação');
      window.location.href = 'login.html';
      return false;
    }

    mismatch.textContent = '';
    btnSubmit.disabled = false;
    return true;
  } catch {
    lockPage('Não foi possível validar o link de recuperação.');
    await showAlert('Falha de conexão com o servidor', 'Erro');
    window.location.href = 'login.html';
    return false;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!token) {
    await showAlert('Link de recuperação inválido', 'Erro');
    return;
  }

  if (!updateMismatch()) {
    return;
  }

  btnSubmit.disabled = true;
  try {
    const { data } = await apiRequest('/reset-password', {
      method: 'POST',
      body: {
        token,
        senha: senha.value,
        confirmar: confirmar.value,
      },
    });

    if (data.code === 'PASSWORD_MISMATCH') {
      mismatch.textContent = 'As senhas não coincidem';
      return;
    }

    if (data.code === 'TOKEN_EXPIRED') {
      lockPage(data.error || 'Link de recuperação expirado. Solicite um novo.');
      await showAlert(data.error || 'Link expirado', 'Recuperação');
      window.location.href = 'login.html';
      return;
    }

    if (!data.ok) {
      await showAlert(data.error || 'Não foi possível redefinir a senha', 'Erro');
      return;
    }

    await showAlert(data.message || 'Senha atualizada com sucesso', 'Sucesso');
    window.location.href = 'login.html';
  } catch {
    await showAlert('Falha de conexão com o servidor', 'Erro');
  } finally {
    if (!senha.disabled) {
      btnSubmit.disabled = false;
    }
  }
});

validateLink();
