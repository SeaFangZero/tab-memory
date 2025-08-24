// Simple script to create placeholder icons for the extension
// In production, you'd want proper icon files

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '../extension/src/icons');

// Create icons directory if it doesn't exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create simple SVG icons as placeholders
const createIcon = (size) => {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#3b82f6"/>
  <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="white" font-family="Arial" font-size="${size * 0.4}" font-weight="bold">TM</text>
</svg>`;
};

const sizes = [16, 32, 48, 128];

sizes.forEach(size => {
  const svg = createIcon(size);
  const filename = path.join(iconsDir, `icon${size}.svg`);
  fs.writeFileSync(filename, svg);
  console.log(`Created ${filename}`);
});

console.log('Placeholder icons created! Replace with proper PNG icons for production.');
console.log('To convert SVG to PNG, use tools like Inkscape or online converters.');
