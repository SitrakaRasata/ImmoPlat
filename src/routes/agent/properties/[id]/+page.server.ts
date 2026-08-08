import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = await locals.getUser();
	if (!user) redirect(303, '/login');

	const { data: property } = await locals.supabase
		.from('properties')
		.select('id, title, description, city, price, is_published, agent_id')
		.eq('id', params.id)
		.maybeSingle();

	if (!property) error(404, 'Not found');

	const { data: mandates } = await locals.supabase
		.from('property_mandates')
		.select('agent_id, expires_at')
		.eq('property_id', params.id);

	return { property, mandates: mandates ?? [], isOwner: property.agent_id === user.id };
};

export const actions: Actions = {
	save: async ({ params, request, locals }) => {
		const form = await request.formData();
		const { error: err } = await locals.supabase
			.from('properties')
			.update({
				title: String(form.get('title') ?? ''),
				description: String(form.get('description') ?? ''),
				city: String(form.get('city') ?? ''),
				is_published: form.get('is_published') === 'on',
			})
			.eq('id', params.id);

		if (err) return fail(403, { message: 'You are not allowed to edit this listing.' });
		return { saved: true };
	},

	delegate: async ({ params, request, locals }) => {
		const form = await request.formData();
		const expires = String(form.get('expires_at') ?? '');
		const { error: err } = await locals.supabase.from('property_mandates').insert({
			property_id: params.id,
			agent_id: String(form.get('agent_id') ?? ''),
			expires_at: expires === '' ? null : expires,
		});

		if (err) return fail(403, { message: 'You are not allowed to delegate this listing.' });
		return { delegated: true };
	},

	revoke: async ({ params, request, locals }) => {
		const form = await request.formData();
		await locals.supabase
			.from('property_mandates')
			.delete()
			.eq('property_id', params.id)
			.eq('agent_id', String(form.get('agent_id') ?? ''));
		return { revoked: true };
	},
};
