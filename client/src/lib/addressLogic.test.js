import { describe, it, expect } from 'vitest';
import { validateAddress, toAddressPayload } from './addressLogic.js';

const valid = {
  label: 'Main Warehouse',
  line1: 'Plot 14, Industrial Area',
  line2: '',
  city: 'Durgapur',
  state: 'West Bengal',
  pincode: '713212',
  isDefault: false,
};

describe('validateAddress', () => {
  it('accepts a complete address', () => {
    expect(validateAddress(valid)).toEqual({});
  });

  it('treats line2 as optional', () => {
    expect(validateAddress({ ...valid, line2: undefined })).toEqual({});
  });

  it.each(['label', 'line1', 'city', 'state', 'pincode'])('flags a missing %s and nothing else', (field) => {
    const errors = validateAddress({ ...valid, [field]: '' });
    expect(Object.keys(errors)).toEqual([field]);
    expect(errors[field]).toBeTruthy();
  });

  it.each(['71321', '7132123', '71321a', '713 212', 'abcdef'])('rejects the bad PIN code %j', (pincode) => {
    const errors = validateAddress({ ...valid, pincode });
    expect(errors.pincode).toMatch(/6 digits/);
  });

  it('treats whitespace-only values as missing', () => {
    const blank = { label: '   ', line1: '\t', line2: '  ', city: ' ', state: '\n', pincode: '   ' };
    const errors = validateAddress(blank);
    expect(Object.keys(errors).sort()).toEqual(['city', 'label', 'line1', 'pincode', 'state']);
    // Blank pincode should get the "required" message, not the format one.
    expect(errors.pincode).toMatch(/required/);
  });

  it('accepts a PIN code with surrounding spaces', () => {
    expect(validateAddress({ ...valid, pincode: ' 713212 ' })).toEqual({});
  });
});

describe('toAddressPayload', () => {
  it('trims every text field and keeps isDefault a boolean', () => {
    const payload = toAddressPayload({
      label: ' Site Office ',
      line1: ' Gate 2 ',
      line2: '  ',
      city: ' Andal ',
      state: ' West Bengal ',
      pincode: ' 713321 ',
      isDefault: true,
    });
    expect(payload).toEqual({
      label: 'Site Office',
      line1: 'Gate 2',
      line2: '',
      city: 'Andal',
      state: 'West Bengal',
      pincode: '713321',
      isDefault: true,
    });
  });

  it('drops server-only fields like id and userId', () => {
    const payload = toAddressPayload({ ...valid, id: 7, userId: 3, createdAt: 'x', updatedAt: 'y' });
    expect(Object.keys(payload).sort()).toEqual(['city', 'isDefault', 'label', 'line1', 'line2', 'pincode', 'state']);
  });
});
