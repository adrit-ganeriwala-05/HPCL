import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, Phone, Mail, MapPin, Building2, MessageCircle, ExternalLink, ArrowRight } from 'lucide-react';
import PageWrapper from '../components/PageWrapper.jsx';
import ContactForm from '../components/ContactForm.jsx';
import FAQ from '../components/FAQ.jsx';
import Section from '../components/layout/Section.jsx';
import SectionHeading from '../components/layout/SectionHeading.jsx';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal.jsx';
import { useDocumentTitle } from '../lib/useDocumentTitle.js';
import { BUYER_PROFILES, DEALER_ENQUIRY_STEPS, DEALER_ENQUIRY_CHECKLIST, DEALER_FAQ } from '../lib/content.js';

const FULL_ADDRESS = '9, Grand Trunk Road, Punjabi More, P.O. Searsole, Rajbari, Raniganj, Paschim Bardhaman, West Bengal 713358, India';
const ADDRESS_QUERY = encodeURIComponent(FULL_ADDRESS);
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${ADDRESS_QUERY}`;
const WHATSAPP_URL = 'https://wa.me/919735496000';

const VALID_TYPES = ['dealer', 'order-stock', 'institution', 'general'];

// kicker / title live in the dark details panel; formHeading is the
// separate, shorter heading on the form card itself — kept deliberately
// different wording so the two panels never repeat the same phrase twice.
const PAGE_COPY = {
  dealer: {
    kicker: 'Enquiry',
    title: 'Tell Us About Your Business',
    description: 'Tell us about your business and requirement — we’ll confirm stock and get back to you with next steps.',
    formHeading: 'Your Details',
  },
  'order-stock': {
    kicker: 'Order / Stock',
    title: 'Order or Stock Enquiry',
    description: 'Checking on an order, delivery, or product availability? Send the details below.',
    formHeading: 'Order Details',
  },
  institution: {
    kicker: 'Institutional',
    title: 'Institutional Enquiry',
    description: 'For mines, plants, power stations and fleet operators with a bulk requirement.',
    formHeading: 'Institution Details',
  },
  general: {
    kicker: 'Contact',
    title: 'Contact Us',
    description: 'Reach out for pricing, delivery scheduling, or general questions — we typically respond same business day.',
    formHeading: 'Send a Message',
  },
};

export default function Contact() {
  const [searchParams] = useSearchParams();
  const rawType = searchParams.get('type');
  const type = VALID_TYPES.includes(rawType) ? rawType : 'general';
  const product = searchParams.get('product') ?? '';
  const copy = PAGE_COPY[type];

  useDocumentTitle(`${copy.title} — M/s Jay Prakash Ganeriwala`);

  return (
    <PageWrapper>
      <Section variant="base">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          {/* Contact details — shown first on mobile, left column on desktop */}
          <Reveal className="order-1 border-2 border-hairline-dark bg-dark p-8 lg:sticky lg:top-24">
            <div className="font-mono text-[12.5px] uppercase tracking-[0.14em] text-accent">{copy.kicker}</div>
            <h1 className="mt-2 text-[26px] font-bold leading-tight tracking-tight text-white">{copy.title}</h1>
            <p className="mt-3 text-[17.5px] leading-relaxed text-text-invert-muted">{copy.description}</p>

            <div className="mt-6 border-t border-white/15 pt-1">
              <InfoRow icon={<Phone size={15} />} label="Phone">
                <a href="tel:+919735496000" className="hover:text-white">+91 97354 96000</a>
              </InfoRow>
              <InfoRow icon={<MessageCircle size={15} />} label="WhatsApp">
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="hover:text-white">Message on WhatsApp</a>
              </InfoRow>
              <InfoRow icon={<Mail size={15} />} label="Email">
                <a href="mailto:hpclcfa2000@gmail.com" className="hover:text-white">hpclcfa2000@gmail.com</a>
              </InfoRow>
              <InfoRow icon={<MapPin size={15} />} label="Office / Warehouse Address">
                {FULL_ADDRESS}
              </InfoRow>
              <InfoRow icon={<Building2 size={15} />} label="Role">
                C&amp;F Agent — HPCL Industrial Lubricants
              </InfoRow>
            </div>

            <div className="mt-6 border-t border-white/15 pt-5">
              <div className="flex justify-between py-1.5 text-[17.5px] text-text-invert-muted">
                <span>Monday – Saturday</span>
                <span className="font-mono">9:00 AM – 7:00 PM</span>
              </div>
              <div className="flex justify-between py-1.5 text-[17.5px] text-text-invert-muted">
                <span>Sunday</span>
                <span className="font-mono">Closed</span>
              </div>
            </div>

            <a
              href={MAPS_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-white hover:underline"
            >
              Open in Google Maps <ExternalLink size={12} />
            </a>
          </Reveal>

          {/* Enquiry form — second on mobile, right column on desktop */}
          <div className="order-2">
            <Reveal delay={0.06}>
              <ContactForm
                initialType={type}
                initialProduct={product}
                focusOnMount={type !== 'general'}
                heading={copy.formHeading}
              />
            </Reveal>
          </div>
        </div>
      </Section>

      {/* Who this desk is for */}
      <Section variant="surface" border>
        <SectionHeading kicker="Who This Is For" title="The Dealer & Institutional Desk" description="Pick the profile that fits — it takes you straight to the right form." />
        <RevealGroup className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {BUYER_PROFILES.map((p) => (
            <RevealItem key={p.title}>
              <Link
                to={`/contact?type=${p.type}`}
                className="group block h-full border-t-2 border-hairline pt-5 transition-colors hover:border-brand"
              >
                <h3 className="flex items-center gap-2 text-[17.5px] font-bold text-text">
                  {p.title}
                  <ArrowRight size={15} className="text-brand opacity-0 transition-opacity group-hover:opacity-100" />
                </h3>
                <p className="mt-1.5 text-[17.5px] leading-relaxed text-text-secondary">{p.description}</p>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* Step-by-step enquiry process */}
      <Section variant="base" border>
        <SectionHeading kicker="How It Works" title="From Enquiry to Delivery" description="A straightforward sequence, the same for every dealer." />
        <RevealGroup className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {DEALER_ENQUIRY_STEPS.map((step) => (
            <RevealItem key={step.code}>
              <div className="border-l-2 border-hairline py-1 pl-5">
                <div className="font-mono text-[15px] font-bold text-accent">{step.code}</div>
                <h3 className="mt-2 text-[17.5px] font-bold text-text">{step.title}</h3>
                <p className="mt-2 text-[17.5px] leading-relaxed text-text-secondary">{step.description}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* What to provide */}
      <Section variant="surface" border>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <Reveal>
            <div className="font-mono text-[13px] uppercase tracking-[0.14em] text-accent">Before You Enquire</div>
            <h2 className="mt-3 text-[26px] font-bold leading-[1.2] tracking-tight text-text sm:text-[30px]">
              What to Include in Your Enquiry
            </h2>
            <p className="mt-4 max-w-[440px] text-[17.5px] leading-relaxed text-text-secondary">
              Having these details ready lets us confirm stock and respond with a useful answer on
              the first reply.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <ul className="space-y-3.5 border-2 border-hairline p-6">
              {DEALER_ENQUIRY_CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-3 text-[17.5px] text-text-secondary">
                  <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-brand" />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Section>

      {/* FAQ */}
      <Section variant="base" border>
        <SectionHeading kicker="Questions" title="Frequently Asked Questions" />
        <FAQ items={DEALER_FAQ} />
      </Section>
    </PageWrapper>
  );
}

function InfoRow({ icon, label, children }) {
  return (
    <div className="mt-5 flex items-start gap-3.5">
      <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center border border-white/15 text-accent">
        {icon}
      </div>
      <div className="text-[17.5px] leading-relaxed text-text-invert-muted">
        <span className="mb-0.5 block font-mono text-[12px] uppercase tracking-wider text-text-invert-muted/70">
          {label}
        </span>
        {children}
      </div>
    </div>
  );
}
