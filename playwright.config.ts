import { defineConfig } from '@playwright/test';
import { loadEnv } from 'vite';
import { isConfigured } from './e2e/configured';

// Vite loads .env for the app it builds, not for this runner process, and the test reads
// SEED_* and the project variables from process.env. Existing values win so that CI secrets
// are never overwritten by a stray local file.
for (const [key, value] of Object.entries(loadEnv('production', process.cwd(), ''))) {
	process.env[key] ??= value;
}

export default defineConfig({
	testDir: 'e2e',
	use: { baseURL: 'http://localhost:4173' },
	webServer: isConfigured()
		? {
				command: 'pnpm run build && pnpm run preview',
				port: 4173,
				reuseExistingServer: !process.env.CI,
			}
		: undefined,
});
