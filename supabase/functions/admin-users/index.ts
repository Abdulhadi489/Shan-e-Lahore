// Settings > Staff, for Super Admins only: create a login, change an account's role, branch or
// active state, and reset a password. Logins and passwords need the secret key, so they live here;
// the access change itself runs in public.set_staff_access, which also audits who made it.
import { z } from 'zod'
import { db } from '../_shared/db.ts'
import { fail, serve, type Reply } from '../_shared/http.ts'

const password = z.string().min(12).max(72)
const access = {
  role: z.enum(['customer', 'order_staff', 'super_admin']),
  // guid, not uuid: the seeded branch id (b0000000-...) is not an RFC version-4 uuid.
  branchId: z.guid().nullable(),
}
const request = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('create'), email: z.email().max(254), fullName: z.string().trim().min(1).max(60), password, ...access }),
  z.strictObject({ action: z.literal('setAccess'), userId: z.uuid(), active: z.boolean(), ...access }),
  z.strictObject({ action: z.literal('resetPassword'), userId: z.uuid(), password }),
])

// Errors raised by set_staff_access that the Settings screen explains to the Super Admin.
const accessErrors = ['CANNOT_CHANGE_OWN_ACCESS', 'TWO_SUPER_ADMINS_REQUIRED', 'ACCOUNT_NOT_FOUND']

serve(async (body, req): Promise<Reply> => {
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

  async function setAccess(userId: string, role: string, branchId: string | null, active: boolean) {
    const { error } = await db.rpc('set_staff_access', {
      actor_id: actorId,
      target_user_id: userId,
      new_role: role,
      new_branch_id: branchId,
      active,
    })
    if (!error) return null
    if (accessErrors.includes(error.message)) return fail(409, error.message)
    // A CHECK violation: Order Staff without a branch.
    if (error.code === '23514') return fail(400, 'BRANCH_REQUIRED')
    throw error
  }

  const data = input.data
  if (data.action === 'create') {
    const created = await db.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    })
    if (created.error) {
      if (created.error.code === 'email_exists') return fail(409, 'EMAIL_TAKEN')
      if (created.error.code === 'weak_password') return fail(400, 'WEAK_PASSWORD')
      throw created.error
    }
    const userId = created.data.user.id
    // No half-made accounts: without its role the login is removed again.
    const problem = await setAccess(userId, data.role, data.branchId, true).catch(async (error) => {
      await db.auth.admin.deleteUser(userId)
      throw error
    })
    if (problem) {
      await db.auth.admin.deleteUser(userId)
      return problem
    }
    return { status: 200, body: { userId } }
  }

  if (data.action === 'setAccess') {
    return (await setAccess(data.userId, data.role, data.branchId, data.active)) ?? { status: 200, body: {} }
  }

  const updated = await db.auth.admin.updateUserById(data.userId, { password: data.password })
  if (updated.error) {
    if (updated.error.code === 'weak_password') return fail(400, 'WEAK_PASSWORD')
    if (updated.error.status === 404) return fail(409, 'ACCOUNT_NOT_FOUND')
    throw updated.error
  }
  const { error: logError } = await db.from('audit_log').insert({
    table_name: 'auth.users',
    row_id: data.userId,
    action: 'update',
    new_values: { password_reset: true },
    changed_by: actorId,
  })
  if (logError) throw logError
  return { status: 200, body: {} }
})
