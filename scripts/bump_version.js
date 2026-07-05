const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node bump_version.js <new-version-string>");
  console.error("Example: node bump_version.js 1.0.3");
  process.exit(1);
}

const newVersion = args[0];
const appVersionPath = path.join(__dirname, '..', 'shared', 'app-version.json');

try {
  if (!fs.existsSync(appVersionPath)) {
    console.error(`Error: File not found at ${appVersionPath}`);
    process.exit(1);
  }

  const data = fs.readFileSync(appVersionPath, 'utf8');
  const appVersion = JSON.parse(data);

  console.log(`Current version: ${appVersion.version}`);
  console.log(`Current androidVersionCode: ${appVersion.androidVersionCode}`);
  console.log(`Current iosBuildNumber: ${appVersion.iosBuildNumber}`);

  // Update values
  appVersion.version = newVersion;
  appVersion.androidVersionCode = (appVersion.androidVersionCode || 0) + 1;
  appVersion.iosBuildNumber = String(parseInt(appVersion.iosBuildNumber || "0", 10) + 1);

  console.log(`\nBumping to new version: ${appVersion.version}`);
  console.log(`New androidVersionCode: ${appVersion.androidVersionCode}`);
  console.log(`New iosBuildNumber: ${appVersion.iosBuildNumber}`);

  fs.writeFileSync(appVersionPath, JSON.stringify(appVersion, null, 2) + '\n', 'utf8');

  console.log('\nSuccess! Version updated in shared/app-version.json');
} catch (error) {
  console.error("Failed to bump version:", error);
  process.exit(1);
}
