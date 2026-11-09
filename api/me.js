import { getSql } from '../lib/db.js';
import { getBearerToken, verifyToken, firstName } from '../lib/auth.js';
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
    const token = getBearerToken(req);
    if (!token) {
      return json(res, 401, { ok: false, error: 'Não autenticado' });
    }

    let payload;
    try {
      payload = await verifyToken(token);
    } catch {
      return json(res, 401, { ok: false, error: 'Sessão expirada ou inválida' });
    }

    const userId = Number(payload.sub);
    if (!userId) {
      return json(res, 401, { ok: false, error: 'Sessão inválida' });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT id, nome, email, status
      FROM usuarios
      WHERE id = ${userId}
      LIMIT 1
    `;

    if (rows.length === 0 || rows[0].status !== 'ativo') {
      return json(res, 401, { ok: false, error: 'Usuário não encontrado' });
    }

    const user = rows[0];
    return json(res, 200, {
      ok: true,
      user: {
        id: user.id,
        nome: user.nome,
        primeiroNome: firstName(user.nome),
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[me]', err);
    return json(res, 500, { ok: false, error: 'Erro ao validar sessão' });
  }
}
