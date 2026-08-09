import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/login');

	const { data: property, error: propertyError } = await locals.supabase
		.from('properties')
		.select('id, title, description, city, price, is_published, agent_id')
		.eq('id', params.id)
		.maybeSingle();
	if (propertyError) error(500, 'Could not load this listing.');

	if (!property) error(404, 'Not found');

	const { data: mandates, error: mandatesError } = await locals.supabase
		.from('property_mandates')
		.select('agent_id, expires_at')
		.eq('property_id', params.id);
	if (mandatesError) error(500, 'Could not load this listing.');

	return { property, mandates, isOwner: property.agent_id === user.id };
};

export const actions: Actions = {
	// A row that fails the policy's USING clause is excluded from the update
	// target, not rejected: PostgREST reports zero rows changed, not an error.
	// Reading .select() back is what tells save from a policy refusal.
	save: async ({ params, request, locals }) => {
		const form = await request.formData();
		const { data, error: err } = await locals.supabase
			.from('properties')
			.update({
				title: String(form.get('title') ?? ''),
				description: String(form.get('description') ?? ''),
				city: String(form.get('city') ?? ''),
				is_published: form.get('is_published') === 'on',
			})
			.eq('id', params.id)
			.select('id');

		if (err) return fail(400, { action: 'save', message: 'Could not save this listing.' });
		if (data.length === 0) {
			return fail(403, { action: 'save', message: 'You are not allowed to edit this listing.' });
		}
		return { action: 'save', success: true };
	},

	delegate: async ({ params, request, locals }) => {
		const form = await request.formData();
		const expires = String(form.get('expires_at') ?? '');
		const { error: err } = await locals.supabase.from('property_mandates').insert({
			property_id: params.id,
			agent_id: String(form.get('agent_id') ?? ''),
			expires_at: expires === '' ? null : expires,
		});

		// 42501 is the policy's WITH CHECK refusing the insert; other codes
		// (22P02 malformed uuid, 23503 unknown agent, 23505 already delegated)
		// are input mistakes a fully authorized owner can make just as easily.
		if (err) {
			if (err.code === '42501') {
				return fail(403, { action: 'delegate', message: 'You are not allowed to delegate this listing.' });
			}
			return fail(400, { action: 'delegate', message: 'Could not add this mandate. Check the agent id and expiry.' });
		}
		return { action: 'delegate', success: true };
	},

	revoke: async ({ params, request, locals }) => {
		const form = await request.formData();
		const { data, error: err } = await locals.supabase
			.from('property_mandates')
			.delete()
			.eq('property_id', params.id)
			.eq('agent_id', String(form.get('agent_id') ?? ''))
			.select('agent_id');

		if (err) return fail(400, { action: 'revoke', message: 'Could not revoke this mandate.' });
		if (data.length === 0) {
			return fail(403, { action: 'revoke', message: 'You are not allowed to revoke this mandate.' });
		}
		return { action: 'revoke', success: true };
	},
};
