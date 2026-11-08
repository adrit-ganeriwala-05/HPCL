import PageWrapper from '../components/PageWrapper.jsx';
import ImagePlaceholder from '../components/ImagePlaceholder.jsx';
import ImageTextFeature from '../components/ImageTextFeature.jsx';
import FAQ from '../components/FAQ.jsx';
import DealerEnquiryCTA from '../components/DealerEnquiryCTA.jsx';
import Section from '../components/layout/Section.jsx';
import Container from '../components/layout/Container.jsx';
import SectionHeading from '../components/layout/SectionHeading.jsx';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { SERVICE_AREAS, QUALITY_PROTOCOL, OPERATIONS_FAQ } from '../lib/content.js';

const OPERATIONAL_SCOPE = [
  { label: 'Role', detail: 'Consignment & Forwarding (C&F) agent' },
  { label: 'Product Range', detail: 'HPCL industrial lubricants' },
  { label: 'Region', detail: 'Raniganj–Asansol–Durgapur belt, West Bengal' },
  { label: 'Warehousing', detail: 'Sealed, batch-segregated storage' },
  { label: 'Inventory', detail: 'Tracked against incoming supply and dealer demand' },
  { label: 'Dispatch', detail: 'Straight to plant gates and dealer counters' },
];

const HUB_REASONS = [
  {
    code: '01',
    title: 'Local Operating Knowledge',
    description: 'Based in Raniganj, we know the operating conditions of the mines and plants across this belt — not reading it off a map.',
  },
  {
    code: '02',
    title: 'Direct Distribution Channel',
    description: "Stock moves through HPCL's own distribution channel and is traceable back to source — not resold from a third party.",
  },
  {
    code: '03',
    title: 'Emergency Supply Dispatch',
    description: 'A short delivery radius means a genuine emergency order can move same-day, not queue behind a week of transit.',
  },
];

export default function AboutOperations() {
  useDocumentTitle('Operations & Infrastructure — M/s Jay Prakash Ganeriwala');

  return (
    <PageWrapper>
      {/* Hero — proof, not a pitch */}
      <section className="border-b border-hairline-dark bg-dark">
        <Container className="grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <Reveal>
            <div className="font-mono text-[12.5px] uppercase tracking-[0.14em] text-accent">Operations & Infrastructure</div>
            <h1 className="mt-3 text-[30px] font-extrabold leading-[1.2] tracking-tight text-white sm:text-[36px]">
              The Operational Record Behind Every HPCL Consignment We Move.
            </h1>
            <p className="mt-5 max-w-[540px] text-[17.5px] leading-relaxed text-text-invert-muted">
              M/s Jay Prakash Ganeriwala has run as a Consignment &amp; Forwarding agent for HPCL
              industrial lubricants for <strong className="font-semibold text-white">25+ years</strong>,
              based in Raniganj at the centre of the Asansol–Durgapur industrial belt. This page is the
              proof, not the pitch — how stock is held, checked, documented and dispatched.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <ImagePlaceholder file="business-signage.jpg" alt="Business signage at the office or warehouse premises" ratio="aspect-[4/3]" dark />
          </Reveal>
        </Container>
      </section>

      {/* The Strategic Hub */}
      <Section variant="surface" border>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <div className="font-mono text-[12.5px] uppercase tracking-[0.14em] text-accent">The Strategic Hub</div>
            <h2 className="mt-3 text-[26px] font-bold leading-[1.2] tracking-tight text-text sm:text-[28px]">
              Why Raniganj, Not a Warehouse Three States Away
            </h2>
            <p className="mt-4 max-w-[540px] text-[17.5px] leading-relaxed text-text-secondary">
              Raniganj sits inside the Asansol–Durgapur industrial corridor and the Raniganj Coalfield
              itself — not near it, <strong className="font-semibold text-text">in it</strong>. That means
              a shorter delivery radius to every mine, plant and dealer counter on this belt, and it's what
              makes an emergency dispatch a same-day call, not a multi-day wait.
            </p>
            <p className="mt-4 max-w-[540px] text-[17.5px] leading-relaxed text-text-secondary">
              We are an <strong className="font-semibold text-text">independent business</strong>, not
              Hindustan Petroleum Corporation Limited&apos;s corporate entity — a structured, accountable
              handler of their industrial lubricant stock, operating under terms HPCL itself sets for its
              C&amp;F network. Not a storefront reselling under our own terms.
            </p>
            <dl className="mt-8 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
              {OPERATIONAL_SCOPE.map((item) => (
                <div key={item.label} className="border-t border-hairline pt-3">
                  <dt className="font-mono text-[12.5px] uppercase tracking-wider text-text-muted">{item.label}</dt>
                  <dd className="mt-1 text-[17.5px] font-medium text-text">{item.detail}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="aspect-[3/2] overflow-hidden border border-hairline">
              <img
                src="/images/hpcl-petrol-pump.jpg"
                alt="HPCL petrol pump signage"
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </Reveal>
        </div>

        <RevealGroup className="mt-14 grid grid-cols-1 gap-x-10 gap-y-9 border-t border-hairline pt-10 sm:grid-cols-3">
          {HUB_REASONS.map((r) => (
            <RevealItem key={r.code}>
              <div className="border-l-2 border-hairline py-1 pl-5">
                <div className="font-mono text-[15px] font-bold text-accent">{r.code}</div>
                <h3 className="mt-2 text-[17.5px] font-bold text-text">{r.title}</h3>
                <p className="mt-2 text-[17.5px] leading-relaxed text-text-secondary">{r.description}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* Storage & Quality Protocol — the 4-Step Guarantee */}
      <Section variant="base" border>
        <SectionHeading
          kicker="The 4-Step Guarantee"
          title="Storage & Quality Protocol"
          description="Every consignment goes through the same four checks, in the same order, with no exceptions made for a rush order."
        />
      </Section>
      {QUALITY_PROTOCOL.map((step, i) => (
        <Section key={step.code} variant={i % 2 === 0 ? 'surface' : 'base'} border>
          <ImageTextFeature {...step} reverse={i % 2 === 1} />
        </Section>
      ))}

      {/* Coverage */}
      <Section variant="surface" border>
        <SectionHeading kicker="Coverage" title="Area We Serve" description="Based in Raniganj, supplying across the Paschim Bardhaman industrial belt." />
        <Reveal className="flex flex-wrap gap-2.5">
          {SERVICE_AREAS.map((area) => (
            <span key={area} className="border-2 border-hairline px-4 py-2 text-[17.5px] font-medium text-text">
              {area}
            </span>
          ))}
        </Reveal>
      </Section>

      {/* FAQ */}
      <Section variant="base" border>
        <SectionHeading kicker="Questions" title="Frequently Asked Questions" />
        <FAQ items={OPERATIONS_FAQ} />
      </Section>

      <Section variant="dark">
        <DealerEnquiryCTA />
      </Section>
    </PageWrapper>
  );
}
