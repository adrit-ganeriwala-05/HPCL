import { PRODUCT_CATEGORIES } from './content.js';

// Pure form logic — field schemas, validation, and payload shaping — kept
// separate from ContactForm.jsx's rendering so it's testable without
// pulling in React, Framer Motion, TanStack Query, or the API client (which
// itself touches the auth store / localStorage). None of that belongs in a
// unit test for "does this phone regex work."

export const PRODUCT_FIELD_OPTIONS = [...PRODUCT_CATEGORIES, 'Not sure — need advice'];

const PHONE_RE = /^[0-9+\-\s()]{7,15}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Field schemas are data-driven so each enquiry type renders a different
// form without four near-duplicate JSX blocks.
export const FIELD_SCHEMAS = {
  dealer: [
    { key: 'businessName', label: 'Business Name', required: true, wide: true },
    { key: 'contactPerson', label: 'Contact Person', required: true, wide: true },
    { key: 'phone', label: 'Phone Number', type: 'tel', required: true, wide: true, placeholder: '10-digit mobile number' },
    { key: 'email', label: 'Email Address', type: 'email', wide: true, placeholder: 'you@company.com' },
    { key: 'city', label: 'City', required: true, wide: true },
    { key: 'district', label: 'District / State', wide: true },
    { key: 'companyAddress', label: 'Company Address', wide: true, placeholder: 'Registered business address' },
    { key: 'businessType', label: 'Current Business Type', wide: true, placeholder: 'e.g. retail dealer, workshop, distributor' },
    { key: 'productInterest', label: 'Products / Lubricant Categories of Interest', type: 'select', options: PRODUCT_FIELD_OPTIONS, wide: true },
    { key: 'volume', label: 'Expected Requirement / Order Volume', wide: true, placeholder: 'e.g. 10 drums per month' },
    { key: 'message', label: 'Message', type: 'textarea' },
  ],
  'order-stock': [
    { key: 'name', label: 'Name', required: true, wide: true },
    { key: 'company', label: 'Business / Dealership Name', wide: true },
    { key: 'companyAddress', label: 'Company Address', wide: true, placeholder: 'Delivery or billing address' },
    { key: 'phone', label: 'Phone Number', type: 'tel', required: true, wide: true, placeholder: '10-digit mobile number' },
    { key: 'email', label: 'Email Address', type: 'email', wide: true, placeholder: 'you@company.com' },
    { key: 'productInterest', label: 'Product / Grade', type: 'select', options: PRODUCT_FIELD_OPTIONS, wide: true },
    { key: 'orderQuery', label: 'Order or Stock Query', wide: true, placeholder: 'e.g. order status, availability of a grade' },
    { key: 'message', label: 'Message', type: 'textarea' },
  ],
  institution: [
    { key: 'organisation', label: 'Organisation Name', required: true, wide: true },
    { key: 'contactPerson', label: 'Contact Person', required: true, wide: true },
    { key: 'phone', label: 'Phone Number', type: 'tel', required: true, wide: true, placeholder: '10-digit mobile number' },
    { key: 'email', label: 'Email Address', type: 'email', wide: true, placeholder: 'you@company.com' },
    { key: 'city', label: 'City', wide: true },
    { key: 'companyAddress', label: 'Company Address', wide: true, placeholder: 'Plant / site / registered office address' },
    { key: 'institutionType', label: 'Type of Institution', wide: true, placeholder: 'e.g. mine, plant, power station' },
    { key: 'message', label: 'Requirement Details', type: 'textarea', required: true },
  ],
  general: [
    { key: 'name', label: 'Name', required: true, wide: true },
    { key: 'companyName', label: 'Company Name', wide: true },
    { key: 'companyAddress', label: 'Company Address', wide: true },
    { key: 'phone', label: 'Phone Number', type: 'tel', required: true, wide: true, placeholder: '10-digit mobile number' },
    { key: 'email', label: 'Email Address', type: 'email', wide: true, placeholder: 'you@company.com' },
    { key: 'subject', label: 'Subject', required: true, wide: true },
    { key: 'message', label: 'Message', type: 'textarea', required: true },
  ],
};

export function emptyValues() {
  return {
    businessName: '', contactPerson: '', phone: '', email: '', city: '', district: '',
    businessType: '', productInterest: '', volume: '', name: '', company: '', orderQuery: '',
    organisation: '', institutionType: '', subject: '', message: '',
    companyName: '', companyAddress: '',
  };
}

function composeDetails(parts) {
  return parts.filter(Boolean).join('\n');
}

export function buildPayload(type, v) {
  switch (type) {
    case 'dealer':
      return {
        name: v.contactPerson,
        company: v.businessName,
        companyAddress: v.companyAddress,
        phone: v.phone,
        email: v.email,
        location: [v.city, v.district].filter(Boolean).join(', '),
        enquiryType: 'dealer',
        productInterest: v.productInterest,
        details: composeDetails([
          v.businessType && `Current business type: ${v.businessType}`,
          v.volume && `Expected requirement / order volume: ${v.volume}`,
          v.message,
        ]),
      };
    case 'order-stock':
      return {
        name: v.name,
        company: v.company,
        companyAddress: v.companyAddress,
        phone: v.phone,
        email: v.email,
        location: '',
        enquiryType: 'order-stock',
        productInterest: v.productInterest,
        details: composeDetails([v.orderQuery && `Query: ${v.orderQuery}`, v.message]),
      };
    case 'institution':
      return {
        name: v.contactPerson,
        company: v.organisation,
        companyAddress: v.companyAddress,
        phone: v.phone,
        email: v.email,
        location: v.city,
        enquiryType: 'institution',
        productInterest: '',
        details: composeDetails([v.institutionType && `Type of institution: ${v.institutionType}`, v.message]),
      };
    default:
      return {
        name: v.name,
        company: v.companyName,
        companyAddress: v.companyAddress,
        phone: v.phone,
        email: v.email,
        location: '',
        enquiryType: 'general',
        productInterest: '',
        details: composeDetails([v.subject && `Subject: ${v.subject}`, v.message]),
      };
  }
}

export function validate(type, v) {
  const errors = {};
  const schema = FIELD_SCHEMAS[type];
  for (const field of schema) {
    if (field.required && !v[field.key]?.trim()) {
      errors[field.key] = `${field.label} is required.`;
    }
  }
  if (v.phone && !PHONE_RE.test(v.phone)) {
    errors.phone = 'Enter a valid phone number.';
  }
  if (v.email && !EMAIL_RE.test(v.email)) {
    errors.email = 'Enter a valid email address, or leave it blank.';
  }
  return errors;
}
