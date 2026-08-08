import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createTestDb, as, IDENTITIES, PROPERTIES } from '../helpers/db';

describe('properties write policies', () => {
	let db: PGlite;
	beforeAll(async () => { db = await createTestDb(); });
	afterAll(async () => { await db.close(); });

	it('refuses to let a delegate reassign the property to themselves', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.delegate);
			await expect(
				tx.query('update properties set agent_id = $1 where id = $2',
				         [IDENTITIES.delegate, PROPERTIES.draft]),
			).rejects.toThrow(/permission denied/i);
			await tx.rollback();
		});
	});

	it('still lets that delegate edit the editable columns', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.delegate);
			await tx.query('update properties set title = $1 where id = $2',
			               ['Edited by delegate', PROPERTIES.draft]);
			const { rows } = await tx.query<{ title: string }>(
				'select title from properties where id = $1', [PROPERTIES.draft]);
			expect(rows[0].title).toBe('Edited by delegate');
			await tx.rollback();
		});
	});

	it('lets an agent create a property for themselves', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.owner);
			const { affectedRows } = await tx.query('insert into properties (agent_id, title) values ($1, $2)',
			                                        [IDENTITIES.owner, 'New listing']);
			expect(affectedRows).toBe(1);
			await tx.rollback();
		});
	});

	it('refuses to let a delegate create a property owned by someone else', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.delegate);
			await expect(
				tx.query('insert into properties (agent_id, title) values ($1, $2)',
				         [IDENTITIES.owner, 'Smuggled listing']),
			).rejects.toThrow(/row-level security/i);
			await tx.rollback();
		});
	});

	it('refuses to let a client create a property at all', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.client);
			await expect(
				tx.query('insert into properties (agent_id, title) values ($1, $2)',
				         [IDENTITIES.client, 'Client listing']),
			).rejects.toThrow(/row-level security/i);
			await tx.rollback();
		});
	});

	it('lets only the owner delete', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.delegate);
			const { affectedRows } = await tx.query('delete from properties where id = $1',
			                                        [PROPERTIES.draft]);
			expect(affectedRows).toBe(0);
			await tx.rollback();
		});
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.owner);
			const { affectedRows } = await tx.query('delete from properties where id = $1',
			                                        [PROPERTIES.draft]);
			expect(affectedRows).toBe(1);
			await tx.rollback();
		});
	});
});
