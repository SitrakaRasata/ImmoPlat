import { beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { createTestDb, as, IDENTITIES } from '../helpers/db'

describe('auth.uid()', () => {
  let db: PGlite
  beforeAll(async () => { db = await createTestDb() })

  it('returns null when no claims are set', async () => {
    await db.transaction(async (tx) => {
      await as(tx, 'anon')
      const { rows } = await tx.query<{ uid: string | null }>('select auth.uid() as uid')
      expect(rows[0].uid).toBeNull()
      await tx.rollback()
    })
  })

  it('returns the sub claim when claims are set', async () => {
    await db.transaction(async (tx) => {
      await as(tx, 'authenticated', IDENTITIES.owner)
      const { rows } = await tx.query<{ uid: string | null }>('select auth.uid() as uid')
      expect(rows[0].uid).toBe(IDENTITIES.owner)
      await tx.rollback()
    })
  })

  it('does not leak the role or claims past a rollback', async () => {
    await db.transaction(async (tx) => {
      await as(tx, 'authenticated', IDENTITIES.owner)
      await tx.rollback()
    })
    const { rows } = await db.query<{ user: string }>('select current_user as "user"')
    expect(rows[0].user).toBe('postgres')
  })
})
