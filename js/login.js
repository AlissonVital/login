import { apiRequest } from './api.js';
import { saveSession } from './auth.js';
import { setupPasswordToggles, showAlert, showModal } from './ui.js';

setupPasswordToggles();

const form = document.getElementById('login-form');
const email = document.getElementById('email');
const senha = document.getElementById('senha');
const btnCancel = document.getElementById('btn-cancel');
const btnSubmit = document.getElementById('btn-submit');
const recoverLink = document.getElementById('recover-link');

let recoverMode = false;

function setRecoverMode(active) {
  recoverMode = active;
  btnSubmit.textContent = active ? 'RECUPERAR' : 'ENVIAR';
}

btnCancel.addEventListener('click', () => {
  form.reset();
  window.location.href = 'index.html';
});

recoverLink.addEventListener('click', async () => {
  setRecoverMode(true);

  const result = await showModal({
    title: 'Recuperar senha',
    message: 'Digite o e-mail cadastrado para receber o link de recuperação.',
    confirmText: 'RECUPERAR',
    cancelText: 'CANCELAR',
    input: {
      label: 'E-mail',
      type: 'email',
      placeholder: 'seu@email.com',
      value: email.value.trim(),
      autocomplete: 'email',
    },
  });

  if (!result.confirmed) {
    setRecoverMode(false);
    return;
  }

  if (!result.value) {
    await showAlert('Informe o e-mail cadastrado', 'Recuperação');
    setRecoverMode(false);
    return;
  }

  btnSubmit.disabled = true;
  try {
    const { status, data } = await apiRequest('/recover', {
      method: 'POST',
      body: { email: result.value },
    });

    if (status === 404 || data.code === 'EMAIL_NOT_FOUND') {
      await showAlert('E-mail não cadastrado', 'Recuperação');
      return;
    }

    if (!data.ok) {
      await showAlert(data.error || 'Não foi possível solicitar a recuperação', 'Erro');
      return;
    }

    if (data.emailSent) {
      await showAlert(
        data.message || 'Um link de recuperação de senha foi enviado para seu e-mail',
        'Recuperação'
      );
      return;
    }

    if (data.recoveryUrl) {
      const openLink = await showModal({
        title: 'Modo teste',
        message:
          'O e-mail ainda não foi enviado (SMTP). Deseja abrir o link de recuperação agora?',
        confirmText: 'ABRIR',
        cancelText: 'FECHAR',
      });
      if (openLink.confirmed) {
        window.location.href = data.recoveryUrl;
      }
      return;
    }

    await showAlert(
      'Não foi possível enviar o e-mail. Configure SMTP na Vercel.',
      'Recuperação'
    );
  } catch {
    await showAlert('Falha de conexão com o servidor', 'Erro');
  } finally {
    btnSubmit.disabled = false;
    setRecoverMode(false);
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  if (recoverMode) {
    recoverLink.click();
    return;
  }

  btnSubmit.disabled = true;
  try {
    const { status, data } = await apiRequest('/login', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        senha: senha.value,
      },
    });

    if (status === 404 || data.code === 'EMAIL_NOT_FOUND') {
      await showAlert('E-mail não cadastrado', 'Login');
      return;
    }

    if (status === 401 || data.code === 'WRONG_PASSWORD') {
      await showAlert('Senha incorreta', 'Login');
      return;
    }

    if (!data.ok) {
      await showAlert(data.error || 'Não foi possível entrar', 'Erro');
      return;
    }

    saveSession({ token: data.token, user: data.user });
    window.location.href = 'index.html';
  } catch {
    await showAlert('Falha de conexão com o servidor', 'Erro');
  } finally {
    btnSubmit.disabled = false;
  }
});
