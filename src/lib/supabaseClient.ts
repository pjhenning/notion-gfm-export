import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabaseTypes';

import dotenv from "dotenv";

dotenv.config();

const projectURL = process.env.supabase_project_url;
const key = process.env.supabase_anon_key;

export const supabase = createClient<Database>(projectURL!, key!);