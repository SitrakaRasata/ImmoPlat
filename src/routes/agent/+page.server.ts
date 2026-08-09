import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Two targeted queries, not one broad query filtered in TypeScript: the
// delegated set is named by property_mandates.agent_id, which is what
// mandates_read already restricts to this agent's own rows. Filtering
// client-side instead would both hide published-but-delegated properties
// (they fail an "owned" check and a "not published" check alike) and pull
// back every published property in the catalogue just to discard most of it.
export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/login');

	const { data: owned, error: ownedError } = await locals.supabase
		.from('properties')
		.select('id, title, city, is_published, agent_id')
		.eq('agent_id', user.id)
		.order('created_at', { ascending: false });
	if (ownedError) error(500, 'Could not load listings.');

	const { data: mandates, error: mandatesError } = await locals.supabase
		.from('property_mandates')
		.select('property_id')
		.eq('agent_id', user.id);
	if (mandatesError) error(500, 'Could not load listings.');

	const delegatedIds = mandates.map((mandate) => mandate.property_id);
	let delegated: typeof owned = [];
	if (delegatedIds.length > 0) {
		const { data: delegatedProperties, error: delegatedError } = await locals.supabase
			.from('properties')
			.select('id, title, city, is_published, agent_id')
			.in('id', delegatedIds)
			.order('created_at', { ascending: false });
		if (delegatedError) error(500, 'Could not load listings.');
		delegated = delegatedProperties;
	}

	return { owned, delegated };
};
