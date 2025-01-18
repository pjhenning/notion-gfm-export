import type { Actions } from './$types';
import { supabase } from '$lib/supabaseClient';
import { getMarkdownForPage } from '$lib/gfm-export';

export const actions = {
	default: async (_event) => {
    const sb = await supabase.from("main").select();
		const md = await getMarkdownForPage(process.env.pageid!, sb.data![0].auth);
    return { md };
	}
} satisfies Actions;
