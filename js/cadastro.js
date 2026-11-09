import { apiRequest } from './api.js';
import { showAlert, showConfirm } from './ui.js';

const form = document.getElementById('cadastro-form');
const btnCancel = document.getElementById('btn-cancel');
const btnSubmit = document.getElementById('btn-submit');
const nome = document.getElementById('nome');
const email = document.getElementById('email');
const senha = document.getElementById('senha');

function hasData() {
  return Boolean(nome.value.trim() || email.value.trim() || senha.value);
}

function clearFields() {
  form.reset();
  nome.focus();
}

btnCancel.addEventListener('click', async () => {
  if (!hasData()) {
    window.location.href = 'index.html';
    return;
  }

  const result = await showConfirm(
    'Realmente deseja cancelar? Os dados serão apagados.',
    'Cancelar cadastro'
  );

  if (result.confirmed) {
    clearFields();
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  btnSubmit.disabled = true;

  try {
    const { status, data } = await apiRequest('/register', {
      method: 'POST',
      body: {
        nome: nome.value.trim(),
        email: email.value.trim(),
        senha: senha.value,
      },
    });

    if (status === 409 || data.code === 'EMAIL_EXISTS') {
      await showAlert('Este e-mail já está cadastrado', 'Cadastro');
      clearFields();
      return;
    }

    if (!data.ok) {
      await showAlert(data.error || 'Não foi possível cadastrar', 'Erro');
      return;
    }

    await showAlert(data.message || 'Cadastro realizado com sucesso', 'Sucesso');
    window.location.href = 'login.html';
  } catch {
    await showAlert('Falha de conexão com o servidor', 'Erro');
  } finally {
    btnSubmit.disabled = false;
  }
});
