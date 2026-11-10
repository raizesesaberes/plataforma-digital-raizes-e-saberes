// QA-only empty registry used to prove the fallback remains inert after rollout.
export const pendingRegistry = Object.freeze({schemaVersion: 1,
  editorialRevision: 'carla-editorial-2026-11-10-v1',
  release: Object.freeze({status: 'awaiting_assets', approvalRef: null}),
  licenses: Object.freeze([]), assets: Object.freeze([])});
