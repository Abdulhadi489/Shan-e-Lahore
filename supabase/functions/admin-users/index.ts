// Settings > Staff and riders, for Super Admins only. Logins need the secret key, so everything that touches a login
// lives here: list, create, update (details, role, branch, active), reset password, and remove. Each request is
// checked against the caller's role in the database before anything happens. The rules (two active Super Admins,
// nobody changes themselves) run inside the SQL functions, which also record who did it in the audit log.
// Passwords are generated here and returned to the Super Admin. A copy is kept encrypted in staff_credentials so a
// Super Admin can show it again; it is never logged and never leaves this function except to a Super Admin.
import { z } from 'zod'
import { db } from '../_shared/db.ts'
import { decryptPassword, encryptPassword } from '../_shared/credentials.ts'
import { clientIp, fail, serve, type Reply } from '../_shared/http.ts'
import { temporaryPassword } from '../_shared/password.ts'
import { rateLimited } from '../_shared/rate-limit.ts'

const fullName = z.string().trim().min(1).max(60)
// 03001234567, +92 300 1234567 and 923001234567 all become 923001234567; empty means no phone.
const phone = z
  .string()
  .trim()
  .max(20)
  .transform((value) => value.replace(/[\s-]/g, '').replace(/^\+/, '').replace(/^0/, '92'))
  .refine((value) => value === '' || /^923[0-9]{9}$/.test(value))
  .transform((value) => value || null)
const details = {
  fullName,
  phone,
  role: z.enum(['order_staff', 'super_admin']),
  // guid, not uuid: the seeded branch id (b0000000-...) is not an RFC version-4 uuid.
  branchId: z.guid().nullable(),
}
const request = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('list') }),
  z.strictObject({ action: z.literal('create'), email: z.email().max(254), ...details }),
  z.strictObject({ action: z.literal('update'), userId: z.uuid(), active: z.boolean(), ...details }),
  z.strictObject({ action: z.literal('resetPassword'), userId: z.uuid() }),
  z.strictObject({ action: z.literal('viewPassword'), userId: z.uuid() }),
  z.strictObject({ action: z.literal('remove'), userId: z.uuid() }),
  z.strictObject({ action: z.literal('removeRider'), riderId: z.guid() }),
])

// Errors raised by the SQL functions that the screen explains to the Super Admin.
const knownErrors = ['CANNOT_CHANGE_OWN_ACCESS', 'TWO_SUPER_ADMINS_REQUIRED', 'ACCOUNT_NOT_FOUND']
const ONE_CENTURY = '876000h'

serve(async (body, req): Promise<Reply> => {
  // Anyone can reach this URL, so calls are limited per address before anything else.
  if (await rateLimited('admin-users-anon', clientIp(req), 600, 60)) return fail(429, 'TOO_MANY_REQUESTS')

  const input = request.safeParse(body)
  if (!input.success) return fail(400, 'INVALID_INPUT')

  const token = req.headers.get('authorization')?.replace(/^Bearer /i, '') ?? ''
  const { data: caller } = await db.auth.getUser(token)
  if (!caller.user) return fail(401, 'NOT_SIGNED_IN')
  const actorId = caller.user.id
  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('role, is_active')
    .eq('user_id', actorId)
    .maybeSingle()
  if (profileError) throw profileError
  if (profile?.role !== 'super_admin' || !profile.is_active) return fail(403, 'NOT_ALLOWED')
  if (await rateLimited('admin-users', actorId, 600, 200)) return fail(429, 'TOO_MANY_REQUESTS')

  const rpcFailure = (error: { message: string; code?: string }): Reply => {
    if (knownErrors.includes(error.message)) return fail(409, error.message)
    // A CHECK violation: Order Staff without a branch.
    if (error.code === '23514') return fail(400, 'BRANCH_REQUIRED')
    throw error
  }

  // Changes the access of an existing account through the SQL function that enforces the rules.
  async function setAccess(userId: string, role: string, branchId: string | null, active: boolean) {
    const { error } = await db.rpc('set_staff_access', {
      actor_id: actorId,
      target_user_id: userId,
      new_role: role,
      new_branch_id: branchId,
      active,
    })
    return error ? rpcFailure(error) : null
  }

  // Auth has no audit trigger, so what happens to a login is logged here (no passwords, only what happened).
  async function audit(event: string, userId: string) {
    const { error } = await db.from('audit_log').insert({
      table_name: 'auth.users',
      row_id: userId,
      action: 'update',
      new_values: { event },
      changed_by: actorId,
    })
    if (error) throw error
  }

  // Encrypting comes first, before any login is created or changed, so a missing key stops everything with nothing
  // half-done; the encrypted copy is saved once the login has the password.
  async function keepPassword(userId: string, ciphertext: string) {
    const { error } = await db.from('staff_credentials').upsert({ user_id: userId, ciphertext, updated_at: new Date().toISOString() })
    if (error) throw error
  }

  const data = input.data

  if (data.action === 'list') {
    const [profiles, users, kept] = await Promise.all([
      db
        .from('profiles')
        .select('user_id, full_name, role, branch_id, is_active, phone, created_by, created_at, updated_at')
        .is('deleted_at', null)
        .neq('role', 'customer')
        .order('full_name'),
      db.auth.admin.listUsers({ perPage: 1000 }),
      db.from('staff_credentials').select('user_id'),
    ])
    if (kept.error) throw kept.error
    const keptIds = new Set(kept.data.map((row) => row.user_id))
    if (profiles.error) throw profiles.error
    if (users.error) throw users.error
    const accounts = new Map(users.data.users.map((user) => [user.id, user]))
    const people = profiles.data.map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      role: row.role,
      branchId: row.branch_id,
      active: row.is_active,
      phone: row.phone,
      createdBy: row.created_by,
      passwordStored: keptIds.has(row.user_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      email: accounts.get(row.user_id)?.email ?? null,
      lastSignInAt: accounts.get(row.user_id)?.last_sign_in_at ?? null,
    }))
    return { status: 200, body: { people } }
  }

  if (data.action === 'create') {
    const password = temporaryPassword()
    const userId = crypto.randomUUID()
    const sealed = await encryptPassword(userId, password)
    const created = await db.auth.admin.createUser({
      id: userId,
      email: data.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    })
    if (created.error) {
      if (created.error.code === 'email_exists') return fail(409, 'EMAIL_TAKEN')
      throw created.error
    }
    // No half-made accounts: if anything below fails, the login is removed again.
    try {
      const problem = await setAccess(userId, data.role, data.branchId, true)
      if (problem) {
        await db.auth.admin.deleteUser(userId)
        return problem
      }
      const { error } = await db.from('profiles').update({ full_name: data.fullName, phone: data.phone, created_by: actorId }).eq('user_id', userId)
      if (error) throw error
      await keepPassword(userId, sealed)
    } catch (error) {
      await db.auth.admin.deleteUser(userId)
      throw error
    }
    return { status: 200, body: { userId, email: data.email, temporaryPassword: password } }
  }

  if (data.action === 'update') {
    const problem = await setAccess(data.userId, data.role, data.branchId, data.active)
    if (problem) return problem
    const { error } = await db.from('profiles').update({ full_name: data.fullName, phone: data.phone }).eq('user_id', data.userId)
    if (error) throw error
    // A deactivated login cannot sign in or refresh a session; reactivating lifts the ban.
    const banned = await db.auth.admin.updateUserById(data.userId, { ban_duration: data.active ? 'none' : ONE_CENTURY })
    if (banned.error) throw banned.error
    if (!data.active) {
      const { error: sessionError } = await db.rpc('end_sessions', { target_user_id: data.userId })
      if (sessionError) throw sessionError
    }
    return { status: 200, body: {} }
  }

  if (data.action === 'resetPassword') {
    if (data.userId === actorId) return fail(409, 'CANNOT_CHANGE_OWN_ACCESS')
    const password = temporaryPassword()
    const sealed = await encryptPassword(data.userId, password)
    const updated = await db.auth.admin.updateUserById(data.userId, { password })
    if (updated.error) {
      if (updated.error.status === 404) return fail(409, 'ACCOUNT_NOT_FOUND')
      throw updated.error
    }
    await keepPassword(data.userId, sealed)
    const { error: sessionError } = await db.rpc('end_sessions', { target_user_id: data.userId })
    if (sessionError) throw sessionError
    await audit('password_reset', data.userId)
    return { status: 200, body: { temporaryPassword: password } }
  }

  if (data.action === 'viewPassword') {
    const { data: row, error } = await db.from('staff_credentials').select('ciphertext').eq('user_id', data.userId).maybeSingle()
    if (error) throw error
    if (!row) return fail(404, 'NO_STORED_PASSWORD')
    // Every look is logged: who looked at whose password (never the password itself).
    await audit('password_viewed', data.userId)
    return { status: 200, body: { password: await decryptPassword(data.userId, row.ciphertext) } }
  }

  if (data.action === 'remove') {
    const { data: outcome, error } = await db.rpc('remove_account', { actor_id: actorId, target_user_id: data.userId })
    if (error) return rpcFailure(error)
    if (outcome === 'deleted') {
      await audit('account_deleted', data.userId)
      const removed = await db.auth.admin.deleteUser(data.userId)
      if (removed.error && removed.error.status !== 404) throw removed.error
    } else {
      // Orders still point to this person, so the row stays without name, phone or access and the login stays locked.
      // The email cannot be changed (a database trigger forbids it), so it stays on the locked login.
      await audit('account_anonymised', data.userId)
      const { error: keptError } = await db.from('staff_credentials').delete().eq('user_id', data.userId)
      if (keptError) throw keptError
      const locked = await db.auth.admin.updateUserById(data.userId, {
        ban_duration: ONE_CENTURY,
        password: temporaryPassword(32),
        user_metadata: { full_name: 'Deleted staff member' },
      })
      if (locked.error) throw locked.error
      const { error: sessionError } = await db.rpc('end_sessions', { target_user_id: data.userId })
      if (sessionError) throw sessionError
    }
    return { status: 200, body: { outcome } }
  }

  const { data: outcome, error } = await db.rpc('remove_rider', { actor_id: actorId, rider: data.riderId })
  if (error) return rpcFailure(error)
  return { status: 200, body: { outcome } }
})
