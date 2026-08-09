import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Two targeted queries, not one filtered in TypeScript: the delegated set is
// named by property_mandates.agent_id, which mandates_read already restricts
// to this agent's own rows.
export const load: PageServerLoad = async ({ locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/login');

	const { data: owned, error: ownedError } = await locals.supabase
		.from('properties')
		.select('id, title, is_published')
		.eq('agent_id', user.id)
		.order('created_at', { ascending: false });
	if (ownedError) error(500, 'Could not load listings.');

	// Mirrors has_active_mandate: the RLS policy only checks ownership of the
	// mandate row, not its expiry, so an expired mandate would otherwise name
	// a property this agent can see but the properties_update policy refuses.
	const { data: mandates, error: mandatesError } = await locals.supabase
		.from('property_mandates')
		.select('property_id')
		.eq('agent_id', user.id)
		.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
	if (mandatesError) error(500, 'Could not load listings.');

	const delegatedIds = mandates.map((mandate) => mandate.property_id);
	let delegated: typeof owned = [];
	if (delegatedIds.length > 0) {
		const { data: delegatedProperties, error: delegatedError } = await locals.supabase
			.from('properties')
			.select('id, title, is_published')
			.in('id', delegatedIds)
			.order('created_at', { ascending: false });
		if (delegatedError) error(500, 'Could not load listings.');
		delegated = delegatedProperties;
	}

	return { owned, delegated };
};
