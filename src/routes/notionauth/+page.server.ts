import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

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
			code: "your-temporary-code",
			redirect_uri: redirectUri,
		}),
	});

	const responseJSON: NotionAuthResponseJSON = await response.json();

	return {
		title: 'Hello world!',
		content: 'Welcome to our blog. Lorem ipsum dolor sit amet...',
		searchParams: [...url.searchParams.entries()],
		auth: responseJSON
	};

	error(404, 'Not found');
};