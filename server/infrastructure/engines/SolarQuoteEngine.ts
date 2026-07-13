import { IQuoteEngine, QuoteResult } from '../../interfaces/IQuoteEngine.js';

// ─── Business Pricing Table ──────────────────────────────────────────────────
// Source: O3 Energy México official quote ranges (bimestral → converted to monthly)
// Edit THIS table to update pricing — never change the LLM prompt numbers.
//
// Bimestral ranges reference:
//   $2,500–$4,000  bimestral  = $1,250–$2,000  monthly → 4–6 panels  → $70k–$90k MXN
//   $4,000–$6,000  bimestral  = $2,000–$3,000  monthly → 6–8 panels  → $90k–$120k MXN
//   $6,000–$10,000 bimestral  = $3,000–$5,000  monthly → 8–12 panels → $120k–$180k MXN
//   >$10,000       bimestral  = >$5,000         monthly → 12+ panels  → commercial

interface PriceTier {
  minMonthly: number;
  maxMonthly: number;
  panelsMid: number;     // midpoint of panel range for quote
  systemKwp: number;
  costMid: number;       // midpoint of cost range for quote
  roiYears: number;
  rangeLabel: string;    // human-readable range for the LLM
}

const PRICE_TABLE: PriceTier[] = [
  {
    minMonthly: 1250,
    maxMonthly: 2000,
    panelsMid: 5,
    systemKwp: 2.0,
    costMid: 80000,
    roiYears: 3.0,
    rangeLabel: '4 a 6 paneles',
  },
  {
    minMonthly: 2000,
    maxMonthly: 3000,
    panelsMid: 7,
    systemKwp: 2.8,
    costMid: 105000,
    roiYears: 3.5,
    rangeLabel: '6 a 8 paneles',
  },
  {
    minMonthly: 3000,
    maxMonthly: 5000,
    panelsMid: 10,
    systemKwp: 4.0,
    costMid: 150000,
    roiYears: 3.7,
    rangeLabel: '8 a 12 paneles',
  },
  {
    minMonthly: 5000,
    maxMonthly: Infinity,
    panelsMid: 14,
    systemKwp: 5.6,
    costMid: 220000,
    roiYears: 4.0,
    rangeLabel: '12+ paneles (sistema comercial)',
  },
];

// Extra load factor: bump to next tier if client plans to add heavy loads
const EXTRA_LOAD_FACTOR = 1.25;

export class SolarQuoteEngine implements IQuoteEngine {
  calculate(monthlyBillMxn: number, extraLoad = false): QuoteResult {
    // Adjust for extra load by inflating the bill equivalent
    const effectiveBill = extraLoad
      ? monthlyBillMxn * EXTRA_LOAD_FACTOR
      : monthlyBillMxn;

    // Find the matching tier from the business table
    const tier =
      PRICE_TABLE.find(
        (t) => effectiveBill >= t.minMonthly && effectiveBill < t.maxMonthly,
      ) ?? PRICE_TABLE[PRICE_TABLE.length - 1]; // default to top tier

    const panels = tier.panelsMid;
    const systemKwp = tier.systemKwp;
    const estimatedCost = tier.costMid;
    const roiYears = tier.roiYears;

    // Savings — 90% reduction on the ORIGINAL bill (not inflated)
    const annualSavings = Math.round(monthlyBillMxn * 0.90 * 12);
    const monthlySavings = Math.round(annualSavings / 12);

    return {
      monthlyBill: monthlyBillMxn,
      panels,
      systemPowerKw: systemKwp,
      estimatedCost,
      roiYears,
      monthlySavings,
      annualSavings,
      monthlySavingsFormatted: `$${monthlySavings.toLocaleString('es-MX')} MXN`,
      annualSavingsFormatted: `$${annualSavings.toLocaleString('es-MX')} MXN`,
      costFormatted: `$${estimatedCost.toLocaleString('es-MX')} MXN`,
      systemDescription: `${panels} paneles solares (sistema de ${systemKwp.toFixed(1)} kWp)`,
      disclaimer:
        'Este es un presupuesto preliminar. El costo final depende de la visita técnica sin costo en tu sitio (evaluación de inclinación del techo, sombras y trayectoria eléctrica).',
    };
  }
}
