import { ArrowRight, ShieldCheck, Warehouse, FileText } from 'lucide-react';
import PageWrapper from '../components/PageWrapper.jsx';
import Button from '../components/Button.jsx';
import ImagePlaceholder from '../components/ImagePlaceholder.jsx';
import TrustStrip from '../components/TrustStrip.jsx';
import DealerEnquiryCTA from '../components/DealerEnquiryCTA.jsx';
import Section from '../components/layout/Section.jsx';
import Container from '../components/layout/Container.jsx';
import SectionHeading from '../components/layout/SectionHeading.jsx';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { CORE_VALUE_PILLARS, SERVICE_AREAS, SECTORS_SERVED } from '../lib/content.js';

const PILLAR_ICONS = { ShieldCheck, Warehouse, FileText };

export default function Home() {
  useDocumentTitle('M/s Jay Prakash Ganeriwala — C&F Agent, HPCL Industrial Lubricants');

  return (
    <PageWrapper>
      {/* Hero */}
      <section className="border-b border-hairline-dark bg-dark">
        <Container className="grid grid-cols-1 items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <Reveal>
            <div className="font-mono text-[13px] uppercase tracking-[0.14em] text-accent">
              HPCL Industrial Lubricants C&amp;F Operations
            </div>
            <h1 className="mt-5 text-[32px] font-extrabold leading-[1.15] tracking-tight text-white sm:text-[42px] lg:text-[46px]">
              Zero Production Stoppages. 100% Genuine HPCL Lubricants — Delivered Across the Coal Belt.
            </h1>
            <p className="mt-5 max-w-[480px] text-[17.5px] leading-relaxed text-text-invert-muted">
              Local inventory held in Raniganj for immediate dispatch to mines, plants and dealer
              networks across Paschim Bardhaman — not sourced on demand from three states away.
            </p>
            <div className="mt-9 flex flex-wrap gap-3.5">
              <Button to="/contact?type=order-stock" variant="primary">
                Check Stock &amp; Order
              </Button>
              <Button to="/products" variant="onDark">
                View HPCL Grade Directory <ArrowRight size={15} />
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <ImagePlaceholder
              file="warehouse-exterior.jpg"
              alt="Warehouse exterior with signage, used as the hero image"
              ratio="aspect-[4/3]"
              dark
            />
          </Reveal>
        </Container>
      </section>

      <TrustStrip />

      {/* Core value pillars — the three things that actually cost a buyer
          money when a supplier gets them wrong, not a generic feature list */}
      <Section variant="base" border>
        <SectionHeading kicker="Why Buyers Stay" title="Built Around What Actually Costs You Money" description="Fake stock, transit delay and paperwork mismatches are the three failures that hurt a plant's schedule and its audit trail." />
        <RevealGroup className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {CORE_VALUE_PILLARS.map((p) => {
            const Icon = PILLAR_ICONS[p.icon];
            return (
              <RevealItem key={p.code}>
                <div className="h-full border-2 border-hairline p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center border border-brand text-brand">
                      <Icon size={18} strokeWidth={1.75} />
                    </div>
                    <div className="font-mono text-[13px] font-bold text-accent">{p.code}</div>
                  </div>
                  <h3 className="mt-4 text-[19px] font-bold text-text">{p.title}</h3>
                  <p className="mt-2.5 text-[17.5px] leading-relaxed text-text-secondary">{p.description}</p>
                </div>
              </RevealItem>
            );
          })}
        </RevealGroup>
        <Reveal className="mt-10">
          <Button to="/about-operations" variant="outline">
            See Our Full Operations Protocol <ArrowRight size={15} />
          </Button>
        </Reveal>
      </Section>

      {/* Industries served */}
      <Section variant="surface" border>
        <SectionHeading kicker="Industries" title="Who We Serve" description="Bulk lubricant supply for the mines, plants and fleets that run this belt." />
        <RevealGroup className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SECTORS_SERVED.map((s) => (
            <RevealItem key={s.code}>
              <div className="group border border-hairline bg-base">
                {s.image.ready === false ? (
                  <ImagePlaceholder file={s.image.file} alt={s.image.alt} ratio="aspect-[4/3]" />
                ) : (
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={`/images/${s.image.file}`}
                      alt={s.image.alt}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex items-center gap-2.5 border-t border-hairline px-4 py-3.5">
                  <span className="h-1.5 w-1.5 shrink-0 bg-accent" />
                  <span className="text-[16.5px] font-semibold leading-snug text-text">{s.label}</span>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* Operational proof — contrasting section */}
      <Section variant="dark" border>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <ImagePlaceholder
              file="dispatch-loading-area.jpg"
              alt="Loading area for outgoing lubricant consignments"
              ratio="aspect-[4/3]"
              dark
            />
          </Reveal>
          <Reveal delay={0.06}>
            <div className="font-mono text-[13px] uppercase tracking-[0.14em] text-accent">Operations</div>
            <h2 className="mt-3 text-[26px] font-bold leading-[1.2] tracking-tight text-white sm:text-[30px]">
              Trusted With the Stock That Keeps Operations Running
            </h2>
            <p className="mt-4 max-w-[480px] text-[17.5px] leading-relaxed text-text-invert-muted">
              Mines, plants and fleets across this belt run on lubricant that has to be right — the
              correct grade, the correct quantity, on time. That's the standard every consignment
              leaving our warehouse is held to.
            </p>
          </Reveal>
        </div>
      </Section>

      {/* Dealer & institutional support — teaser only, full desk lives on /contact */}
      <Section variant="base" border>
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <Reveal>
            <div className="font-mono text-[13px] uppercase tracking-[0.14em] text-accent">Who We Support</div>
            <h2 className="mt-3 text-[26px] font-bold leading-[1.2] tracking-tight text-text sm:text-[30px]">
              Dealers and Institutional Buyers, Handled Directly
            </h2>
            <p className="mt-4 max-w-[480px] text-[17.5px] leading-relaxed text-text-secondary">
              No call centre, no layer in between — the person who confirms your stock is the
              person you talk to next time.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="flex flex-wrap gap-3.5 lg:justify-end">
            <Button to="/contact" variant="outline">
              Dealer &amp; Institutional Desk <ArrowRight size={15} />
            </Button>
            <Button to="/contact?type=dealer" variant="primary">Enquiry</Button>
          </Reveal>
        </div>
      </Section>

      {/* Operations preview */}
      <Section variant="surface" border>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <Reveal>
            <div className="font-mono text-[13px] uppercase tracking-[0.14em] text-accent">Operations</div>
            <h2 className="mt-3 text-[26px] font-bold leading-[1.2] tracking-tight text-text sm:text-[30px]">
              A Consignment &amp; Forwarding agent for HPCL industrial lubricants, based in Raniganj.
            </h2>
            <p className="mt-4 max-w-[560px] text-[17.5px] leading-relaxed text-text-secondary">
              25+ years running warehousing, order verification and dispatch for HPCL's industrial
              lubricant range, serving the mines, plants and fleets of the Raniganj–Asansol–Durgapur
              belt.
            </p>
            <Button to="/about-operations" variant="outline" className="mt-6">
              Our Operations &amp; Infrastructure <ArrowRight size={15} />
            </Button>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mb-3 font-mono text-[12px] uppercase tracking-[0.12em] text-text-muted">Coverage</div>
            <div className="flex flex-wrap gap-2">
              {SERVICE_AREAS.map((area) => (
                <span key={area} className="border-2 border-hairline px-3.5 py-1.5 text-[15px] font-medium text-text">
                  {area}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </Section>

      {/* Final CTA */}
      <Section variant="dark">
        <DealerEnquiryCTA />
      </Section>
    </PageWrapper>
  );
}
