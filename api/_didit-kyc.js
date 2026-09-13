const APPROVED = new Set(['approved', 'success', 'passed']);
const DECLINED = new Set(['declined', 'rejected', 'failed', 'failure']);

function normalizedStatus(value) {
  if (typeof value === 'boolean') return value ? 'approved' : 'declined';
  if (value && typeof value === 'object') {
    return normalizedStatus(value.status ?? value.result ?? value.decision ?? value.outcome ?? value.passed);
  }
  return String(value ?? '').trim().toLowerCase();
}

function findCollection(value, names, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 6) return null;
  for (const name of names) {
    if (Array.isArray(value[name])) return value[name];
  }
  for (const child of Object.values(value)) {
    const found = findCollection(child, names, depth + 1);
    if (found) return found;
  }
  return null;
}

function approvedCollection(remote, names) {
  const items = findCollection(remote, names);
  return Boolean(items?.length) && items.every((item) => APPROVED.has(normalizedStatus(item)));
}

function workflowIdFrom(remote) {
  const roots = [remote, remote?.decision, remote?.session, remote?.data].filter(Boolean);
  for (const root of roots) {
    const value = root.workflow_id ?? root.workflowId ?? root.workflow?.id;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/**
 * A global APPROVED result is insufficient for full KYC. The configured
 * workflow and every required feature must independently pass.
 */
export function evaluateFullKyc(remote, expectedWorkflowId) {
  const overall = normalizedStatus(remote?.decision?.status ?? remote?.status);
  const workflowId = workflowIdFrom(remote);
  const checks = {
    document: approvedCollection(remote, ['id_verifications', 'document_verifications', 'document_checks']),
    liveness: approvedCollection(remote, ['liveness_checks', 'liveness_verifications']),
    faceMatch: approvedCollection(remote, ['face_matches', 'face_match_checks'])
  };
  const workflowMatches = Boolean(expectedWorkflowId && workflowId === expectedWorkflowId);
  const evidenceComplete = checks.document && checks.liveness && checks.faceMatch;

  let status = 'pending';
  if (DECLINED.has(overall)) status = 'declined';
  else if (APPROVED.has(overall) && workflowMatches && evidenceComplete) status = 'approved';
  else if (APPROVED.has(overall)) status = 'review_required';

  return { status, workflowId, workflowMatches, evidenceComplete, checks };
}


/** Contract signing uses its own workflow and must include an approved
 * liveness result. Identity onboarding still uses evaluateFullKyc above. */
export function evaluateSignatureBiometrics(remote, expectedWorkflowId) {
  const overall = normalizedStatus(remote?.decision?.status ?? remote?.status);
  const workflowId = workflowIdFrom(remote);
  const workflowMatches = Boolean(expectedWorkflowId && workflowId === expectedWorkflowId);
  const liveness = approvedCollection(remote, ['liveness_checks', 'liveness_verifications']);

  let status = 'pending';
  if (DECLINED.has(overall)) status = 'declined';
  else if (APPROVED.has(overall) && workflowMatches && liveness) status = 'approved';
  else if (APPROVED.has(overall)) status = 'review_required';

  return { status, workflowId, workflowMatches, checks: { liveness } };
}
