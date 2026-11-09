import bcrypt from 'bcryptjs';
import { getSql } from '../lib/db.js';
import { createToken, firstName } from '../lib/auth.js';
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
    const senha = String(body.senha || '');

    if (!isValidEmail(email)) {
      return json(res, 400, { ok: false, error: 'E-mail inválido' });
    }
    if (!senha) {
      return json(res, 400, { ok: false, error: 'Informe a senha' });
    }

    const sql = getSql();
    const rows = await sql`
      SELECT id, nome, email, senha_hash, status
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
      return json(res, 403, {
        ok: false,
        error: 'Conta indisponível. Entre em contato com o suporte.',
      });
    }

    const valid = await bcrypt.compare(senha, user.senha_hash);
    const { ip, userAgent } = clientMeta(req);

    if (!valid) {
      await sql`
        UPDATE usuarios
        SET login_attempts = login_attempts + 1
        WHERE id = ${user.id}
      `;
      await sql`
        INSERT INTO auditoria_acessos (usuario_id, acao, ip_address, user_agent)
        VALUES (${user.id}, 'login_falha', ${ip}, ${userAgent})
      `;
      return json(res, 401, {
        ok: false,
        code: 'WRONG_PASSWORD',
        error: 'Senha incorreta',
      });
    }

    await sql`
      UPDATE usuarios
      SET login_attempts = 0, last_login = CURRENT_TIMESTAMP
      WHERE id = ${user.id}
    `;
    await sql`
      INSERT INTO auditoria_acessos (usuario_id, acao, ip_address, user_agent)
      VALUES (${user.id}, 'login_sucesso', ${ip}, ${userAgent})
    `;

    const token = await createToken({
      sub: String(user.id),
      email: user.email,
      nome: user.nome,
    });

    return json(res, 200, {
      ok: true,
      token,
      user: {
        id: user.id,
        nome: user.nome,
        primeiroNome: firstName(user.nome),
        email: user.email,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    return json(res, 500, { ok: false, error: 'Erro ao autenticar' });
  }
}
