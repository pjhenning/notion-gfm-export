import type { Actions } from './$types';
import { supabase } from '$lib/supabaseClient';
import { getMarkdownForPage } from '$lib/gfm-export';

export const actions = {
	default: async ({ request }) => {
    const sb = await supabase.from("main").select();
    const data = await request.formData();
		const pageID = data.get('pageid') as string;
		const md = await getMarkdownForPage(pageID, sb.data![0].auth);
    return {
      md
    };
	}
} satisfies Actions;
