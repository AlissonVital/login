import bcrypt from 'bcryptjs';
import { getSql } from '../lib/db.js';
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
    const nome = String(body.nome || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const senha = String(body.senha || '');

    if (!nome || nome.length < 2) {
      return json(res, 400, { ok: false, error: 'Informe o nome completo' });
    }
    if (!isValidEmail(email)) {
      return json(res, 400, { ok: false, error: 'E-mail inválido' });
    }
    if (!senha || senha.length < 6) {
      return json(res, 400, { ok: false, error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const sql = getSql();
    const existing = await sql`
      SELECT id FROM usuarios WHERE email = ${email} LIMIT 1
    `;

    if (existing.length > 0) {
      return json(res, 409, {
        ok: false,
        code: 'EMAIL_EXISTS',
        error: 'Este e-mail já está cadastrado',
      });
    }

    const senhaHash = await bcrypt.hash(senha, 12);
    const inserted = await sql`
      INSERT INTO usuarios (nome, email, senha_hash)
      VALUES (${nome}, ${email}, ${senhaHash})
      RETURNING id, nome, email
    `;

    const user = inserted[0];
    const { ip, userAgent } = clientMeta(req);
    await sql`
      INSERT INTO auditoria_acessos (usuario_id, acao, ip_address, user_agent)
      VALUES (${user.id}, 'cadastro', ${ip}, ${userAgent})
    `;

    return json(res, 201, {
      ok: true,
      message: 'Cadastro realizado com sucesso',
      user: { id: user.id, nome: user.nome, email: user.email },
    });
  } catch (err) {
    console.error('[register]', err);
    return json(res, 500, { ok: false, error: 'Erro ao cadastrar usuário' });
  }
}
