const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// List of exercise illustration PNGs that currently render with a white matte.
const exerciseImagePaths = [
  'exercises copy/tricep-extension-machine/large.png',
  'exercises copy/hammer-curl-dumbbell/large.png',
  'exercises copy/overhead-tricep-extension-cable/large.png',
  'exercises copy/clean-and-jerk-barbell/large.png',
  'exercises copy/front-raise-band/large.png',
  'exercises copy/hanging-leg-raise/large.png',
  'exercises copy/knee-push-up/large.png',
  'exercises copy/lunge/large.png',
  'exercises copy/power-clean/large.png',
  'exercises copy/shoulder-press-dumbbell/large.png',
];

const ROOT = path.resolve(__dirname, '..');
const WHITE_THRESHOLD = 240;
const COLOR_TOLERANCE = 18;

function isAlmostWhite(r, g, b) {
  if (r < WHITE_THRESHOLD || g < WHITE_THRESHOLD || b < WHITE_THRESHOLD) {
    return false;
  }

  return (
    Math.abs(r - g) <= COLOR_TOLERANCE &&
    Math.abs(r - b) <= COLOR_TOLERANCE &&
    Math.abs(g - b) <= COLOR_TOLERANCE
  );
}

function removeWhiteBackground(imagePath) {
  const absolute = path.join(ROOT, imagePath);
  const buffer = fs.readFileSync(absolute);
  const png = PNG.sync.read(buffer);
  const { data } = png;

  for (let idx = 0; idx < data.length; idx += 4) {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];

    if (a !== 0 && isAlmostWhite(r, g, b)) {
      data[idx + 3] = 0;
    }
  }

  const output = PNG.sync.write(png);
  fs.writeFileSync(absolute, output);
  console.log(`✅ Removed matte from ${imagePath}`);
}

exerciseImagePaths.forEach(removeWhiteBackground);
