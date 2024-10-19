const fs = require("fs-extra");
const path = require("path");
const archiver = require("archiver");
const { execSync } = require("child_process");

// Path configurations
const distPath = path.join(__dirname, "../dist");
const buildsPath = path.join(__dirname, "../builds");

// Function to update version in manifest.json
const updateVersionInManifest = (isPath, manifestFile) => {
  const manifestPath = path.join(__dirname, `../public/${manifestFile}`);
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

// Function to build the project with the specified environment
const buildProject = (env) => {
  console.log(`Building project with BUILD_TYPE=${env.BUILD_TYPE}...`);
  execSync(`npm run build -- --env BUILD_TYPE=${env.BUILD_TYPE}`, { stdio: "inherit" });
  console.log(`Build completed for BUILD_TYPE=${env.BUILD_TYPE}`);
};

// Function to zip the /dist folder and save it in the /builds folder
const zipDistFolder = (version, buildType, onCompleted) => {
  const zipName = `tabme_v${version}_${buildType}.zip`;
  const zipPath = path.join(buildsPath, zipName);

  fs.ensureDirSync(buildsPath);

  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    console.log(`${archive.pointer()} total bytes`);
    console.log(`Archive ${zipName} created successfully`);
    if(onCompleted) {
      onCompleted()
    }
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

    execSync(`npm run clean`);

    // Step 1: Update version in manifest.json for tabme
    let newVersion = updateVersionInManifest(isPath, 'manifest-normal.json')
    // Step 2: Build the test version (window.isTest = true)
    buildProject({ BUILD_TYPE: "normal" });
    // Step 3: Zip the test version
    zipDistFolder(newVersion, "normal", () => {

      // now build without new tab
      // Step: Clean
      execSync(`npm run clean`);

      // Step 4: Update version in manifest.json for tabme - version without newtab
      newVersion = updateVersionInManifest(isPath, 'manifest-overrideless.json')
      // // Step 5: Build the prod version (window.isTest = false)
      buildProject({ BUILD_TYPE: "overrideless" });
      // // Step 6: Zip the prod version
      zipDistFolder(newVersion, "overrideless", () => {
        console.log("Don't forget to update \"What's new\" in the ChromeStore admin panel.");
      });
    });
  } catch (error) {
    console.error("Error during publish process:", error);
  }
};

main();