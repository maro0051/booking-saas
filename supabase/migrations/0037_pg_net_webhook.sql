-- 0037_pg_net_webhook.sql
-- Fire the send-email Edge Function directly from a Postgres trigger using
-- pg_net. This replaces the Database Webhook UI entirely.

-- 1. Enable pg_net (the HTTP client extension).
create extension if not exists pg_net;

-- 2. Function that POSTs a notification row to the Edge Function.
create or replace function public.tg_notifications_call_send_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := 'https://unhodloanszhgzbcynym.supabase.co/functions/v1/send-email';
  v_payload jsonb;
begin
  -- Only handle queued email rows.
  if new.channel <> 'email' or new.recipient_email is null then
    return new;
  end if;

  v_payload := jsonb_build_object(
    'type', 'INSERT',
    'table', 'notifications',
    'record', to_jsonb(new)
  );

  -- Fire-and-forget HTTP POST. pg_net queues this asynchronously.
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := v_payload
  );

  return new;
end;
$$;

drop trigger if exists notifications_call_send_email on public.notifications;
create trigger notifications_call_send_email
  after insert on public.notifications
  for each row execute function public.tg_notifications_call_send_email();