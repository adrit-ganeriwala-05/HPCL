import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../lib/api.js';
import { FIELD_SCHEMAS, PRODUCT_FIELD_OPTIONS, emptyValues, buildPayload, validate } from '../lib/contactFormLogic.js';
import Button from './Button.jsx';

export default function ContactForm({ initialType = 'general', initialProduct = '', focusOnMount = false, heading, description }) {
  // Type is decided entirely by the page/URL (Contact.jsx), not re-pickable
  // here — a second in-form selector duplicating that choice was making the
  // Enquiry and general Contact forms look identical.
  const type = initialType;
  const [values, setValues] = useState(() => {
    const matchesCategory = PRODUCT_FIELD_OPTIONS.includes(initialProduct);
    // A specific grade name (e.g. from the grade finder) won't match one of
    // the broad category options — carry it into the free-text field
    // instead of silently dropping it.
    const gradeHint = initialProduct && !matchesCategory ? `Grade of interest: ${initialProduct}` : '';
    return {
      ...emptyValues(),
      productInterest: matchesCategory ? initialProduct : '',
      orderQuery: gradeHint,
      message: gradeHint,
    };
  });
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  useEffect(() => {
    if (focusOnMount && formRef.current) {
      formRef.current.querySelector('input, select, textarea')?.focus();
    }
    // Only run on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/leads', payload, { auth: false }),
    onSuccess: () => {
      setValues(emptyValues());
      setErrors({});
    },
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((e2) => ({ ...e2, [name]: undefined }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const nextErrors = validate(type, values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      const firstKey = Object.keys(nextErrors)[0];
      formRef.current?.querySelector(`[name="${firstKey}"]`)?.focus();
      return;
    }
    mutation.mutate(buildPayload(type, values));
  }

  const schema = FIELD_SCHEMAS[type];

  return (
    <div className="border-2 border-hairline bg-surface p-7">
      <h2 className="text-[19px] font-bold text-text">{heading ?? 'Send an Enquiry'}</h2>
      <p className="mb-5 mt-1.5 text-[17.5px] text-text-muted">
        {description ?? "Fill in your requirement below and we'll get back to you."}
      </p>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {schema.map((field) => (
            <Field
              key={field.key}
              field={field}
              value={values[field.key]}
              error={errors[field.key]}
              onChange={handleChange}
            />
          ))}
        </div>

        <Button type="submit" disabled={mutation.isPending} className="w-full disabled:opacity-60">
          {mutation.isPending ? 'Submitting…' : 'Submit Enquiry'}
        </Button>

        <AnimatePresence>
          {mutation.isSuccess && (
            <motion.div
              role="status"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3.5 flex items-start gap-2 border border-success/30 bg-success/5 px-4 py-3.5 text-[17.5px] text-success"
            >
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
              Enquiry received. We&apos;ll get back to you shortly — for urgent orders, please call us directly.
            </motion.div>
          )}
          {mutation.isError && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3.5 flex items-start gap-2 border border-error/30 bg-error/5 px-4 py-3.5 text-[17.5px] text-error"
            >
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {mutation.error.message || 'Something went wrong. Please try again or call us directly.'}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}

function Field({ field, value, error, onChange }) {
  const id = `cf-${field.key}`;
  const wrapClass = field.wide ? '' : 'sm:col-span-2';
  const describedBy = error ? `${id}-error` : undefined;

  return (
    <div className={wrapClass}>
      <label htmlFor={id} className="mb-1.5 block text-[13.5px] font-semibold text-text-secondary">
        {field.label} {field.required && <span className="text-accent">*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          id={id}
          name={field.key}
          rows={4}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className="field-input resize-none"
        />
      ) : field.type === 'select' ? (
        <select
          id={id}
          name={field.key}
          value={value}
          onChange={onChange}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className="field-input"
        >
          <option value="">Select an option</option>
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={field.key}
          type={field.type ?? 'text'}
          value={value}
          onChange={onChange}
          placeholder={field.placeholder}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className="field-input"
        />
      )}

      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[13.5px] text-error">
          {error}
        </p>
      )}
    </div>
  );
}
