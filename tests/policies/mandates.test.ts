import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createTestDb, as, IDENTITIES, PROPERTIES } from '../helpers/db';

describe('mandate delegation', () => {
	let db: PGlite;
	beforeAll(async () => { db = await createTestDb(); });
	afterAll(async () => { await db.close(); });

	it('lets a delegate read the property delegated to them', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.delegate);
			const { rows } = await tx.query<{ title: string }>('select title from properties order by title');
			expect(rows.map((r) => r.title)).toEqual(['Draft townhouse', 'Published loft']);
			await tx.rollback();
		});
	});

	it('hides the draft from an agent with no mandate', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.outsider);
			const { rows } = await tx.query<{ title: string }>('select title from properties');
			expect(rows.map((r) => r.title)).toEqual(['Published loft']);
			await tx.rollback();
		});
	});

	it('reads mandates without policy recursion', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.owner);
			const { rows } = await tx.query<{ agent_id: string }>('select agent_id from property_mandates');
			expect(rows.map((r) => r.agent_id)).toEqual([IDENTITIES.delegate]);
			await tx.rollback();
		});
	});

	it('closes access once the mandate has expired', async () => {
		await db.transaction(async (tx) => {
			await tx.query(`update property_mandates set expires_at = now() - interval '1 day'`);
			await as(tx, 'authenticated', IDENTITIES.delegate);
			const { rows } = await tx.query<{ title: string }>('select title from properties');
			expect(rows.map((r) => r.title)).toEqual(['Published loft']);
			await tx.rollback();
		});
	});

	it('lets the owner grant a mandate on their own property', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.owner);
			const { affectedRows } = await tx.query(
				`insert into property_mandates (property_id, agent_id) values ($1, $2)`,
				[PROPERTIES.published, IDENTITIES.outsider],
			);
			expect(affectedRows).toBe(1);
			await tx.rollback();
		});
	});

	it('lets the owner revoke a mandate that the delegate themselves cannot', async () => {
		// The delegate can see this mandate through mandates_read (agent_id =
		// auth.uid()), so a check against an outsider who cannot see the row at
		// all would pass without ever exercising mandates_delete: DELETE also
		// requires the row to be visible under the table's SELECT policy, so an
		// invisible row reads as "denied" regardless of what mandates_delete says.
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.delegate);
			const { affectedRows } = await tx.query(
				`delete from property_mandates where property_id = $1 and agent_id = $2`,
				[PROPERTIES.draft, IDENTITIES.delegate],
			);
			expect(affectedRows).toBe(0);
			await tx.rollback();
		});
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.owner);
			const { affectedRows } = await tx.query(
				`delete from property_mandates where property_id = $1 and agent_id = $2`,
				[PROPERTIES.draft, IDENTITIES.delegate],
			);
			expect(affectedRows).toBe(1);
			await tx.rollback();
		});
	});

	it('refuses to let a delegate extend their own mandate expiration', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.delegate);
			await expect(
				tx.query(
					`update property_mandates set expires_at = now() + interval '10 years' where agent_id = $1`,
					[IDENTITIES.delegate],
				),
			).rejects.toThrow(/permission denied/i);
			await tx.rollback();
		});
		// Positive control: writes to property_mandates are not blanket-denied —
		// the owner can still grant a fresh mandate in the same run.
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.owner);
			const { affectedRows } = await tx.query(
				`insert into property_mandates (property_id, agent_id) values ($1, $2)`,
				[PROPERTIES.published, IDENTITIES.client],
			);
			expect(affectedRows).toBe(1);
			await tx.rollback();
		});
	});

	it('refuses to let one agent grant a mandate on another agent property', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.outsider);
			await expect(
				tx.query(`insert into property_mandates (property_id, agent_id) values ($1, $2)`,
				         [PROPERTIES.draft, IDENTITIES.outsider]),
			).rejects.toThrow(/row-level security/i);
			await tx.rollback();
		});
	});

	it('denies anon the right to call the authorization function directly', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'anon');
			await expect(tx.query('select has_active_mandate($1)', [PROPERTIES.draft]))
				.rejects.toThrow(/permission denied for function/i);
			await tx.rollback();
		});
	});
});
