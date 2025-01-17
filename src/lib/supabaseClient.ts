import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabaseTypes';

const project = process.env.supabase_project_url;
const key = process.env.supabase_anon_key;

export const supabase = createClient<Database>(`https://${project}.supabase.co`, key!);