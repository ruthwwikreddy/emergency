const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');

// Short, unique, alphanumeric ID (6-8 chars)
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 7);

const CardSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    uniqueId: { type: String, unique: true, index: true, default: () => nanoid() },
    insuranceStatus: { type: String, enum: ['Valid', 'Invalid', 'Expired'], required: true },
    preferredHospitals: { type: [String], default: [] },
    allergies: { type: [String], default: [] },
    familyDoctorName: { type: String, default: '' },
    bloodType: { type: String, required: true },
    currentMedication: { type: [String], default: [] },
    emergencyContactNumber: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Card', CardSchema);
