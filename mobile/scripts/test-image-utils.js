const path = require('path');
const { generateImageAsync } = require('@expo/image-utils');

const ASSETS_DIR = path.join(__dirname, 'assets');

const iconsToResize = [
  'SquareLogo.png',
  'adaptive-icon.png',
  'icon.png',
  'splash-icon.png',
  'logo.png'
];

async function resizeIcon(filename) {
  const src = path.join(ASSETS_DIR, filename);
  try {
    // Generate an image using contain (which scales it down to fit the bounding box, maintaining aspect ratio)
    // We don't have a way to just "pad" unless we know the original size.
    // Let's just create a new 1024x1024 image with the src scaled down to 70%.
    // Actually generateImageAsync doesn't expose a "scale" property directly, but resizeMode 'contain' 
    // will scale to fit the width/height. If the source image is 1024x1024, resizeMode contain with 1024x1024
    // will just keep it 1024x1024 without padding.
    console.log("To do padding properly, we need sharp.");
  } catch(e) {
    console.error(e);
  }
}

console.log("We need sharp to do transparent padding. Let's try downloading a sharp binary or use something else.");
