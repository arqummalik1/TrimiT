const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../assets');

const iconsToResize = [
  'SquareLogo.png',
  'adaptive-icon.png',
  'icon.png',
  'splash-icon.png',
  'logo.png'
];

async function resizeIcon(filename) {
  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${filename} - not found`);
    return;
  }

  const backupPath = path.join(ASSETS_DIR, `${filename}.bak`);
  
  // Backup original
  fs.copyFileSync(filePath, backupPath);

  try {
    const metadata = await sharp(backupPath).metadata();
    const width = metadata.width;
    const height = metadata.height;

    // Reduce size by 30% -> meaning we scale the actual image down to 70% of its original size
    const newInnerWidth = Math.round(width * 0.7);
    const newInnerHeight = Math.round(height * 0.7);

    // We resize the image down to 70%, then extend the canvas back to 100% with a transparent background
    await sharp(backupPath)
      .resize(newInnerWidth, newInnerHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .extend({
        top: Math.round((height - newInnerHeight) / 2),
        bottom: height - newInnerHeight - Math.round((height - newInnerHeight) / 2),
        left: Math.round((width - newInnerWidth) / 2),
        right: width - newInnerWidth - Math.round((width - newInnerWidth) / 2),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toFile(filePath);

    console.log(`Successfully resized and padded ${filename}`);
  } catch (error) {
    console.error(`Error processing ${filename}:`, error);
    // Restore backup
    fs.copyFileSync(backupPath, filePath);
  }
}

async function run() {
  for (const icon of iconsToResize) {
    await resizeIcon(icon);
  }
  console.log('Done!');
}

run();
