"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Printer, Share2, Clipboard, ArrowLeft, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface ThermalReceiptProps {
  sale: {
    invoiceNumber: string;
    items: Array<{
      productId: string;
      name: string;
      quantity: number;
      sellingPrice: number;
      taxRate?: number;
    }>;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
    paymentMethod: "cash" | "upi" | "card";
    cashierName: string;
    cashReceived?: number;
    changeDue?: number;
    createdAt: string;
  };
  onBack: () => void;
}

export default function ThermalReceipt({ sale, onBack }: ThermalReceiptProps) {
  const printReceipt = () => {
    window.print();
  };

  const getWhatsAppMessage = () => {
    let msg = `*KIRANA STORE RECEIPT*\n`;
    msg += `-------------------------------\n`;
    msg += `*Invoice:* ${sale.invoiceNumber}\n`;
    msg += `*Date:* ${new Date(sale.createdAt).toLocaleString("en-IN")}\n`;
    msg += `*Cashier:* ${sale.cashierName}\n`;
    msg += `-------------------------------\n`;

    sale.items.forEach((item) => {
      msg += `${item.name}\n  ${item.quantity} x ₹${item.sellingPrice.toFixed(2)} = ₹${(
        item.quantity * item.sellingPrice
      ).toFixed(2)}\n`;
    });

    msg += `-------------------------------\n`;
    msg += `*Subtotal:* ₹${sale.subtotal.toFixed(2)}\n`;
    if (sale.discount > 0) msg += `*Discount:* -₹${sale.discount.toFixed(2)}\n`;
    if (sale.tax > 0) msg += `*Tax (GST):* ₹${sale.tax.toFixed(2)}\n`;
    msg += `*TOTAL BILL:* ₹${sale.total.toFixed(2)}\n`;
    msg += `*Paid Via:* ${sale.paymentMethod.toUpperCase()}\n`;
    
    if (sale.paymentMethod === "cash" && sale.cashReceived) {
      msg += `*Cash Received:* ₹${sale.cashReceived.toFixed(2)}\n`;
      msg += `*Change Returned:* ₹${(sale.changeDue || 0).toFixed(2)}\n`;
    }
    
    msg += `-------------------------------\n`;
    msg += `Thank you for shopping with us!\n`;
    return encodeURIComponent(msg);
  };

  const copyToClipboard = () => {
    const rawText = decodeURIComponent(getWhatsAppMessage().replace(/\*/g, ""));
    navigator.clipboard.writeText(rawText);
    toast.success("Receipt copied to clipboard!");
  };

  const shareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${getWhatsAppMessage()}`;
    window.open(url, "_blank");
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 max-w-lg mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-300">
      {/* Top Header Panel */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/10 rounded-full text-emerald-400 mb-2 border border-emerald-500/20">
          <CheckCircle className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-white">Payment Completed!</h2>
        <p className="text-slate-400 text-sm">Invoice {sale.invoiceNumber} stored in sales history.</p>
      </div>

      {/* Interactive Toolbar (Hides on standard print) */}
      <div className="flex flex-wrap gap-2 justify-center w-full max-w-xs no-print">
        <Button
          onClick={printReceipt}
          className="flex-1 bg-emerald-500 text-slate-950 hover:bg-emerald-400 font-semibold gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print
        </Button>
        <Button
          onClick={shareWhatsApp}
          className="flex-1 bg-green-600 text-white hover:bg-green-500 font-semibold gap-2 cursor-pointer"
        >
          <Share2 className="w-4 h-4" /> WhatsApp
        </Button>
      </div>

      <div className="flex gap-2 justify-center w-full max-w-xs no-print">
        <Button
          variant="outline"
          onClick={copyToClipboard}
          className="flex-1 border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-white gap-2 cursor-pointer"
        >
          <Clipboard className="w-4 h-4" /> Copy Raw
        </Button>
        <Button
          variant="outline"
          onClick={onBack}
          className="flex-1 border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-white gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> New Sale
        </Button>
      </div>

      {/* The Actual Receipt Sheet rendered in browser and target for printing */}
      <div
        id="print-receipt-container"
        className="w-full max-w-xs bg-white text-black p-6 border border-slate-200 shadow-md font-mono text-xs rounded-sm relative"
      >
        <div className="text-center space-y-1">
          <h3 className="text-sm font-bold tracking-wider uppercase">KIRANA SUPERSTORE</h3>
          <p className="text-[10px]">12, Market Complex, Sec 5, Noida</p>
          <p className="text-[10px]">GSTIN: 09AAAAA1111A1Z1</p>
          <p className="text-[10px]">Phone: +91 98765 43210</p>
        </div>

        <div className="border-b border-dashed border-slate-400 my-4" />

        <div className="space-y-1 text-[10px]">
          <div className="receipt-row flex justify-between">
            <span>Invoice:</span>
            <span className="font-bold">{sale.invoiceNumber}</span>
          </div>
          <div className="receipt-row flex justify-between">
            <span>Date:</span>
            <span>{new Date(sale.createdAt).toLocaleString("en-IN")}</span>
          </div>
          <div className="receipt-row flex justify-between">
            <span>Cashier:</span>
            <span>{sale.cashierName}</span>
          </div>
        </div>

        <div className="border-b border-dashed border-slate-400 my-4" />

        {/* Item headers */}
        <div className="grid grid-cols-12 gap-1 font-bold text-[10px] mb-1">
          <span className="col-span-6">Item</span>
          <span className="col-span-2 text-center">Qty</span>
          <span className="col-span-2 text-right">Price</span>
          <span className="col-span-2 text-right">Amt</span>
        </div>

        {/* Items */}
        <div className="space-y-2">
          {sale.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-1 text-[10px]">
              <span className="col-span-6 truncate font-sans font-medium">{item.name}</span>
              <span className="col-span-2 text-center">{item.quantity}</span>
              <span className="col-span-2 text-right">₹{item.sellingPrice.toFixed(0)}</span>
              <span className="col-span-2 text-right font-bold">
                ₹{(item.quantity * item.sellingPrice).toFixed(0)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-b border-dashed border-slate-400 my-4" />

        {/* Calculations */}
        <div className="space-y-1 text-[10px]">
          <div className="receipt-row flex justify-between">
            <span>Subtotal</span>
            <span>₹{sale.subtotal.toFixed(2)}</span>
          </div>
          {sale.discount > 0 && (
            <div className="receipt-row flex justify-between font-bold text-red-600">
              <span>Discount</span>
              <span>-₹{sale.discount.toFixed(2)}</span>
            </div>
          )}
          {sale.tax > 0 && (
            <div className="receipt-row flex justify-between">
              <span>GST (Inc.)</span>
              <span>₹{sale.tax.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-dotted border-slate-300 my-1" />
          <div className="receipt-row flex justify-between text-xs font-bold">
            <span>NET TOTAL</span>
            <span>₹{sale.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="border-b border-dashed border-slate-400 my-4" />

        <div className="space-y-1 text-[10px]">
          <div className="receipt-row flex justify-between">
            <span>Payment Mode:</span>
            <span className="font-bold uppercase">{sale.paymentMethod}</span>
          </div>
          {sale.paymentMethod === "cash" && (
            <>
              <div className="receipt-row flex justify-between">
                <span>Cash Received:</span>
                <span>₹{sale.cashReceived?.toFixed(2)}</span>
              </div>
              <div className="receipt-row flex justify-between font-bold">
                <span>Change Returned:</span>
                <span>₹{sale.changeDue?.toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        <div className="border-b border-dashed border-slate-400 my-4" />

        <div className="text-center space-y-1">
          <p className="font-bold text-[10px] uppercase">Thank you for your visit!</p>
          <p className="text-[9px] text-slate-500">SoftPOS System Powered by KiranaPOS</p>
        </div>
      </div>
    </div>
  );
}
