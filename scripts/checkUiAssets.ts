import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { inflateSync } from "node:zlib";

type AssetSpec = {
  readonly file: string;
  readonly directory?: "ui" | "world";
  readonly width: number;
  readonly height: number;
  readonly alphaMode: "hard" | "opaque" | "gradient";
  readonly maxKiB: number;
  readonly interior?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
};

type Png = {
  readonly width: number;
  readonly height: number;
  readonly alpha: Uint8Array;
};

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ASSET_ROOT = resolve("public/assets");
const ASSETS: readonly AssetSpec[] = [
  { file: "card_frame_common.png", width: 512, height: 768, alphaMode: "hard", maxKiB: 256, interior: { x: 40, y: 56, width: 432, height: 656 } },
  { file: "card_frame_rare.png", width: 512, height: 768, alphaMode: "hard", maxKiB: 256, interior: { x: 40, y: 56, width: 432, height: 656 } },
  { file: "card_frame_legendary.png", width: 512, height: 768, alphaMode: "hard", maxKiB: 256, interior: { x: 40, y: 56, width: 432, height: 656 } },
  { file: "house_select_frame.png", width: 384, height: 512, alphaMode: "hard", maxKiB: 256 },
  { file: "panel_frame.png", width: 512, height: 512, alphaMode: "hard", maxKiB: 256 },
  { file: "background_field.png", directory: "world", width: 1920, height: 1200, alphaMode: "opaque", maxKiB: 512 },
  { file: "draft_backdrop.png", width: 1920, height: 1080, alphaMode: "gradient", maxKiB: 512 },
  { file: "gauge_frame.png", width: 256, height: 64, alphaMode: "hard", maxKiB: 128 },
] as const;

function paeth(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  return aboveDistance <= upperLeftDistance ? above : upperLeft;
}

function unfilter(raw: Buffer, width: number, height: number): Uint8Array {
  const stride = width * 4;
  const pixels = new Uint8Array(stride * height);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw.readUInt8(inputOffset);
    inputOffset += 1;
    const rowOffset = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const encoded = raw.readUInt8(inputOffset + x);
      const left = x >= 4 ? pixels[rowOffset + x - 4] ?? 0 : 0;
      const above = y > 0 ? pixels[rowOffset + x - stride] ?? 0 : 0;
      const upperLeft = x >= 4 && y > 0 ? pixels[rowOffset + x - stride - 4] ?? 0 : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) predictor = paeth(left, above, upperLeft);
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
      pixels[rowOffset + x] = (encoded + predictor) & 255;
    }
    inputOffset += stride;
  }
  return pixels;
}

function readPng(path: string): Png {
  const png = readFileSync(path);
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error(`${path} is not a PNG`);
  let offset = 8;
  let width = 0;
  let height = 0;
  const compressed: Buffer[] = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const valid = data.readUInt8(8) === 8 && data.readUInt8(9) === 6 && data.readUInt8(12) === 0;
      if (!valid) throw new Error(`${path} must be non-interlaced 8-bit RGBA`);
    } else if (type === "IDAT") {
      compressed.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset += length + 12;
  }
  if (width === 0 || height === 0 || compressed.length === 0) throw new Error(`${path} has incomplete PNG data`);
  const pixels = unfilter(inflateSync(Buffer.concat(compressed)), width, height);
  const alpha = new Uint8Array(width * height);
  for (let index = 0; index < alpha.length; index += 1) alpha[index] = pixels[index * 4 + 3] ?? 0;
  return { width, height, alpha };
}

function detectInterior(alpha: Uint8Array, width: number, height: number): AssetSpec["interior"] {
  const centerX = Math.floor(width / 2);
  const centerY = Math.floor(height / 2);
  const isTransparent = (x: number, y: number): boolean => alpha[y * width + x] === 0;
  if (!isTransparent(centerX, centerY)) throw new Error("Card centre is not transparent");
  let x = centerX;
  while (x > 0 && isTransparent(x - 1, centerY)) x -= 1;
  let right = centerX;
  while (right + 1 < width && isTransparent(right + 1, centerY)) right += 1;
  const rowIsTransparent = (y: number): boolean => {
    for (let column = x; column <= right; column += 1) {
      if (!isTransparent(column, y)) return false;
    }
    return true;
  };
  let y = centerY;
  while (y > 0 && rowIsTransparent(y - 1)) y -= 1;
  let bottom = centerY;
  while (bottom + 1 < height && rowIsTransparent(bottom + 1)) bottom += 1;
  return { x, y, width: right - x + 1, height: bottom - y + 1 };
}

function sameInterior(actual: AssetSpec["interior"], expected: NonNullable<AssetSpec["interior"]>): boolean {
  return actual?.x === expected.x
    && actual.y === expected.y
    && actual.width === expected.width
    && actual.height === expected.height;
}

for (const spec of ASSETS) {
  const path = resolve(ASSET_ROOT, spec.directory ?? "ui", spec.file);
  const png = readPng(path);
  if (png.width !== spec.width || png.height !== spec.height) {
    throw new Error(`${spec.file}: expected ${spec.width}x${spec.height}, got ${png.width}x${png.height}`);
  }
  let covered = 0;
  let partial = 0;
  let minimumAlpha = 255;
  let maximumAlpha = 0;
  for (const alpha of png.alpha) {
    if (alpha > 0) covered += 1;
    if (alpha > 0 && alpha < 255) partial += 1;
    minimumAlpha = Math.min(minimumAlpha, alpha);
    maximumAlpha = Math.max(maximumAlpha, alpha);
  }
  const coverage = ((covered / png.alpha.length) * 100).toFixed(2);
  const sizeKiBValue = statSync(path).size / 1024;
  const sizeKiB = sizeKiBValue.toFixed(1);
  if (sizeKiBValue > spec.maxKiB) throw new Error(`${spec.file}: ${sizeKiB}KiB exceeds ${spec.maxKiB}KiB`);
  if (spec.alphaMode === "hard" && (partial !== 0 || covered === png.alpha.length)) {
    throw new Error(`${spec.file}: expected hard transparent edges without partial alpha`);
  }
  if (spec.alphaMode === "opaque" && (partial !== 0 || covered !== png.alpha.length)) {
    throw new Error(`${spec.file}: expected a fully opaque alpha channel`);
  }
  if (spec.alphaMode === "gradient" && (partial === 0 || covered !== png.alpha.length)) {
    throw new Error(`${spec.file}: expected a non-zero alpha gradient across the full image`);
  }
  const interior = spec.interior ? detectInterior(png.alpha, png.width, png.height) : undefined;
  if (spec.interior && !sameInterior(interior, spec.interior)) {
    throw new Error(`${spec.file}: interior mismatch ${JSON.stringify(interior)}`);
  }
  const box = interior
    ? ` interior=x${interior.x},y${interior.y},w${interior.width},h${interior.height}`
    : "";
  console.log(
    `${spec.file}: ${png.width}x${png.height} size=${sizeKiB}KiB alphaCoverage=${coverage}% alphaRange=${minimumAlpha}-${maximumAlpha} partialAlpha=${partial}${box}`,
  );
}
console.log("All 8 assets passed dimension and alpha checks; card interiors are identical.");
