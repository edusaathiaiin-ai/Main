/*
  Migration: 037_login_count.sql
  Purpose: Track how many times a user has opened the app (session starts).
           Used to trigger session_5 conversion popup on the 5th visit.
*/

alter table public.profiles
  add column if not exists login_count integer not null default 0;
