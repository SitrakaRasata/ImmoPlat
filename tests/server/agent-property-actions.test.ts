import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createTestDb, as, IDENTITIES, PROPERTIES } from '../helpers/db';
import { createFakeSupabase } from '../helpers/fake-supabase';
import { actions } from '../../src/routes/agent/properties/[id]/+page.server';

const formRequest = (fields: Record<string, string>) => ({
	formData: async () => {
		const form = new FormData();
		for (const [key, value] of Object.entries(fields)) form.set(key, value);
		return form;
	},
});

describe('agent property actions', () => {
	let db: PGlite;
	beforeAll(async () => { db = await createTestDb(); });
	afterAll(async () => { await db.close(); });

	it('lets the owner save their own listing', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.owner);
			const supabase = createFakeSupabase(tx);
			const result = await actions.save({
				params: { id: PROPERTIES.published },
				request: formRequest({ title: 'Renovated loft', city: 'Lyon', description: '' }),
				locals: { supabase },
			} as never);

			expect(result).toEqual({ action: 'save', success: true });
			await tx.rollback();
		});
	});

	it('refuses save when the mandate has expired', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.owner);
			const { rows } = await tx.query<{ id: string }>(
				`insert into properties (agent_id, title, city, price, is_published)
				 values ($1, 'Lapsed mandate listing', 'Rennes', 199000, false) returning id`,
				[IDENTITIES.owner],
			);
			const propertyId = rows[0].id;
			await tx.query(
				`insert into property_mandates (property_id, agent_id, expires_at)
				 values ($1, $2, now() - interval '1 day')`,
				[propertyId, IDENTITIES.delegate],
			);

			await as(tx, 'authenticated', IDENTITIES.delegate);
			const supabase = createFakeSupabase(tx);
			const result = await actions.save({
				params: { id: propertyId },
				request: formRequest({ title: 'Attempted edit', city: 'Rennes', description: '' }),
				locals: { supabase },
			} as never);

			expect(result?.status).toBe(403);
			await tx.rollback();
		});
	});

	it('refuses revoke by a non-owner', async () => {
		await db.transaction(async (tx) => {
			// The delegate can see this mandate through mandates_read, but
			// mandates_delete only lets the owner remove it.
			await as(tx, 'authenticated', IDENTITIES.delegate);
			const supabase = createFakeSupabase(tx);
			const result = await actions.revoke({
				params: { id: PROPERTIES.draft },
				request: formRequest({ agent_id: IDENTITIES.delegate }),
				locals: { supabase },
			} as never);

			expect(result?.status).toBe(403);
			await tx.rollback();
		});
	});
});
