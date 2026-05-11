-- Add code_version to settings so rotating the visitor code invalidates existing sessions
alter table public.settings
  add column if not exists code_version uuid not null default gen_random_uuid();

-- Regenerate code_version on every rotation
create or replace function public.set_visitor_code(new_code text)
returns void language plpgsql security definer as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can rotate the visitor access code.';
  end if;

  insert into public.settings (id, visitor_access_code_hash, code_version, updated_by)
  values (1, crypt(new_code, gen_salt('bf')), gen_random_uuid(), auth.uid())
  on conflict (id) do update
    set visitor_access_code_hash = crypt(new_code, gen_salt('bf')),
        code_version             = gen_random_uuid(),
        updated_at               = now(),
        updated_by               = auth.uid();
end;
$$;

-- Expose code_version without requiring auth (callable by service role in layout/middleware)
create or replace function public.get_code_version()
returns text language sql security definer stable as $$
  select code_version::text from public.settings where id = 1;
$$;
