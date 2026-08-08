import { describe, expect, it, vi } from 'vitest';
import { handle } from '../../src/hooks.server';

const fakeEvent = () => {
	const store = [{ name: 'sb-access-token', value: 'token-value' }];
	return {
		cookies: {
			getAll: vi.fn(() => store),
			set: vi.fn(),
		},
		locals: {} as Record<string, unknown>,
	};
};

describe('handle', () => {
	it('builds a per-request client wired to the request cookies', async () => {
		const event = fakeEvent();
		await handle({ event: event as never, resolve: async () => new Response('ok') });
		expect(event.locals.supabase).toBeDefined();
		expect(event.cookies.getAll).toHaveBeenCalled();
	});

	it('exposes getUser, never a bare session read', async () => {
		const event = fakeEvent();
		await handle({ event: event as never, resolve: async () => new Response('ok') });
		expect(typeof event.locals.getUser).toBe('function');
		expect((event.locals as Record<string, unknown>).getSession).toBeUndefined();
	});
});
