import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { createTestDb, as, IDENTITIES, PROPERTIES, type TestRole } from '../helpers/db';

type Row = {
	label: string;
	role: TestRole;
	uid?: string;
	property: 'published' | 'draft';
	select: boolean;
	insert: boolean;
	update: boolean;
	delete: boolean;
};

const MATRIX: Row[] = [
	{ label: 'anonymous, published', role: 'anon',          uid: undefined,        property: 'published',
	  select: true,  insert: false, update: false, delete: false },
	{ label: 'anonymous, draft',     role: 'anon',          uid: undefined,        property: 'draft',
	  select: false, insert: false, update: false, delete: false },
	{ label: 'client',               role: 'authenticated', uid: IDENTITIES.client,   property: 'published',
	  select: true,  insert: false, update: false, delete: false },
	{ label: 'owning agent',         role: 'authenticated', uid: IDENTITIES.owner,    property: 'draft',
	  select: true,  insert: true,  update: true,  delete: true },
	{ label: 'mandated agent',       role: 'authenticated', uid: IDENTITIES.delegate, property: 'draft',
	  select: true,  insert: false, update: true,  delete: false },
	{ label: 'unrelated agent',      role: 'authenticated', uid: IDENTITIES.outsider, property: 'draft',
	  select: false, insert: false, update: false, delete: false },
];

describe('authorization matrix', () => {
	let db: PGlite;
	beforeAll(async () => { db = await createTestDb(); });
	afterAll(async () => { await db.close(); });

	// A denial shows up either as a privilege exception or as zero rows
	// touched when a policy filters silently. Both count as "denied".
	const run = async (row: Row, fn: (tx: Transaction) => Promise<number>) => {
		let count = 0;
		await db.transaction(async (tx) => {
			await as(tx, row.role, row.uid);
			try { count = await fn(tx); } catch { count = 0; }
			await tx.rollback();
		});
		return count > 0;
	};

	describe.each(MATRIX)('$label', (row) => {
		const id = PROPERTIES[row.property];

		it(`SELECT is ${row.select ? 'allowed' : 'denied'}`, async () => {
			const allowed = await run(row, async (tx) =>
				(await tx.query('select 1 from properties where id = $1', [id])).rows.length);
			expect(allowed).toBe(row.select);
		});

		it(`INSERT is ${row.insert ? 'allowed' : 'denied'}`, async () => {
			const allowed = await run(row, async (tx) =>
				(await tx.query('insert into properties (agent_id, title) values ($1, $2)',
				                [IDENTITIES.owner, 'matrix probe'])).affectedRows ?? 0);
			expect(allowed).toBe(row.insert);
		});

		it(`UPDATE is ${row.update ? 'allowed' : 'denied'}`, async () => {
			const allowed = await run(row, async (tx) =>
				(await tx.query('update properties set title = $1 where id = $2',
				                ['matrix probe', id])).affectedRows ?? 0);
			expect(allowed).toBe(row.update);
		});

		it(`DELETE is ${row.delete ? 'allowed' : 'denied'}`, async () => {
			const allowed = await run(row, async (tx) =>
				(await tx.query('delete from properties where id = $1', [id])).affectedRows ?? 0);
			expect(allowed).toBe(row.delete);
		});
	});
});
