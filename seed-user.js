// seed-user.cjs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_project_ROLE_KEY
);

async function run() {
  const email = 'alice@example.com';
  const password = 'Password123!';

  // create auth user via admin API
  const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password
  });
  if (createErr) throw createErr;

  const userId = newUser.user.id;
  console.log('Created user id:', userId);

  // create or upsert profile (bypasses RLS because we use project role)
  const { error: pErr } = await supabaseAdmin
    .from('profiles')
    .upsert([{ id: userId, email, full_name: 'Alice Example' }], { onConflict: 'id' });
  if (pErr) throw pErr;

  // insert a todo
  const { error: tErr } = await supabaseAdmin
    .from('todos')
    .insert([{ user_id: userId, task: 'Seeded todo' }]);
  if (tErr) throw tErr;

  console.log('Seed complete for user:', userId);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
