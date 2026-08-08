import { createServerClient } from '@supabase/ssr';
import { env } from '$env/dynamic/public';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(
		env.PUBLIC_SUPABASE_URL,
		env.PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (all) =>
					all.forEach(({ name, value, options }) =>
						event.cookies.set(name, value, { ...options, path: '/' })),
			},
		},
	);

	// getSession() re-reads the cookie without verifying its signature. On the
	// server this is a trust boundary: only getUser(), which validates the
	// token, is exposed.
	event.locals.getUser = async () => {
		const { data } = await event.locals.supabase.auth.getUser();
		return data.user;
	};

	return resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-range',
	});
};
