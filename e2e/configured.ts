// The SSR leg needs a real project: the seeded account signs in, and the hook refuses to boot
// without the project variables. An unconfigured run must therefore skip before Playwright
// starts a server, not after — a preview that cannot boot fails the job instead of skipping it.
// Read lazily, since the config fills process.env from .env before this is first called.
export const isConfigured = () =>
	Boolean(
		process.env.SEED_PASSWORD &&
			process.env.PUBLIC_SUPABASE_URL &&
			process.env.PUBLIC_SUPABASE_ANON_KEY
	);
