import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PageWrapper from '../components/PageWrapper.jsx';
import Button from '../components/Button.jsx';
import DealerEnquiryCTA from '../components/DealerEnquiryCTA.jsx';
import Section from '../components/layout/Section.jsx';
import Container from '../components/layout/Container.jsx';
import SectionHeading from '../components/layout/SectionHeading.jsx';
import RecommenderWizard from '../components/RecommenderWizard.jsx';
import GradeChatbot from '../components/GradeChatbot.jsx';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { PRODUCTS_PAGE, PRODUCT_APPLICATIONS } from '../lib/content.js';
import { HPCL_DIRECTORY, RECOMMENDER_SECTORS } from '../lib/hpclCatalog.js';

export default function Products() {
  useDocumentTitle('Products & Catalogue — M/s Jay Prakash Ganeriwala');

  return (
    <PageWrapper>
      <section className="border-b border-hairline-dark bg-dark">
        <Container className="py-16 lg:py-20">
          <Reveal className="max-w-[640px]">
            <div className="font-mono text-[13px] uppercase tracking-[0.14em] text-accent">{PRODUCTS_PAGE.kicker}</div>
            <h1 className="mt-3 text-[30px] font-extrabold leading-[1.18] tracking-tight text-white sm:text-[38px]">
              {PRODUCTS_PAGE.title}
            </h1>
            <p className="mt-4 text-[19px] font-medium leading-relaxed text-white/90">
              {PRODUCTS_PAGE.subheadline}
            </p>
            <p className="mt-4 max-w-[560px] text-[17.5px] leading-relaxed text-text-invert-muted">
              {PRODUCTS_PAGE.intro}
            </p>
            <Button to="/contact?type=order-stock" variant="onColor" className="mt-7">
              Check Availability
            </Button>
          </Reveal>
        </Container>
      </section>

      {/* Application breakdown — what this range is actually for, before
          someone drills into 200+ grade names */}
      <Section variant="base" border>
        <SectionHeading kicker="By Application" title="Built for Your Equipment, Not a Generic Shelf" />
        <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCT_APPLICATIONS.map((a) => (
            <RevealItem key={a.title}>
              <div className="h-full border-2 border-hairline p-6">
                <h3 className="text-[18.5px] font-bold text-text">{a.title}</h3>
                <p className="mt-2 text-[17.5px] leading-relaxed text-text-secondary">{a.description}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* Grades we stock — one category grid, each box opens its own page
          of grades to browse and select from. */}
      <Section variant="surface" border>
        <SectionHeading
          kicker="Categories"
          title="HPCL Grades We Stock"
          description="Open a category to browse and search its grades — select one for details and HPCL's own reference page."
        />
        <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {HPCL_DIRECTORY.map((sector) => {
            const meta = RECOMMENDER_SECTORS.find((s) => s.id === sector.id);
            const gradeCount = sector.groups.reduce((n, g) => n + g.grades.length, 0);
            return (
              <RevealItem key={sector.id}>
                <Link
                  to={`/products/${sector.id}`}
                  className="group flex h-full flex-col justify-between border-2 border-hairline bg-surface p-6 transition-colors hover:border-brand"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[19px] font-bold text-text">{meta?.label ?? sector.id}</h3>
                      <span className="font-mono text-[13px] text-text-muted">{gradeCount} grades</span>
                    </div>
                    <p className="mt-2 text-[15.5px] leading-relaxed text-text-secondary">{meta?.blurb}</p>
                  </div>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[14.5px] font-semibold text-brand">
                    Browse Category <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>
        <Reveal className="mt-6">
          <p className="text-[14.5px] text-text-muted">
            This is a name directory, not a live stock feed — confirm current availability, quantity and
            packaging with our team before ordering.
          </p>
        </Reveal>
      </Section>

      {/* Grade recommender — kept as a real interactive tool, not decoration */}
      <Section variant="base" border>
        <SectionHeading kicker="Find Your Grade" title="Not Sure Which Lubricant You Need?" description="Answer three quick questions and we'll match the HPCL grade for your equipment." align="center" />
        <Reveal className="mx-auto max-w-[720px]">
          <RecommenderWizard />
        </Reveal>
      </Section>

      {/* Free-text grade finder — local keyword matching, not a live-stock search */}
      <Section variant="surface" border>
        <SectionHeading kicker="Or Just Ask" title="Describe What You Need" description="Type the equipment or condition in plain words — it's matched against the same grade catalog, not a guided form." align="center" />
        <Reveal className="mx-auto max-w-[640px]">
          <GradeChatbot />
        </Reveal>
      </Section>

      <Section variant="dark">
        <DealerEnquiryCTA />
      </Section>
    </PageWrapper>
  );
}
