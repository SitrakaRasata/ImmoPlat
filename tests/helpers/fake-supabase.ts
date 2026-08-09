import type { Transaction } from '@electric-sql/pglite';

// Stands in for the Supabase query builder in route-level tests: each call
// becomes plain SQL run on the test transaction under whatever role
// tests/helpers/db.ts `as()` has set, so a refusal here is Postgres refusing.

type FilterOp = { column: string; op: 'eq' | 'in'; value: unknown };
type OrFilter = { column: string; op: 'is' | 'gt'; value: string | null };

interface PostgrestResult<T> {
	data: T | null;
	error: { message: string; code: string | undefined } | null;
}

class FakeQueryBuilder<T = Record<string, unknown>>
	implements PromiseLike<PostgrestResult<T[] | T | null>>
{
	private mode: 'select' | 'update' | 'insert' | 'delete' = 'select';
	private columns = '*';
	private payload: Record<string, unknown> | undefined;
	private readonly filters: FilterOp[] = [];
	private readonly orFilters: OrFilter[] = [];
	private orderBy: { column: string; ascending: boolean } | undefined;
	private wantsSingle = false;
	private wantsReturning = false;

	constructor(
		private readonly tx: Transaction,
		private readonly table: string,
	) {}

	select(columns = '*'): this {
		this.columns = columns;
		if (this.mode !== 'select') this.wantsReturning = true;
		return this;
	}

	eq(column: string, value: unknown): this {
		this.filters.push({ column, op: 'eq', value });
		return this;
	}

	in(column: string, values: unknown[]): this {
		this.filters.push({ column, op: 'in', value: values });
		return this;
	}

	// Covers only what the app emits: PostgREST's `column.op.value,...` syntax,
	// restricted to the "is null" / "gt" pair that expresses an expiry check.
	or(filterExpression: string): this {
		for (const clause of filterExpression.split(',')) {
			const [column, op, value] = clause.split('.');
			this.orFilters.push({ column, op: op as 'is' | 'gt', value: value === 'null' ? null : value });
		}
		return this;
	}

	order(column: string, options: { ascending: boolean }): this {
		this.orderBy = { column, ascending: options.ascending };
		return this;
	}

	maybeSingle(): this {
		this.wantsSingle = true;
		return this;
	}

	update(payload: Record<string, unknown>): this {
		this.mode = 'update';
		this.payload = payload;
		return this;
	}

	insert(payload: Record<string, unknown>): this {
		this.mode = 'insert';
		this.payload = payload;
		return this;
	}

	delete(): this {
		this.mode = 'delete';
		return this;
	}

	then<TResult1 = PostgrestResult<T[] | T | null>, TResult2 = never>(
		onfulfilled?:
			| ((value: PostgrestResult<T[] | T | null>) => TResult1 | PromiseLike<TResult1>)
			| null,
		onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
	): PromiseLike<TResult1 | TResult2> {
		return this.execute().then(onfulfilled, onrejected);
	}

	private buildWhere(paramOffset: number): { clause: string; params: unknown[] } {
		const params: unknown[] = [];
		const parts = this.filters.map((filter) => {
			const placeholder = paramOffset + params.length;
			params.push(filter.value);
			return filter.op === 'eq'
				? `"${filter.column}" = $${placeholder}`
				: `"${filter.column}" = any($${placeholder})`;
		});
		if (this.orFilters.length > 0) {
			const orParts = this.orFilters.map((filter) => {
				if (filter.op === 'is') return `"${filter.column}" is null`;
				const placeholder = paramOffset + params.length;
				params.push(filter.value);
				return `"${filter.column}" > $${placeholder}`;
			});
			parts.push(`(${orParts.join(' or ')})`);
		}
		if (parts.length === 0) return { clause: '', params: [] };
		return { clause: ` where ${parts.join(' and ')}`, params };
	}

	private async execute(): Promise<PostgrestResult<T[] | T | null>> {
		try {
			if (this.mode === 'select') {
				const { clause, params } = this.buildWhere(1);
				let sql = `select ${this.columns} from "${this.table}"${clause}`;
				if (this.orderBy) {
					sql += ` order by "${this.orderBy.column}" ${this.orderBy.ascending ? 'asc' : 'desc'}`;
				}
				const { rows } = await this.tx.query<T>(sql, params);
				return this.wantsSingle
					? { data: (rows[0] ?? null) as T | null, error: null }
					: { data: rows, error: null };
			}

			if (this.mode === 'update') {
				const columns = Object.keys(this.payload ?? {});
				const setParams = Object.values(this.payload ?? {});
				const setClause = columns.map((column, index) => `"${column}" = $${index + 1}`).join(', ');
				const { clause, params } = this.buildWhere(setParams.length + 1);
				const sql = `update "${this.table}" set ${setClause}${clause} returning ${this.columns}`;
				const { rows } = await this.tx.query<T>(sql, [...setParams, ...params]);
				return { data: this.wantsReturning ? rows : null, error: null };
			}

			if (this.mode === 'insert') {
				const columns = Object.keys(this.payload ?? {});
				const values = Object.values(this.payload ?? {});
				const placeholders = columns.map((_, index) => `$${index + 1}`);
				const sql =
					`insert into "${this.table}" (${columns.map((c) => `"${c}"`).join(', ')}) ` +
					`values (${placeholders.join(', ')}) returning ${this.columns}`;
				const { rows } = await this.tx.query<T>(sql, values);
				return { data: this.wantsReturning ? rows : null, error: null };
			}

			const { clause, params } = this.buildWhere(1);
			const sql = `delete from "${this.table}"${clause} returning ${this.columns}`;
			const { rows } = await this.tx.query<T>(sql, params);
			return { data: this.wantsReturning ? rows : null, error: null };
		} catch (caught) {
			const dbError = caught as { message?: string; code?: string };
			return { data: null, error: { message: dbError.message ?? 'unknown error', code: dbError.code } };
		}
	}
}

export function createFakeSupabase(tx: Transaction) {
	return {
		from: (table: string) => new FakeQueryBuilder(tx, table),
	};
}
