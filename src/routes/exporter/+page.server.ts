import type { Actions } from './$types';
import { supabase } from '$lib/supabaseClient';
import { getMarkdownForPage } from '$lib/gfm-export';

const pageID = '17bddd82c25580f38e27e2376678fe30';

export const actions = {
	default: async (_event) => {
    const sb = await supabase.from("main").select();
		const md = await getMarkdownForPage(pageID, sb.data![0].auth);
    return { md };
	}
} satisfies Actions;
