import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ExternalLink, Search, ShieldCheck, X } from 'lucide-react';
import PageWrapper from '../components/PageWrapper.jsx';
import Section from '../components/layout/Section.jsx';
import Container from '../components/layout/Container.jsx';
import Button from '../components/Button.jsx';
import { HPCL_DIRECTORY, RECOMMENDER_SECTORS, RECOMMENDER_CONDITIONS, hpclSearchLink } from '../lib/hpclCatalog.js';
import { CATEGORY_LABELS } from '../lib/hpclSearch.js';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';

const CONDITION_LABELS = Object.fromEntries(RECOMMENDER_CONDITIONS.map((c) => [c.id, c.label]));

function gradeBoxId(name) {
  return `grade-box-${name}`;
}

export default function ProductCategory() {
  const { sectorId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState('');

  const sectorMeta = RECOMMENDER_SECTORS.find((s) => s.id === sectorId);
  const sectorData = HPCL_DIRECTORY.find((s) => s.id === sectorId);

  useDocumentTitle(`${sectorMeta?.label ?? 'Grades'} — M/s Jay Prakash Ganeriwala`);

  const allGrades = useMemo(() => sectorData?.groups.flatMap((g) => g.grades) ?? [], [sectorData]);
  const [selected, setSelected] = useState(() => {
    const wanted = searchParams.get('grade');
    return wanted ? allGrades.find((g) => g.name === wanted) ?? null : null;
  });

  function selectGrade(grade) {
    setSelected(grade);
    setSearchParams({ grade: grade.name }, { replace: true });
  }
  function closeGrade() {
    setSelected(null);
    setSearchParams({}, { replace: true });
  }

  useEffect(() => {
    if (!selected) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(e) {
      if (e.key === 'Escape') closeGrade();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  if (!sectorMeta || !sectorData) {
    return (
      <PageWrapper>
        <Section variant="base">
          <p className="text-[17.5px] text-text-secondary">
            That category doesn&apos;t exist. <Link to="/products" className="font-semibold text-brand hover:underline">Back to Products</Link>
          </p>
        </Section>
      </PageWrapper>
    );
  }

  const q = query.trim().toLowerCase();
  const visibleGroups = sectorData.groups
    .map((g) => ({
      ...g,
      grades: q ? g.grades.filter((grade) => grade.name.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)) : g.grades,
    }))
    .filter((g) => g.grades.length > 0);

  return (
    <PageWrapper>
      <section className="border-b border-hairline-dark bg-dark">
        <Container className="py-14 lg:py-16">
          <Link to="/products" className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-text-invert-muted hover:text-white">
            <ArrowLeft size={14} /> All Categories
          </Link>
          <div className="mt-4 font-mono text-[13px] uppercase tracking-[0.14em] text-accent">Category</div>
          <h1 className="mt-2 text-[28px] font-extrabold leading-[1.18] tracking-tight text-white sm:text-[34px]">{sectorMeta.label}</h1>
          <p className="mt-3 max-w-[560px] text-[17.5px] leading-relaxed text-text-invert-muted">{sectorMeta.blurb}</p>
        </Container>
      </section>

      <Section variant="base">
        <div className="relative mb-8 max-w-[420px]">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search within ${sectorMeta.label.toLowerCase()}…`}
            className="field-input pl-10"
          />
        </div>

        {visibleGroups.length === 0 && (
          <p className="border-2 border-hairline bg-bg p-5 text-[17.5px] text-text-secondary">
            No grade name matches &ldquo;{query}&rdquo; in this category.
          </p>
        )}

        <div className="space-y-9">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <div className="mb-3 font-mono text-[12.5px] uppercase tracking-[0.1em] text-text-muted">{group.label}</div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
                {group.grades.map((grade) => (
                  <motion.button
                    key={grade.name}
                    layoutId={gradeBoxId(grade.name)}
                    onClick={() => selectGrade(grade)}
                    className={`flex items-center gap-1.5 border-2 border-hairline bg-surface px-3.5 py-3 text-left text-[14.5px] font-medium text-text-secondary transition-colors hover:border-brand hover:text-text ${
                      selected?.name === grade.name ? 'invisible' : ''
                    }`}
                  >
                    {grade.defence && <ShieldCheck size={12} className="flex-shrink-0 text-text-muted" aria-label="Defence spec" />}
                    <span className="truncate">{grade.name}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeGrade}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-dark/70 p-5"
          >
            <motion.div
              layoutId={gradeBoxId(selected.name)}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[440px] border-2 border-brand bg-surface p-7 shadow-elevated"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="font-mono text-[12px] uppercase tracking-[0.1em] text-text-muted">{selected.group}</div>
                <button onClick={closeGrade} aria-label="Close" className="text-text-muted hover:text-text">
                  <X size={18} />
                </button>
              </div>

              <div className="mt-1.5 flex items-center gap-2">
                <h2 className="text-[22px] font-bold text-text">{selected.name}</h2>
                {selected.defence && <ShieldCheck size={16} className="flex-shrink-0 text-text-muted" aria-label="Defence spec" />}
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {selected.categories.map((id) => (
                  <span key={id} className="border border-hairline px-2.5 py-1 text-[12.5px] font-medium text-text-secondary">
                    {CATEGORY_LABELS[id]}
                  </span>
                ))}
                {selected.conditions
                  .filter((id) => id !== 'general')
                  .map((id) => (
                    <span key={id} className="border border-accent/40 bg-accent/5 px-2.5 py-1 text-[12.5px] font-medium text-accent">
                      {CONDITION_LABELS[id]}
                    </span>
                  ))}
              </div>

              <p className="mt-4 text-[15.5px] leading-relaxed text-text-secondary">
                Listed under HPCL&apos;s {selected.group} range. This is a name reference, not a live stock
                figure — confirm current availability and packaging with our team before ordering.
              </p>

              <div className="mt-6 flex flex-wrap gap-2.5">
                <Button href="tel:+919735496000" variant="primary" className="!px-4 !py-2.5 !text-[15px]">
                  Call for This Grade
                </Button>
                <Button to={`/contact?type=order-stock&product=${encodeURIComponent(selected.name)}`} variant="outline" className="!px-4 !py-2.5 !text-[15px]">
                  Confirm Stock &amp; Get Quote
                </Button>
              </div>

              <a
                href={hpclSearchLink(selected.name)}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent hover:underline"
              >
                HPCL Reference Page <ExternalLink size={12} />
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
