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

	it('closes access once the mandate has expired, with the row still there', async () => {
		await db.transaction(async (tx) => {
			await tx.query(`update property_mandates set expires_at = now() - interval '1 day'`);
			await as(tx, 'authenticated', IDENTITIES.delegate);
			const { rows } = await tx.query<{ title: string }>('select title from properties');
			expect(rows.map((r) => r.title)).toEqual(['Published loft']);
			await tx.rollback();
		});
		const { rows } = await db.query('select 1 from property_mandates');
		expect(rows).toHaveLength(1);
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
