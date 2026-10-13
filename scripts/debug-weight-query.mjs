import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach((line) => {
  const [key, ...vals] = line.trim().split('=');
  if (key && vals.length > 0) env[key] = vals.join('=').trim();
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function testQuery() {
  const athleteId = 'usr-1791544128294-ohzu';
  const query = supabase
    .from('weight_logs')
    .select('*')
    .or(`user_id.eq.${athleteId},user_id.is.null`)
    .order('date', { ascending: false });

  const { data, error } = await query;
  console.log('Query result count:', data?.length, 'Error:', error);
  if (data) {
    data.slice(0, 15).forEach((d) => console.log(d.date, d.weight_kg, d.notes));
  }
}

testQuery();
