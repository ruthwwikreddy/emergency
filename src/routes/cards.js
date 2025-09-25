const express = require('express');
const router = express.Router();
const Card = require('../models/Card');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
let parseCsvSync;

// Create a new emergency card
router.post('/', async (req, res) => {
  try {
    const {
      fullName,
      insuranceStatus,
      preferredHospitals = '',
      allergies = '',
      familyDoctorName = '',
      bloodType,
      currentMedication = '',
      emergencyContactNumber,
      vehicleLast4,
    } = req.body;

    // Normalize inputs (accept comma-separated strings or arrays)
    const toArray = (val) => {
      if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
      if (typeof val === 'string') return val.split(',').map((v) => v.trim()).filter(Boolean);
      return [];
    };

    // Validate vehicleLast4 (last 4 digits)
    const last4 = String(vehicleLast4 || '').trim();
    if (!/^\d{4}$/.test(last4)) {
      return res.status(400).json({ message: 'vehicleLast4 must be exactly 4 digits' });
    }

    const card = await Card.create({
      fullName,
      insuranceStatus,
      preferredHospitals: toArray(preferredHospitals),
      allergies: toArray(allergies),
      familyDoctorName,
      bloodType,
      currentMedication: toArray(currentMedication),
      emergencyContactNumber,
      vehicleLast4: last4,
    });

    return res.status(201).json(card);
  } catch (err) {
    console.error('Create card error:', err);
    return res.status(400).json({ message: 'Unable to create card', error: err.message });
  }
});

// Bulk create via JSON array: [{...}, {...}]
router.post('/bulk', async (req, res) => {
  try {
    const payload = Array.isArray(req.body) ? req.body : req.body.records;
    if (!Array.isArray(payload) || payload.length === 0) {
      return res.status(400).json({ message: 'Provide an array of records in request body or under records[]' });
    }

    const toArray = (val) => {
      if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
      if (typeof val === 'string') return val.split(',').map((v) => v.trim()).filter(Boolean);
      return [];
    };

    const docs = payload.map((r) => ({
      fullName: r.fullName,
      insuranceStatus: r.insuranceStatus,
      preferredHospitals: toArray(r.preferredHospitals || ''),
      allergies: toArray(r.allergies || ''),
      familyDoctorName: r.familyDoctorName || '',
      bloodType: r.bloodType,
      currentMedication: toArray(r.currentMedication || ''),
      emergencyContactNumber: r.emergencyContactNumber,
    }));

    const inserted = await Card.insertMany(docs, { ordered: false });
    return res.status(201).json({ count: inserted.length, records: inserted.map((d) => ({ id: d.uniqueId, fullName: d.fullName })) });
  } catch (err) {
    console.error('Bulk create error:', err);
    return res.status(400).json({ message: 'Bulk insert failed', error: err.message });
  }
});

// Bulk upload via file (CSV or JSON)
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded. Use field name "file".' });
    const name = (req.file.originalname || '').toLowerCase();
    const buf = req.file.buffer.toString('utf8');

    let records = [];
    if (name.endsWith('.json')) {
      const parsed = JSON.parse(buf);
      records = Array.isArray(parsed) ? parsed : parsed.records;
    } else {
      // CSV path
      if (!parseCsvSync) {
        try {
          parseCsvSync = require('csv-parse/sync').parse;
        } catch (e) {
          return res.status(500).json({ message: 'CSV parsing module not available' });
        }
      }
      const rows = parseCsvSync(buf, { columns: true, skip_empty_lines: true, trim: true });
      records = rows;
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'No records found in file' });
    }

    const toArray = (val) => {
      if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean);
      if (typeof val === 'string') return val.split(',').map((v) => v.trim()).filter(Boolean);
      return [];
    };

    const docs = records.map((r) => ({
      fullName: r.fullName,
      insuranceStatus: r.insuranceStatus,
      preferredHospitals: toArray(r.preferredHospitals || ''),
      allergies: toArray(r.allergies || ''),
      familyDoctorName: r.familyDoctorName || '',
      bloodType: r.bloodType,
      currentMedication: toArray(r.currentMedication || ''),
      emergencyContactNumber: r.emergencyContactNumber,
    }));

    const inserted = await Card.insertMany(docs, { ordered: false });
    return res.status(201).json({ count: inserted.length, records: inserted.map((d) => ({ id: d.uniqueId, fullName: d.fullName })) });
  } catch (err) {
    console.error('Bulk upload error:', err);
    return res.status(400).json({ message: 'Bulk upload failed', error: err.message });
  }
});

// Get card by unique ID
router.get('/:id', async (req, res) => {
  try {
    const v4 = String(req.query.v4 || '').trim();
    if (!/^\d{4}$/.test(v4)) {
      return res.status(400).json({ message: 'Missing or invalid passcode. Provide last 4 digits as v4 query parameter.' });
    }
    const card = await Card.findOne({ uniqueId: req.params.id, vehicleLast4: v4 }).lean();
    if (!card) return res.status(404).json({ message: 'Card not found or passcode incorrect' });
    return res.json(card);
  } catch (err) {
    console.error('Fetch card error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
