// ---------------------------------------------------------------------------
// HPCL grade directory — a reference list of grade names across HPCL's
// industrial and automotive range, supplied by the business owner. This is
// NOT the live, priced, stocked catalog (see internal/models/product.go /
// AdminProducts — that's the real DB-backed inventory). It exists so a
// visitor can look up the HPCL grade name for their equipment before
// confirming actual stock and packaging with our team — the same "don't
// promise what we haven't verified" discipline as the rest of the site's
// copy (see DEALER_FAQ / OPERATIONS_FAQ in content.js).
//
// `categories` / `conditions` drive the grade finder in RecommenderWizard.jsx
// — they're inferred from the grade's own name/group (e.g. "EP" in the name
// -> extreme-pressure, "FRWG"/"FRIE" -> fire-resistant), never from outside
// technical claims we can't verify against HPCL's own documentation.
// ---------------------------------------------------------------------------

export function hpclSearchLink(name) {
  const q = encodeURIComponent(name).replace(/%20/g, '+');
  return `https://www.hplubricants.in/search/node/${q}`;
}

// Factory so each catalog group only states its defaults once instead of
// repeating {sector, group, categories} on every single grade name.
function group(sector, groupLabel, defaultCategories) {
  return (name, opts = {}) => ({
    name,
    sector,
    group: groupLabel,
    categories: opts.categories || defaultCategories,
    conditions: opts.conditions || ['general'],
    defence: !!opts.defence,
  });
}

// --- Automotive -------------------------------------------------------------

const diesel = group('automotive', 'Diesel Engine Oils', ['commercial-diesel']);
const tractorAgri = { categories: ['tractor-agri'] };
const railwayMarine = { categories: ['railway-marine'] };

const AUTOMOTIVE_DIESEL = [
  diesel('Hylube HDX MG 10W30'),
  diesel('Hylube HDX MG 20W40'),
  diesel('Hylube HDX MG 20W50'),
  diesel('HP Laal Ghoda 20W40'),
  diesel('Hylube X3 10W'),
  diesel('Hylube X3 30'),
  diesel('Hylube X3 40'),
  diesel('Hylube X3 50'),
  diesel('Hylube CDKC 20W40'),
  diesel('Hylube X3 10W-20'),
  diesel('HP L.G Tractor Oil 40', tractorAgri),
  diesel('Hylube MTU 40', railwayMarine),
  diesel('HP Milcy Power 15W40', tractorAgri),
  diesel('HP Pumpset Oil (LG) 20W40', tractorAgri),
  diesel('HP HDX Plus 20W40'),
  diesel('Hylube Supertrak 20W40'),
  diesel('HP Rail Road Oil 613', railwayMarine),
  diesel('HP Rail Road Oil 713', railwayMarine),
  diesel('HP Rail Road Oil 813M', railwayMarine),
  diesel('HP Rail Road Oil 817M', railwayMarine),
  diesel('HP Engine Tonic'),
  diesel('Hylube Milcy 30', tractorAgri),
  diesel('Hylube Milcy 40', tractorAgri),
  diesel('Hylube Milcy 50', tractorAgri),
  diesel('Hylube SHP 15W40'),
  diesel('Hylube Milcy Super 20W40', tractorAgri),
  diesel('Hylube Extra 20W40'),
];

const gasEngine = group('automotive', 'Natural Gas Engine Oils', ['commercial-diesel']);
const AUTOMOTIVE_GAS = [
  gasEngine('HP Natural Gas Engine Oil L40', { conditions: ['low-ash-cng'] }),
  gasEngine('HP Natural Gas Engine Oil L15W40', { conditions: ['low-ash-cng'] }),
  gasEngine('HP Natural Gas Engine Oil A40', { conditions: ['low-ash-cng'] }),
  gasEngine('HP Natural Gas Engine Oil M40', { conditions: ['low-ash-cng'] }),
];

const petrol4w = group('automotive', 'Petrol Engine Oils (4-Wheeler)', ['passenger-petrol']);
const AUTOMOTIVE_PETROL_4W = [
  petrol4w('HP Extra Super Motor Oil 20W40'),
  petrol4w('HP Extra Super Motor Oil 20W50'),
  petrol4w('HP Super Engine Oil MG 20W40'),
  petrol4w('HP Super Engine Oil MG 20W50'),
  petrol4w('HP SJX 15W40'),
  petrol4w('HP SGX 15W40'),
];

const petrol23w = group('automotive', 'Petrol Engine Oils (2 & 3-Wheeler)', ['two-three-wheeler']);
const AUTOMOTIVE_PETROL_23W = [
  petrol23w('HP Racer 2 Low Smoke'),
  petrol23w('HP Sundari'),
  petrol23w('HP Racer 4'),
  petrol23w('HP Racer 2 SM', { defence: true }),
];

const firstFill = group('automotive', 'First Fill / Break-In Oils', ['commercial-diesel', 'passenger-petrol']);
const AUTOMOTIVE_FIRST_FILL = [firstFill('HP Autolube 30'), firstFill('HP Autolube 40'), firstFill('HP Autoprun T120')];

const gearTrans = group('automotive', 'Gear & Transmission Oils', ['hydraulic-transmission']);
const ep = { conditions: ['extreme-pressure'] };
const AUTOMOTIVE_GEAR = [
  gearTrans('HP Gear Oil ST 90'),
  gearTrans('HP Gear Oil ST 140'),
  gearTrans('HP Gear Oil EP 80W', ep),
  gearTrans('HP Gear Oil EP 90', ep),
  gearTrans('HP Gear Oil EP 140', ep),
  gearTrans('HP Gear Oil EP 80W-90', ep),
  gearTrans('HP Gear Oil EP 75W-90', ep),
  gearTrans('HP Laal Ghoda Gear Oil EP 90', ep),
  gearTrans('HP Gear Oil XP 80W', ep),
  gearTrans('HP Gear Oil XP 90', ep),
  gearTrans('HP Gear Oil XP 140', ep),
  gearTrans('HP Gear Oil XP 85W-140', ep),
  gearTrans('HP Gear Oil XP 80W-90', ep),
  gearTrans('HP ATF DEX II'),
  gearTrans('HP Automatic Transmission Fluid'),
  gearTrans('HP Powerglide C 310/330'),
  gearTrans('HP Powerglide C 410/430'),
  gearTrans('HP Supertran'),
];

const AUTOMOTIVE_SPECIALITIES = [
  gearTrans('HP Powerfluid LTP 100'),
  gearTrans('HP Powerfluid TH 46'),
  gearTrans('HP Powerfluid P 100'),
  group('automotive', 'Auto Specialities & Hydraulics', ['commercial-diesel', 'passenger-petrol'])('HP Thanda Raja'),
  group('automotive', 'Auto Specialities & Hydraulics', ['commercial-diesel', 'passenger-petrol'])('HP Koolgard'),
  group('automotive', 'Auto Specialities & Hydraulics', ['commercial-diesel', 'passenger-petrol'])('HP Koolgard P'),
  group('automotive', 'Auto Specialities & Hydraulics', ['commercial-diesel', 'passenger-petrol'])('HP Radiator Protector'),
  group('automotive', 'Auto Specialities & Hydraulics', ['commercial-diesel', 'passenger-petrol'])('HP Super Duty Brake Fluid DOT-3'),
  group('automotive', 'Auto Specialities & Hydraulics', ['commercial-diesel', 'passenger-petrol'])('HP Super Duty Brake Fluid DOT-4'),
  group('automotive', 'Auto Specialities & Hydraulics', ['passenger-petrol', 'two-three-wheeler'])('HP Shock Absorber Oil Light'),
  group('automotive', 'Auto Specialities & Hydraulics', ['commercial-diesel', 'two-three-wheeler'])('HP Shock Absorber Oil Heavy'),
  group('automotive', 'Auto Specialities & Hydraulics', ['passenger-petrol', 'two-three-wheeler'])('HP Shock Absorber Oil AW'),
  group('automotive', 'Auto Specialities & Hydraulics', ['two-three-wheeler'])('HP Shock Absorber Oil TELE'),
  group('automotive', 'Auto Specialities & Hydraulics', ['two-three-wheeler'])('HP Shock Absorber Oil GB'),
];

// --- Industrial ---------------------------------------------------------

const turbineBearing = group('industrial', 'Turbine & Bearing Oils', ['turbine']);
const INDUSTRIAL_TURBINE = [
  turbineBearing('Turbinol 32'),
  turbineBearing('Turbinol 46'),
  turbineBearing('Turbinol 57'),
  turbineBearing('Turbinol 68'),
  turbineBearing('Turbinol 77'),
  turbineBearing('Turbinol XT 32'),
  turbineBearing('Turbinol XT 46'),
  turbineBearing('Turbinol XT 68'),
  turbineBearing('HP Film Oil 32', { categories: ['turbine', 'bearing-slideway'] }),
  turbineBearing('HP Film Oil 46', { categories: ['turbine', 'bearing-slideway'] }),
  turbineBearing('HP Film Oil 68', { categories: ['turbine', 'bearing-slideway'] }),
  turbineBearing('HP Film Oil 100', { categories: ['turbine', 'bearing-slideway'] }),
  turbineBearing('HP Film Oil 150', { categories: ['turbine', 'bearing-slideway'] }),
  turbineBearing('HP Film Oil 220', { categories: ['turbine', 'bearing-slideway'] }),
  turbineBearing('HP Steel 257', { categories: ['bearing-slideway'] }),
  turbineBearing('HP Steel 460', { categories: ['bearing-slideway'] }),
  turbineBearing('HP Steel 680', { categories: ['bearing-slideway'] }),
  turbineBearing('HP Steel EP 100', { categories: ['bearing-slideway'], conditions: ['extreme-pressure'] }),
];

const hydCirc = group('industrial', 'Hydraulic & Circulating Oils', ['hydraulic']);
const fireResistant = { conditions: ['fire-resistant'] };
const INDUSTRIAL_HYDRAULIC = [
  hydCirc('Enklo (32 to 460)'),
  hydCirc('Enklo HLP (22 to 68)'),
  hydCirc('Enklo HLP T (32 to 68)'),
  hydCirc('Enklo HL (32 to 150)'),
  hydCirc('Enklo FRIE 68', fireResistant),
  hydCirc('Enklo FRIE 100', fireResistant),
  hydCirc('Enklo FRIE 150', fireResistant),
  hydCirc('Enklo FRWG 22', fireResistant),
  hydCirc('Enklo FRWG 46', fireResistant),
  hydCirc('Enklo FRWG 68', fireResistant),
];

const compressor = group('industrial', 'Compressor Oils', ['compressor']);
const INDUSTRIAL_COMPRESSOR = [
  compressor('Hycom C (100 to 320)'),
  compressor('Hycom (32 to 150)'),
  compressor('Hycom NH 32'),
  compressor('Hycom NH 46'),
  compressor('Hycom NH 57'),
  compressor('Hycom VDL T (32 to 320)'),
];

const machineTool = group('industrial', 'Machine Tool, Gear Box & Open Gear Oils', ['bearing-slideway']);
const INDUSTRIAL_MACHINE_TOOL = [
  machineTool('Waylube 68'),
  machineTool('Waylube N68'),
  machineTool('Waylube 220'),
  machineTool('Parthan EP (68 to 1000)', { categories: ['gearbox'], conditions: ['extreme-pressure'] }),
  machineTool('Hytak 0'),
  machineTool('Hytak 1'),
  machineTool('Hytak 2'),
  machineTool('Hytak 5'),
  machineTool('Hytak F3'),
  machineTool('Hytak F4'),
  machineTool('Hytak F5'),
];

const generalMachinery = group('industrial', 'General Machinery & Specialty Industrial', ['gearbox', 'bearing-slideway']);
const INDUSTRIAL_GENERAL_MACHINERY = [
  group('industrial', 'General Machinery & Specialty Industrial', ['metalworking'])('Spintek (5 to 22)'),
  generalMachinery('Yantrol (32 to 460)'),
  generalMachinery('Yantrol N (32 to 460)'),
  generalMachinery('Yantrol TS'),
  generalMachinery('Yantrol C 32'),
  generalMachinery('Cyndol (460 to 1500)', { categories: ['gearbox'] }),
  generalMachinery('Cyndol TC (460 to 1500)', { categories: ['gearbox'], conditions: ['extreme-pressure'] }),
  group('industrial', 'General Machinery & Specialty Industrial', ['metalworking'])('Seetul (15 to 100)'),
  group('industrial', 'General Machinery & Specialty Industrial', ['metalworking'])('Seetul N (15 to 100)'),
  group('industrial', 'General Machinery & Specialty Industrial', ['compressor'])('Nu-Matic 100'),
  group('industrial', 'General Machinery & Specialty Industrial', ['compressor'])('Nu-Matic 220'),
  generalMachinery('Crush Well 2', { categories: ['gearbox'] }),
  generalMachinery('Crush Well 3', { categories: ['gearbox'] }),
  generalMachinery('Crush Well 4', { categories: ['gearbox'] }),
];

const heatTransfer = group('industrial', 'Heat Transfer Fluids', ['heat-transfer']);
const highTemp = { conditions: ['high-temp-shock'] };
// Also tagged 'general': these are the only grades HPCL lists for this
// category, so they should still surface when no special condition is
// picked, not just under the High Temperature filter.
const INDUSTRIAL_HEAT_TRANSFER = [
  heatTransfer('Hytherm Thermic Fluid 500', { conditions: ['general', 'high-temp-shock'] }),
  heatTransfer('Hytherm Thermic Fluid 600', { conditions: ['general', 'high-temp-shock'] }),
];

const industrialDefence = group('industrial', 'Defence Grades (Industrial)', ['turbine']);
const INDUSTRIAL_DEFENCE = [
  industrialDefence('HP OIL OM 33', { defence: true }),
  industrialDefence('HP OIL OM 100', { defence: true }),
  industrialDefence('HP OIL C 70', { categories: ['compressor'], defence: true }),
  industrialDefence('HP OIL C 600', { categories: ['compressor'], defence: true }),
  industrialDefence('HP OIL OX 52', { defence: true }),
];

// --- Industrial Specialities ---------------------------------------------

const metalworkingDrawing = group('industrial-specialities', 'Metal Working & Drawing', ['metalworking-drawing']);
const SPECIALITIES_METALWORKING = [
  metalworkingDrawing('Koolkut 40'),
  metalworkingDrawing('Koolkut 60'),
  metalworkingDrawing('Koolkut EP 66', ep),
  metalworkingDrawing('Koolkut 70'),
  metalworkingDrawing('Koolkut 80'),
  metalworkingDrawing('Synthkool 100', { conditions: ['eco-synthetic'] }),
  metalworkingDrawing('Trimofin (14 to 58)'),
  metalworkingDrawing('Trimol 225'),
  metalworkingDrawing('HP Hot Rolling Oil', highTemp),
  metalworkingDrawing('Rolmet N 34'),
  metalworkingDrawing('Rolmet 40'),
  metalworkingDrawing('Rolmet V 45'),
  metalworkingDrawing('Rolmet C 12'),
  metalworkingDrawing('Drawmet 15'),
  metalworkingDrawing('Drawmet 22'),
  metalworkingDrawing('Drawmet 44'),
  metalworkingDrawing('Drawmet 66'),
];

const heatTreatment = group('industrial-specialities', 'Heat Treatment & Processing', ['heat-treatment-processing']);
const SPECIALITIES_HEAT_TREATMENT = [
  heatTreatment('Metaquench 39', highTemp),
  heatTreatment('Metaquench 40', highTemp),
  heatTreatment('Metaquench 42', highTemp),
  heatTreatment('Metaquench 43', highTemp),
  heatTreatment('Metaquench 44', highTemp),
  heatTreatment('Metaquench 85', highTemp),
  heatTreatment('Metaquench 86', highTemp),
  heatTreatment('Elasto Rubber Process Oil (165 to 715)'),
];

const rustPreventive = group('industrial-specialities', 'Rust Preventives & Special Applications', ['rust-preventives-special']);
const SPECIALITIES_RUST_PREVENTIVE = [
  rustPreventive('Rustop 173'),
  rustPreventive('Rustop 184'),
  rustPreventive('Rustop 274'),
  rustPreventive('Rustop 276'),
  rustPreventive('Rustop 285'),
  rustPreventive('Rustop 286'),
  rustPreventive('Rustop 287'),
  rustPreventive('Rustop S'),
  rustPreventive('Rustop 387'),
  rustPreventive('Rustop 388'),
  rustPreventive('Unipro 36'),
  rustPreventive('Unipro 37'),
  rustPreventive('Unipro 38'),
  rustPreventive('HP Conkote'),
  rustPreventive('HP Spray Oil E'),
  rustPreventive('Glamol 40'),
  rustPreventive('HP Sulfotan'),
  rustPreventive('Cemol 35'),
  rustPreventive('HP Protective PX-10', { defence: true }),
];

// --- Greases --------------------------------------------------------------

const autoGrease = group('greases', 'Automotive Greases', ['automotive-grease']);
const GREASES_AUTOMOTIVE = [
  autoGrease('HP Chassis Grease'),
  autoGrease('HP Wheel Bearing Grease'),
  autoGrease('HP Multipurpose Grease 2'),
  autoGrease('HP Multipurpose Grease 3'),
  autoGrease('HP Multipurpose Grease 000'),
  autoGrease('HP Laal Ghoda AP Grease'),
  autoGrease('HP Lithon RR-3'),
];

const indGrease = group('greases', 'Industrial Greases', ['industrial-grease']);
const GREASES_INDUSTRIAL = [
  indGrease('Lithon 2'),
  indGrease('Lithon 3'),
  indGrease('Lithon EP1', ep),
  indGrease('Lithon EP2', ep),
  indGrease('Lithon M2'),
  indGrease('Lithoplex 2'),
  indGrease('Lithoplex 3'),
  indGrease('Limaplex 0'),
  indGrease('Limaplex 1'),
  indGrease('Limaplex 2'),
  indGrease('Plutek 1'),
  indGrease('Plutek 2'),
  indGrease('Draftlube 1'),
  indGrease('Draftlube 2'),
  indGrease('Tisona 2'),
  indGrease('Tisona M2'),
  group('greases', 'Defence Greases', ['industrial-grease'])('HP Grease LG 280', { defence: true }),
  group('greases', 'Defence Greases', ['industrial-grease'])('HP Grease SG 240', { defence: true }),
];

export const HPCL_GRADES = [
  ...AUTOMOTIVE_DIESEL,
  ...AUTOMOTIVE_GAS,
  ...AUTOMOTIVE_PETROL_4W,
  ...AUTOMOTIVE_PETROL_23W,
  ...AUTOMOTIVE_FIRST_FILL,
  ...AUTOMOTIVE_GEAR,
  ...AUTOMOTIVE_SPECIALITIES,
  ...INDUSTRIAL_TURBINE,
  ...INDUSTRIAL_HYDRAULIC,
  ...INDUSTRIAL_COMPRESSOR,
  ...INDUSTRIAL_MACHINE_TOOL,
  ...INDUSTRIAL_GENERAL_MACHINERY,
  ...INDUSTRIAL_HEAT_TRANSFER,
  ...INDUSTRIAL_DEFENCE,
  ...SPECIALITIES_METALWORKING,
  ...SPECIALITIES_HEAT_TREATMENT,
  ...SPECIALITIES_RUST_PREVENTIVE,
  ...GREASES_AUTOMOTIVE,
  ...GREASES_INDUSTRIAL,
];

// Directory grouping for display (Task: browsable reference directory) —
// sector -> ordered list of group labels -> grades, built once from the
// flat list above so the two views can never drift out of sync.
export const HPCL_DIRECTORY = HPCL_GRADES.reduce((sectors, grade) => {
  let sector = sectors.find((s) => s.id === grade.sector);
  if (!sector) {
    sector = { id: grade.sector, groups: [] };
    sectors.push(sector);
  }
  let groupEntry = sector.groups.find((g) => g.label === grade.group);
  if (!groupEntry) {
    groupEntry = { label: grade.group, grades: [] };
    sector.groups.push(groupEntry);
  }
  groupEntry.grades.push(grade);
  return sectors;
}, []);

// --- Grade finder (recommendation engine) wizard data ----------------------

export const RECOMMENDER_SECTORS = [
  { id: 'automotive', label: 'Automotive', blurb: 'Engine, gear and transmission oils for commercial, passenger and two/three-wheeler vehicles.' },
  { id: 'industrial', label: 'Industrial', blurb: 'Hydraulic, compressor, gearbox, turbine and bearing oils for plant machinery.' },
  { id: 'industrial-specialities', label: 'Industrial Specialities', blurb: 'Metalworking, heat treatment and rust-preventive fluids for process applications.' },
  { id: 'greases', label: 'Greases', blurb: 'Automotive and industrial greases across NLGI grades.' },
];

export const RECOMMENDER_CATEGORIES = {
  automotive: [
    { id: 'commercial-diesel', label: 'Commercial Heavy Diesel' },
    { id: 'passenger-petrol', label: 'Passenger Petrol Car' },
    { id: 'two-three-wheeler', label: '2-Wheeler / 3-Wheeler' },
    { id: 'tractor-agri', label: 'Tractor / Agricultural' },
    { id: 'railway-marine', label: 'Railway / Marine' },
    { id: 'hydraulic-transmission', label: 'Hydraulic / Transmission' },
  ],
  industrial: [
    { id: 'hydraulic', label: 'Hydraulic System' },
    { id: 'compressor', label: 'Air / Gas Compressor' },
    { id: 'gearbox', label: 'Industrial Gearbox' },
    { id: 'turbine', label: 'Turbine' },
    { id: 'metalworking', label: 'Metalworking / Cutting' },
    { id: 'bearing-slideway', label: 'Bearing / Slide Way' },
    { id: 'heat-transfer', label: 'Heat Transfer' },
  ],
  'industrial-specialities': [
    { id: 'metalworking-drawing', label: 'Metalworking & Drawing' },
    { id: 'heat-treatment-processing', label: 'Heat Treatment & Processing' },
    { id: 'rust-preventives-special', label: 'Rust Preventives & Special Applications' },
  ],
  greases: [
    { id: 'automotive-grease', label: 'Automotive Greases' },
    { id: 'industrial-grease', label: 'Industrial Greases' },
  ],
};

export const RECOMMENDER_CONDITIONS = [
  { id: 'general', label: 'Standard Duty', description: 'No special requirement — everyday running condition.' },
  { id: 'high-temp-shock', label: 'High Temperature / Shock Load', description: 'Sustained heat or sudden load spikes.' },
  { id: 'fire-resistant', label: 'Fire-Resistant', description: 'Near ignition sources or high fire-risk areas.' },
  { id: 'low-ash-cng', label: 'Low Ash / CNG', description: 'Gas-fuelled engines needing a low-ash formulation.' },
  { id: 'extreme-pressure', label: 'Extreme Pressure', description: 'Heavy, shock-loaded gears and contact surfaces.' },
  { id: 'food-textile-nonstaining', label: 'Food / Textile Non-Staining', description: 'Non-staining, food or textile-safe environments.' },
  { id: 'eco-synthetic', label: 'Eco / Synthetic', description: 'Synthetic-based, extended-drain formulations.' },
];

const CONDITION_PHRASE = {
  'high-temp-shock': 'sustained high-temperature or shock-load duty',
  'fire-resistant': 'fire-resistant service',
  'low-ash-cng': 'gas-fuelled, low-ash engine requirements',
  'extreme-pressure': 'extreme-pressure duty',
  'food-textile-nonstaining': 'non-staining, food or textile-safe environments',
  'eco-synthetic': 'synthetic-based, extended-drain duty',
};

// Deliberately descriptive, not evaluative — states where the grade sits in
// HPCL's own range rather than asserting a technical spec we haven't
// verified (no invented viscosity index, TBN, or API service claims).
export function describeFit(grade, categoryLabel, conditionId) {
  const conditionPhrase = CONDITION_PHRASE[conditionId];
  const usage = conditionPhrase ? `for ${conditionPhrase}` : `for standard ${categoryLabel.toLowerCase()} duty`;
  return `Listed under HPCL's ${grade.group} range, tagged ${usage}.`;
}

// Filters the static grade list for a sector/category/condition combination.
// Falls back from an exact condition match to any grade in that category so
// the tool never dead-ends on "no results" — it's explicit about which case
// it's in (isExact) so the UI can be honest about the difference.
export function findGrades({ sector, category, condition }) {
  const pool = HPCL_GRADES.filter((g) => g.sector === sector && g.categories.includes(category));
  const exact = pool.filter((g) => g.conditions.includes(condition));
  const isExact = exact.length > 0;
  const matches = isExact ? exact : pool.filter((g) => g.conditions.includes('general'));
  return { matches: matches.slice(0, 3), isExact, poolSize: pool.length };
}
