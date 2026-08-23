const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const iconDirectory = path.join(__dirname, 'assets', 'icons');
const sizes = [16, 32, 48, 128];
const samplesPerAxis = 4;

fs.mkdirSync(iconDirectory, { recursive: true });
for (const size of sizes) {
  const png = new PNG({ width: size, height: size, colorType: 6 });
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const samples = [];
      for (let sampleY = 0; sampleY < samplesPerAxis; sampleY += 1) {
        for (let sampleX = 0; sampleX < samplesPerAxis; sampleX += 1) {
          samples.push(
            colorAt(
              (x + (sampleX + 0.5) / samplesPerAxis) / size,
              (y + (sampleY + 0.5) / samplesPerAxis) / size,
            ),
          );
        }
      }
      const color = average(samples);
      const offset = (y * size + x) * 4;
      png.data[offset] = color.r;
      png.data[offset + 1] = color.g;
      png.data[offset + 2] = color.b;
      png.data[offset + 3] = color.a;
    }
  }
  fs.writeFileSync(path.join(iconDirectory, `icon-${size}.png`), PNG.sync.write(png));
}

function colorAt(x, y) {
  if (!insideRoundedRectangle(x, y, 0.04, 0.04, 0.92, 0.92, 0.22)) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  let color = { r: 13, g: 17, b: 27, a: 255 };
  const glow = Math.max(0, 1 - Math.hypot(x - 0.76, y - 0.18) / 0.72);
  color = blend(color, { r: 58, g: 45, b: 128, a: 255 }, glow * 0.72);

  if (insideRoundedRectangle(x, y, 0.3, 0.43, 0.4, 0.14, 0.07)) {
    color = { r: 104, g: 96, b: 255, a: 255 };
  }

  const leftDistance = Math.hypot(x - 0.34, y - 0.5);
  const rightDistance = Math.hypot(x - 0.66, y - 0.5);
  if (
    (leftDistance <= 0.225 && leftDistance >= 0.12) ||
    (rightDistance <= 0.225 && rightDistance >= 0.12)
  ) {
    color = { r: 245, g: 247, b: 251, a: 255 };
  }

  return color;
}

function insideRoundedRectangle(x, y, left, top, width, height, radius) {
  const centerX = left + width / 2;
  const centerY = top + height / 2;
  const distanceX = Math.abs(x - centerX) - (width / 2 - radius);
  const distanceY = Math.abs(y - centerY) - (height / 2 - radius);
  return (
    Math.hypot(Math.max(distanceX, 0), Math.max(distanceY, 0)) +
      Math.min(Math.max(distanceX, distanceY), 0) <=
    radius
  );
}

function blend(base, overlay, amount) {
  return {
    r: Math.round(base.r + (overlay.r - base.r) * amount),
    g: Math.round(base.g + (overlay.g - base.g) * amount),
    b: Math.round(base.b + (overlay.b - base.b) * amount),
    a: 255,
  };
}

function average(colors) {
  const totals = colors.reduce(
    (result, color) => ({
      r: result.r + color.r * color.a,
      g: result.g + color.g * color.a,
      b: result.b + color.b * color.a,
      a: result.a + color.a,
    }),
    { r: 0, g: 0, b: 0, a: 0 },
  );
  if (totals.a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  return {
    r: Math.round(totals.r / totals.a),
    g: Math.round(totals.g / totals.a),
    b: Math.round(totals.b / totals.a),
    a: Math.round(totals.a / colors.length),
  };
}
