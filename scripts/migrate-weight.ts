import { Client } from 'pg';

async function migrate() {
  const hosts = [
    'db.jlttflrksvnndwnnfuca.supabase.co',
    'aws-0-eu-central-1.pooler.supabase.com',
  ];

  const sql = `
    CREATE TABLE IF NOT EXISTS weight_logs (
        id TEXT PRIMARY KEY,
        date DATE NOT NULL,
        timestamp TIMESTAMPTZ DEFAULT now(),
        weight_kg NUMERIC(5,2) NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_weight_date ON weight_logs (date DESC);

    ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_weight') THEN
            CREATE POLICY service_role_all_weight ON weight_logs FOR ALL USING (true);
        END IF;
    END $$;
  `;

  for (const host of hosts) {
    console.log(`Intentando conectar a ${host}...`);
    const isPooler = host.includes('pooler');
    const client = new Client({
      host,
      port: isPooler ? 6543 : 5432,
      user: isPooler ? 'postgres.jlttflrksvnndwnnfuca' : 'postgres',
      password: 'SybFUzpvK5Lxye4x',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });


    try {
      await client.connect();
      console.log(`✅ Conectado a ${host}`);
      await client.query(sql);
      console.log('✅ Migración ejecutada con éxito: tabla weight_logs creada y RLS configurado.');
      await client.end();
      return;
    } catch (err: any) {
      console.error(`❌ Falló conexión con ${host}:`, err.message);
      try { await client.end(); } catch (_) {}
    }
  }

  console.log('No se pudo conectar directamente por PostgreSQL.');
}

migrate();
