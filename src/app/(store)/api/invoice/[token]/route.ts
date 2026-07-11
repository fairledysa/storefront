// FILE: apps/storefront/src/app/(store)/api/invoice/[token]/route.ts
// Public PDF invoice generated from the real order and merchant invoice settings.
// Important: this route deliberately does not use ImageResponse/Satori. It draws
// Arabic glyph outlines into the PDF with the store's existing Lusail WOFF2 fonts.

import { deflateSync, inflateSync } from "node:zlib";

import { resolveStoreContext } from "@/theme-engine/store-context/resolve-store";
import { getOrdersDb } from "@/data/db/orders-db.server";
import { getStoreDb } from "@/data/db/store-db.server";

// fontkit parses WOFF2 and performs Arabic shaping (ligatures/right-to-left).
// It is intentionally a direct production dependency, not a dev dependency.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fontkit: any = require("fontkit");

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type DbRecord = Record<string, any>;
type InvoiceSettings = {
  issueMode: "platform" | "custom";
  customStoreTitle: string;
  showStoreTitle: boolean;
  showLogo: boolean;
  logoSize: number;
  logoPosition: "right" | "center" | "left";
  showStoreAddress: boolean;
  showProductImage: boolean;
  showProductDescription: boolean;
  showInvoiceBarcode: boolean;
  showProductBarcode: boolean;
  showSku: boolean;
  showGtin: boolean;
  showMpn: boolean;
  showZeroTaxFields: boolean;
  primaryFontWeight: "bold" | "normal";
  secondaryFontWeight: "bold" | "normal";
  textColor: string;
  watermarkUrl: string;
  watermarkOpacity: number;
  stampUrl: string;
  stampOpacity: number;
  stampPosition: "bottom-right" | "bottom-center" | "bottom-left";
  footerText: string;
};

type InvoiceItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
  currency: string;
  description: string;
  sku: string;
  gtin: string;
  mpn: string;
  barcode: string;
  imageUrl: string;
};

type InvoiceModel = {
  store: {
    name: string;
    logoUrl: string;
    address: string;
    email: string;
    phone: string;
    taxNumber: string;
    taxLabel: string;
  };
  order: {
    invoiceNo: string;
    orderNo: string;
    publicNo: string;
    createdAt: string;
    currency: string;
    paymentMethod: string;
    paymentStatus: string;
    shippingCarrier: string;
    shippingAddress: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    subtotal: number;
    shipping: number;
    discount: number;
    tax: number;
    total: number;
    walletUsed: number;
    walletRemaining: number;
    walletRefunded: number;
  };
  items: InvoiceItem[];
  settings: InvoiceSettings;
};

type PdfImage = {
  kind: "rgb" | "jpeg";
  width: number;
  height: number;
  data: Buffer;
};

type PageImage = {
  name: string;
  image: PdfImage;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
};

type PdfPage = {
  commands: string[];
  images: PageImage[];
};

type InvoiceFonts = {
  regular: any;
  bold: any;
};

const SETTINGS_SLUG = "invoice_settings";
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 38;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const MAX_REMOTE_IMAGE_BYTES = 2_500_000;
const MAX_IMAGE_PIXELS = 1_400_000;

const DEFAULT_INVOICE_SETTINGS: InvoiceSettings = {
  issueMode: "platform",
  customStoreTitle: "",
  showStoreTitle: true,
  showLogo: true,
  logoSize: 32,
  logoPosition: "center",
  showStoreAddress: true,
  showProductImage: false,
  showProductDescription: true,
  showInvoiceBarcode: false,
  showProductBarcode: false,
  showSku: true,
  showGtin: false,
  showMpn: false,
  showZeroTaxFields: false,
  primaryFontWeight: "bold",
  secondaryFontWeight: "normal",
  textColor: "#111827",
  watermarkUrl: "",
  watermarkOpacity: 20,
  stampUrl: "",
  stampOpacity: 35,
  stampPosition: "bottom-right",
  footerText: "شكراً لتسوقك من متجرنا.",
};

let fontsPromise: Promise<InvoiceFonts> | null = null;

function s(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: unknown) {
  return Math.round(n(value) * 100) / 100;
}

function safeObject(value: unknown): DbRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as DbRecord;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as DbRecord;
    } catch {}
  }
  return {};
}

function safeArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = s(value);
    if (text) return text;
  }
  return "";
}

function bool(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return fallback;
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const parsed = n(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  const text = s(value) as T;
  return allowed.includes(text) ? text : fallback;
}

function isHexColor(value: string) {
  return /^#[0-9a-f]{3,8}$/i.test(value);
}

function normalizeInvoiceSettings(value: unknown): InvoiceSettings {
  const raw = safeObject(value);
  return {
    issueMode: s(raw.issueMode) === "custom" ? "custom" : "platform",
    customStoreTitle: s(raw.customStoreTitle).slice(0, 120),
    showStoreTitle: bool(raw.showStoreTitle, true),
    showLogo: bool(raw.showLogo, true),
    logoSize: clamp(raw.logoSize, 18, 80, 32),
    logoPosition: oneOf(raw.logoPosition, ["right", "center", "left"], "center"),
    showStoreAddress: bool(raw.showStoreAddress, true),
    showProductImage: bool(raw.showProductImage, false),
    showProductDescription: bool(raw.showProductDescription, true),
    showInvoiceBarcode: bool(raw.showInvoiceBarcode, false),
    showProductBarcode: bool(raw.showProductBarcode, false),
    showSku: bool(raw.showSku, true),
    showGtin: bool(raw.showGtin, false),
    showMpn: bool(raw.showMpn, false),
    showZeroTaxFields: bool(raw.showZeroTaxFields, false),
    primaryFontWeight: oneOf(raw.primaryFontWeight, ["bold", "normal"], "bold"),
    secondaryFontWeight: oneOf(raw.secondaryFontWeight, ["bold", "normal"], "normal"),
    textColor: isHexColor(s(raw.textColor)) ? s(raw.textColor) : "#111827",
    watermarkUrl: s(raw.watermarkUrl).slice(0, 1000),
    watermarkOpacity: clamp(raw.watermarkOpacity, 0, 100, 20),
    stampUrl: s(raw.stampUrl).slice(0, 1000),
    stampOpacity: clamp(raw.stampOpacity, 0, 100, 35),
    stampPosition: oneOf(raw.stampPosition, ["bottom-right", "bottom-center", "bottom-left"], "bottom-right"),
    footerText: s(raw.footerText || DEFAULT_INVOICE_SETTINGS.footerText).slice(0, 300),
  };
}

function stripHtml(value: unknown, max = 180) {
  return s(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").slice(0, max).trim();
}

function selectedOptionsText(value: unknown) {
  return safeArray(value)
    .map((row) => {
      const item = safeObject(row);
      const label = firstText(item.name, item.label, item.option_name);
      const choice = firstText(item.value, item.label, item.name);
      if (label && choice && label !== choice) return `${label}: ${choice}`;
      return choice || label;
    })
    .filter(Boolean)
    .join("، ");
}

function money(value: number, currency: string) {
  return `${currency || "SAR"} ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(round2(value))}`;
}

function dateText(value: unknown) {
  const raw = s(value);
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(date);
}

function paymentMethodLabel(method: unknown) {
  const value = s(method);
  if (value === "cod") return "الدفع عند الاستلام";
  if (value === "bank_transfer") return "تحويل بنكي";
  if (value.startsWith("provider:")) return "دفع إلكتروني";
  return value || "طريقة الدفع المسجلة";
}

function paymentStatusLabel(status: unknown) {
  const value = s(status);
  if (value === "paid") return "مدفوع";
  if (value === "unpaid") return "غير مدفوع / قيد المعالجة";
  if (value === "failed") return "فشل الدفع";
  if (value === "refunded") return "تم الاسترجاع";
  return value || "قيد المعالجة";
}

function formatAddress(source: unknown) {
  const value = safeObject(source);
  const direct = firstText(value.full_address, value.fullAddress, value.address, value.address_line1, value.addressLine1, value.location);
  const parts = [direct, firstText(value.district, value.district_name, value.districtName), firstText(value.city, value.city_name, value.cityName), firstText(value.country, value.country_name, value.countryName)].filter(Boolean);
  return Array.from(new Set(parts)).join("، ");
}

function profileAddress(profile: DbRecord) {
  const direct = firstText(profile.address, profile.full_address, profile.fullAddress, profile.address_line1, profile.addressLine1, profile.location);
  if (direct) return direct;
  return [firstText(profile.district, profile.district_name, profile.districtName), firstText(profile.city, profile.city_name, profile.cityName), firstText(profile.country, profile.country_name, profile.countryName)].filter(Boolean).join("، ");
}

function safeHttpUrl(value: unknown) {
  const url = s(value);
  return /^https?:\/\//i.test(url) ? url : "";
}

async function loadFonts(request: Request): Promise<InvoiceFonts> {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      const regularUrl = new URL("/fonts/lusail/Lusail-Regular.woff2", request.url);
      const boldUrl = new URL("/fonts/lusail/Lusail-Bold.woff2", request.url);
      const [regularR, boldR] = await Promise.all([
        fetch(regularUrl, { cache: "force-cache" }),
        fetch(boldUrl, { cache: "force-cache" }),
      ]);
      if (!regularR.ok || !boldR.ok) throw new Error("INVOICE_FONT_UNAVAILABLE");
      const [regularBytes, boldBytes] = await Promise.all([regularR.arrayBuffer(), boldR.arrayBuffer()]);
      return {
        regular: fontkit.create(Buffer.from(regularBytes)),
        bold: fontkit.create(Buffer.from(boldBytes)),
      };
    })();
  }
  return fontsPromise;
}

function pdfNumber(value: number) {
  return String(Math.round(value * 1000) / 1000);
}

function hexRgb(value: string): [number, number, number] {
  let hex = s(value).replace("#", "");
  if (hex.length === 3) hex = hex.split("").map((char) => `${char}${char}`).join("");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return [0.06, 0.09, 0.16];
  return [0, 2, 4].map((offset) => Math.round((Number.parseInt(hex.slice(offset, offset + 2), 16) / 255) * 1000) / 1000) as [number, number, number];
}

function rgbFill(value: string) {
  const [r, g, b] = hexRgb(value);
  return `${pdfNumber(r)} ${pdfNumber(g)} ${pdfNumber(b)} rg\n`;
}

function rgbStroke(value: string) {
  const [r, g, b] = hexRgb(value);
  return `${pdfNumber(r)} ${pdfNumber(g)} ${pdfNumber(b)} RG\n`;
}

function measureText(font: any, value: string, size: number) {
  const run = font.layout(String(value || " "));
  const scale = size / font.unitsPerEm;
  return run.positions.reduce((sum: number, position: any) => sum + n(position.xAdvance) * scale, 0);
}

function glyphPathPdf(glyph: any, x: number, y: number, scale: number) {
  let output = "";
  let cx = 0;
  let cy = 0;
  for (const command of glyph.path.commands as Array<{ command: string; args: number[] }>) {
    const a = command.args || [];
    if (command.command === "moveTo") {
      cx = a[0]; cy = a[1];
      output += `${pdfNumber(x + cx * scale)} ${pdfNumber(y + cy * scale)} m\n`;
    } else if (command.command === "lineTo") {
      cx = a[0]; cy = a[1];
      output += `${pdfNumber(x + cx * scale)} ${pdfNumber(y + cy * scale)} l\n`;
    } else if (command.command === "bezierCurveTo") {
      output += `${pdfNumber(x + a[0] * scale)} ${pdfNumber(y + a[1] * scale)} ${pdfNumber(x + a[2] * scale)} ${pdfNumber(y + a[3] * scale)} ${pdfNumber(x + a[4] * scale)} ${pdfNumber(y + a[5] * scale)} c\n`;
      cx = a[4]; cy = a[5];
    } else if (command.command === "quadraticCurveTo") {
      const qx = a[0]; const qy = a[1]; const ex = a[2]; const ey = a[3];
      const c1x = cx + (2 / 3) * (qx - cx);
      const c1y = cy + (2 / 3) * (qy - cy);
      const c2x = ex + (2 / 3) * (qx - ex);
      const c2y = ey + (2 / 3) * (qy - ey);
      output += `${pdfNumber(x + c1x * scale)} ${pdfNumber(y + c1y * scale)} ${pdfNumber(x + c2x * scale)} ${pdfNumber(y + c2y * scale)} ${pdfNumber(x + ex * scale)} ${pdfNumber(y + ey * scale)} c\n`;
      cx = ex; cy = ey;
    } else if (command.command === "closePath") {
      output += "h\n";
    }
  }
  return output;
}

function drawText(page: PdfPage, font: any, value: string, x: number, baseline: number, size: number, color: string, align: "right" | "left" | "center" = "right") {
  const text = s(value) || "-";
  const run = font.layout(text);
  const scale = size / font.unitsPerEm;
  const width = run.positions.reduce((sum: number, position: any) => sum + n(position.xAdvance) * scale, 0);
  let penX = align === "right" ? x - width : align === "center" ? x - width / 2 : x;
  let penY = baseline;
  let command = rgbFill(color);
  for (let index = 0; index < run.glyphs.length; index += 1) {
    const glyph = run.glyphs[index];
    const position = run.positions[index] || {};
    const gx = penX + n(position.xOffset) * scale;
    const gy = penY + n(position.yOffset) * scale;
    command += glyphPathPdf(glyph, gx, gy, scale);
    command += "f\n";
    penX += n(position.xAdvance) * scale;
    penY += n(position.yAdvance) * scale;
  }
  page.commands.push(command);
  return width;
}

function splitText(font: any, value: string, size: number, maxWidth: number, maxLines = 3) {
  const clean = s(value);
  if (!clean) return [] as string[];
  const words = clean.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measureText(font, candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && words.length > 0) {
    const consumed = lines.join(" ").split(/\s+/).length;
    if (consumed < words.length) {
      let last = lines[lines.length - 1];
      while (last && measureText(font, `${last}…`, size) > maxWidth) last = last.slice(0, -1);
      lines[lines.length - 1] = `${last}…`;
    }
  }
  return lines;
}

function drawParagraph(page: PdfPage, font: any, value: string, x: number, topBaseline: number, size: number, color: string, maxWidth: number, lineHeight: number, maxLines = 3, align: "right" | "left" | "center" = "right") {
  const lines = splitText(font, value, size, maxWidth, maxLines);
  lines.forEach((line, index) => drawText(page, font, line, x, topBaseline - index * lineHeight, size, color, align));
  return lines.length * lineHeight;
}

function drawRect(page: PdfPage, x: number, y: number, width: number, height: number, color: string) {
  page.commands.push(`q\n${rgbFill(color)}${pdfNumber(x)} ${pdfNumber(y)} ${pdfNumber(width)} ${pdfNumber(height)} re\nf\nQ\n`);
}

function drawLine(page: PdfPage, x1: number, y1: number, x2: number, y2: number, color = "#e2e8f0", thickness = 0.8) {
  page.commands.push(`q\n${rgbStroke(color)}${pdfNumber(thickness)} w\n${pdfNumber(x1)} ${pdfNumber(y1)} m\n${pdfNumber(x2)} ${pdfNumber(y2)} l\nS\nQ\n`);
}

function addImage(page: PdfPage, image: PdfImage | null | undefined, x: number, y: number, width: number, height: number, opacity = 1) {
  if (!image || width <= 0 || height <= 0) return;
  const name = `Im${page.images.length + 1}`;
  page.images.push({ name, image, x, y, width, height, opacity: Math.max(0, Math.min(1, opacity)) });
}

function downsampleRgb(image: PdfImage): PdfImage {
  if (image.kind !== "rgb" || image.width * image.height <= MAX_IMAGE_PIXELS) return image;
  const factor = Math.sqrt(MAX_IMAGE_PIXELS / (image.width * image.height));
  const width = Math.max(1, Math.floor(image.width * factor));
  const height = Math.max(1, Math.floor(image.height * factor));
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor((y / height) * image.height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor((x / width) * image.width));
      const sourceOffset = (sourceY * image.width + sourceX) * 3;
      const targetOffset = (y * width + x) * 3;
      data[targetOffset] = image.data[sourceOffset];
      data[targetOffset + 1] = image.data[sourceOffset + 1];
      data[targetOffset + 2] = image.data[sourceOffset + 2];
    }
  }
  return { kind: "rgb", width, height, data };
}

function readUint32(buffer: Buffer, offset: number) {
  return buffer.readUInt32BE(offset);
}

function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function decodePng(buffer: Buffer): PdfImage | null {
  const signature = "89504e470d0a1a0a";
  if (buffer.length < 33 || buffer.subarray(0, 8).toString("hex") !== signature) return null;
  let offset = 8;
  let width = 0; let height = 0; let bitDepth = 0; let colorType = 0; let interlace = 0;
  const dataParts: Buffer[] = [];
  while (offset + 12 <= buffer.length) {
    const length = readUint32(buffer, offset); offset += 4;
    const type = buffer.subarray(offset, offset + 4).toString("ascii"); offset += 4;
    if (offset + length + 4 > buffer.length) return null;
    const chunk = buffer.subarray(offset, offset + length); offset += length + 4;
    if (type === "IHDR") {
      width = readUint32(chunk, 0); height = readUint32(chunk, 4); bitDepth = chunk[8]; colorType = chunk[9]; interlace = chunk[12];
    } else if (type === "IDAT") dataParts.push(chunk);
    else if (type === "IEND") break;
  }
  if (!width || !height || bitDepth !== 8 || interlace !== 0 || ![2, 6].includes(colorType)) return null;
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  let raw: Buffer;
  try { raw = inflateSync(Buffer.concat(dataParts)); } catch { return null; }
  if (raw.length < (stride + 1) * height) return null;
  const scan = Buffer.alloc(stride * height);
  let inputOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = raw[inputOffset++];
    const targetOffset = row * stride;
    for (let col = 0; col < stride; col += 1) {
      const value = raw[inputOffset++];
      const left = col >= channels ? scan[targetOffset + col - channels] : 0;
      const up = row > 0 ? scan[targetOffset - stride + col] : 0;
      const upLeft = row > 0 && col >= channels ? scan[targetOffset - stride + col - channels] : 0;
      if (filter === 0) scan[targetOffset + col] = value;
      else if (filter === 1) scan[targetOffset + col] = (value + left) & 255;
      else if (filter === 2) scan[targetOffset + col] = (value + up) & 255;
      else if (filter === 3) scan[targetOffset + col] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) scan[targetOffset + col] = (value + paeth(left, up, upLeft)) & 255;
      else return null;
    }
  }
  const rgb = Buffer.alloc(width * height * 3);
  for (let pixel = 0, output = 0; pixel < width * height; pixel += 1, output += 3) {
    const source = pixel * channels;
    const alpha = channels === 4 ? scan[source + 3] : 255;
    rgb[output] = Math.round((scan[source] * alpha + 255 * (255 - alpha)) / 255);
    rgb[output + 1] = Math.round((scan[source + 1] * alpha + 255 * (255 - alpha)) / 255);
    rgb[output + 2] = Math.round((scan[source + 2] * alpha + 255 * (255 - alpha)) / 255);
  }
  return downsampleRgb({ kind: "rgb", width, height, data: rgb });
}

function decodeJpeg(buffer: Buffer): PdfImage | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset++];
    if (marker === 0xd8 || marker === 0xd9) continue;
    const length = buffer.readUInt16BE(offset); offset += 2;
    if (length < 2 || offset + length - 2 > buffer.length) return null;
    const sof = marker >= 0xc0 && marker <= 0xc3;
    if (sof) {
      const height = buffer.readUInt16BE(offset + 1);
      const width = buffer.readUInt16BE(offset + 3);
      const components = buffer[offset + 5];
      if (!width || !height || components !== 3) return null;
      return { kind: "jpeg", width, height, data: buffer };
    }
    offset += length - 2;
  }
  return null;
}

async function fetchPdfImage(value: string) {
  const url = safeHttpUrl(value);
  if (!url) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(url, { signal: controller.signal, cache: "force-cache" });
    if (!response.ok) return null;
    const length = n(response.headers.get("content-length"));
    if (length > MAX_REMOTE_IMAGE_BYTES) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_REMOTE_IMAGE_BYTES) return null;
    return decodePng(bytes) || decodeJpeg(bytes);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function fitImage(image: PdfImage, maxWidth: number, maxHeight: number) {
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
  return { width: image.width * ratio, height: image.height * ratio };
}

function barcodeBars(value: string, count = 42) {
  let seed = 0;
  for (const char of value) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  return Array.from({ length: count }, (_, index) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return { width: 1 + (seed % 3), active: index < 3 || index > count - 4 || seed % 5 !== 0 };
  });
}

function drawBarcode(page: PdfPage, font: any, value: string, x: number, y: number, width: number, height: number) {
  const clean = s(value);
  if (!clean) return;
  const bars = barcodeBars(clean);
  const total = bars.reduce((sum, bar) => sum + bar.width, 0);
  const scale = Math.min(1.8, width / total);
  let cursor = x + (width - total * scale) / 2;
  for (const bar of bars) {
    if (bar.active) drawRect(page, cursor, y + 12, bar.width * scale, height - 12, "#111827");
    cursor += bar.width * scale;
  }
  drawText(page, font, clean, x + width / 2, y + 2, 7.5, "#475569", "center");
}

function drawInfoLine(page: PdfPage, labelsFont: any, valuesFont: any, label: string, value: string, x: number, baseline: number, width: number, textColor: string) {
  if (!s(value)) return 0;
  drawText(page, labelsFont, label, x, baseline, 9.3, "#64748b", "right");
  const height = drawParagraph(page, valuesFont, value, x, baseline - 13, 10.5, textColor, width, 13, 2, "right");
  return 13 + height + 4;
}

function itemHeight(item: InvoiceItem, settings: InvoiceSettings, font: any) {
  const titleLines = splitText(font, item.name, 11.5, settings.showProductImage ? 205 : 270, 2).length || 1;
  const descLines = settings.showProductDescription && item.description ? splitText(font, item.description, 8.6, settings.showProductImage ? 205 : 270, 2).length : 0;
  const meta = [settings.showSku && item.sku, settings.showGtin && item.gtin, settings.showMpn && item.mpn].filter(Boolean).length;
  const barcodeSpace = settings.showProductBarcode && item.barcode ? 30 : 0;
  return Math.max(settings.showProductImage ? 66 : 46, 16 + titleLines * 14 + descLines * 11 + (meta ? 11 : 0) + barcodeSpace);
}

function splitItemsForPages(items: InvoiceItem[], settings: InvoiceSettings, font: any) {
  const rows = items.length ? items : [{ id: "empty", name: "لا توجد منتجات في الطلب", qty: 0, unitPrice: 0, totalPrice: 0, currency: "SAR", description: "", sku: "", gtin: "", mpn: "", barcode: "", imageUrl: "" }];
  const chunks: InvoiceItem[][] = [];
  let index = 0;
  let first = true;
  while (index < rows.length) {
    const available = first ? 210 : 395;
    let used = 0;
    const chunk: InvoiceItem[] = [];
    while (index < rows.length) {
      const height = itemHeight(rows[index], settings, font);
      if (chunk.length && used + height > available) break;
      chunk.push(rows[index]); used += height; index += 1;
    }
    chunks.push(chunk);
    first = false;
  }
  return chunks;
}

function drawPage(model: InvoiceModel, fonts: InvoiceFonts, images: Map<string, PdfImage>, items: InvoiceItem[], pageNo: number, pageCount: number) {
  const page: PdfPage = { commands: [], images: [] };
  const settings = model.settings;
  const titleFont = settings.primaryFontWeight === "bold" ? fonts.bold : fonts.regular;
  const bodyFont = settings.secondaryFontWeight === "bold" ? fonts.bold : fonts.regular;
  const textColor = settings.textColor;
  const invoiceStoreName = settings.issueMode === "custom" && settings.customStoreTitle ? settings.customStoreTitle : model.store.name;
  const isFirst = pageNo === 1;
  const isLast = pageNo === pageCount;

  const watermark = images.get("watermark");
  if (watermark) {
    const fit = fitImage(watermark, 270, 270);
    addImage(page, watermark, (PAGE_WIDTH - fit.width) / 2, (PAGE_HEIGHT - fit.height) / 2, fit.width, fit.height, settings.watermarkOpacity / 100);
  }

  let cursor = PAGE_HEIGHT - MARGIN;
  const logo = images.get("logo");
  const logoBox = settings.showLogo ? Math.max(44, Math.min(78, settings.logoSize * 1.45)) : 0;
  let logoX = 0;
  if (settings.logoPosition === "right") logoX = PAGE_WIDTH - MARGIN - logoBox;
  else if (settings.logoPosition === "left") logoX = MARGIN;
  else logoX = (PAGE_WIDTH - logoBox) / 2;
  if (settings.showLogo && logo) {
    const fit = fitImage(logo, logoBox, logoBox);
    addImage(page, logo, logoX + (logoBox - fit.width) / 2, cursor - fit.height, fit.width, fit.height);
  }

  const titleX = settings.logoPosition === "right" && settings.showLogo ? PAGE_WIDTH - MARGIN - logoBox - 16 : PAGE_WIDTH - MARGIN;
  const idX = MARGIN;
  if (settings.showStoreTitle) drawText(page, titleFont, invoiceStoreName, titleX, cursor - 5, 18, textColor, "right");
  drawText(page, bodyFont, "فاتورة مبيعات", titleX, cursor - 25, 10.8, "#64748b", "right");
  drawText(page, titleFont, "رقم الفاتورة", idX, cursor - 6, 10.3, "#64748b", "left");
  drawText(page, titleFont, `INV-${model.order.invoiceNo}`, idX, cursor - 24, 13, textColor, "left");
  cursor -= Math.max(logoBox, 48) + 14;
  drawLine(page, MARGIN, cursor, PAGE_WIDTH - MARGIN, cursor, "#dbe4ee", 1.1);
  cursor -= 20;

  drawText(page, bodyFont, "تاريخ الطلب", PAGE_WIDTH - MARGIN, cursor, 9.5, "#64748b", "right");
  drawText(page, bodyFont, dateText(model.order.createdAt), PAGE_WIDTH - MARGIN - 108, cursor, 10, textColor, "right");
  drawText(page, bodyFont, "رقم الطلب", MARGIN, cursor, 9.5, "#64748b", "left");
  drawText(page, bodyFont, `#${model.order.orderNo}`, MARGIN + 56, cursor, 10, textColor, "left");
  cursor -= 18;

  if (settings.showInvoiceBarcode && isFirst) {
    drawBarcode(page, bodyFont, `INV-${model.order.invoiceNo}`, PAGE_WIDTH - MARGIN - 130, cursor - 32, 130, 30);
    cursor -= 39;
  }

  if (isFirst) {
    const cardHeight = 134;
    const gap = 12;
    const cardWidth = (CONTENT_WIDTH - gap) / 2;
    const rightX = PAGE_WIDTH - MARGIN - cardWidth;
    const leftX = MARGIN;
    drawRect(page, rightX, cursor - cardHeight, cardWidth, cardHeight, "#f8fafc");
    drawRect(page, leftX, cursor - cardHeight, cardWidth, cardHeight, "#f8fafc");
    drawText(page, titleFont, "مصدره من", rightX + cardWidth - 13, cursor - 18, 12, textColor, "right");
    drawText(page, titleFont, "مصدره إلى", leftX + cardWidth - 13, cursor - 18, 12, textColor, "right");
    let rightY = cursor - 37;
    if (settings.showStoreTitle) rightY -= drawInfoLine(page, bodyFont, titleFont, "المتجر", invoiceStoreName, rightX + cardWidth - 13, rightY, cardWidth - 24, textColor);
    if (settings.showStoreAddress && model.store.address) rightY -= drawInfoLine(page, bodyFont, bodyFont, "العنوان", model.store.address, rightX + cardWidth - 13, rightY, cardWidth - 24, textColor);
    if (model.store.email) rightY -= drawInfoLine(page, bodyFont, bodyFont, "البريد الإلكتروني", model.store.email, rightX + cardWidth - 13, rightY, cardWidth - 24, textColor);
    if (model.store.phone) drawInfoLine(page, bodyFont, bodyFont, "الجوال", model.store.phone, rightX + cardWidth - 13, rightY, cardWidth - 24, textColor);
    let leftY = cursor - 37;
    leftY -= drawInfoLine(page, bodyFont, titleFont, "العميل", model.order.customerName || "-", leftX + cardWidth - 13, leftY, cardWidth - 24, textColor);
    if (model.order.shippingAddress) leftY -= drawInfoLine(page, bodyFont, bodyFont, "عنوان الشحن", model.order.shippingAddress, leftX + cardWidth - 13, leftY, cardWidth - 24, textColor);
    if (model.order.customerEmail) leftY -= drawInfoLine(page, bodyFont, bodyFont, "البريد الإلكتروني", model.order.customerEmail, leftX + cardWidth - 13, leftY, cardWidth - 24, textColor);
    if (model.order.customerPhone) drawInfoLine(page, bodyFont, bodyFont, "الجوال", model.order.customerPhone, leftX + cardWidth - 13, leftY, cardWidth - 24, textColor);
    cursor -= cardHeight + 18;
  }

  const columns = {
    total: MARGIN,
    price: MARGIN + 96,
    qty: MARGIN + 192,
    product: MARGIN + 282,
  };
  const headHeight = 26;
  drawRect(page, MARGIN, cursor - headHeight, CONTENT_WIDTH, headHeight, "#eef2f7");
  drawText(page, titleFont, "المنتج", PAGE_WIDTH - MARGIN - 10, cursor - 18, 10.4, "#334155", "right");
  drawText(page, titleFont, "الكمية", columns.qty + 28, cursor - 18, 10.4, "#334155", "center");
  drawText(page, titleFont, "السعر", columns.price + 38, cursor - 18, 10.4, "#334155", "center");
  drawText(page, titleFont, "المجموع", MARGIN + 37, cursor - 18, 10.4, "#334155", "center");
  cursor -= headHeight;

  for (const item of items) {
    const row = itemHeight(item, settings, titleFont);
    const bottom = cursor - row;
    drawLine(page, MARGIN, bottom, PAGE_WIDTH - MARGIN, bottom, "#e2e8f0", 0.65);
    const image = images.get(`item:${item.id}`);
    const productRight = PAGE_WIDTH - MARGIN - 10;
    let productTextRight = productRight;
    if (settings.showProductImage && image) {
      const fit = fitImage(image, 48, 48);
      addImage(page, image, productRight - 48, bottom + (row - 48) / 2, fit.width, fit.height);
      productTextRight = productRight - 58;
    }
    const productWidth = settings.showProductImage && image ? 198 : 268;
    const titleLines = splitText(titleFont, item.name || "منتج", 11.5, productWidth, 2);
    titleLines.forEach((line, index) => drawText(page, titleFont, line, productTextRight, cursor - 16 - index * 14, 11.5, textColor, "right"));
    let metaY = cursor - 16 - titleLines.length * 14;
    if (settings.showProductDescription && item.description) {
      const descLines = splitText(bodyFont, item.description, 8.6, productWidth, 2);
      descLines.forEach((line, index) => drawText(page, bodyFont, line, productTextRight, metaY - 2 - index * 11, 8.6, "#64748b", "right"));
      metaY -= descLines.length * 11 + 2;
    }
    const meta = [settings.showSku && item.sku ? `SKU ${item.sku}` : "", settings.showGtin && item.gtin ? `GTIN ${item.gtin}` : "", settings.showMpn && item.mpn ? `MPN ${item.mpn}` : ""].filter(Boolean).join(" · ");
    if (meta) drawText(page, bodyFont, meta, productTextRight, metaY - 2, 7.8, "#64748b", "right");
    if (settings.showProductBarcode && item.barcode) drawBarcode(page, bodyFont, item.barcode, productTextRight - 92, bottom + 7, 92, 25);
    const middle = bottom + row / 2 + 4;
    drawText(page, bodyFont, String(item.qty), columns.qty + 28, middle, 10.6, textColor, "center");
    drawText(page, bodyFont, money(item.unitPrice, item.currency || model.order.currency), columns.price + 76, middle, 9.2, textColor, "right");
    drawText(page, titleFont, money(item.totalPrice, item.currency || model.order.currency), MARGIN + 80, middle, 9.6, textColor, "right");
    cursor = bottom;
  }

  if (isLast) {
    cursor -= 18;
    const infoWidth = 250;
    drawText(page, bodyFont, "تفاصيل الدفع", PAGE_WIDTH - MARGIN, cursor, 11, textColor, "right");
    cursor -= 15;
    drawText(page, bodyFont, `طريقة الدفع: ${paymentMethodLabel(model.order.paymentMethod)}`, PAGE_WIDTH - MARGIN, cursor, 9.4, "#475569", "right");
    cursor -= 14;
    drawText(page, bodyFont, `حالة الدفع: ${paymentStatusLabel(model.order.paymentStatus)}`, PAGE_WIDTH - MARGIN, cursor, 9.4, "#475569", "right");
    if (model.order.walletUsed > 0) {
      // Keep Arabic labels and Latin currency values in separate text runs.
      // Mixing RTL Arabic with LTR numbers/currency in one fontkit run reverses
      // values such as "SAR 100" into "001 RAS" in the generated PDF.
      cursor -= 14;
      drawText(page, bodyFont, "المدفوع من المحفظة", PAGE_WIDTH - MARGIN, cursor, 9.4, "#047857", "right");
      cursor -= 13;
      drawText(page, titleFont, money(model.order.walletUsed, model.order.currency), PAGE_WIDTH - MARGIN, cursor, 9.4, "#047857", "right");

      cursor -= 14;
      drawText(page, bodyFont, "المتبقي على العميل", PAGE_WIDTH - MARGIN, cursor, 9.4, "#475569", "right");
      cursor -= 13;
      drawText(page, titleFont, money(model.order.walletRemaining, model.order.currency), PAGE_WIDTH - MARGIN, cursor, 9.4, "#475569", "right");

      if (model.order.walletRefunded > 0) {
        cursor -= 14;
        drawText(page, bodyFont, "المسترجع إلى المحفظة", PAGE_WIDTH - MARGIN, cursor, 9.4, "#475569", "right");
        cursor -= 13;
        drawText(page, titleFont, money(model.order.walletRefunded, model.order.currency), PAGE_WIDTH - MARGIN, cursor, 9.4, "#475569", "right");
      }
    }
    if (model.order.shippingCarrier) { cursor -= 14; drawText(page, bodyFont, `شركة الشحن: ${model.order.shippingCarrier}`, PAGE_WIDTH - MARGIN, cursor, 9.4, "#475569", "right"); }
    const totalsX = MARGIN;
    let totalY = cursor + 14;
    const rows: Array<[string, string, boolean]> = [
      ["الإجمالي الفرعي", money(model.order.subtotal, model.order.currency), true],
      ["الشحن", model.order.shipping > 0 ? money(model.order.shipping, model.order.currency) : "مجاني", true],
      ["الخصم", `- ${money(model.order.discount, model.order.currency)}`, model.order.discount > 0],
      [model.store.taxLabel || "ضريبة القيمة المضافة", money(model.order.tax, model.order.currency), model.order.tax > 0 || settings.showZeroTaxFields],
    ];
    for (const [label, value, visible] of rows) {
      if (!visible) continue;
      drawText(page, bodyFont, label, totalsX + 184, totalY, 10.2, "#475569", "right");
      drawText(page, bodyFont, value, totalsX, totalY, 10.2, textColor, "left");
      totalY -= 17;
    }
    drawLine(page, totalsX, totalY + 5, totalsX + 184, totalY + 5, "#0f172a", 1.35);
    drawText(page, titleFont, "الإجمالي", totalsX + 184, totalY - 13, 14, textColor, "right");
    drawText(page, titleFont, money(model.order.total, model.order.currency), totalsX, totalY - 13, 14, textColor, "left");
  }

  const stamp = images.get("stamp");
  if (stamp) {
    const fit = fitImage(stamp, 78, 78);
    const stampX = settings.stampPosition === "bottom-left" ? MARGIN : settings.stampPosition === "bottom-center" ? (PAGE_WIDTH - fit.width) / 2 : PAGE_WIDTH - MARGIN - fit.width;
    addImage(page, stamp, stampX, 62, fit.width, fit.height, settings.stampOpacity / 100);
  }
  drawLine(page, MARGIN, 42, PAGE_WIDTH - MARGIN, 42, "#e2e8f0", 0.75);
  drawText(page, bodyFont, settings.footerText || DEFAULT_INVOICE_SETTINGS.footerText, PAGE_WIDTH / 2, 25, 8.8, "#64748b", "center");
  drawText(page, bodyFont, `${pageNo} / ${pageCount}`, MARGIN, 25, 8, "#94a3b8", "left");
  return page;
}

function buildPdf(pages: PdfPage[]) {
  let nextId = 3;
  const pageEntries = pages.map((page) => {
    const pageId = nextId++;
    const contentsId = nextId++;
    const imageEntries = page.images.map((image) => ({ ...image, objectId: nextId++ }));
    const opacityValues = Array.from(new Set(imageEntries.map((image) => Math.round(image.opacity * 1000) / 1000).filter((value) => value < 1)));
    const opacityIds = new Map<number, number>();
    for (const value of opacityValues) opacityIds.set(value, nextId++);
    return { page, pageId, contentsId, imageEntries, opacityIds };
  });
  const size = nextId;
  const objects = new Map<number, Buffer | string>();
  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(2, `<< /Type /Pages /Kids [${pageEntries.map((entry) => `${entry.pageId} 0 R`).join(" ")}] /Count ${pageEntries.length} >>`);
  for (const entry of pageEntries) {
    const content = entry.page.commands.join("") + entry.imageEntries.map((image) => {
      const opacity = Math.round(image.opacity * 1000) / 1000;
      const gs = entry.opacityIds.get(opacity);
      return `q\n${gs ? `/GS${Math.round(opacity * 1000)} gs\n` : ""}${pdfNumber(image.width)} 0 0 ${pdfNumber(image.height)} ${pdfNumber(image.x)} ${pdfNumber(image.y)} cm\n/${image.name} Do\nQ\n`;
    }).join("");
    const contentBuffer = Buffer.from(content, "ascii");
    objects.set(entry.contentsId, Buffer.concat([Buffer.from(`<< /Length ${contentBuffer.length} >>\nstream\n`, "ascii"), contentBuffer, Buffer.from("endstream", "ascii")]));
    const xObjects = entry.imageEntries.map((image) => `/${image.name} ${image.objectId} 0 R`).join(" ");
    const extGs = Array.from(entry.opacityIds.entries()).map(([opacity, objectId]) => `/GS${Math.round(opacity * 1000)} ${objectId} 0 R`).join(" ");
    objects.set(entry.pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << ${xObjects ? `/XObject << ${xObjects} >>` : ""} ${extGs ? `/ExtGState << ${extGs} >>` : ""} >> /Contents ${entry.contentsId} 0 R >>`);
    for (const image of entry.imageEntries) {
      const body = image.image.kind === "jpeg"
        ? Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${image.image.width} /Height ${image.image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.image.data.length} >>\nstream\n`, "ascii"), image.image.data, Buffer.from("\nendstream", "ascii")])
        : (() => {
            const compressed = deflateSync(image.image.data, { level: 9 });
            return Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${image.image.width} /Height ${image.image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${compressed.length} >>\nstream\n`, "ascii"), compressed, Buffer.from("\nendstream", "ascii")]);
          })();
      objects.set(image.objectId, body);
    }
    for (const [opacity, objectId] of entry.opacityIds) objects.set(objectId, `<< /Type /ExtGState /ca ${pdfNumber(opacity)} /CA ${pdfNumber(opacity)} >>`);
  }
  const buffers: Buffer[] = [];
  const offsets: number[] = new Array(size).fill(0);
  let position = 0;
  const push = (value: Buffer | string) => { const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "binary"); buffers.push(buffer); position += buffer.length; };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  for (let id = 1; id < size; id += 1) {
    offsets[id] = position;
    push(`${id} 0 obj\n`); push(objects.get(id) || "<< >>"); push("\nendobj\n");
  }
  const xref = position;
  push(`xref\n0 ${size}\n0000000000 65535 f \n`);
  for (let id = 1; id < size; id += 1) push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  push(`trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return Buffer.concat(buffers);
}

async function loadInvoice(token: string): Promise<InvoiceModel | null> {
  const ctx = await resolveStoreContext();
  if (!ctx.store?.id) return null;

  const storeId = ctx.store.id;
  const [ordersDb, storeDb] = await Promise.all([getOrdersDb(storeId), getStoreDb(storeId)]);
  const orders: any = ordersDb;
  const store: any = storeDb;

  const orderR = await orders
    .from("orders")
    .select(
      [
        "id",
        "store_id",
        "customer_id",
        "order_number",
        "public_no",
        "public_token",
        "invoice_no",
        "currency",
        "subtotal",
        "shipping_amount",
        "tax_amount",
        "discount_amount",
        "total_amount",
        "payment_method",
        "payment_status",
        "created_at",
        "shipping_address",
        "shipping_snapshot",
      ].join(","),
    )
    .eq("store_id", storeId)
    .eq("public_token", token)
    .maybeSingle();

  if (orderR.error || !orderR.data?.id) return null;
  const order = orderR.data as DbRecord;

  const [itemsR, settingR, taxR, customerR, walletPaymentR] = await Promise.all([
    orders
      .from("order_items")
      .select(
        [
          "id",
          "product_id",
          "variant_id",
          "name",
          "sku",
          "qty",
          "currency",
          "unit_price",
          "total_price",
          "selected_options",
          "created_at",
        ].join(","),
      )
      .eq("store_id", storeId)
      .eq("order_id", order.id)
      .order("created_at", { ascending: true }),
    store
      .from("store_settings")
      .select("slug,value,updated_at")
      .eq("store_id", storeId)
      .in("slug", [SETTINGS_SLUG, "store.profile", "profile", "store.support"])
      .order("updated_at", { ascending: false }),
    store
      .from("store_tax_settings")
      .select("tax_number,tax_label")
      .eq("store_id", storeId)
      .maybeSingle(),
    order.customer_id
      ? orders
          .from("customers")
          .select("full_name,email,phone_e164")
          .eq("id", order.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    orders
      .from("order_wallet_payments")
      .select("wallet_amount,external_amount,refunded_wallet_amount,status,currency")
      .eq("store_id", storeId)
      .eq("order_id", order.id)
      .maybeSingle(),
  ]);

  const items = Array.isArray(itemsR.data) ? itemsR.data : [];
  const productIds = Array.from(new Set(items.map((item: DbRecord) => s(item.product_id)).filter(Boolean)));
  const variantIds = Array.from(new Set(items.map((item: DbRecord) => s(item.variant_id)).filter(Boolean)));

  const [productsR, mediaR, variantsR] = await Promise.all([
    productIds.length
      ? store
          .from("products")
          .select("id,description")
          .eq("store_id", storeId)
          .in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    productIds.length
      ? store
          .from("product_media")
          .select("product_id,original_url,is_default,sort_order")
          .eq("store_id", storeId)
          .eq("media_kind", "image")
          .in("product_id", productIds)
      : Promise.resolve({ data: [], error: null }),
    variantIds.length
      ? store
          .from("product_variants")
          .select("id,sku,barcode,gtin,mpn")
          .in("id", variantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const settingRows = Array.isArray(settingR.data) ? settingR.data : [];
  const firstSetting = (slugs: string[]) => {
    for (const slug of slugs) {
      const row = settingRows.find((item: DbRecord) => s(item.slug) === slug);
      if (row) return safeObject(row.value);
    }
    return {};
  };

  const invoiceSettings = normalizeInvoiceSettings(firstSetting([SETTINGS_SLUG]));
  const profile = firstSetting(["store.profile", "profile"]);
  const support = firstSetting(["store.support"]);
  const productsById = new Map<string, DbRecord>(
    safeArray(productsR.data).map((row: DbRecord) => [s(row.id), row]),
  );
  const variantsById = new Map<string, DbRecord>(
    safeArray(variantsR.data).map((row: DbRecord) => [s(row.id), row]),
  );
  const imagesByProduct = new Map<string, DbRecord>();

  for (const row of safeArray(mediaR.data)) {
    const productId = s(row.product_id);
    if (!productId) continue;
    const previous = imagesByProduct.get(productId);
    const score = (row.is_default ? 0 : 1000) + n(row.sort_order);
    const previousScore = previous ? (previous.is_default ? 0 : 1000) + n(previous.sort_order) : Number.POSITIVE_INFINITY;
    if (!previous || score < previousScore) imagesByProduct.set(productId, row);
  }

  const shippingAddress = safeObject(order.shipping_address);
  const snapshot = safeObject(order.shipping_snapshot);
  const checkoutSnapshot = safeObject(snapshot.checkout);
  const customer = safeObject(customerR.data);
  const walletPayment = walletPaymentR?.error ? {} : safeObject(walletPaymentR?.data);
  const walletUsed = round2(walletPayment.wallet_amount);
  const walletRemaining = round2(
    walletPayment.external_amount ?? Math.max(0, round2(order.total_amount) - walletUsed),
  );
  const walletRefunded = round2(walletPayment.refunded_wallet_amount);

  const invoiceItems: InvoiceItem[] = items.map((item: DbRecord, index: number) => {
    const product = productsById.get(s(item.product_id)) || {};
    const variant = variantsById.get(s(item.variant_id)) || {};
    const image = imagesByProduct.get(s(item.product_id)) || {};
    const options = selectedOptionsText(item.selected_options);
    const description = options || stripHtml(product.description);

    return {
      id: s(item.id) || `${s(item.product_id)}-${index}`,
      name: firstText(item.name, "منتج"),
      qty: Math.max(1, Math.floor(n(item.qty) || 1)),
      unitPrice: round2(item.unit_price),
      totalPrice: round2(item.total_price),
      currency: firstText(item.currency, order.currency, ctx.store?.default_currency, "SAR"),
      description,
      sku: firstText(item.sku, variant.sku),
      gtin: firstText(variant.gtin),
      mpn: firstText(variant.mpn),
      barcode: firstText(variant.barcode, variant.gtin, item.sku),
      imageUrl: safeHttpUrl(image.original_url),
    };
  });

  const orderShippingCarrier = firstText(
    snapshot.carrier_name,
    snapshot.shipping_carrier_name,
    snapshot.shipping_method_name,
    checkoutSnapshot.carrier_name,
    checkoutSnapshot.shipping_method_name,
  );

  return {
    store: {
      name: firstText(ctx.store.name, "المتجر"),
      logoUrl: safeHttpUrl(firstText(ctx.store.logo_url, profile.logo_url)),
      address: profileAddress(profile),
      email: firstText(support.email, profile.email, profile.support_email),
      phone: firstText(support.phone, support.whatsapp, profile.phone),
      taxNumber: firstText(taxR.data?.tax_number),
      taxLabel: firstText(taxR.data?.tax_label, "الرقم الضريبي"),
    },
    order: {
      invoiceNo: firstText(order.invoice_no, order.order_number, order.public_no, order.id),
      orderNo: firstText(order.order_number, order.public_no, order.invoice_no, order.id),
      publicNo: firstText(order.public_no),
      createdAt: firstText(order.created_at),
      currency: firstText(order.currency, ctx.store.default_currency, "SAR"),
      paymentMethod: firstText(order.payment_method, checkoutSnapshot.payment_method),
      paymentStatus: firstText(order.payment_status),
      shippingCarrier: orderShippingCarrier,
      shippingAddress: formatAddress(shippingAddress),
      customerName: firstText(shippingAddress.recipient_name, shippingAddress.name, shippingAddress.full_name, customer.full_name),
      customerEmail: firstText(shippingAddress.email, customer.email),
      customerPhone: firstText(shippingAddress.phone_e164, shippingAddress.phone, customer.phone_e164),
      subtotal: round2(order.subtotal),
      shipping: round2(order.shipping_amount),
      discount: round2(order.discount_amount),
      tax: round2(order.tax_amount),
      total: round2(order.total_amount),
      walletUsed,
      walletRemaining,
      walletRefunded,
    },
    items: invoiceItems,
    settings: invoiceSettings,
  };
}



export async function GET(
  request: Request,
  context: { params: Promise<{ token?: string }> },
) {
  try {
    const params = await context.params;
    const token = s(params?.token);
    if (!/^[A-Za-z0-9_-]{5,160}$/.test(token)) return new Response("Not found", { status: 404 });
    const model = await loadInvoice(token);
    if (!model) return new Response("Not found", { status: 404 });

    const [fonts, logo, watermark, stamp] = await Promise.all([
      loadFonts(request),
      model.settings.showLogo ? fetchPdfImage(model.store.logoUrl) : Promise.resolve(null),
      model.settings.watermarkUrl ? fetchPdfImage(model.settings.watermarkUrl) : Promise.resolve(null),
      model.settings.stampUrl ? fetchPdfImage(model.settings.stampUrl) : Promise.resolve(null),
    ]);
    const images = new Map<string, PdfImage>();
    if (logo) images.set("logo", logo);
    if (watermark) images.set("watermark", watermark);
    if (stamp) images.set("stamp", stamp);
    if (model.settings.showProductImage) {
      const unique = Array.from(new Map(model.items.filter((item) => item.imageUrl).map((item) => [item.imageUrl, item.imageUrl])).keys());
      const fetched = await Promise.all(unique.map(async (url) => [url, await fetchPdfImage(url)] as const));
      const byUrl = new Map(fetched);
      for (const item of model.items) {
        const image = byUrl.get(item.imageUrl);
        if (image) images.set(`item:${item.id}`, image);
      }
    }
    const primaryFont = model.settings.primaryFontWeight === "bold" ? fonts.bold : fonts.regular;
    const chunks = splitItemsForPages(model.items, model.settings, primaryFont);
    const pages = chunks.map((chunk, index) => drawPage(model, fonts, images, chunk, index + 1, chunks.length));
    const pdf = buildPdf(pages);
    const cleanNo = model.order.invoiceNo.replace(/[^A-Za-z0-9_-]/g, "") || "order";
    return new Response(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${cleanNo}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("[storefront-invoice-download]", error);
    return new Response("تعذر إنشاء الفاتورة حالياً", { status: 500 });
  }
}
