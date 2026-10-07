import { createClient } from '@supabase/supabase-js';

const url = 'https://iffzbbipieifbnsivggv.supabase.co';
const key = 'sb_publishable_r71H3vOOT57DqihqLzgINg_0ah332Hg';
const supabase = createClient(url, key);

async function testAuth() {
  console.log('Testing signUp with a standard email...');
  const email = `commuter_${Date.now()}@gmail.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
    options: { data: { full_name: 'Alex Rivera' } }
  });
  console.log('SignUp result:', {
    user: data?.user?.id,
    identities: data?.user?.identities?.length,
    session: Boolean(data?.session),
    error: error ? error.message : null
  });
}

testAuth();
