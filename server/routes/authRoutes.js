const express = require('express');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const router = express.Router();
const Admin = require('../models/Admin');
const LocalUser = require('../models/LocalUser');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const AccessRequest = require('../models/AccessRequest');
const { requireAuth, signAuthToken } = require('../middleware/auth');
const { hashPassword, verifyPassword } = require('../utils/password');
const { escapeHtml, getAdminEmailList, isMailConfigured, sendMail } = require('../utils/mailer');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

const publicMailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

function buildSession(user, userType) {
  const authUser = {
    id: user._id,
    username: user.username,
    userType,
  };

  return {
    token: signAuthToken(authUser),
    userType,
    username: user.username,
  };
}

function normalizeIdentifier(value) {
  return String(value || '').trim().toLowerCase();
}

function isEmail(value) {
  return /.+@.+\..+/.test(String(value || '').trim());
}

function isPhone(value) {
  return /^[0-9]{10}$/.test(String(value || '').trim());
}

function hashOtp(otp) {
  const secret = process.env.RESET_OTP_SECRET || process.env.JWT_SECRET || 'neighborly-development-reset-secret';
  return crypto.createHash('sha256').update(`${otp}:${secret}`).digest('hex');
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function findUserByIdentifier(identifier) {
  const rawValue = String(identifier || '').trim();
  const emailValue = normalizeIdentifier(rawValue);
  const query = isEmail(rawValue)
    ? { email: emailValue }
    : { username: rawValue };

  const admin = await Admin.findOne(query);
  if (admin) {
    return { user: admin, userType: 'admin', Model: Admin };
  }

  const localUser = await LocalUser.findOne({
    ...query,
    isRemoved: { $ne: true },
    loginDisabled: { $ne: true },
  });
  if (localUser) {
    return { user: localUser, userType: 'local', Model: LocalUser };
  }

  return null;
}

async function findUserByUsername(username) {
  const admin = await Admin.findOne({ username }).select('+password');

  if (admin) {
    return { user: admin, userType: 'admin' };
  }

  const localUser = await LocalUser.findOne({
    username,
    isRemoved: { $ne: true },
    loginDisabled: { $ne: true },
  }).select('+password');

  if (localUser) {
    return { user: localUser, userType: 'local' };
  }

  return null;
}

// POST /api/login
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const result = await findUserByUsername(username);

    if (!result) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { user, userType } = result;
    const passwordResult = await verifyPassword(password, user.password);

    if (!passwordResult.isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (passwordResult.needsRehash) {
      await user.constructor.updateOne(
        { _id: user._id },
        { $set: { password: await hashPassword(password) } }
      );
    }

    return res.json(buildSession(user, userType));
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

router.post('/password-reset/request', publicMailLimiter, async (req, res) => {
  const identifier = req.body.usernameOrEmail || req.body.identifier;

  if (!identifier) {
    return res.status(400).json({ error: 'Username or email is required' });
  }

  try {
    const result = await findUserByIdentifier(identifier);

    if (result?.user?.email) {
      const otp = generateOtp();
      await PasswordResetOtp.deleteMany({
        userId: result.user._id,
        userType: result.userType,
        usedAt: { $exists: false },
      });

      await PasswordResetOtp.create({
        userId: result.user._id,
        userType: result.userType,
        otpHash: hashOtp(otp),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      await sendMail({
        to: result.user.email,
        subject: 'Neighborly password reset OTP',
        text: `Your Neighborly password reset OTP is ${otp}. It expires in 10 minutes.`,
        html: `
          <h2>Password reset</h2>
          <p>Your Neighborly password reset OTP is:</p>
          <p style="font-size:24px;font-weight:700;letter-spacing:4px">${otp}</p>
          <p>This OTP expires in 10 minutes.</p>
        `,
      });
    }

    return res.json({
      message: 'If an account matches these details, a reset OTP has been emailed.',
      mailConfigured: isMailConfigured(),
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to process password reset request' });
  }
});

router.post('/password-reset/confirm', publicMailLimiter, async (req, res) => {
  const identifier = req.body.usernameOrEmail || req.body.identifier;
  const { otp, newPassword, confirmPassword } = req.body;

  if (!identifier || !otp || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Username/email, OTP, new password, and confirmation are required' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New password and confirmation do not match' });
  }

  if (String(newPassword).length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  try {
    const result = await findUserByIdentifier(identifier);
    if (!result) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const reset = await PasswordResetOtp.findOne({
      userId: result.user._id,
      userType: result.userType,
      usedAt: { $exists: false },
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!reset || reset.attempts >= 5) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (reset.otpHash !== hashOtp(String(otp).trim())) {
      reset.attempts += 1;
      await reset.save();
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    await result.Model.updateOne(
      { _id: result.user._id },
      { $set: { password: await hashPassword(newPassword) } }
    );

    reset.usedAt = new Date();
    await reset.save();

    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to reset password' });
  }
});

router.post('/access-requests', publicMailLimiter, async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeIdentifier(req.body.email);
  const phoneNumber = String(req.body.phoneNumber || '').replace(/\D/g, '').slice(0, 10);
  const address = String(req.body.address || '').trim();
  const message = String(req.body.message || '').trim();

  if (!name || !isEmail(email) || !isPhone(phoneNumber) || !address) {
    return res.status(400).json({ error: 'Name, valid email, 10-digit phone number, and address are required' });
  }

  try {
    const request = await AccessRequest.create({
      name,
      email,
      phoneNumber,
      address,
      message,
    });

    const admins = await getAdminEmailList();
    const mail = await sendMail({
      bcc: admins,
      subject: 'New Neighborly access request',
      text: [
        'A resident requested Neighborly access.',
        '',
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phoneNumber}`,
        `Address: ${address}`,
        message ? `Message: ${message}` : '',
      ].filter(Boolean).join('\n'),
      html: `
        <h2>New Neighborly access request</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Phone:</strong> ${escapeHtml(phoneNumber)}</p>
        <p><strong>Address:</strong> ${escapeHtml(address)}</p>
        ${message ? `<p><strong>Message:</strong> ${escapeHtml(message)}</p>` : ''}
      `,
    });

    return res.status(201).json({
      message: 'Access request submitted.',
      requestId: request._id,
      mail,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Unable to submit access request' });
  }
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    username: req.user.username,
    userType: req.user.userType,
  });
});

module.exports = router;
