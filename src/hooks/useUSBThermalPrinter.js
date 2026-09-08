"use client";

import { useState, useCallback, useRef, useEffect } from "react";

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
      throw new Error(
        "Please Use Chrome or Edge Browser"
      );
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
      throw new Error("Printer connected nei. Age 'Connect Printer' e click korun.");
    }
    const writer = port.writable.getWriter();
    try {
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(escposString));
    } finally {
      writer.releaseLock();
    }
  }, []);

  return { connect, disconnect, print, isConnected, isConnecting };
}