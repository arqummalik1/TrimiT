const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Usage: node bump-version.js <new-version>');
  console.error('Example: node bump-version.js 1.0.3');
  process.exit(1);
}

// 1. Update shared/app-version.json
const sharedAppVersionPath = path.join(__dirname, '../shared/app-version.json');
if (fs.existsSync(sharedAppVersionPath)) {
  const appVersion = JSON.parse(fs.readFileSync(sharedAppVersionPath, 'utf8'));
  appVersion.version = newVersion;
  appVersion.androidVersionCode += 1;
  appVersion.iosBuildNumber = String(Number(appVersion.iosBuildNumber) + 1);
  fs.writeFileSync(sharedAppVersionPath, JSON.stringify(appVersion, null, 2) + '\n', 'utf8');
  console.log(`Updated shared/app-version.json to version ${newVersion}, androidVersionCode ${appVersion.androidVersionCode}`);
}

// 2. Update mobile/package.json
const mobilePackageJsonPath = path.join(__dirname, '../mobile/package.json');
if (fs.existsSync(mobilePackageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(mobilePackageJsonPath, 'utf8'));
  pkg.version = newVersion;
  fs.writeFileSync(mobilePackageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
  console.log(`Updated mobile/package.json to version ${newVersion}`);
}

// 3. Update backend/server.py
const serverPyPath = path.join(__dirname, '../backend/server.py');
if (fs.existsSync(serverPyPath)) {
  let content = fs.readFileSync(serverPyPath, 'utf8');
  // Match version="x.y.z"
  content = content.replace(/version="[0-9]+\.[0-9]+\.[0-9]+"/, `version="${newVersion}"`);
  fs.writeFileSync(serverPyPath, content, 'utf8');
  console.log(`Updated backend/server.py to version ${newVersion}`);
}

console.log('✅ Version bump complete.');
