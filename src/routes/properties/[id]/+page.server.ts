import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { data, error: err } = await locals.supabase
		.from('properties')
		.select('id, title, description, city, price, is_published')
		.eq('id', params.id)
		.maybeSingle();

	if (err) error(500, 'Could not load this listing.');
	if (!data) error(404, 'Not found');
	return { property: data };
};
