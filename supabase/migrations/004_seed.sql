-- Insert default visitor access code for development (MUST be rotated before production)
-- Code: 123456
insert into public.settings (id, visitor_access_code_hash)
values (1, crypt('123456', gen_salt('bf')))
on conflict (id) do nothing;
