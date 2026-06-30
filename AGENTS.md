# Project Instructions

## App Purpose

This project is a personal task list dashboard. Build features around user-owned tasks, status tracking, due dates, filtering, and clear dashboard summaries.

## Stack

- Use Vue with JavaScript for the frontend unless the project is explicitly migrated to TypeScript.
- Use Supabase for authentication and database access.
- Deploy on Vercel.
- Prefer Vite-style environment variables for browser-exposed configuration.

## Implementation Guidelines

- Keep UI work in small, focused Vue single-file components.
- Put reusable task data logic in composables or service modules instead of duplicating Supabase calls across components.
- Include loading, error, empty, and success states for task and dashboard flows.
- Keep forms accessible with labels, clear validation messages, and disabled submit states while requests are running.
- Favor simple, readable JavaScript over clever abstractions.

## Supabase Security

- Enable Row Level Security for every user-data table in exposed schemas such as `public`.
- Scope personal task rows to the current user, normally through policies based on `auth.uid()`.
- Never expose the Supabase `service_role` key or any secret key in browser code.
- Only use the Supabase URL and publishable/anon key in frontend code, and rely on RLS to protect data.
- Do not use user-editable metadata for authorization decisions.

## Environment Variables

- Commit `.env.example` with placeholder values only.
- Do not commit `.env.local`, production secrets, or real API keys.
- In Vue/Vite browser code, only read public configuration from `VITE_` variables.
- Add production and preview secrets through Vercel environment variables, not hardcoded values.

## Verification

- After changing app code, run the relevant lint, build, or test command when available.
- After Supabase schema or policy changes, verify the behavior with a representative authenticated user flow.
