import { getSql } from '../lib/db.js';
import { json, methodNotAllowed, setCors, mapServerError } from '../lib/http.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== 'GET') {
    return methodNotAllowed(res, ['GET']);
  }

  const checks = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    jwtSecret: Boolean(process.env.JWT_SECRET),
    appUrl: Boolean(process.env.APP_URL),
  };

  if (!checks.databaseUrl) {
    return json(res, 500, {
      ok: false,
      code: 'MISSING_DATABASE_URL',
      error: 'DATABASE_URL não configurada na Vercel',
      checks,
    });
  }

  try {
    const sql = getSql();
    const rows = await sql`
      SELECT to_regclass('public.usuarios') AS usuarios,
             to_regclass('public.auditoria_acessos') AS auditoria
    `;
    const row = rows[0] || {};
    const tablesOk = Boolean(row.usuarios) && Boolean(row.auditoria);

    if (!tablesOk) {
      return json(res, 500, {
        ok: false,
        code: 'SCHEMA_MISSING',
        error: 'Tabelas não encontradas. Execute sql/schema.sql no Neon SQL Editor',
        checks: { ...checks, dbConnected: true, tablesOk: false },
      });
    }

    return json(res, 200, {
      ok: true,
      checks: { ...checks, dbConnected: true, tablesOk: true },
    });
  } catch (err) {
    console.error('[health]', err);
    const mapped = mapServerError(err, 'Falha no health check');
    return json(res, 500, {
      ok: false,
      ...mapped,
      checks: { ...checks, dbConnected: false },
    });
  }
}
