// Shared package.json loader
// Ensures consistent package info loading across the application

let cachedPackage = null;

function loadPackage() {
  if (cachedPackage) {
    return cachedPackage;
  }

  let packageInfo = null;
  
  // Try multiple paths to find package.json
  const paths = [
    '../../../package.json',    // From src/routes/modules/
    '../../../../package.json',  // Alternative from src/routes/modules/
    '../../package.json',        // From src/routes/
    '../package.json',           // From src/
    './package.json',            // From root
  ];

  for (const path of paths) {
    try {
      packageInfo = require(path);
      console.log('[PackageLoader] ✓ Loaded package.json from:', path);
      break;
    } catch (err) {
      console.log('[PackageLoader] Failed path:', path);
    }
  }

  if (!packageInfo) {
    console.warn('[PackageLoader] Could not load package.json from any path, using defaults');
    packageInfo = {
      version: 'unknown',
      publishDate: 'unknown',
      name: 'Transculturalist',
      description: 'A cultural exploration game platform'
    };
  }

  cachedPackage = packageInfo;
  return packageInfo;
}

function getPackageInfo() {
  const pkg = loadPackage();
  return {
    version: pkg.version || 'unknown',
    publishDate: pkg.publishDate || 'unknown',
    name: pkg.name || 'Transculturalist',
    description: pkg.description || 'A cultural exploration game platform'
  };
}

module.exports = {
  loadPackage,
  getPackageInfo
};
