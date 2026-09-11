"use client";

import { useState, useCallback, useEffect } from "react";

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

// ✅ NEW: module-level singleton — EK-e-EKTA port + connection state,
// shared across EVERY component je useUSBThermalPrinter() call kore
// (InvoiceListPage, InvoiceSummary, jekhane e call koro). Age protita
// component-er nijer আলাদা portRef/isConnected state chilo, tai ekhane
// connect korle okhane "not connected" dekhato — pagination-e notun
// row click korle je fresh render/remount hoto, shetar state fresh
// false-e start hoto, r auto-reconnect abar port.open() korte giye
// "port already open" error khete silently fail hoto (sudhu
// console.warn hoto, UI update hoto na).
//
// Ekhon shob hook-instance ei EKTAI global state-ke SUBSCRIBE kore —
// tai kono remount/pagination/page-switch-e desync hobe na.
let globalPort = null;
let globalConnected = false;
const listeners = new Set();

function notifyListeners() {
  listeners.forEach((fn) => fn(globalConnected));
}

function setGlobalConnected(value) {
  globalConnected = value;
  notifyListeners();
}

// ✅ Shudhu app-e ekbar (first hook mount-e) previously-granted port
// silently re-adopt korar chesta kore — protibar notun component mount
// hole na (age ei bug-i duplicate-open error-er main karon chilo)
let autoReconnectAttempted = false;
async function tryAutoReconnect() {
  if (autoReconnectAttempted) return;
  autoReconnectAttempted = true;
  if (!("serial" in navigator)) return;
  try {
    // ✅ Onno kono hook-instance already connect kore rekheche kina
    // seta age check koro — thakle sheita reuse koro, notun open()
    // call koro na (double-open error avoid korte)
    if (globalPort && globalPort.writable) {
      setGlobalConnected(true);
      return;
    }
    const ports = await navigator.serial.getPorts();
    if (ports.length > 0) {
      await ports[0].open(PORT_OPTIONS);
      globalPort = ports[0];
      setGlobalConnected(true);
    }
  } catch (err) {
    console.warn("Auto-reconnect skipped:", err.message);
  }
}

export function useUSBThermalPrinter() {
  const [isConnected, setIsConnected] = useState(globalConnected);
  const [isConnecting, setIsConnecting] = useState(false);

  // ✅ Global state-e subscribe kora holo — ei component chara onno
  // jekono component theke connect/disconnect korleo eikhane instantly
  // reflect hobe
  useEffect(() => {
    const listener = (value) => setIsConnected(value);
    listeners.add(listener);
    // Mount hobar somoy global state already ki ache seta sathe sathe
    // sync kore nao (onno page theke age theke connected thakle)
    setIsConnected(globalConnected);
    tryAutoReconnect();
    return () => listeners.delete(listener);
  }, []);

  useEffect(() => {
    if (!("serial" in navigator)) return;
    const handleDisconnect = (event) => {
      if (event.target === globalPort) {
        globalPort = null;
        setGlobalConnected(false);
      }
    };
    navigator.serial.addEventListener("disconnect", handleDisconnect);
    return () =>
      navigator.serial.removeEventListener("disconnect", handleDisconnect);
  }, []);

  const closeCurrentPort = useCallback(async () => {
    if (globalPort) {
      try {
        await globalPort.close();
      } catch (err) {
        console.warn("Close error (ignored):", err.message);
      }
      globalPort = null;
      setGlobalConnected(false);
    }
  }, []);

  // connect(): already open globalPort thakle sheita reuse kore —
  // notun picker dekhay na
  const connect = useCallback(async () => {
    if (!("serial" in navigator)) {
      throw new Error("Please Use Chrome or Edge Browser");
    }
    if (!window.isSecureContext) {
      throw new Error("Please Use Chrome or Edge Browser");
    }
    if (globalPort && globalPort.writable) {
      setGlobalConnected(true);
      return globalPort;
    }

    setIsConnecting(true);
    try {
      const port = await navigator.serial.requestPort();
      await port.open(PORT_OPTIONS);
      globalPort = port;
      setGlobalConnected(true);
      return port;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // selectNewPort(): shob jaygay theke age-r port close kore, tarpor
  // browser-er port-picker abar dekhay
  const selectNewPort = useCallback(async () => {
    if (!("serial" in navigator)) {
      throw new Error("Please Use Chrome or Edge Browser");
    }
    if (!window.isSecureContext) {
      throw new Error("Please Use Chrome or Edge Browser");
    }

    setIsConnecting(true);
    try {
      await closeCurrentPort();
      const port = await navigator.serial.requestPort();
      await port.open(PORT_OPTIONS);
      globalPort = port;
      setGlobalConnected(true);
      return port;
    } finally {
      setIsConnecting(false);
    }
  }, [closeCurrentPort]);

  const disconnect = useCallback(async () => {
    await closeCurrentPort();
  }, [closeCurrentPort]);

  const print = useCallback(async (escposString) => {
    if (!globalPort || !globalPort.writable) {
      throw new Error(
        "Printer connected nei. Age 'Connect Printer' e click korun.",
      );
    }
    const bytes = toPrinterBytes(escposString);
    const writer = globalPort.writable.getWriter();
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