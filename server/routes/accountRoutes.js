const express = require('express');
const router = express.Router();
const Account = require('../models/Account');
const PaymentSettings = require('../models/PaymentSettings');
const { requireAdmin, requireAuth } = require('../middleware/auth');

router.use(requireAuth);

const PAYMENT_SETTINGS_KEY = 'community-donation';

const DEFAULT_PAYMENT_SETTINGS = {
  _id: PAYMENT_SETTINGS_KEY,
  accountHolderName: 'Neighborly Community Welfare Association',
  bankName: 'HDFC Bank',
  accountNumber: '50200012345678',
  ifscCode: 'HDFC0001234',
  branchName: 'Greenwood Residency Branch',
  upiId: 'neighborlycommunity@upi',
  upiDisplayName: 'Neighborly Community Welfare',
  paymentNote: 'Mention your flat number and purpose, for example: A-102 donation.',
  updatedBy: 'system-default',
};

function normalizePaymentSettings(body, username) {
  return {
    _id: PAYMENT_SETTINGS_KEY,
    accountHolderName: String(body.accountHolderName || '').trim(),
    bankName: String(body.bankName || '').trim(),
    accountNumber: String(body.accountNumber || '').replace(/\s/g, ''),
    ifscCode: String(body.ifscCode || '').trim().toUpperCase(),
    branchName: String(body.branchName || '').trim(),
    upiId: String(body.upiId || '').trim().toLowerCase(),
    upiDisplayName: String(body.upiDisplayName || '').trim(),
    paymentNote: String(body.paymentNote || '').trim(),
    updatedBy: username,
  };
}

function validatePaymentSettings(payload) {
  const errors = [];

  if (payload.accountNumber && !/^[0-9]{6,20}$/.test(payload.accountNumber)) {
    errors.push('Account number must be 6 to 20 digits');
  }

  if (payload.accountNumber) {
    if (!payload.accountHolderName) errors.push('Account holder name is required for bank transfers');
    if (!payload.bankName) errors.push('Bank name is required for bank transfers');
    if (!payload.ifscCode) errors.push('IFSC code is required for bank transfers');
  }

  if (payload.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(payload.ifscCode)) {
    errors.push('IFSC code must be valid');
  }

  if (payload.upiId && !/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/.test(payload.upiId)) {
    errors.push('UPI ID must be valid');
  }

  if (!payload.upiId && !payload.accountNumber) {
    errors.push('Add either UPI ID or bank account number');
  }

  return errors;
}

// GET all account transactions
router.get('/', async (req, res) => {
  try {
    const accounts = await Account.find().sort({ transactionDate: -1 });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch account data' });
  }
});

router.get('/payment-settings', async (_req, res) => {
  try {
    const settings = await PaymentSettings.findById(PAYMENT_SETTINGS_KEY).lean();
    res.json(settings || DEFAULT_PAYMENT_SETTINGS);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch payment settings' });
  }
});

router.put('/payment-settings', requireAdmin, async (req, res) => {
  try {
    const payload = normalizePaymentSettings(req.body, req.user.username);
    const errors = validatePaymentSettings(payload);

    if (errors.length) {
      return res.status(400).json({ error: errors.join(', ') });
    }

    const settings = await PaymentSettings.findByIdAndUpdate(
      PAYMENT_SETTINGS_KEY,
      payload,
      { new: true, runValidators: true, upsert: true }
    );

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update payment settings', details: err.message });
  }
});

// POST a new transaction
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { transactionDate, meetingIds, eventIds, amount, username } = req.body;
    const type = req.body.type || req.body.transactionType;

    if (!['Credited', 'Debited'].includes(type) || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid type and amount are required' });
    }

    const newTransaction = new Account({
      type,
      transactionDate,
      meetingIds,
      eventIds,
      amount: Number(amount),
      username
    });

    await newTransaction.save();
    res.status(201).json({ message: 'Transaction added successfully', data: newTransaction });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add transaction', details: err.message });
  }
});

module.exports = router;
