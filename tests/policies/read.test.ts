import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createTestDb, as, IDENTITIES } from '../helpers/db';

const titles = async (db: PGlite, role: 'anon' | 'authenticated', uid?: string) => {
	let result: string[] = [];
	await db.transaction(async (tx) => {
		await as(tx, role, uid);
		const { rows } = await tx.query<{ title: string }>('select title from properties order by title');
		result = rows.map((r) => r.title);
		await tx.rollback();
	});
	return result;
};

describe('properties read policies', () => {
	let db: PGlite;
	beforeAll(async () => { db = await createTestDb(); });
	afterAll(async () => { await db.close(); });

	it('shows published properties to anonymous visitors', async () => {
		expect(await titles(db, 'anon')).toEqual(['Published loft']);
	});

	it('hides drafts from a signed-in client', async () => {
		expect(await titles(db, 'authenticated', IDENTITIES.client)).toEqual(['Published loft']);
	});

	it('does not fail anonymous reads with a permission error', async () => {
		await expect(titles(db, 'anon')).resolves.toBeDefined();
	});

	it('shows their own drafts to the owning agent', async () => {
		expect(await titles(db, 'authenticated', IDENTITIES.owner))
			.toEqual(['Draft townhouse', 'Published loft']);
	});

	it('lets a profile read itself and nobody else', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.client);
			const { rows } = await tx.query<{ id: string }>('select id from profiles');
			expect(rows.map((r) => r.id)).toEqual([IDENTITIES.client]);
			await tx.rollback();
		});
	});
});
