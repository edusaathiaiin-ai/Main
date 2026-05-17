// Shared result shape for the Activate Trial server action. Kept out of
// actions.ts because that file is 'use server' — Next only allows async
// function exports there; a type export can fail the build.
export type ActivateResult = { ok: boolean; message: string } | null
