import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createTestDb, as, IDENTITIES } from '../helpers/db';

describe('auth.uid()', () => {
	let db: PGlite;
	beforeAll(async () => { db = await createTestDb(); });
	afterAll(async () => { await db.close(); });

	it('returns null when no claims are set', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'anon');
			const { rows } = await tx.query<{ uid: string | null }>('select auth.uid() as uid');
			expect(rows[0].uid).toBeNull();
			await tx.rollback();
		});
	});

	it('returns the sub claim when claims are set', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.owner);
			const { rows } = await tx.query<{ uid: string | null }>('select auth.uid() as uid');
			expect(rows[0].uid).toBe(IDENTITIES.owner);
			await tx.rollback();
		});
	});

	it('does not leak the role or claims past a commit', async () => {
		await db.transaction(async (tx) => {
			await as(tx, 'authenticated', IDENTITIES.owner);
		});
		const { rows } = await db.query<{ user: string; claims: string | null }>(
			`select current_user as "user", current_setting('request.jwt.claims', true) as claims`
		);
		// The custom GUC placeholder, once touched, stays registered at session
		// scope: outside the transaction its value reverts to the empty string,
		// never to the claims set locally inside it.
		expect(rows[0].user).toBe('postgres');
		expect(rows[0].claims).toBe('');
	});
});
