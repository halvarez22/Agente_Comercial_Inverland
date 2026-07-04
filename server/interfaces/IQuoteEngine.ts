export interface QuoteResult {
  monthlyBill: number;
  panels: number;
  systemPowerKw: number;
  estimatedCost: number;
  roiYears: number;
  monthlySavings: number;
  annualSavings: number;
  costFormatted: string;
  systemDescription: string;
  disclaimer: string;
}

export interface IQuoteEngine {
  calculate(monthlyBillMxn: number, extraLoad?: boolean): QuoteResult;
}
