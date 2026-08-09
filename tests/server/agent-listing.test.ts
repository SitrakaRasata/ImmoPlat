import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createTestDb, as, IDENTITIES } from '../helpers/db';
import { createFakeSupabase } from '../helpers/fake-supabase';
import { load } from '../../src/routes/agent/+page.server';

describe('agent listing', () => {
	let db: PGlite;
	beforeAll(async () => { db = await createTestDb(); });
	afterAll(async () => { await db.close(); });

	it('shows a published property delegated to the agent as delegated', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.owner);
			const { rows } = await tx.query<{ id: string }>(
				`insert into properties (agent_id, title, city, price, is_published)
				 values ($1, 'Published to a delegate', 'Nantes', 250000, true) returning id`,
				[IDENTITIES.owner],
			);
			const propertyId = rows[0].id;
			await tx.query(
				`insert into property_mandates (property_id, agent_id) values ($1, $2)`,
				[propertyId, IDENTITIES.delegate],
			);

			await as(tx, 'authenticated', IDENTITIES.delegate);
			const supabase = createFakeSupabase(tx);
			const result = (await load({
				locals: { supabase, getUser: async () => ({ id: IDENTITIES.delegate }) },
			} as never)) as { delegated: { id: string }[] };

			expect(result.delegated.map((p) => p.id)).toContain(propertyId);
			await tx.rollback();
		});
	});
});
