import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { data } = await locals.supabase
		.from('properties')
		.select('id, title, description, city, price, is_published')
		.eq('id', params.id)
		.maybeSingle();

	if (!data) error(404, 'Not found');
	return { property: data };
};
