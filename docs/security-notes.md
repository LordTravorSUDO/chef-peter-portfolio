# Security Notes

## RLS Design Decisions

### Why `is_admin()` uses SECURITY DEFINER

The `is_admin()` helper reads from `public.profiles`. When called inside an
RLS policy (which runs as the querying role — potentially `anon`), the
function needs elevated access to read another user's profile record.
`SECURITY DEFINER` runs the function as its creator (the `postgres` role),
which can always read `profiles` regardless of RLS. The function is narrow
and returns only a boolean — it does not expose any profile data.

### Why editors have no policies yet

The current schema grants write access only to admins. The `editor` role
exists in the enum for future use. When editors are needed, add:

```sql
-- editors can insert/update their own articles but not publish or delete
CREATE POLICY "Editors create drafts"
  ON public.articles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'editor' AND is_active = TRUE)
    AND author_id = auth.uid()
    AND status = 'draft'
  );
```

### Why published articles cannot be hard-deleted

The `DELETE` policy on `public.articles` only allows deletion of `draft` or
`archived` rows. To remove a published article:
1. Set status to `archived` (UPDATE — allowed for admins)
2. Then delete it (DELETE — now allowed)

This prevents accidental removal of live content and preserves SEO redirect
opportunities.

### Why revision INSERT is blocked from clients

```sql
CREATE POLICY "No direct client inserts on revisions"
  ON public.article_revisions FOR INSERT
  WITH CHECK (FALSE);
```

The `create_article_revision()` trigger runs as `SECURITY DEFINER` (the
`postgres` role), which bypasses RLS. This means the trigger can always
write revisions, but no authenticated client (not even an admin) can insert
a fake revision directly via the API. This protects the integrity of the
audit trail.

### Why `scheduled_for` is in the future check

The DB constraint `articles_scheduled_future` checks `scheduled_for > created_at`
not `scheduled_for > NOW()`. This is intentional — the scheduled publishing
cron (Supabase Edge Function, Milestone 4) will do the actual time check when
it runs. The constraint just prevents obviously incorrect data (scheduling
something in the past relative to when the article was created).

---

## Known Vulnerability Notes

### react-router v6.30.6 — moderate CVEs

- CVE `GHSA-wrjc-x8rr-h8h6`: Open redirect via backslash in `<Link>`.
  **Not applicable** — no user-controlled `to` props in this codebase.

- CVE `GHSA-337j-9hxr-rhxg`: Arbitrary constructor injection via
  `deserializeErrors()` in SSR hydration.
  **Not applicable** — this is a pure client-side SPA with no SSR.

The safe fix is upgrading to react-router v7 (breaking API change).
Deferred to Milestone 3.

### express + qs — moderate CVEs

Present in the `express` package (a template remnant from the original
AI Studio scaffolding). No `server.js` exists; express is never executed.
Risk is zero. The package should be removed in a dependency cleanup task:

```bash
npm uninstall express dotenv @google/genai
npm uninstall --save-dev @types/express
```

Do not do this until you confirm no other code depends on these packages.

---

## Things That Must Never Happen

1. **Never commit `.env`** — it is in `.gitignore`. Double-check before every push.
2. **Never put `SUPABASE_SERVICE_ROLE_KEY` in browser code** — it bypasses all RLS.
3. **Never enable public sign-up** — admin accounts are created manually.
4. **Never run `supabase/tests/rls_access_control.sql` on a populated production
   database without reading it first** — it creates and rolls back test users but
   the `auth.users` insert requires postgres-level access.
5. **Never remove RLS from any table** without replacing it with equivalent policies.
