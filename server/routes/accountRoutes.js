const express = require('express');
const router = express.Router();
const Account = require('../models/Account');

// GET all account transactions
router.get('/', async (req, res) => {
  try {
    const accounts = await Account.find().sort({ transactionDate: -1 });
    res.json(accounts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch account data' });
  }
});

// POST a new transaction
router.post('/', async (req, res) => {
  try {
    const { type, transactionDate, meetingIds, eventIds, amount, username } = req.body;

    const newTransaction = new Account({
      type,
      transactionDate,
      meetingIds,
      eventIds,
      amount,
      username
    });

    await newTransaction.save();
    res.status(201).json({ message: 'Transaction added successfully', data: newTransaction });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add transaction', details: err.message });
  }
});

module.exports = router;
