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

if (!token) {
  mismatch.textContent = 'Link de recuperação inválido ou ausente.';
  btnSubmit.disabled = true;
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

    if (!data.ok) {
      await showAlert(data.error || 'Não foi possível redefinir a senha', 'Erro');
      return;
    }

    await showAlert(data.message || 'Senha atualizada com sucesso', 'Sucesso');
    window.location.href = 'login.html';
  } catch {
    await showAlert('Falha de conexão com o servidor', 'Erro');
  } finally {
    btnSubmit.disabled = false;
  }
});
