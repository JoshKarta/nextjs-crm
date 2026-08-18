import Decimal from "decimal.js";

// PRD §9: "Rounding rules must be explicitly defined and applied
// consistently in the service/domain layer." This is that definition.
//
// Rule: every intermediate and final monetary value is rounded to 4 decimal
// places using ROUND_HALF_UP, matching the NUMERIC(_, 4) columns used
// throughout the schema. 4 places (not 2) gives headroom for unit prices
// like $0.0125/unit on high-quantity line items without lossy intermediate
// rounding; final invoice totals will typically resolve cleanly to 2 places
// in practice for whole-cent currencies, but this module does not assume a
// currency's minor-unit count.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const MONEY_DECIMAL_PLACES = 4;

export function money(value: string | number | Decimal): Decimal {
  return new Decimal(value);
}

export function roundMoney(value: Decimal): Decimal {
  return value.toDecimalPlaces(MONEY_DECIMAL_PLACES, Decimal.ROUND_HALF_UP);
}

// Always store/return money as a plain decimal string — never a JS number —
// so it round-trips into a NUMERIC column without float artifacts.
export function toMoneyString(value: Decimal): string {
  return roundMoney(value).toFixed(MONEY_DECIMAL_PLACES);
}