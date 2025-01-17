import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';

export const load: PageServerLoad = async () => {
  // TODO: get token

  const sb = await supabase.from("main").select();
  const sbData = sb.data;

	return {
    sbData,
    token: ''
  };

	error(404, 'Not found');
};