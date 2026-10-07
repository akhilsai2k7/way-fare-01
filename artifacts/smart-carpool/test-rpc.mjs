import { createClient } from '@supabase/supabase-js';

const url = 'https://iffzbbipieifbnsivggv.supabase.co';
const key = 'sb_publishable_r71H3vOOT57DqihqLzgINg_0ah332Hg';
const supabase = createClient(url, key);

async function testRpc() {
  console.log('Testing RPC request_ride...');
  const { data, error } = await supabase.rpc('request_ride', {
    p_ride_id: '00000000-0000-0000-0000-000000000000',
    p_seats_requested: 1
  });
  console.log('RPC result:', data, 'Error:', error);
}

testRpc();
