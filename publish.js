const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");
const { execSync } = require("child_process");

// Path configurations
const manifestPath = path.join(__dirname, "public/manifest.json");
const distPath = path.join(__dirname, "dist");
const buildsPath = path.join(__dirname, "builds");

// Function to update version in manifest.json
const updateVersionInManifest = (isPath) => {
  const manifest = fs.readJSONSync(manifestPath);
  const version = manifest.version;

  // Extract the major, minor, and patch version numbers
  let [major, minor, patch] = version.split(".").map(Number);

  // Increment version based on the flag
  if (isPath) {
    patch += 1;
  } else {
    minor += 1;
    patch = 0; // Reset patch to 0 when minor is incremented
  }

  const newVersion = `${major}.${minor}.${patch}`;
  manifest.version = newVersion;

  fs.writeJSONSync(manifestPath, manifest, { spaces: 2 });
  console.log(`Version updated to ${newVersion}`);
  return newVersion;
};

// Function to build the project
const buildProject = () => {
  console.log("Building project...");
  execSync("npm run build", { stdio: "inherit" });
  console.log("Build completed");
};

// Function to zip the /dist folder and save it in the /builds folder
const zipDistFolder = (version) => {
  const zipName = `tabme_v${version}.zip`;
  const zipPath = path.join(buildsPath, zipName);

  fs.ensureDirSync(buildsPath);

  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    console.log(`${archive.pointer()} total bytes`);
    console.log(`Archive ${zipName} created successfully`);
  });

  archive.on("error", (err) => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(distPath, false);
  archive.finalize();
};

// Main function to execute the steps
const main = async () => {
  try {
    // Check if --path flag is provided
    const isPath = process.argv.includes("--path");

    // Step 1: Update version in manifest.json
    const newVersion = updateVersionInManifest(isPath);

    // Step 2: Build the project
    buildProject();

    // Step 3: Zip the /dist folder and save it in the /builds folder
    zipDistFolder(newVersion);

    console.log("Don't forget to update \"What's new\" in the ChromeStore admin panel.");
  } catch (error) {
    console.error("Error during publish process:", error);
  }
};

main();