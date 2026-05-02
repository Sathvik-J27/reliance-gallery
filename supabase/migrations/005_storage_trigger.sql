-- Enable pg_net extension for HTTP calls from triggers
create extension if not exists pg_net;

-- Function to call the process-media edge function after media insert
create or replace function public.trigger_process_media()
returns trigger language plpgsql security definer as $$
declare
  payload jsonb;
  edge_function_url text;
begin
  edge_function_url := current_setting('app.edge_function_url', true) || '/process-media';

  payload := jsonb_build_object('record', row_to_json(NEW));

  perform net.http_post(
    url := edge_function_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
    )
  );

  return NEW;
end;
$$;

create trigger after_media_insert
  after insert on public.media
  for each row execute function public.trigger_process_media();
