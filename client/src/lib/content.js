// ---------------------------------------------------------------------------
// Enum-matching data — these string values must stay byte-identical to
// server/internal/models/product.go's Category consts. Never reword them.
// ---------------------------------------------------------------------------

export const PRODUCT_CATEGORIES = [
  'Engine / Automotive Oil',
  'Hydraulic / Industrial Oil',
  'Gear Oil',
  'Grease',
  'Coolant',
  'Specialty Industrial Fluid',
];

// Free-text "product interest" dropdown options — not tied to a Go enum.
export const PRODUCT_OPTIONS = [
  'Engine / Automotive Oil',
  'Hydraulic / Industrial Oil',
  'Gear Oil',
  'Grease',
  'Coolant',
  'Not sure — need advice',
];

// ---------------------------------------------------------------------------
// Public site copy
// ---------------------------------------------------------------------------

// Homepage trust bar — hard operational facts, not vibes. Every one of
// these has to be true and defensible; if it can't be backed on a bad day,
// it doesn't belong here (see the "Same-Day/Next-Day" confirmation this
// list was built against).
export const TRUST_POINTS = [
  '25+ Years Operations',
  'Raniganj Hub',
  '100% Direct HPCL Consignment',
  'Same-Day/Next-Day Belt Dispatch',
];

// Home page value pillars — built around the three things that actually
// cost a B2B buyer money when they go wrong: fake stock, transit delay,
// and paperwork that doesn't match the load. Not generic "why choose us"
// copy — each one answers a specific failure mode.
export const CORE_VALUE_PILLARS = [
  {
    code: '01',
    icon: 'ShieldCheck',
    title: 'No Fake or Adulterated Stock',
    description: 'Sealed HPCL drums move straight from refinery/depot to our warehouse — nothing decanted, nothing re-packed, nothing off a grey-market truck.',
  },
  {
    code: '02',
    icon: 'Warehouse',
    title: 'No Waiting on Long-Distance Transit',
    description: 'We hold local stock in Raniganj so your plant isn’t sitting idle on a delivery coming from three states away.',
  },
  {
    code: '03',
    icon: 'FileText',
    title: 'Accurate GST & Batch Paperwork',
    description: 'Batch numbers on the invoice match the batch numbers on the drum — built for corporate audits, not just for the delivery.',
  },
];

// The 4-Step Guarantee — Our Operations & Infrastructure page. Reuses the
// same real image assets the old Capabilities page rows used; the steps
// themselves are the fulfilment protocol, not a features list.
export const QUALITY_PROTOCOL = [
  {
    code: '01',
    title: 'Controlled Warehousing',
    what: 'Every consignment is received into sealed, batch-segregated storage — nothing mixed across grades or batches, nothing left exposed.',
    why: 'Product condition holds from delivery to dispatch, so nothing degraded goes out under our name.',
    how: 'You get lubricant that performs exactly as HPCL specifies, every time — not "close enough."',
    image: { file: 'warehouse-interior.jpg', alt: 'Interior of the warehouse showing organised lubricant storage' },
  },
  {
    code: '02',
    title: 'Rigorous Pre-Dispatch Inspection',
    what: 'Every drum is checked before it leaves — seals intact, no leaking, no external damage, correct grade and batch against the order.',
    why: 'A damaged or mismatched drum caught here never becomes your problem at the plant gate.',
    how: 'What gets loaded is what you ordered, in the condition you’re paying for.',
    image: { file: 'lubricant-storage-racks.jpg', alt: 'Storage racks holding HPCL lubricant drums and cartons organised by grade' },
  },
  {
    code: '03',
    title: 'Document Matching',
    what: 'E-way bills, batch numbers and invoices are matched 1:1 against the physical load before the vehicle leaves.',
    why: 'Paperwork that doesn’t match the truck is the single most common cause of a stalled delivery or a failed audit.',
    how: 'Your procurement and accounts team get documentation that reconciles cleanly, first time.',
    image: { file: 'business-signage.jpg', alt: 'Business signage at the office or warehouse premises' },
  },
  {
    code: '04',
    title: 'Reliable Transport',
    what: 'Consignments are dispatched straight to plant gates or dealer counters, coordinated directly with our transport partners.',
    why: 'No hand-off to a third-party courier network that can’t tell you where your load actually is.',
    how: 'You know when it left and when it lands — tracked the whole way, not just at the two ends.',
    image: { file: 'dispatch-loading-area.jpg', alt: 'Loading area for outgoing lubricant consignments' },
  },
];

export const SECTORS_SERVED = [
  {
    code: 'CM',
    label: 'Coal Mining & Allied Units',
    image: { file: 'sector-coal-mining.jpg', alt: 'Heavy mining machinery at a coal mining site' },
  },
  {
    code: 'SP',
    label: 'Steel & Sponge Iron Plants',
    image: { file: 'sector-steel-plant.jpg', alt: 'Steel or sponge iron plant processing equipment' },
  },
  {
    code: 'TP',
    label: 'Thermal Power Plants',
    image: { file: 'sector-thermal-power.jpg', alt: 'Thermal power plant turbine or boiler equipment' },
  },
  {
    code: 'TF',
    label: 'Transport Fleet Operators',
    image: { file: 'sector-transport-fleet.jpg', alt: 'Fleet of commercial trucks used for transport operations' },
  },
  {
    code: 'WG',
    label: 'Workshops & Garages',
    image: { file: 'sector-workshop-garage.jpg', alt: 'Vehicle workshop or garage servicing heavy equipment' },
  },
  {
    code: 'CC',
    label: 'Cement & Construction',
    image: { file: 'sector-cement-construction.jpg', alt: 'Cement plant or heavy construction machinery' },
  },
];

// Hero copy for the standalone Products / Catalogue page — see
// hpclCatalog.js / ProductCategory.jsx for the actual grade-level directory,
// search and recommender that back this page.
export const PRODUCTS_PAGE = {
  kicker: 'In Stock in Raniganj',
  title: 'Not Sourced on Demand.',
  subheadline: 'Every grade your operation runs on — in stock, sorted by batch, ready to move the day you order.',
  intro:
    'We hold a comprehensive range of HPCL industrial lubricant grades — engine and automotive oils, hydraulic fluids, industrial gear oils, greases, coolants and specialty industrial fluids — stocked, not sourced on request. Need technical data sheets (TDS) or batch certificates? Request them directly with your stock enquiry.',
};

// Application breakdown shown on the Products page, above the full grade
// directory — the "what is this actually for" layer before someone drills
// into 200+ grade names.
export const PRODUCT_APPLICATIONS = [
  { title: 'Mining Machinery', description: 'Heavy-duty engine and hydraulic oils built for continuous-duty earthmoving and extraction equipment.' },
  { title: 'Heavy Hydraulics', description: 'Hydraulic fluids for excavators, cranes and press equipment, including fire-resistant grades.' },
  { title: 'Industrial Gearboxes', description: 'EP and XP gear oils for plant gearboxes, conveyors and heavy transmission systems.' },
  { title: 'Fleet Automotive', description: 'Engine oils, gear oils and transmission fluids for commercial trucks, tractors and fleet vehicles.' },
  { title: 'Metalworking & Coolants', description: 'Cutting oils, drawing fluids and coolants for machining, rolling and metal-forming operations.' },
];

// Step-by-step enquiry process for the Dealer Support page.
export const DEALER_ENQUIRY_STEPS = [
  { code: '01', title: 'Submit Your Enquiry', description: 'Send your requirement through the Dealer Enquiry form or call us directly with the details.' },
  { code: '02', title: 'We Confirm Stock & Details', description: 'Our team checks current stock and confirms grade, quantity and delivery point with you.' },
  { code: '03', title: 'Order Is Scheduled', description: 'Once confirmed, the order is allocated from inventory and scheduled for dispatch.' },
  { code: '04', title: 'Dispatch & Delivery Coordination', description: 'The consignment is loaded, dispatched, and tracked through to delivery with documentation.' },
];

// What a dealer should have ready when submitting an enquiry.
export const DEALER_ENQUIRY_CHECKLIST = [
  'Business name and delivery location',
  'Product or lubricant category required',
  'Expected quantity and order frequency',
  'Preferred delivery timeline',
  'Any existing account or reference details',
];

// The three buyer profiles the Dealer & Institutional Desk (/contact) is
// built around. title/description drive the profile cards; type is the
// ?type= query param each card links to (see Contact.jsx's VALID_TYPES /
// PAGE_COPY) — keeps the profile list and the form's copy wired to the same
// source instead of drifting into two separate lists. 'general' stays as
// PAGE_COPY's fallback for a bare /contact visit — not shown as a fourth
// profile card, just the default when no type is specified.
export const BUYER_PROFILES = [
  {
    title: 'Industrial Plants & Mines',
    type: 'institution',
    description: 'Bulk supply schedules, emergency dispatches, and technical grade matching for mining and plant machinery.',
  },
  {
    title: 'Registered HPCL Dealers',
    type: 'dealer',
    description: 'Priority order placement, stock replenishment, and billing coordination for your existing account.',
  },
  {
    title: 'Live Order Support',
    type: 'order-stock',
    description: 'Need an immediate update on a dispatched consignment, or confirmation on current stock?',
  },
];

// Contact page FAQ — the practicalities of reaching us and getting a
// response. Deliberately distinct from OPERATIONS_FAQ, which covers how
// the operation itself works.
export const DEALER_FAQ = [
  {
    q: 'What is the fastest way to reach you?',
    a: 'Call or WhatsApp +91 97354 96000 during business hours for an immediate response. The enquiry form works outside those hours too — we follow up the next business day.',
  },
  {
    q: 'Do I need an existing account to enquire?',
    a: "No. New dealers, institutional buyers and first-time enquiries are all welcome — an account isn't a precondition, it's set up as part of the first order.",
  },
  {
    q: 'How long before I hear back?',
    a: 'Enquiries submitted during business hours are typically answered the same day, once stock and delivery details are confirmed on our side.',
  },
  {
    q: 'Can I enquire about more than one product grade at once?',
    a: "Yes — list every grade and quantity you need in a single enquiry and we'll confirm stock across all of them together.",
  },
];

// Operations page FAQ — the operational mechanics (storage, order
// verification, documentation). Deliberately distinct from DEALER_FAQ,
// which covers the enquiry process itself.
export const OPERATIONS_FAQ = [
  {
    q: 'How is lubricant stock stored?',
    a: 'In sealed, batch-segregated storage under controlled warehouse conditions — the same storage discipline HPCL specifies for its industrial range.',
  },
  {
    q: 'How do you confirm an order before dispatch?',
    a: "Every order is checked against live stock on hand before it's scheduled — we don't confirm quantities we don't actually have.",
  },
  {
    q: 'What documentation comes with a delivery?',
    a: 'A delivery challan, e-way bill and matching invoice are issued with every dispatch — batch numbers on the paperwork match what was physically loaded.',
  },
  {
    q: 'How is delivery tracked?',
    a: 'Consignments are tracked from the loading bay through to delivery at the plant gate or dealer counter, coordinated directly with our transport partners.',
  },
];

export const SERVICE_AREAS = ['Raniganj', 'Asansol', 'Durgapur', 'Andal', 'Kulti', 'Barakar', 'Jamuria', 'Ukhra'];
