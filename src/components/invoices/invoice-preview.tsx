"use client";

import type { Invoice, InvoiceItem, Contact, InvoiceTemplateLayout } from "@/db/schema";
import { Badge } from "@/components/ui/badge";

interface InvoicePreviewProps {
  invoice: Invoice & { items: InvoiceItem[]; contact?: Contact | null };
  layout?: InvoiceTemplateLayout | null;
}

export function InvoicePreview({ invoice, layout }: InvoicePreviewProps) {
  const contact = invoice.contact;
  const items = invoice.items || [];

  const contactName = contact
    ? contact.type === "COMPANY"
      ? contact.companyName || "Unnamed Company"
      : [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Unnamed Contact"
    : "Client";

  return (
    <div className="bg-white text-slate-900 border rounded-lg p-8 shadow-sm font-sans space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start border-b pb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">INVOICE</h2>
          <p className="text-sm font-mono text-slate-500 mt-1">{invoice.invoiceNumber}</p>
        </div>
        <div className="text-right space-y-1 text-sm">
          <Badge
            variant={invoice.status === "DRAFT" ? "secondary" : "default"}
            className="text-xs"
          >
            {invoice.status}
          </Badge>
          <div className="text-xs text-slate-500 font-mono pt-1">
            Date: {new Date(invoice.invoiceDate).toLocaleDateString()}
          </div>
          {invoice.dueDate && (
            <div className="text-xs text-slate-500 font-mono">
              Due: {new Date(invoice.dueDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      {/* Addresses */}
      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Billed To
          </p>
          <p className="font-semibold text-slate-800">{contactName}</p>
          {contact?.email && <p className="text-slate-600 text-xs">{contact.email}</p>}
          {contact?.phone && <p className="text-slate-600 text-xs">{contact.phone}</p>}
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Pay To
          </p>
          <p className="font-semibold text-slate-800">Your Organization</p>
          <p className="text-slate-600 text-xs">billing@example.com</p>
        </div>
      </div>

      {/* Items Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-500 border-b">
            <tr>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4 text-center">Qty</th>
              <th className="py-3 px-4 text-right">Unit Price</th>
              <th className="py-3 px-4 text-right">Tax Rate</th>
              <th className="py-3 px-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-slate-400 text-xs italic">
                  No line items on this invoice.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 px-4 font-medium">{item.description}</td>
                  <td className="py-3 px-4 text-center font-mono">{parseFloat(item.quantity)}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    {invoice.currency} ${parseFloat(item.unitPrice).toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {(parseFloat(item.taxRate) * 100).toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold">
                    {invoice.currency} ${parseFloat(item.totalAmount).toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totals Breakdown */}
      <div className="flex justify-end pt-2">
        <div className="w-64 space-y-2 text-sm font-mono">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal:</span>
            <span>{invoice.currency} ${parseFloat(invoice.subtotalAmount).toFixed(2)}</span>
          </div>
          {parseFloat(invoice.discountAmount) > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Discount:</span>
              <span>-{invoice.currency} ${parseFloat(invoice.discountAmount).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Tax:</span>
            <span>{invoice.currency} ${parseFloat(invoice.taxAmount).toFixed(2)}</span>
          </div>
          <div className="border-t pt-2 flex justify-between font-bold text-slate-900 text-base">
            <span>Total:</span>
            <span>{invoice.currency} ${parseFloat(invoice.totalAmount).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600 text-xs">
            <span>Amount Due:</span>
            <span className="font-semibold text-orange-600">
              {invoice.currency} ${parseFloat(invoice.amountDue).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Notes & Terms */}
      {(invoice.notes || invoice.terms) && (
        <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-500">
          {invoice.notes && (
            <div>
              <p className="font-semibold text-slate-700 mb-1">Notes</p>
              <p>{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <p className="font-semibold text-slate-700 mb-1">Terms & Conditions</p>
              <p>{invoice.terms}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
