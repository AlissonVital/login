import nodemailer from 'nodemailer';
import crypto from 'crypto';

export function createRecoveryToken() {
  return crypto.randomBytes(32).toString('hex');
}

/** Monta a URL pública do site a partir do host da requisição (mais confiável na Vercel). */
export function resolveAppUrl(req) {
  const hostHeader = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  const protoHeader = req?.headers?.['x-forwarded-proto'] || 'https';
  const host = String(hostHeader || '')
    .split(',')[0]
    .trim();
  const proto = String(protoHeader || 'https')
    .split(',')[0]
    .trim();

  if (host && !host.includes('localhost') && !host.startsWith('127.')) {
    return `${proto}://${host}`.replace(/\/$/, '');
  }

  const fromEnv = String(process.env.APP_URL || '')
    .trim()
    .replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (host) return `${proto}://${host}`.replace(/\/$/, '');
  return 'http://localhost:3000';
}

export function buildRecoveryUrl(token, req) {
  const base = resolveAppUrl(req);
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
