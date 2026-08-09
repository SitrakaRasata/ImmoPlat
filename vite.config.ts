import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		environment: 'node',
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
		// Each policy test file opens its own in-process Postgres (PGlite/WASM)
		// and shares nothing with the others. Running them in parallel opens
		// several WASM instances at once and blows past the default hookTimeout
		// non-deterministically; running them one after another costs a few
		// seconds and makes the suite deterministic. Each file closes its
		// instance in afterAll, so only one is ever alive at a time.
		fileParallelism: false
	}
});
