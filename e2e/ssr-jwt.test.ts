import { expect, test } from '@playwright/test';

const EMAIL = process.env.SEED_EMAIL ?? 'owner@example.test';
const PASSWORD = process.env.SEED_PASSWORD ?? '';

test('the owner draft is present in the server-rendered markup', async ({ page, request }) => {
	test.skip(PASSWORD === '', 'SEED_PASSWORD is required to run the end-to-end leg');

	await page.goto('/login');
	await page.fill('input[name="email"]', EMAIL);
	await page.fill('input[name="password"]', PASSWORD);
	await page.click('button[type="submit"]');
	await page.waitForURL('**/agent');

	const cookies = await page.context().cookies();
	const header = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

	const response = await request.get('/agent', { headers: { cookie: header } });
	const html = await response.text();

	expect(html).toContain('Draft townhouse');
});
