import { createClient } from '@supabase/supabase-js';

const project = process.env.supabase_project_url;
const key = process.env.supabase_anon_key;

export const supabase = createClient(`https://${project}.supabase.co`, key!);