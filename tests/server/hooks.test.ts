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
	it('creates a distinct client per request, never a module-level singleton', async () => {
		const eventA = fakeEvent();
		const eventB = fakeEvent();
		await handle({ event: eventA as never, resolve: async () => new Response('ok') });
		await handle({ event: eventB as never, resolve: async () => new Response('ok') });
		expect(eventA.locals.supabase).toBeDefined();
		expect(eventA.locals.supabase).not.toBe(eventB.locals.supabase);
	});

	it('exposes getUser, never a bare session read', async () => {
		const event = fakeEvent();
		await handle({ event: event as never, resolve: async () => new Response('ok') });
		expect(typeof event.locals.getUser).toBe('function');
		expect((event.locals as Record<string, unknown>).getSession).toBeUndefined();
	});
});
