import { getSql } from '../lib/db.js';
import { createRecoveryToken, buildRecoveryUrl, sendRecoveryEmail } from '../lib/mail.js';
import { json, methodNotAllowed, readJson, isValidEmail, setCors, clientMeta } from '../lib/http.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'POST') {
    return methodNotAllowed(res, ['POST']);
  }

  try {
    const body = await readJson(req);
    const email = String(body.email || '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      return json(res, 400, { ok: false, error: 'E-mail inválido' });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT id, email, status
      FROM usuarios
      WHERE email = ${email}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return json(res, 404, {
        ok: false,
        code: 'EMAIL_NOT_FOUND',
        error: 'E-mail não cadastrado',
      });
    }

    const user = rows[0];
    if (user.status !== 'ativo') {
      return json(res, 403, { ok: false, error: 'Conta indisponível' });
    }

    const token = createRecoveryToken();

    await sql`
      UPDATE usuarios
      SET recovery_token = ${token},
          recovery_token_expires = CURRENT_TIMESTAMP + INTERVAL '5 minutes'
      WHERE id = ${user.id}
    `;

    const recoveryUrl = buildRecoveryUrl(token);
    const mailResult = await sendRecoveryEmail({ to: user.email, recoveryUrl });
    const allowDevLink = process.env.DEV_RETURN_RECOVERY_LINK === 'true';

    const { ip, userAgent } = clientMeta(req);
    await sql`
      INSERT INTO auditoria_acessos (usuario_id, acao, ip_address, user_agent)
      VALUES (${user.id}, 'recuperacao_solicitada', ${ip}, ${userAgent})
    `;

    if (!mailResult.sent && !allowDevLink) {
      const error =
        mailResult.reason === 'smtp_not_configured'
          ? 'Envio de e-mail não configurado. Defina SMTP_* na Vercel.'
          : 'Não foi possível enviar o e-mail de recuperação. Confira SMTP_USER e a senha de app.';
      return json(res, 503, {
        ok: false,
        code: 'EMAIL_NOT_SENT',
        error,
        emailSent: false,
      });
    }

    const response = {
      ok: true,
      message: mailResult.sent
        ? 'Um link de recuperação de senha foi enviado para seu e-mail'
        : 'Token gerado. SMTP ainda não está configurado (modo teste).',
      emailSent: mailResult.sent,
    };

    if (allowDevLink) {
      response.recoveryUrl = recoveryUrl;
    }

    return json(res, 200, response);
  } catch (err) {
    console.error('[recover]', err);
    return json(res, 500, { ok: false, error: 'Erro ao solicitar recuperação' });
  }
}
