import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data, error: err } = await locals.supabase
		.from('properties')
		.select('id, title, city, price, is_published')
		.order('created_at', { ascending: false });
	if (err) error(500, 'Could not load listings.');
	return { properties: data };
};
