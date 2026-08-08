import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/login');

	const { data } = await locals.supabase
		.from('properties')
		.select('id, title, city, is_published, agent_id')
		.order('created_at', { ascending: false });

	const properties = data ?? [];
	return {
		owned: properties.filter((p) => p.agent_id === user.id),
		delegated: properties.filter((p) => p.agent_id !== user.id && !p.is_published),
	};
};
