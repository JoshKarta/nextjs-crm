import { money, roundMoney, toMoneyString } from "@/lib/money";
import { ValidationError } from "@/lib/errors";

export interface LineItemCalcInput {
  quantity: string;
  unitPrice: string;
  discountType?: "FIXED" | "PERCENTAGE" | null;
  discountValue?: string | null;
  taxRate: string;
}

export interface LineItemCalcResult {
  subtotalAmount: string; // quantity * unitPrice, before discount
  discountAmount: string;
  taxAmount: string; // computed on the DISCOUNTED amount
  totalAmount: string; // subtotal - discount + tax
}

// Calculation sequence, verbatim from PRD §9:
//   1. quantity × unit price
//   2. apply discount
//   3. calculate tax on the discounted amount
//   4. derive line total
//   5. aggregate invoice totals (see calculateInvoiceTotals below)
export function calculateLineItem(input: LineItemCalcInput): LineItemCalcResult {
  const quantity = money(input.quantity);
  const unitPrice = money(input.unitPrice);

  if (quantity.lte(0)) throw new ValidationError("Line item quantity must be positive");
  if (unitPrice.lt(0)) throw new ValidationError("Line item unit price cannot be negative");

  // 1. quantity × unit price
  const rawSubtotal = quantity.times(unitPrice);

  // 2. apply discount
  let discountAmount = money(0);
  if (input.discountType && input.discountValue) {
    const discountValue = money(input.discountValue);
    if (discountValue.lt(0)) throw new ValidationError("Discount value cannot be negative");

    if (input.discountType === "PERCENTAGE") {
      if (discountValue.gt(1)) {
        throw new ValidationError("Percentage discount must be a fraction between 0 and 1");
      }
      discountAmount = rawSubtotal.times(discountValue);
    } else {
      discountAmount = discountValue;
    }

    if (discountAmount.gt(rawSubtotal)) {
      throw new ValidationError("Discount cannot exceed the line item subtotal");
    }
  }

  const discountedAmount = rawSubtotal.minus(discountAmount);

  // 3. calculate tax on the discounted amount
  const taxRate = money(input.taxRate);
  if (taxRate.lt(0) || taxRate.gt(1)) {
    throw new ValidationError("taxRate must be a fraction between 0 and 1");
  }
  const taxAmount = discountedAmount.times(taxRate);

  // 4. derive line total
  const totalAmount = discountedAmount.plus(taxAmount);

  return {
    subtotalAmount: toMoneyString(rawSubtotal),
    discountAmount: toMoneyString(discountAmount),
    taxAmount: toMoneyString(taxAmount),
    totalAmount: toMoneyString(totalAmount),
  };
}

export interface InvoiceTotals {
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  totalAmount: string;
}

// 5. aggregate invoice totals — a straight sum of already-rounded line
// items, not a re-derivation from raw quantities. Summing rounded values
// (rather than summing raw Decimals and rounding once at the end) is the
// deliberate choice here: it guarantees the invoice total always equals the
// visible sum of its line items, which is what a person reviewing the
// invoice will check by hand.
export function calculateInvoiceTotals(
  items: Array<Pick<LineItemCalcResult, "subtotalAmount" | "discountAmount" | "taxAmount" | "totalAmount">>
): InvoiceTotals {
  let subtotal = money(0);
  let discount = money(0);
  let tax = money(0);
  let total = money(0);

  for (const item of items) {
    subtotal = subtotal.plus(item.subtotalAmount);
    discount = discount.plus(item.discountAmount);
    tax = tax.plus(item.taxAmount);
    total = total.plus(item.totalAmount);
  }

  return {
    subtotalAmount: toMoneyString(roundMoney(subtotal)),
    discountAmount: toMoneyString(roundMoney(discount)),
    taxAmount: toMoneyString(roundMoney(tax)),
    totalAmount: toMoneyString(roundMoney(total)),
  };
}