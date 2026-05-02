-- Trigger: restrict email domain on profile insert
create or replace function public.check_email_domain()
returns trigger language plpgsql security definer as $$
begin
  if new.email not like '%@reliancestones.com' then
    raise exception 'Registration is restricted to @reliancestones.com email addresses.';
  end if;
  return new;
end;
$$;

create trigger enforce_email_domain
  before insert on public.profiles
  for each row execute function public.check_email_domain();

-- Trigger: first user becomes admin, create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  user_count int;
begin
  select count(*) into user_count from public.profiles;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when user_count = 0 then 'admin' else 'staff' end
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Function: verify visitor access code (security definer — never exposes the hash)
create or replace function public.verify_visitor_code(input_code text)
returns boolean language plpgsql security definer as $$
declare
  stored_hash text;
begin
  select visitor_access_code_hash into stored_hash from public.settings where id = 1;
  if stored_hash is null then return false; end if;
  return stored_hash = crypt(input_code, stored_hash);
end;
$$;

-- Function: check and record rate limit for visitor code attempts
create or replace function public.check_rate_limit(client_ip text)
returns boolean language plpgsql security definer as $$
declare
  attempt_count int;
begin
  -- Count attempts in last 10 minutes
  select count(*) into attempt_count
  from public.code_attempts
  where ip_address = client_ip
    and attempted_at > now() - interval '10 minutes';

  if attempt_count >= 5 then
    return false; -- rate limited
  end if;

  -- Record this attempt
  insert into public.code_attempts (ip_address) values (client_ip);

  -- Clean up old attempts (older than 1 hour)
  delete from public.code_attempts
  where attempted_at < now() - interval '1 hour';

  return true; -- allowed
end;
$$;

-- Function: rotate visitor access code (admin only)
create or replace function public.set_visitor_code(new_code text)
returns void language plpgsql security definer as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can rotate the visitor access code.';
  end if;

  insert into public.settings (id, visitor_access_code_hash, updated_by)
  values (1, crypt(new_code, gen_salt('bf')), auth.uid())
  on conflict (id) do update
    set visitor_access_code_hash = crypt(new_code, gen_salt('bf')),
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;
