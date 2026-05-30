const MIN_JWT_SECRET_LENGTH = 32;
const DISALLOWED_JWT_SECRETS = new Set(['dev-secret-change-in-production']);

function readJwtSecret(): string {
  const rawSecret = process.env.JWT_SECRET;
  if (typeof rawSecret !== 'string') {
    throw new Error('JWT_SECRET is required');
  }

  const secret = rawSecret.trim();
  if (secret.length < MIN_JWT_SECRET_LENGTH || DISALLOWED_JWT_SECRETS.has(secret)) {
    throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters and not use placeholder values`);
  }

  return secret;
}

export const JWT_SECRET = readJwtSecret();
