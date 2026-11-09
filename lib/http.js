export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export function json(res, status, data) {
  setCors(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

export function methodNotAllowed(res, allowed = ['POST']) {
  res.setHeader('Allow', allowed.join(', '));
  return json(res, 405, { ok: false, error: 'Método não permitido' });
}

export async function readJson(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('JSON inválido');
  }
}

export function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function clientMeta(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' && forwarded.split(',')[0].trim()) ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    null;
  const userAgent = req.headers['user-agent'] || null;
  return { ip, userAgent };
}

/** Mapeia erros comuns de banco/config para mensagens úteis (sem vazar segredos). */
export function mapServerError(err, fallback = 'Erro interno do servidor') {
  const msg = String(err?.message || err || '');
  const lower = msg.toLowerCase();

  if (lower.includes('database_url')) {
    return {
      code: 'MISSING_DATABASE_URL',
      error: 'DATABASE_URL não configurada na Vercel',
    };
  }
  if (lower.includes('jwt_secret')) {
    return {
      code: 'MISSING_JWT_SECRET',
      error: 'JWT_SECRET não configurada na Vercel',
    };
  }
  if (
    lower.includes('undefined_table') ||
    (lower.includes('relation') && lower.includes('does not exist')) ||
    (lower.includes('usuarios') && lower.includes('does not exist'))
  ) {
    return {
      code: 'SCHEMA_MISSING',
      error: 'Tabelas não encontradas. Execute sql/schema.sql no Neon SQL Editor',
    };
  }
  if (
    lower.includes('password authentication failed') ||
    lower.includes('enotfound') ||
    lower.includes('fetch failed') ||
    lower.includes('timeout') ||
    lower.includes('ssl') ||
    (lower.includes('database') && lower.includes('does not exist')) ||
    lower.includes('connection')
  ) {
    return {
      code: 'DB_CONNECTION',
      error: 'Falha ao conectar no banco. Confira DATABASE_URL (senha, host e nome do banco)',
    };
  }

  return { code: 'INTERNAL_ERROR', error: fallback };
}
