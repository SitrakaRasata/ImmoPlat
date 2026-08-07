import { beforeAll, describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { createTestDb } from '../helpers/db'

describe('handle_new_user', () => {
  let db: PGlite
  beforeAll(async () => { db = await createTestDb() })

  it('ignores a self-declared role and always creates a client', async () => {
    await db.transaction(async (tx) => {
      await tx.query(
        `insert into auth.users (id, email, raw_user_meta_data)
         values ($1, $2, '{"role":"agent","firstname":"Mallory"}')`,
        ['99999999-9999-9999-9999-999999999999', 'mallory@example.test'],
      )
      const { rows } = await tx.query<{ role: string; firstname: string }>(
        `select role, firstname from profiles where id = $1`,
        ['99999999-9999-9999-9999-999999999999'],
      )
      expect(rows[0].role).toBe('client')
      expect(rows[0].firstname).toBe('Mallory')
      await tx.rollback()
    })
  })
})
