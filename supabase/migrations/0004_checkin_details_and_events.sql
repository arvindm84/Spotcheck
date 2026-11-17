-- The web check-in asks three things: crowd (busy_score), noise and free outlets.
alter table busy_reports
  add column if not exists noise text
  constraint busy_reports_noise_check check (noise in ('whisper', 'chatter', 'loud'));

alter table busy_reports
  add column if not exists outlets text
  constraint busy_reports_outlets_check check (outlets in ('plenty', 'few', 'none'));

-- Web visitors report through an anonymous Supabase session, which the existing
-- "Signed-in users can report" policy already covers (one report per spot every 10 minutes).
-- Turn it on in the dashboard: Authentication → Sign In / Providers → Allow anonymous sign-ins.

-- "Tonight on campus".
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  venue text not null,
  location_id text references locations(id) on delete set null,
  starts_at timestamptz not null,
  free_food boolean not null default false
);

create index if not exists events_starts_at_idx on events (starts_at);

alter table events enable row level security;

drop policy if exists "Public read access" on events;
create policy "Public read access" on events for select using (true);
