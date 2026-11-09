import bcrypt from 'bcryptjs';
import { getSql } from '../lib/db.js';
import { json, methodNotAllowed, readJson, setCors, clientMeta } from '../lib/http.js';

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
    const token = String(body.token || '').trim();
    const senha = String(body.senha || '');
    const confirmar = String(body.confirmar || body.senhaConfirmacao || '');

    if (!token) {
      return json(res, 400, { ok: false, error: 'Token de recuperação inválido' });
    }
    if (!senha || senha.length < 6) {
      return json(res, 400, { ok: false, error: 'A senha deve ter pelo menos 6 caracteres' });
    }
    if (senha !== confirmar) {
      return json(res, 400, {
        ok: false,
        code: 'PASSWORD_MISMATCH',
        error: 'As senhas não coincidem',
      });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT id, recovery_token_expires, status
      FROM usuarios
      WHERE recovery_token = ${token}
      LIMIT 1
    `;

    if (rows.length === 0) {
      return json(res, 400, {
        ok: false,
        code: 'TOKEN_INVALID',
        error: 'Link de recuperação inválido ou já utilizado',
      });
    }

    const user = rows[0];
    const expires = user.recovery_token_expires
      ? new Date(user.recovery_token_expires)
      : null;

    if (!expires || Number.isNaN(expires.getTime()) || expires.getTime() < Date.now()) {
      await sql`
        UPDATE usuarios
        SET recovery_token = NULL,
            recovery_token_expires = NULL
        WHERE id = ${user.id}
      `;
      return json(res, 400, {
        ok: false,
        code: 'TOKEN_EXPIRED',
        error: 'Link de recuperação expirado. Solicite um novo.',
      });
    }

    if (user.status !== 'ativo') {
      return json(res, 403, { ok: false, error: 'Conta indisponível' });
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    await sql`
      UPDATE usuarios
      SET senha_hash = ${senhaHash},
          recovery_token = NULL,
          recovery_token_expires = NULL,
          login_attempts = 0
      WHERE id = ${user.id}
    `;

    const { ip, userAgent } = clientMeta(req);
    await sql`
      INSERT INTO auditoria_acessos (usuario_id, acao, ip_address, user_agent)
      VALUES (${user.id}, 'senha_redefinida', ${ip}, ${userAgent})
    `;

    return json(res, 200, {
      ok: true,
      message: 'Senha atualizada com sucesso',
    });
  } catch (err) {
    console.error('[reset-password]', err);
    return json(res, 500, { ok: false, error: 'Erro ao redefinir senha' });
  }
}
