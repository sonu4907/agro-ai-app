/**
 * schemesData.ts
 * Complete database of Indian Government Agricultural Schemes
 * with smart matching rules based on crop, disease, and condition.
 */

export type SchemeCategory =
  | 'insurance'
  | 'credit'
  | 'subsidy'
  | 'market'
  | 'organic'
  | 'water'
  | 'research'
  | 'income'

export interface Scheme {
  id:            string
  name:          string
  shortName:     string
  emoji:         string
  category:      SchemeCategory
  ministry:      string
  launchedYear:  number
  benefit:       string
  benefitAmount: string
  eligibility:   string[]
  cropTypes:     string[]    // 'all' or specific crops
  conditions:    string[]    // 'diseased' | 'healthy' | 'any' | 'kharif' | 'rabi'
  applyUrl:      string
  helpline:      string
  description:   string
  keyPoints:     string[]
  matchScore:    (opts: MatchOpts) => number  // returns 0-100
}

export interface MatchOpts {
  plantName:  string
  disease:    string
  isHealthy:  boolean
  cropType:   string
  severity:   string
  language:   string
}

/* ── Helper: check if plant matches crop list ─────────── */
/* ══════════════════════════════════════════════════════════
   SCHEMES DATABASE
══════════════════════════════════════════════════════════ */
export const ALL_SCHEMES: Scheme[] = [

  /* ───────────────────────────────────────────────────────
     1. PM Fasal Bima Yojana (PMFBY)
  ─────────────────────────────────────────────────────── */
  {
    id:           'pmfby',
    name:         'Pradhan Mantri Fasal Bima Yojana',
    shortName:    'PM Fasal Bima',
    emoji:        '🛡️',
    category:     'insurance',
    ministry:     'Ministry of Agriculture & Farmers Welfare',
    launchedYear: 2016,
    benefit:      'Comprehensive crop insurance against natural calamities, pests & diseases',
    benefitAmount: '₹2 lakh+ claim per hectare (crop-dependent)',
    eligibility: [
      'All farmers growing notified crops',
      'Both loanee and non-loanee farmers',
      'Sharecroppers and tenant farmers',
      'Valid land record or tenancy agreement required',
    ],
    cropTypes: ['all'],
    conditions: ['any'],
    applyUrl:  'https://pmfby.gov.in/',
    helpline:  '1800-200-7710',
    description:
      'India\'s flagship crop insurance scheme providing financial support to farmers suffering crop loss/damage due to unforeseen events like natural calamities, pests and diseases.',
    keyPoints: [
      'Premium: Only 2% for Kharif, 1.5% for Rabi, 5% for commercial crops',
      'Claims settled within 2 months of crop cutting',
      'Covers pre-sowing to post-harvest losses',
      'Satellite & drone technology for loss assessment',
    ],
    matchScore: ({ isHealthy, severity }) => {
      // Higher relevance when crop is diseased (financial loss likely)
      if (!isHealthy) {
        if (severity?.toLowerCase() === 'critical') return 98
        if (severity?.toLowerCase() === 'high')     return 92
        return 82
      }
      return 60  // Always somewhat relevant
    },
  },

  /* ───────────────────────────────────────────────────────
     2. PM-KISAN
  ─────────────────────────────────────────────────────── */
  {
    id:           'pmkisan',
    name:         'Pradhan Mantri Kisan Samman Nidhi',
    shortName:    'PM-KISAN',
    emoji:        '💰',
    category:     'income',
    ministry:     'Ministry of Agriculture & Farmers Welfare',
    launchedYear: 2019,
    benefit:      'Direct income support to farmer families',
    benefitAmount: '₹6,000 per year in 3 instalments of ₹2,000',
    eligibility: [
      'Small and marginal farmers with cultivable land',
      'Land holding up to 2 hectares',
      'Valid Aadhaar card mandatory',
      'Indian citizen',
    ],
    cropTypes: ['all'],
    conditions: ['any'],
    applyUrl:  'https://pmkisan.gov.in/',
    helpline:  '155261',
    description:
      'Central sector scheme providing income support of ₹6,000/year to all land-holding farmer families to meet their agricultural and domestic needs.',
    keyPoints: [
      'Direct bank transfer (DBT) to farmer\'s account',
      'No intermediaries — money goes directly to farmer',
      'Self-registration available online at pmkisan.gov.in',
      '11+ crore farmers already benefiting',
    ],
    matchScore: () => 75,  // Always relevant for all farmers
  },

  /* ───────────────────────────────────────────────────────
     3. Kisan Credit Card (KCC)
  ─────────────────────────────────────────────────────── */
  {
    id:           'kcc',
    name:         'Kisan Credit Card Scheme',
    shortName:    'Kisan Credit Card',
    emoji:        '💳',
    category:     'credit',
    ministry:     'Ministry of Finance / NABARD',
    launchedYear: 1998,
    benefit:      'Short-term credit for seeds, fertilizers, pesticides',
    benefitAmount: 'Credit limit up to ₹3 lakh at 4% interest (with subvention)',
    eligibility: [
      'All farmers — individual, joint, tenant farmers',
      'Self Help Groups (SHGs) of farmers',
      'Valid land record or lease agreement',
      'No upper income limit',
    ],
    cropTypes: ['all'],
    conditions: ['any'],
    applyUrl:  'https://www.nabard.org/auth/writereaddata/tender/1608180417KCC%20Scheme.pdf',
    helpline:  '1800-180-1551',
    description:
      'Provides farmers timely credit for crop cultivation, post-harvest expenses, maintenance of farm assets, allied activities and consumption requirements.',
    keyPoints: [
      'Interest rate as low as 4% p.a. with government subvention',
      'ATM-enabled RuPay debit card provided',
      'No collateral up to ₹1.6 lakh',
      'Revolving credit — withdraw and repay anytime',
    ],
    matchScore: ({ isHealthy, severity }) => {
      // Extra relevant when disease detected (need funds for pesticides)
      if (!isHealthy) {
        if (severity?.toLowerCase() === 'critical') return 90
        return 80
      }
      return 65
    },
  },

  /* ───────────────────────────────────────────────────────
     4. RKVY — Rashtriya Krishi Vikas Yojana
  ─────────────────────────────────────────────────────── */
  {
    id:           'rkvy',
    name:         'Rashtriya Krishi Vikas Yojana',
    shortName:    'RKVY-RAFTAAR',
    emoji:        '🚀',
    category:     'subsidy',
    ministry:     'Ministry of Agriculture & Farmers Welfare',
    launchedYear: 2007,
    benefit:      'Financial support for agricultural infrastructure and innovation',
    benefitAmount: 'Grants up to ₹25 lakh for agri-startups; state allocations vary',
    eligibility: [
      'Farmers, FPOs, agri-entrepreneurs',
      'State-wise selection through District Agriculture Office',
      'Priority for distressed farmers',
    ],
    cropTypes: ['all'],
    conditions: ['any'],
    applyUrl:  'https://rkvy.nic.in/',
    helpline:  '1800-180-1551',
    description:
      'Provides flexibility to states to create new schemes and make local investments to boost agriculture production and farmers\' income through end-to-end solutions.',
    keyPoints: [
      'Covers infrastructure, technology, market linkage',
      'Includes agri-startups and innovation grants',
      'State-wise projects: farm mechanization, irrigation',
      'Agri-incubation funding for rural entrepreneurs',
    ],
    matchScore: () => 55,
  },

  /* ───────────────────────────────────────────────────────
     5. Soil Health Card Scheme
  ─────────────────────────────────────────────────────── */
  {
    id:           'shc',
    name:         'Soil Health Card Scheme',
    shortName:    'Soil Health Card',
    emoji:        '🟫',
    category:     'research',
    ministry:     'Ministry of Agriculture & Farmers Welfare',
    launchedYear: 2015,
    benefit:      'Free soil testing and nutrient recommendations',
    benefitAmount: 'Free soil testing + customized fertilizer advisory',
    eligibility: [
      'All farmers in India',
      'No land holding limit',
      'Apply at nearest Krishi Vigyan Kendra or Agriculture office',
    ],
    cropTypes: ['all'],
    conditions: ['any'],
    applyUrl:  'https://soilhealth.dac.gov.in/',
    helpline:  '1800-180-1551',
    description:
      'Issues Soil Health Cards to farmers with soil nutrient status and recommendations on appropriate dosage of nutrients for improved soil health and fertility.',
    keyPoints: [
      'Tests 12 key soil parameters (NPK, micronutrients, pH)',
      'Crop-specific fertilizer recommendations',
      'Issued every 2 years per plot',
      '22 crore+ cards issued across India',
    ],
    matchScore: ({ disease, isHealthy }) => {
      const d = disease?.toLowerCase() || ''
      // Extra relevant for nutrient-deficiency diseases
      if (d.includes('deficiency') || d.includes('chlorosis') || d.includes('yellowing')) return 95
      if (!isHealthy) return 70  // Soil health could be contributing factor
      return 60
    },
  },

  /* ───────────────────────────────────────────────────────
     6. PMKSY — PM Krishi Sinchayee Yojana
  ─────────────────────────────────────────────────────── */
  {
    id:           'pmksy',
    name:         'Pradhan Mantri Krishi Sinchayee Yojana',
    shortName:    'PMKSY Irrigation',
    emoji:        '💧',
    category:     'water',
    ministry:     'Ministry of Agriculture & Jal Shakti',
    launchedYear: 2015,
    benefit:      'Drip & sprinkler irrigation subsidy (up to 55% for small farmers)',
    benefitAmount: '45–55% subsidy on micro-irrigation systems',
    eligibility: [
      'All categories of farmers',
      'Priority to small and marginal farmers (55% subsidy)',
      'OBC/SC/ST farmers get higher subsidy',
      'Minimum 0.5 acre land holding',
    ],
    cropTypes: ['all'],
    conditions: ['any'],
    applyUrl:  'https://pmksy.gov.in/',
    helpline:  '1800-180-1551',
    description:
      '"Har Khet Ko Pani" — ensuring irrigation access to every farm. Includes drip irrigation, sprinklers, watershed development, and groundwater recharge.',
    keyPoints: [
      '55% subsidy for small/marginal farmers on drip irrigation',
      'Reduces water use by 40-50% vs flood irrigation',
      'Improves crop yield by 20-40%',
      'Integrated with Fertilization (Fertigation) systems',
    ],
    matchScore: ({ disease }) => {
      const d = disease?.toLowerCase() || ''
      // Water-related diseases benefit most from proper irrigation
      if (d.includes('rot') || d.includes('blight') || d.includes('wilt')) return 78
      return 55
    },
  },

  /* ───────────────────────────────────────────────────────
     7. PKVY — Paramparagat Krishi Vikas Yojana (Organic)
  ─────────────────────────────────────────────────────── */
  {
    id:           'pkvy',
    name:         'Paramparagat Krishi Vikas Yojana',
    shortName:    'PKVY Organic Farming',
    emoji:        '🌿',
    category:     'organic',
    ministry:     'Ministry of Agriculture & Farmers Welfare',
    launchedYear: 2015,
    benefit:      '₹50,000/hectare over 3 years for organic farming conversion',
    benefitAmount: '₹50,000/ha over 3 years (seeds, certification, training)',
    eligibility: [
      'Farmers willing to adopt organic farming',
      'Cluster of minimum 50 farmers (20 ha)',
      'No chemical use for 3+ years required for certification',
      'PGS (Participatory Guarantee System) participation',
    ],
    cropTypes: ['all'],
    conditions: ['any'],
    applyUrl:  'https://pgsindia-ncof.gov.in/PKVY/Index.aspx',
    helpline:  '1800-180-1551',
    description:
      'Promotes organic farming through cluster approach, PGS certification, and end-to-end support including seeds, compost, organic pesticides, marketing support and brand building.',
    keyPoints: [
      '₹50,000/ha support over 3 years',
      'Organic certification (PGS-India) provided free',
      'Training in organic pest management',
      'Helps get premium price for organic produce',
    ],
    matchScore: ({ disease }) => {
      const d = disease?.toLowerCase() || ''
      // Organic approach most relevant for fungal diseases treated with neem/copper
      if (d.includes('fungal') || d.includes('mildew') || d.includes('rust') || d.includes('blight')) return 80
      return 55
    },
  },

  /* ───────────────────────────────────────────────────────
     8. e-NAM — National Agriculture Market
  ─────────────────────────────────────────────────────── */
  {
    id:           'enam',
    name:         'e-National Agriculture Market',
    shortName:    'e-NAM Online Mandi',
    emoji:        '📱',
    category:     'market',
    ministry:     'Ministry of Agriculture & Farmers Welfare',
    launchedYear: 2016,
    benefit:      'Sell produce online to national buyers — better prices, less middlemen',
    benefitAmount: '10-15% better price realization on average',
    eligibility: [
      'All farmers with produce to sell',
      'Registration at local APMC/Mandi office',
      'Aadhaar and bank account required',
      'Available in 1,260+ mandis across 23 states',
    ],
    cropTypes: ['all'],
    conditions: ['healthy'],
    applyUrl:  'https://www.enam.gov.in/',
    helpline:  '1800-270-0224',
    description:
      'Pan-India electronic trading portal for agricultural commodities, enabling farmers to sell from any connected mandi, get competitive prices, and receive payment directly in bank.',
    keyPoints: [
      '1,260+ mandis across India connected',
      'Online quality testing, bidding, payment',
      'WhatsApp-based e-NAM for rural farmers',
      'Same-day payment guarantee',
    ],
    matchScore: ({ isHealthy }) => isHealthy ? 75 : 40,
  },

  /* ───────────────────────────────────────────────────────
     9. NHM — National Horticulture Mission
  ─────────────────────────────────────────────────────── */
  {
    id:           'nhm',
    name:         'Mission for Integrated Development of Horticulture',
    shortName:    'MIDH / NHM',
    emoji:        '🥦',
    category:     'subsidy',
    ministry:     'Ministry of Agriculture & Farmers Welfare',
    launchedYear: 2014,
    benefit:      'Subsidy on planting material, protected cultivation, cold chain',
    benefitAmount: '40–50% subsidy on horticulture infrastructure',
    eligibility: [
      'Farmers growing fruits, vegetables, spices, flowers',
      'Individual farmers, FPOs, SHGs',
      'State-wise application through Horticulture Department',
    ],
    cropTypes: [
      'tomato', 'potato', 'onion', 'mango', 'banana', 'grapes', 'apple',
      'chilli', 'pepper', 'cucumber', 'eggplant', 'brinjal', 'strawberry',
      'guava', 'pear', 'citrus', 'orange', 'lemon', 'spinach', 'cauliflower',
      'cabbage', 'pea', 'bean', 'garlic', 'ginger', 'turmeric', 'flower',
    ],
    conditions: ['any'],
    applyUrl:  'https://midh.gov.in/',
    helpline:  '1800-180-1551',
    description:
      'Holistic development of horticulture sector covering production, post-harvest management and market linkages for sustainable income of horticulture farmers.',
    keyPoints: [
      '40% subsidy on protected cultivation (polyhouse/greenhouse)',
      'Subsidy on drip irrigation for vegetables',
      'Cold storage and pack house subsidies',
      'Disease-resistant variety seeds subsidized',
    ],
    matchScore: ({ plantName, cropType }) => {
      const hortiCrops = ['tomato', 'potato', 'onion', 'mango', 'banana', 'grape', 'apple',
        'chilli', 'pepper', 'cucumber', 'brinjal', 'eggplant', 'strawberry', 'guava']
      const p = (plantName + ' ' + cropType).toLowerCase()
      if (hortiCrops.some(c => p.includes(c))) return 88
      return 35
    },
  },

  /* ───────────────────────────────────────────────────────
     10. IPM — Integrated Pest Management Programme
  ─────────────────────────────────────────────────────── */
  {
    id:           'ipm',
    name:         'National IPM Programme',
    shortName:    'IPM Programme',
    emoji:        '🐛',
    category:     'research',
    ministry:     'Directorate of Plant Protection (DPPQ&S)',
    launchedYear: 1992,
    benefit:      'Free bio-pesticide distribution and IPM training for farmers',
    benefitAmount: 'Free pest management kits + technical guidance',
    eligibility: [
      'All farmers in India',
      'Apply through Block Agriculture Office',
      'Free training camps organized in villages',
    ],
    cropTypes: ['all'],
    conditions: ['diseased'],
    applyUrl:  'https://ppqs.gov.in/divisions/integrated-pest-management',
    helpline:  '011-25846491',
    description:
      'Promotes eco-friendly pest management — reducing chemical pesticide use by 50% and encouraging biological control, resistant varieties, and cultural practices.',
    keyPoints: [
      'Free Farmer Field Schools (FFS) training',
      'Subsidized bio-pesticides (Trichoderma, NPV, etc.)',
      'Pest Surveillance and early warning system',
      '30 Bio-control Research Laboratories across India',
    ],
    matchScore: ({ isHealthy, disease }) => {
      if (!isHealthy) {
        const d = disease?.toLowerCase() || ''
        if (d.includes('pest') || d.includes('insect') || d.includes('aphid') ||
            d.includes('mite') || d.includes('thrip') || d.includes('worm') ||
            d.includes('borer') || d.includes('fly'))  return 95
        return 80  // Disease management always relevant
      }
      return 45
    },
  },

  /* ───────────────────────────────────────────────────────
     11. NFSM — National Food Security Mission
  ─────────────────────────────────────────────────────── */
  {
    id:           'nfsm',
    name:         'National Food Security Mission',
    shortName:    'NFSM',
    emoji:        '🌾',
    category:     'subsidy',
    ministry:     'Ministry of Agriculture & Farmers Welfare',
    launchedYear: 2007,
    benefit:      'Subsidized improved seeds, farm machinery, nutrients',
    benefitAmount: '50% subsidy on certified seeds, demo plots support',
    eligibility: [
      'Farmers growing rice, wheat, pulses, coarse cereals',
      'State-wise targeted districts (low productivity districts)',
    ],
    cropTypes: [
      'wheat', 'rice', 'paddy', 'maize', 'corn', 'pulses', 'lentil',
      'chickpea', 'pigeon pea', 'soybean', 'mustard', 'rapeseed',
    ],
    conditions: ['any'],
    applyUrl:  'https://nfsm.gov.in/',
    helpline:  '1800-180-1551',
    description:
      'Aims at increasing production of food grains in targeted districts through area expansion and productivity enhancement using high-yielding varieties and modern technology.',
    keyPoints: [
      '50% subsidy on certified high-yielding seeds',
      'Free demonstration plots for new varieties',
      'Farm machinery subsidy (seed drills, zero-till machines)',
      'Covers post-harvest losses through storage support',
    ],
    matchScore: ({ plantName, cropType }) => {
      const foodCrops = ['wheat', 'rice', 'paddy', 'maize', 'corn', 'pulse', 'lentil', 'chickpea', 'soybean']
      const p = (plantName + ' ' + cropType).toLowerCase()
      if (foodCrops.some(c => p.includes(c))) return 85
      return 35
    },
  },

  /* ───────────────────────────────────────────────────────
     12. Agriculture Infrastructure Fund (AIF)
  ─────────────────────────────────────────────────────── */
  {
    id:           'aif',
    name:         'Agriculture Infrastructure Fund',
    shortName:    'AIF Loan Scheme',
    emoji:        '🏗️',
    category:     'credit',
    ministry:     'Ministry of Agriculture & Farmers Welfare',
    launchedYear: 2020,
    benefit:      '3% interest subvention on loans for post-harvest infrastructure',
    benefitAmount: '3% interest subvention on loans up to ₹2 crore',
    eligibility: [
      'Farmers, FPOs, PACS, Agri-entrepreneurs',
      'For cold chains, warehouses, sorting/grading, processing',
      'Bank/NBFC loan application required',
    ],
    cropTypes: ['all'],
    conditions: ['any'],
    applyUrl:  'https://agriinfra.dac.gov.in/',
    helpline:  '1800-180-1551',
    description:
      '₹1 lakh crore fund providing affordable credit with interest subvention to build post-harvest management infrastructure and community farming assets.',
    keyPoints: [
      'Interest subvention of 3% p.a. for 7 years',
      'Credit guarantee under CGTMSE',
      'For cold storage, processing units, warehouses',
      '1 lakh crore total fund size',
    ],
    matchScore: () => 50,
  },
]

/* ══════════════════════════════════════════════════════════
   MATCHING ENGINE
══════════════════════════════════════════════════════════ */
export interface MatchedScheme {
  scheme:      Scheme
  score:       number
  matchReason: string
  priority:    'critical' | 'high' | 'medium' | 'low'
}

export function matchSchemes(opts: MatchOpts): MatchedScheme[] {
  const results: MatchedScheme[] = []

  for (const scheme of ALL_SCHEMES) {
    const score = scheme.matchScore(opts)
    if (score < 30) continue  // filter out very low relevance

    let matchReason = ''
    // Build the human-readable match reason
    if (!opts.isHealthy) {
      if (scheme.category === 'insurance')
        matchReason = `Your ${opts.plantName || 'crop'} has ${opts.disease} — you may be eligible for crop loss compensation`
      else if (scheme.category === 'credit')
        matchReason = `Get affordable credit to buy pesticides and treatment for ${opts.disease}`
      else if (scheme.id === 'ipm')
        matchReason = `Free bio-pesticide kits and expert guidance for ${opts.disease} management`
      else if (scheme.id === 'shc')
        matchReason = `Soil health analysis can help identify contributing factors to ${opts.disease}`
      else if (scheme.id === 'pkvy')
        matchReason = `Organic treatment methods for ${opts.disease} — neem oil, copper fungicide etc.`
      else
        matchReason = `Support available for ${opts.plantName || 'your crop'} growers`
    } else {
      if (scheme.id === 'enam')
        matchReason = `Your healthy ${opts.plantName || 'crop'} can fetch better prices on e-NAM digital mandi`
      else if (scheme.id === 'pmkisan')
        matchReason = `All farmers qualify for ₹6,000/year direct income support`
      else if (scheme.id === 'kcc')
        matchReason = `Low-interest credit for seeds, fertilizers, and crop inputs`
      else
        matchReason = `Scheme available to support ${opts.plantName || 'your crop'} cultivation`
    }

    const priority: MatchedScheme['priority'] =
      score >= 85 ? 'critical' :
      score >= 70 ? 'high'     :
      score >= 55 ? 'medium'   : 'low'

    results.push({ scheme, score, matchReason, priority })
  }

  // Sort by score descending
  return results.sort((a, b) => b.score - a.score)
}

/* ── Category meta ─────────────────────────────────────── */
export const CATEGORY_META: Record<SchemeCategory, { label: string; gradient: string; textColor: string }> = {
  insurance: { label: 'Insurance',    gradient: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)', textColor: '#93c5fd' },
  credit:    { label: 'Credit/Loan',  gradient: 'linear-gradient(135deg,#1a3a2a,#16a34a)', textColor: '#86efac' },
  subsidy:   { label: 'Subsidy',      gradient: 'linear-gradient(135deg,#2d1a3e,#7c3aed)', textColor: '#d8b4fe' },
  market:    { label: 'Market',       gradient: 'linear-gradient(135deg,#3a2000,#b45309)', textColor: '#fcd34d' },
  organic:   { label: 'Organic',      gradient: 'linear-gradient(135deg,#0f2818,#15803d)', textColor: '#4ade80' },
  water:     { label: 'Irrigation',   gradient: 'linear-gradient(135deg,#0c2a3e,#0891b2)', textColor: '#67e8f9' },
  research:  { label: 'Research/Info',gradient: 'linear-gradient(135deg,#2a1a3e,#9333ea)', textColor: '#e9d5ff' },
  income:    { label: 'Income Support',gradient: 'linear-gradient(135deg,#3a1a00,#c2410c)', textColor: '#fed7aa' },
}
