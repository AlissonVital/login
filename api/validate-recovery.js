import { getSql } from '../lib/db.js';
import { json, methodNotAllowed, setCors } from '../lib/http.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  try {
    let token = '';
    if (req.query && req.query.token != null) {
      token = String(req.query.token).trim();
    } else {
      const url = new URL(req.url || '/', 'http://localhost');
      token = String(url.searchParams.get('token') || '').trim();
    }

    if (!token) {
      return json(res, 400, {
        ok: false,
        code: 'TOKEN_MISSING',
        error: 'Link de recuperação inválido ou ausente',
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
    if (user.status !== 'ativo') {
      return json(res, 403, { ok: false, code: 'ACCOUNT_UNAVAILABLE', error: 'Conta indisponível' });
    }

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

    return json(res, 200, {
      ok: true,
      expiresAt: expires.toISOString(),
      remainingSeconds: Math.max(0, Math.floor((expires.getTime() - Date.now()) / 1000)),
    });
  } catch (err) {
    console.error('[validate-recovery]', err);
    return json(res, 500, { ok: false, error: 'Erro ao validar link de recuperação' });
  }
}
