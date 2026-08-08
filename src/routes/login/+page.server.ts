import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const form = await request.formData();
		const email = String(form.get('email') ?? '');
		const password = String(form.get('password') ?? '');

		const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
		if (error) return fail(400, { email, message: 'Invalid credentials.' });

		redirect(303, '/agent');
	},
	signout: async ({ locals }) => {
		await locals.supabase.auth.signOut();
		redirect(303, '/');
	},
};
