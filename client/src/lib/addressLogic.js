// Pure address-form logic, kept out of ManageAddresses.jsx so it's testable
// without React or the API client (same split as contactFormLogic.js).

export const EMPTY_ADDRESS = {
  label: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
};

// line2 is the only optional text field. Messages are shown under each input.
const REQUIRED_MESSAGES = {
  label: 'Give this address a name, e.g. "Main Warehouse".',
  line1: 'Address line 1 is required.',
  city: 'City is required.',
  state: 'State is required.',
  pincode: 'PIN code is required.',
};

// Indian PIN code: exactly six digits.
const PINCODE_RE = /^\d{6}$/;

// Returns { field: message } for every problem; an empty object means valid.
// Values are trimmed first, so "   " counts as missing — the server's
// "required" check only rejects empty strings, not whitespace.
export function validateAddress(form) {
  const errors = {};
  for (const [key, message] of Object.entries(REQUIRED_MESSAGES)) {
    if (!String(form[key] ?? '').trim()) errors[key] = message;
  }
  const pincode = String(form.pincode ?? '').trim();
  if (pincode && !PINCODE_RE.test(pincode)) {
    errors.pincode = 'PIN code must be exactly 6 digits.';
  }
  return errors;
}

// The request body for POST/PUT /profile/addresses: just the editable
// fields, trimmed, so stray spaces never get saved.
export function toAddressPayload(form) {
  return {
    label: String(form.label ?? '').trim(),
    line1: String(form.line1 ?? '').trim(),
    line2: String(form.line2 ?? '').trim(),
    city: String(form.city ?? '').trim(),
    state: String(form.state ?? '').trim(),
    pincode: String(form.pincode ?? '').trim(),
    isDefault: Boolean(form.isDefault),
  };
}
