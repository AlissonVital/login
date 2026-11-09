import nodemailer from 'nodemailer';
import crypto from 'crypto';

export function createRecoveryToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function buildRecoveryUrl(token) {
  const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/recuperacao.html?token=${encodeURIComponent(token)}`;
}

export async function sendRecoveryEmail({ to, recoveryUrl }) {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[mail] SMTP não configurado. Link de recuperação:', recoveryUrl);
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || 'false') === 'true';
  const from = process.env.SMTP_FROM || user;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to,
      subject: 'Recuperação de senha — Site Modelo',
      text: [
        'Você solicitou a redefinição de senha.',
        '',
        'Acesse o link abaixo (válido por 5 minutos):',
        recoveryUrl,
        '',
        'Se você não solicitou esta alteração, ignore este e-mail.',
      ].join('\n'),
      html: `
        <p>Você solicitou a redefinição de senha.</p>
        <p><a href="${recoveryUrl}">Clique aqui para redefinir sua senha</a></p>
        <p>Este link é válido por <strong>5 minutos</strong>.</p>
        <p>Se você não solicitou esta alteração, ignore este e-mail.</p>
      `,
    });

    return { sent: true };
  } catch (err) {
    console.error('[mail] Falha ao enviar e-mail:', err);
    return {
      sent: false,
      reason: 'smtp_send_failed',
      detail: String(err?.message || err),
    };
  }
}
