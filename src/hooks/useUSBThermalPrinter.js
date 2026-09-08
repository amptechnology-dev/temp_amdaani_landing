"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ── Convert a JS string into raw single-byte codes (Latin1/CP437-safe).
// This is the key fix: TextEncoder (UTF-8) would split any char code
// above 127 into multiple bytes, which corrupts ESC/POS parsing on the
// printer firmware. Here we force 1 char = 1 byte, and replace any
// character the printer can't represent with a safe ASCII fallback
// instead of letting it silently corrupt the byte stream.
function toPrinterBytes(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0xff) {
      // Control chars (ESC, GS, etc.) and Latin1 range — pass through as-is
      bytes[i] = code;
    } else {
      // Any char outside Latin1 (Bengali, smart quotes, emoji, etc.)
      // the printer cannot render — swap for '?' instead of letting
      // TextEncoder split it into multiple garbage bytes.
      bytes[i] = 0x3f; // '?'
    }
  }
  return bytes;
}

// ── Send data in small chunks with short delays so the printer's
// internal serial buffer never gets flooded. Most thermal printers
// have a small (1–4KB) receive buffer; sending a large invoice in one
// shot at 9600 baud without flow control can overrun it and crash the
// firmware mid-parse — which matches the "Error" screen you got.
async function writeInChunks(writer, bytes, chunkSize = 256, delayMs = 20) {
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.slice(offset, offset + chunkSize);
    await writer.write(chunk);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

export function useUSBThermalPrinter() {
  const portRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // ── Try silent auto-reconnect to a previously granted port ──
  useEffect(() => {
    (async () => {
      if (!("serial" in navigator)) return;
      try {
        const ports = await navigator.serial.getPorts();
        if (ports.length > 0) {
          await ports[0].open({
            baudRate: 9600,
            dataBits: 8,
            stopBits: 1,
            parity: "none",
            flowControl: "none",
          });
          portRef.current = ports[0];
          setIsConnected(true);
        }
      } catch (err) {
        // Port might already be open / in use — ignore silently
        console.warn("Auto-reconnect skipped:", err.message);
      }
    })();
  }, []);

  // ── Detect physical unplug ──
  useEffect(() => {
    if (!("serial" in navigator)) return;
    const handleDisconnect = (event) => {
      if (event.target === portRef.current) {
        portRef.current = null;
        setIsConnected(false);
      }
    };
    navigator.serial.addEventListener("disconnect", handleDisconnect);
    return () =>
      navigator.serial.removeEventListener("disconnect", handleDisconnect);
  }, []);

  const connect = useCallback(async () => {
    if (!("serial" in navigator)) {
      throw new Error("Please Use Chrome or Edge Browser");
    }
    if (!window.isSecureContext) {
      throw new Error("Please Use Chrome or Edge Browser");
    }
    if (portRef.current && portRef.current.writable) {
      setIsConnected(true);
      return portRef.current;
    }

    setIsConnecting(true);
    try {
      const port = await navigator.serial.requestPort();
      await port.open({
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        flowControl: "none",
      });
      portRef.current = port;
      setIsConnected(true);
      return port;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch (err) {
        console.warn("Disconnect error:", err);
      }
      portRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const print = useCallback(async (escposString) => {
    const port = portRef.current;
    if (!port || !port.writable) {
      throw new Error(
        "Printer connected nei. Age 'Connect Printer' e click korun.",
      );
    }

    // ✅ FIX 1: raw single-byte encoding instead of TextEncoder (UTF-8)
    const bytes = toPrinterBytes(escposString);

    const writer = port.writable.getWriter();
    try {
      // ✅ FIX 2: chunked writes with small delay instead of one giant write
      await writeInChunks(writer, bytes);
    } finally {
      writer.releaseLock();
    }
  }, []);

  return { connect, disconnect, print, isConnected, isConnecting };
}