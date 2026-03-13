const { createClient } = require('@supabase/supabase-js');

// Uses the SERVICE ROLE key — this bypasses RLS so the backend can
// read/write any row. Never expose this key on the client side.
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
);

module.exports = supabase;
