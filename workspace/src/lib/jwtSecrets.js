// src/lib/jwtSecrets.js
'use strict';

/**
 * Returns an array of secrets to try for verification.
 * Accepts a comma-separated env var JWT_SECRETS or a single JWT_SECRET for
 * backwards compatibility.
 *
 * Order matters: the FIRST secret is used for signing, remaining secrets
 * are "previous" secrets kept for verification during rotation.
 */
function getJwtSecrets() {
  const raw = process.env.JWT_SECRETS || process.env.JWT_SECRET || '';
  return raw
    .split(',')
    .map((s) => String(s || '').trim())
    .filter(Boolean);
}

/**
 * Return the signing secret (the first item) or null if none configured.
 */
function getSigningSecret() {
  const list = getJwtSecrets();
  return list.length ? list[0] : null;
}

module.exports = { getJwtSecrets, getSigningSecret };
