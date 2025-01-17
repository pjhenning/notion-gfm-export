import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabaseClient';

interface NotionAuthResponseJSON {
	access_token: string;
}

export const load: PageServerLoad = async ({ url }) => {
  const clientId = process.env.oauth_client_id;
  const clientSecret = process.env.oauth_client_secret;
  const redirectUri = 'https://intrapology-notion-gfm-export.onrender.com/notionauth';

	const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

	const response = await fetch("https://api.notion.com/v1/oauth/token", {
		method: "POST",
		headers: {
		Accept: "application/json",
		"Content-Type": "application/json",
		Authorization: `Basic ${encoded}`,
	},
		body: JSON.stringify({
			grant_type: "authorization_code",
			code: url.searchParams.get('code'),
			redirect_uri: redirectUri,
		}),
	});

	const responseJSON: NotionAuthResponseJSON = await response.json();

	const result = await supabase
		.from('main')
		.update({ auth: responseJSON.access_token })
		.eq('id', 1);

	if (result.error === null) {
		return {success: true};
	} else {
		return {
			success: false,
			error: result.error.message
		};
	}
};