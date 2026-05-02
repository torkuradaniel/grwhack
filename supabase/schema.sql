-- Run this once in the Supabase SQL editor.

create table if not exists seen_social (
  url           text        primary key,
  platform      text        not null,
  brand         text        not null,
  first_seen_at timestamptz not null default now()
);

create table if not exists seen_web (
  url           text        primary key,
  brand         text        not null,
  first_seen_at timestamptz not null default now()
);

create index if not exists seen_social_first_seen_idx on seen_social (first_seen_at desc);
create index if not exists seen_web_first_seen_idx    on seen_web    (first_seen_at desc);
