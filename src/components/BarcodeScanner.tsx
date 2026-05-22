"use client";

import React, { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CameraOff, AlertCircle } from "lucide-react";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onScan }: BarcodeScannerProps) {
  const qrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "camera-scanner-view";

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    // Small delay to ensure the DOM element is rendered before initializing
    const timer = setTimeout(() => {
      if (!isMounted) return;

      const html5QrcodeScanner = new Html5Qrcode(scannerId);
      qrCodeRef.current = html5QrcodeScanner;

      const config = { fps: 15, qrbox: { width: 250, height: 150 } };

      html5QrcodeScanner
        .start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Success callback
            onScan(decodedText);
            cleanupScanner();
            onClose();
          },
          () => {
            // Verbose error logging (can be ignored to avoid spamming console)
          }
        )
        .catch((err) => {
          console.error("Failed to start camera scanner:", err);
        });
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      cleanupScanner();
    };
  }, [isOpen]);

  const cleanupScanner = () => {
    if (qrCodeRef.current && qrCodeRef.current.isScanning) {
      qrCodeRef.current
        .stop()
        .then(() => {
          console.log("Scanner stopped successfully");
          qrCodeRef.current = null;
        })
        .catch((err) => {
          console.error("Failed to stop scanner:", err);
        });
    } else {
      qrCodeRef.current = null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Barcode Scanner
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Align the product barcode within the camera frame scanner.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center space-y-4 pt-4">
          <div className="relative w-full aspect-video bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
            {/* Target overlay */}
            <div className="absolute inset-0 border-2 border-dashed border-emerald-500/30 m-8 rounded pointer-events-none z-10 flex items-center justify-center">
              <div className="w-[80%] h-[2px] bg-emerald-500/80 shadow-[0_0_10px_#10b981] animate-bounce" />
            </div>

            <div id={scannerId} className="w-full h-full object-cover" />
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950/80 px-3 py-1.5 rounded-full border border-slate-800">
            <AlertCircle className="w-3.5 h-3.5 text-emerald-400" />
            Ensure barcodes are well-lit and held close to the camera.
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900 hover:text-white"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
