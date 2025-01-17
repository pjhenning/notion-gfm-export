import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params, url }) => {
	return {
		title: 'Hello world!',
		content: 'Welcome to our blog. Lorem ipsum dolor sit amet...',
		searchParams: [...url.searchParams.entries()]
	};

	error(404, 'Not found');
};