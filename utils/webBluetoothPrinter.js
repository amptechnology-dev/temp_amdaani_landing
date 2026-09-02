
const PRINTER_SERVICE_UUID = 0x18f0;
const PRINTER_CHARACTERISTIC_UUID = 0x2af1;

let cachedDevice = null;
let cachedCharacteristic = null;

export function isWebBluetoothSupported() {
  return typeof navigator !== "undefined" && !!navigator.bluetooth;
}

// Must be called directly from a user click (browser requirement)
export async function connectPrinter() {
  if (!isWebBluetoothSupported()) {
    throw new Error(
      "Web Bluetooth is not supported in this browser. Use Chrome or Edge on desktop.",
    );
  }

  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [PRINTER_SERVICE_UUID] }],
    optionalServices: [PRINTER_SERVICE_UUID],
  });

  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
  const characteristic = await service.getCharacteristic(
    PRINTER_CHARACTERISTIC_UUID,
  );

  cachedDevice = device;
  cachedCharacteristic = characteristic;

  device.addEventListener("gattserverdisconnected", () => {
    cachedCharacteristic = null;
  });

  return device;
}

export async function ensurePrinterConnected() {
  if (cachedCharacteristic && cachedDevice?.gatt?.connected) {
    return true;
  }
  if (cachedDevice) {
    try {
      const server = await cachedDevice.gatt.connect();
      const service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
      cachedCharacteristic = await service.getCharacteristic(
        PRINTER_CHARACTERISTIC_UUID,
      );
      return true;
    } catch {
      cachedCharacteristic = null;
      return false;
    }
  }
  return false;
}

export function isPrinterConnected() {
  return !!(cachedCharacteristic && cachedDevice?.gatt?.connected);
}

export function getPrinterName() {
  return cachedDevice?.name || null;
}

// BLE characteristic writes are chunk-limited (usually ~180-512 bytes) —
// send in small pieces with tiny delays so the printer buffer doesn't drop data.
export async function writeBytes(bytes) {
  if (!cachedCharacteristic) {
    throw new Error("Printer not connected. Call connectPrinter() first.");
  }
  const CHUNK_SIZE = 180;
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE);
    if (cachedCharacteristic.writeValueWithoutResponse) {
      await cachedCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await cachedCharacteristic.writeValue(chunk);
    }
    await new Promise((r) => setTimeout(r, 15));
  }
}

export function disconnectPrinter() {
  if (cachedDevice?.gatt?.connected) {
    cachedDevice.gatt.disconnect();
  }
  cachedCharacteristic = null;
}