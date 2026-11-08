import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ExternalLink, PhoneCall, RotateCcw, ShieldCheck } from 'lucide-react';
import {
  RECOMMENDER_SECTORS,
  RECOMMENDER_CATEGORIES,
  RECOMMENDER_CONDITIONS,
  findGrades,
  describeFit,
  hpclSearchLink,
} from '../lib/hpclCatalog.js';
import Button from './Button.jsx';

const stepVariants = {
  enter: { opacity: 0, x: 16 },
  center: { opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.22, 0.9, 0.3, 1] } },
  exit: { opacity: 0, x: -16, transition: { duration: 0.18, ease: [0.22, 0.9, 0.3, 1] } },
};

const STEP_LABELS = ['Sector', 'Category', 'Condition', 'Recommendation'];

export default function RecommenderWizard() {
  const [step, setStep] = useState(1);
  const [sector, setSector] = useState(null);
  const [category, setCategory] = useState(null);
  const [condition, setCondition] = useState(null);

  function reset() {
    setStep(1);
    setSector(null);
    setCategory(null);
    setCondition(null);
  }

  return (
    <div className="border-2 border-hairline bg-surface p-7 sm:p-9">
      <div className="mb-8 flex items-center gap-2">
        {STEP_LABELS.map((label, i) => {
          const n = i + 1;
          const active = n <= step;
          return (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm font-mono text-[13.5px] font-semibold transition-colors ${
                    active ? 'bg-brand text-white' : 'bg-bg text-text-muted'
                  }`}
                >
                  {n}
                </div>
                <span className={`hidden text-[13.5px] font-semibold sm:inline ${active ? 'text-text' : 'text-text-muted'}`}>
                  {label}
                </span>
              </div>
              {n < STEP_LABELS.length && <div className={`h-px flex-1 ${n < step ? 'bg-brand' : 'bg-hairline'}`} />}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" variants={stepVariants} initial="enter" animate="center" exit="exit">
            <h3 className="text-[20px] font-bold text-text">What kind of lubrication do you need?</h3>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {RECOMMENDER_SECTORS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setSector(s.id);
                    setCategory(null);
                    setCondition(null);
                    setStep(2);
                  }}
                  className="border-2 border-hairline bg-surface px-4 py-5 text-center text-[17.5px] font-semibold text-text-secondary transition-colors hover:border-brand hover:text-text"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 2 && sector && (
          <motion.div key="step2" variants={stepVariants} initial="enter" animate="center" exit="exit">
            <h3 className="text-[20px] font-bold text-text">Which category fits your equipment?</h3>
            <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {RECOMMENDER_CATEGORIES[sector].map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCategory(c.id);
                    setCondition(null);
                    setStep(3);
                  }}
                  className="border-2 border-hairline bg-surface px-4 py-3.5 text-left text-[17.5px] font-medium text-text-secondary transition-colors hover:border-brand hover:text-text"
                >
                  {c.label}
                </button>
              ))}
            </div>
            <BackLink onClick={() => setStep(1)} />
          </motion.div>
        )}

        {step === 3 && sector && category && (
          <motion.div key="step3" variants={stepVariants} initial="enter" animate="center" exit="exit">
            <h3 className="text-[20px] font-bold text-text">Any specific operating condition?</h3>
            <div className="mt-5 grid grid-cols-1 gap-2.5">
              {RECOMMENDER_CONDITIONS.map((cond) => (
                <button
                  key={cond.id}
                  onClick={() => {
                    setCondition(cond.id);
                    setStep(4);
                  }}
                  className="border-2 border-hairline bg-surface px-4 py-3 text-left transition-colors hover:border-brand"
                >
                  <div className="text-[17.5px] font-semibold text-text">{cond.label}</div>
                  <div className="mt-0.5 text-[14.5px] text-text-muted">{cond.description}</div>
                </button>
              ))}
            </div>
            <BackLink onClick={() => setStep(2)} />
          </motion.div>
        )}

        {step === 4 && sector && category && condition && (
          <motion.div key="step4" variants={stepVariants} initial="enter" animate="center" exit="exit">
            <Results sector={sector} category={category} condition={condition} onBack={() => setStep(3)} onReset={reset} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BackLink({ onClick }) {
  return (
    <button onClick={onClick} className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-text-muted hover:text-text">
      <ArrowLeft size={14} /> Back
    </button>
  );
}

function Results({ sector, category, condition, onBack, onReset }) {
  const categoryLabel = RECOMMENDER_CATEGORIES[sector].find((c) => c.id === category)?.label ?? category;
  const { matches, isExact, poolSize } = findGrades({ sector, category, condition });
  const [primary, ...alternates] = matches;

  return (
    <div>
      <h3 className="text-[20px] font-bold text-text">Grade Suggestion</h3>
      <p className="mt-1.5 text-[17.5px] text-text-muted">For {categoryLabel.toLowerCase()} equipment.</p>

      <div className="mt-5">
        {!primary && (
          <div className="border-2 border-hairline bg-bg p-5 text-[17.5px] leading-relaxed text-text-secondary">
            We don&apos;t have a listed grade for that exact combination — call us directly and we&apos;ll
            match one from the full HPCL range.
          </div>
        )}

        {primary && (
          <>
            {!isExact && (
              <p className="mb-3 text-[14.5px] text-text-muted">
                No exact match for that condition — showing the closest standard-duty grades in this category
                instead. Confirm the special requirement with our team before ordering.
              </p>
            )}

            <GradeCard grade={primary} categoryLabel={categoryLabel} condition={condition} primary />

            {alternates.length > 0 && (
              <div className="mt-3 space-y-3">
                {alternates.map((g) => (
                  <GradeCard key={g.name} grade={g} categoryLabel={categoryLabel} condition={condition} />
                ))}
              </div>
            )}

            {poolSize > matches.length && (
              <p className="mt-3 text-[14.5px] text-text-muted">
                {poolSize - matches.length} more grade{poolSize - matches.length === 1 ? '' : 's'} in this
                category — ask our team for the full list.
              </p>
            )}
          </>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button href="tel:+919735496000" variant="primary">
          <PhoneCall size={16} /> Call for This Grade
        </Button>
        {primary && (
          <Button to={`/contact?type=order-stock&product=${encodeURIComponent(primary.name)}`} variant="outline">
            Confirm Stock &amp; Get Quote
          </Button>
        )}
      </div>

      <div className="mt-5 flex gap-4">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-text-muted hover:text-text">
          <ArrowLeft size={14} /> Back
        </button>
        <button onClick={onReset} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-text-muted hover:text-text">
          <RotateCcw size={14} /> Start Over
        </button>
      </div>
    </div>
  );
}

function GradeCard({ grade, categoryLabel, condition, primary = false }) {
  return (
    <div className={`border-2 p-4 ${primary ? 'border-brand bg-bg' : 'border-hairline bg-bg'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {primary && <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-brand">Primary</span>}
          {grade.defence && (
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <ShieldCheck size={12} /> Defence Spec
            </span>
          )}
        </div>
        <a
          href={hpclSearchLink(grade.name)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-accent hover:underline"
        >
          HPCL Reference <ExternalLink size={12} />
        </a>
      </div>
      <div className="mt-1 text-[17.5px] font-semibold text-text">{grade.name}</div>
      <p className="mt-1.5 text-[15px] leading-relaxed text-text-secondary">{describeFit(grade, categoryLabel, condition)}</p>
    </div>
  );
}
