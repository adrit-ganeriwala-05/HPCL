import { describe, it, expect } from 'vitest';
import { validate, buildPayload } from './contactFormLogic.js';

describe('validate', () => {
  it('flags every required field missing for a bare general enquiry', () => {
    const errors = validate('general', { name: '', phone: '', email: '', subject: '', message: '' });
    expect(errors.name).toBeTruthy();
    expect(errors.phone).toBeTruthy();
    expect(errors.subject).toBeTruthy();
    expect(errors.message).toBeTruthy();
    // Email is optional — blank shouldn't be flagged.
    expect(errors.email).toBeUndefined();
  });

  it('passes a fully filled general enquiry', () => {
    const errors = validate('general', {
      name: 'Ramesh Kumar',
      phone: '9876543210',
      email: 'ramesh@example.com',
      subject: 'Bulk order query',
      message: 'Need 10 drums of hydraulic oil.',
    });
    expect(errors).toEqual({});
  });

  it('rejects a malformed phone number', () => {
    const errors = validate('general', {
      name: 'Ramesh',
      phone: 'not-a-phone!!',
      subject: 'x',
      message: 'x',
    });
    expect(errors.phone).toBeTruthy();
  });

  it('rejects a malformed email but allows a blank one', () => {
    const withBadEmail = validate('general', {
      name: 'Ramesh', phone: '9876543210', subject: 'x', message: 'x', email: 'not-an-email',
    });
    expect(withBadEmail.email).toBeTruthy();

    const withNoEmail = validate('general', {
      name: 'Ramesh', phone: '9876543210', subject: 'x', message: 'x', email: '',
    });
    expect(withNoEmail.email).toBeUndefined();
  });

  it('requires dealer-specific fields for the dealer enquiry type', () => {
    const errors = validate('dealer', {});
    expect(errors.businessName).toBeTruthy();
    expect(errors.contactPerson).toBeTruthy();
    expect(errors.phone).toBeTruthy();
    expect(errors.city).toBeTruthy();
    // District and message are optional for dealer enquiries.
    expect(errors.district).toBeUndefined();
    expect(errors.message).toBeUndefined();
  });
});

describe('buildPayload', () => {
  it('maps dealer fields into the Lead payload shape, joining city + district into location', () => {
    const payload = buildPayload('dealer', {
      businessName: 'Kumar Traders',
      contactPerson: 'Ramesh Kumar',
      phone: '9876543210',
      email: 'ramesh@example.com',
      city: 'Andal',
      district: 'Paschim Bardhaman',
      businessType: 'Retail dealer',
      productInterest: 'Grease',
      volume: '10 drums/month',
      message: 'Looking to start a dealership.',
    });

    expect(payload.enquiryType).toBe('dealer');
    expect(payload.name).toBe('Ramesh Kumar');
    expect(payload.company).toBe('Kumar Traders');
    expect(payload.location).toBe('Andal, Paschim Bardhaman');
    expect(payload.productInterest).toBe('Grease');
    expect(payload.details).toContain('Current business type: Retail dealer');
    expect(payload.details).toContain('Expected requirement / order volume: 10 drums/month');
    expect(payload.details).toContain('Looking to start a dealership.');
  });

  it('omits blank optional parts from the composed details instead of leaving empty lines', () => {
    const payload = buildPayload('dealer', {
      businessName: 'Kumar Traders',
      contactPerson: 'Ramesh Kumar',
      phone: '9876543210',
      city: 'Andal',
      businessType: '',
      volume: '',
      message: 'Just a general question.',
    });
    expect(payload.details).toBe('Just a general question.');
  });

  it('prefixes the subject line for general enquiries', () => {
    const payload = buildPayload('general', {
      name: 'Ramesh',
      phone: '9876543210',
      email: '',
      subject: 'Stock availability',
      message: 'Do you have 20W-40 in stock?',
    });
    expect(payload.enquiryType).toBe('general');
    expect(payload.details).toBe('Subject: Stock availability\nDo you have 20W-40 in stock?');
    expect(payload.location).toBe('');
    expect(payload.productInterest).toBe('');
  });

  it('defaults to the general shape for an unrecognized type', () => {
    const payload = buildPayload('not-a-real-type', { name: 'X', phone: '1', message: 'm' });
    expect(payload.enquiryType).toBe('general');
  });
});
