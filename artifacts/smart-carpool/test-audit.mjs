import { createClient } from '@supabase/supabase-js';

const url = 'https://iffzbbipieifbnsivggv.supabase.co';
const key = 'sb_publishable_r71H3vOOT57DqihqLzgINg_0ah332Hg';

console.log('====================================================');
console.log('STAGE 1: CHECKING TABLE EXISTENCE IN SUPABASE');
console.log('====================================================');

const anonClient = createClient(url, key, { auth: { persistSession: false } });

const tables = [
  'profiles',
  'vehicles',
  'rides',
  'ride_requests',
  'ride_passengers',
  'conversations',
  'conversation_members',
  'messages',
  'notifications',
  'ratings',
  'reports',
  'blocked_users'
];

async function checkTables() {
  const missing = [];
  for (const table of tables) {
    const { data, error } = await anonClient.from(table).select('*').limit(1);
    if (error) {
      console.log(`Table [${table}]: ERROR - ${error.message} (code: ${error.code})`);
      if (error.code === 'PGRST205') missing.push(table);
    } else {
      console.log(`Table [${table}]: OK (accessible)`);
    }
  }
  return missing;
}

checkTables().then(missing => {
  console.log('\nMissing tables count:', missing.length);
  if (missing.length > 0) {
    console.log('Missing tables:', missing);
  }
});
