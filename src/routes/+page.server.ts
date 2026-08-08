import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { data } = await locals.supabase
		.from('properties')
		.select('id, title, city, price, is_published')
		.order('created_at', { ascending: false });
	return { properties: data ?? [] };
};
