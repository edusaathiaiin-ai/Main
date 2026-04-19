// data.gov.in Dataset Registry
// One API key — all datasets
// Find resource IDs at: data.gov.in/search

export const DATAGOVIN_RESOURCES = {

  // ── FINANCE & TAX ──────────────────────────────────────────
  // AccountSaathi, EconSaathi, FinSaathi
  GST_REVENUE: 'b3a12a05-77e1-44d6-ba51-d8f390d116a3', // Central indirect taxes + GST revenue monthly
  DIRECT_TAX_COLLECTION: 'TODO',          // Income tax, corporate tax
  UNION_BUDGET_EXPENDITURE: 'TODO',       // Ministry-wise expenditure

  // ── ECONOMY ────────────────────────────────────────────────
  // EconSaathi
  GDP_CURRENT_PRICES: 'TODO',             // GDP at current prices
  CPI_INFLATION: 'TODO',                  // Consumer Price Index
  WPI_INFLATION: 'TODO',                  // Wholesale Price Index
  TRADE_EXPORTS: 'TODO',                  // India exports data
  TRADE_IMPORTS: 'TODO',                  // India imports data
  INTL_AIR_TRAFFIC: 'da28d265-d62a-418b-82fe-329052b77846', // International air traffic — pax + freight
  FOREX_RESERVES: 'TODO',                 // Foreign exchange reserves

  // ── AGRICULTURE ────────────────────────────────────────────
  // AgriSaathi
  CROP_PRODUCTION: 'TODO',               // State-wise crop production
  MSP_CROPS: 'TODO',                     // Minimum support prices
  AGMARKNET_PRICES: 'TODO',              // Mandi/APMC live prices
  RAINFALL_DISTRICT: 'TODO',             // District-wise rainfall
  SOIL_HEALTH: 'TODO',                   // Soil health card data

  // ── ENVIRONMENT ────────────────────────────────────────────
  // EnviroSaathi
  AQI_CITY: '3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69', // Real-time AQI from 3400+ stations
  FOREST_COVER_STATE: 'TODO',            // Forest cover by state
  WATER_QUALITY: 'TODO',                 // River water quality

  // ── POLITICAL SCIENCE ──────────────────────────────────────
  // PolSciSaathi
  ELECTION_RESULTS_LS: 'TODO',           // Lok Sabha election results
  ELECTION_RESULTS_STATE: 'TODO',        // State election results
  PARLIAMENT_SESSIONS: 'TODO',           // Parliament session data

  // ── CIVIL ENGINEERING ──────────────────────────────────────
  // CivilSaathi
  SMART_CITIES_PROGRESS: 'TODO',         // Smart Cities Mission
  PMGSY_ROADS: 'TODO',                   // Rural road connectivity
  INFRASTRUCTURE_PROJECTS: 'TODO',       // National infrastructure pipeline

  // ── HEALTH ─────────────────────────────────────────────────
  // MedicoSaathi, NursingSaathi, PharmaSaathi
  HOSPITAL_INFRASTRUCTURE: 'TODO',       // District hospitals data
  DRUG_PRICES_NPPA: 'TODO',             // Drug price control orders
  IMMUNISATION_COVERAGE: 'TODO',        // Vaccination coverage

  // ── EDUCATION ──────────────────────────────────────────────
  // All Saathis
  AISHE_COLLEGES: 'TODO',               // All India higher education survey
  SCHOOL_UDISE: 'TODO',                 // School education data
  SCHOLARSHIP_DATA: 'TODO',             // National scholarship data
}

// Saathi → relevant datasets mapping
export const SAATHI_DATASETS: Record<string, (keyof typeof DATAGOVIN_RESOURCES)[]> = {
  accountsaathi: ['GST_REVENUE', 'DIRECT_TAX_COLLECTION', 'UNION_BUDGET_EXPENDITURE'],
  econsaathi:    ['GDP_CURRENT_PRICES', 'CPI_INFLATION', 'WPI_INFLATION', 'TRADE_EXPORTS', 'FOREX_RESERVES', 'GST_REVENUE'],
  finsaathi:     ['GST_REVENUE', 'DIRECT_TAX_COLLECTION', 'FOREX_RESERVES'],
  agrisaathi:    ['CROP_PRODUCTION', 'MSP_CROPS', 'AGMARKNET_PRICES', 'RAINFALL_DISTRICT'],
  envirosaathi:  ['AQI_CITY', 'FOREST_COVER_STATE', 'WATER_QUALITY'],
  polscisaathi:  ['ELECTION_RESULTS_LS', 'ELECTION_RESULTS_STATE', 'PARLIAMENT_SESSIONS'],
  civilsaathi:   ['SMART_CITIES_PROGRESS', 'PMGSY_ROADS', 'INFRASTRUCTURE_PROJECTS'],
  medicosaathi:  ['HOSPITAL_INFRASTRUCTURE', 'DRUG_PRICES_NPPA', 'IMMUNISATION_COVERAGE'],
  nursingsaathi: ['HOSPITAL_INFRASTRUCTURE', 'IMMUNISATION_COVERAGE'],
  pharmasaathi:  ['DRUG_PRICES_NPPA'],
  aerospacesaathi: ['INTL_AIR_TRAFFIC'],
}

// Trigger keywords per dataset
export const DATASET_TRIGGERS: Record<keyof typeof DATAGOVIN_RESOURCES, string[]> = {
  GST_REVENUE: ['gst', 'goods and services tax', 'indirect tax', 'tax collection', 'cgst', 'igst'],
  DIRECT_TAX_COLLECTION: ['income tax', 'corporate tax', 'direct tax', 'tds'],
  GDP_CURRENT_PRICES: ['gdp', 'gross domestic product', 'economic growth', 'national income'],
  CPI_INFLATION: ['inflation', 'cpi', 'consumer price', 'price rise', 'cost of living'],
  WPI_INFLATION: ['wpi', 'wholesale price', 'wholesale inflation'],
  CROP_PRODUCTION: ['crop production', 'yield', 'harvest', 'agriculture output'],
  MSP_CROPS: ['msp', 'minimum support price', 'procurement price'],
  AGMARKNET_PRICES: ['mandi price', 'apmc', 'market price', 'agmarknet'],
  AQI_CITY: ['air quality', 'aqi', 'pollution', 'pm2.5', 'air pollution'],
  FOREST_COVER_STATE: ['forest cover', 'deforestation', 'tree cover', 'green cover'],
  ELECTION_RESULTS_LS: ['lok sabha', 'election results', 'mp elected', 'constituency'],
  DRUG_PRICES_NPPA: ['drug price', 'medicine cost', 'nppa', 'essential medicines'],
  HOSPITAL_INFRASTRUCTURE: ['hospital', 'health infrastructure', 'beds', 'doctors ratio'],
  AISHE_COLLEGES: ['colleges in india', 'higher education', 'aishe', 'university count'],
  UNION_BUDGET_EXPENDITURE: ['budget', 'government expenditure', 'fiscal deficit'],
  TRADE_EXPORTS: ['exports', 'trade surplus', 'merchandise exports'],
  TRADE_IMPORTS: ['imports', 'trade deficit'],
  FOREX_RESERVES: ['forex', 'foreign exchange', 'dollar reserves'],
  RAINFALL_DISTRICT: ['rainfall', 'monsoon', 'precipitation'],
  SOIL_HEALTH: ['soil health', 'soil quality', 'soil card'],
  WATER_QUALITY: ['water quality', 'river pollution', 'water contamination'],
  ELECTION_RESULTS_STATE: ['state election', 'assembly election', 'mla'],
  PARLIAMENT_SESSIONS: ['parliament', 'lok sabha session', 'rajya sabha'],
  SMART_CITIES_PROGRESS: ['smart city', 'smart cities mission', 'urban development'],
  PMGSY_ROADS: ['rural roads', 'pmgsy', 'village connectivity'],
  INFRASTRUCTURE_PROJECTS: ['infrastructure', 'national projects', 'pip'],
  IMMUNISATION_COVERAGE: ['vaccination', 'immunisation', 'polio', 'measles'],
  SCHOOL_UDISE: ['school data', 'udise', 'school infrastructure'],
  SCHOLARSHIP_DATA: ['scholarship', 'financial aid', 'stipend'],
  INTL_AIR_TRAFFIC: ['air traffic', 'international flights', 'passenger traffic', 'aviation data', 'freight traffic'],
}
