const jwt = require('jsonwebtoken');
const crypto = require('crypto');

let generatedDevelopmentSecret;
const MIN_JWT_SECRET_LENGTH = 32;
const PLACEHOLDER_SECRETS = new Set([
  'replace-with-a-long-random-secret',
  'change-me',
  'secret',
  'jwt-secret',
  'neighborly-development-secret',
]);

function isStrongSecret(secret) {
  const normalized = String(secret || '').trim();
  return normalized.length >= MIN_JWT_SECRET_LENGTH && !PLACEHOLDER_SECRETS.has(normalized.toLowerCase());
}

function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();

  if (secret) {
    if (process.env.NODE_ENV === 'production' && !isStrongSecret(secret)) {
      throw new Error(`JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters and cannot be a placeholder value`);
    }

    if (!isStrongSecret(secret)) {
      console.warn(`JWT_SECRET is weak. Use at least ${MIN_JWT_SECRET_LENGTH} random characters before deployment.`);
    }

    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required');
  }

  if (!generatedDevelopmentSecret) {
    generatedDevelopmentSecret = crypto.randomBytes(32).toString('hex');
    console.warn('JWT_SECRET is missing. Using a temporary development-only secret.');
  }

  return generatedDevelopmentSecret;
}

function signAuthToken(user) {
  return jwt.sign(
    {
      username: user.username,
      userType: user.userType,
    },
    getJwtSecret(),
    {
      subject: String(user.id),
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    }
  );
}

async function requireAuth(req, res, next) {
  const authHeader = req.get('authorization') || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.userType === 'local') {
      const LocalUser = require('../models/LocalUser');
      const activeUser = await LocalUser.exists({
        _id: payload.sub,
        isRemoved: { $ne: true },
        loginDisabled: { $ne: true },
      });

      if (!activeUser) {
        return res.status(401).json({ error: 'Account access has been removed' });
      }
    }

    req.user = {
      id: payload.sub,
      username: payload.username,
      userType: payload.userType,
      isAdmin: payload.userType === 'admin',
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  return next();
}

function requireSelfOrAdmin(paramName = 'username') {
  return (req, res, next) => {
    if (req.user?.isAdmin || req.user?.username === req.params[paramName]) {
      return next();
    }

    return res.status(403).json({ error: 'Access denied' });
  };
}

function validateAuthConfig() {
  getJwtSecret();
}

module.exports = {
  requireAdmin,
  requireAuth,
  requireSelfOrAdmin,
  signAuthToken,
  validateAuthConfig,
};
