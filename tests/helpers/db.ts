import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PGlite, type Transaction } from '@electric-sql/pglite'

export const IDENTITIES = {
  owner: '11111111-1111-1111-1111-111111111111',
  delegate: '22222222-2222-2222-2222-222222222222',
  outsider: '33333333-3333-3333-3333-333333333333',
  client: '44444444-4444-4444-4444-444444444444',
} as const

export const PROPERTIES = {
  published: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  draft: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
} as const

const ROLES = { anon: 'anon', authenticated: 'authenticated', service: 'service_role' } as const
export type TestRole = keyof typeof ROLES

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8')

export async function createTestDb(): Promise<PGlite> {
  const db = await PGlite.create()
  await db.exec(read('tests/fixtures/supabase-shim.sql'))
  await db.exec(read('supabase/schema.sql'))
  await db.exec(read('tests/fixtures/seed.sql'))
  return db
}

export async function as(tx: Transaction, role: TestRole, uid?: string): Promise<void> {
  // Both settings are transaction-local: without that, the first identity used
  // would leak into every following test.
  await tx.exec(`set local role ${ROLES[role]}`)
  await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
    uid ? JSON.stringify({ sub: uid, role: ROLES[role] }) : null,
  ])
}
