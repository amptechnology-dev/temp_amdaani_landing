"use client";

import { useState, useCallback, useRef, useEffect } from "react";

function toPrinterBytes(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    bytes[i] = code <= 0xff ? code : 0x3f;
  }
  return bytes;
}

async function writeInChunks(writer, bytes, chunkSize = 256, delayMs = 20) {
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.slice(offset, offset + chunkSize);
    await writer.write(chunk);
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

const PORT_OPTIONS = {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  flowControl: "none",
};

export function useUSBThermalPrinter() {
  const portRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serial" in navigator)) return;
      try {
        const ports = await navigator.serial.getPorts();
        if (ports.length > 0) {
          await ports[0].open(PORT_OPTIONS);
          portRef.current = ports[0];
          setIsConnected(true);
        }
      } catch (err) {
        console.warn("Auto-reconnect skipped:", err.message);
      }
    })();
  }, []);

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

  // ── internal helper: close whatever's open right now ──
  const closeCurrentPort = useCallback(async () => {
    if (portRef.current) {
      try {
        // release any locked reader/writer before closing, otherwise close() throws
        if (portRef.current.writable?.locked || portRef.current.readable?.locked) {
          // best effort — most consumers already release their writer in `finally`
        }
        await portRef.current.close();
      } catch (err) {
        console.warn("Close error (ignored):", err.message);
      }
      portRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // ✅ connect(): reuses an already-open port if present (old behavior, unchanged)
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
      await port.open(PORT_OPTIONS);
      portRef.current = port;
      setIsConnected(true);
      return port;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // ✅ NEW: selectNewPort() — always closes current port first, then
  // forces the browser's port-picker to show up again so user can
  // choose a different printer/port.
  const selectNewPort = useCallback(async () => {
    if (!("serial" in navigator)) {
      throw new Error("Please Use Chrome or Edge Browser");
    }
    if (!window.isSecureContext) {
      throw new Error("Please Use Chrome or Edge Browser");
    }

    setIsConnecting(true);
    try {
      await closeCurrentPort(); // এখানেই আগের port release হয়ে যাবে
      const port = await navigator.serial.requestPort(); // picker আবার খুলবে
      await port.open(PORT_OPTIONS);
      portRef.current = port;
      setIsConnected(true);
      return port;
    } finally {
      setIsConnecting(false);
    }
  }, [closeCurrentPort]);

  const disconnect = useCallback(async () => {
    await closeCurrentPort();
  }, [closeCurrentPort]);

  const print = useCallback(async (escposString) => {
    const port = portRef.current;
    if (!port || !port.writable) {
      throw new Error(
        "Printer connected nei. Age 'Connect Printer' e click korun.",
      );
    }
    const bytes = toPrinterBytes(escposString);
    const writer = port.writable.getWriter();
    try {
      await writeInChunks(writer, bytes);
    } finally {
      writer.releaseLock();
    }
  }, []);

  return {
    connect,
    selectNewPort, 
    disconnect,
    print,
    isConnected,
    isConnecting,
  };
}