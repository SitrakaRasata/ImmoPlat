import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { env } from '$env/dynamic/public';
import type { Handle } from '@sveltejs/kit';

const requireEnv = (name: string, value: string | undefined): string => {
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
};

const supabaseUrl = requireEnv('PUBLIC_SUPABASE_URL', env.PUBLIC_SUPABASE_URL);
const supabaseAnonKey = requireEnv('PUBLIC_SUPABASE_ANON_KEY', env.PUBLIC_SUPABASE_ANON_KEY);

export const handle: Handle = async ({ event, resolve }) => {
	const setAll: SetAllCookies = (cookiesToSet) =>
		cookiesToSet.forEach(({ name, value, options }) =>
			event.cookies.set(name, value, { ...options, path: '/' }));

	event.locals.supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll,
		},
	});

	// getSession() re-reads the cookie without verifying its signature. On the
	// server this is a trust boundary: only getUser(), which validates the
	// token, is exposed.
	//
	// Cached per request: without this, +layout.server.ts and whichever page
	// load or action also needs the user would each pay a separate network
	// round trip to the auth server for the same request.
	let userPromise: ReturnType<typeof event.locals.supabase.auth.getUser> | undefined;
	event.locals.getUser = async () => {
		userPromise ??= event.locals.supabase.auth.getUser();
		const { data } = await userPromise;
		return data.user;
	};

	return resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-range',
	});
};
