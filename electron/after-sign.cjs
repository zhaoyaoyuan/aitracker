/**
 * electron-builder afterSign hook (macOS).
 *
 * Runs after code signing but BEFORE the DMG target reads the staged bundle.
 * The workspace may live under a file-provider sync root that re-stamps
 * files with FinderInfo/resource-fork extended attributes at any moment —
 * doing so between afterPack's signing and the DMG build bakes "resource
 * fork, Finder information, or similar detritus" into the disk image, and
 * the installed app then fails `codesign --verify`. Stripping the extended
 * attributes here gives the DMG a clean, sealed bundle.
 *
 * Removing xattrs never touches file contents or the signature seal, so the
 * designated requirement recorded at signing time stays valid.
 */
const { execFileSync } = require("node:child_process");
const path = require("node:path");

exports.default = async function afterSign(context) {
  if (context.electronPlatformName !== "darwin") return;
  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
  );
  try {
    execFileSync("xattr", ["-cr", appPath], { stdio: "pipe" });
    console.log(`[after-sign] stripped extended attributes from ${appPath}`);
  } catch (error) {
    console.warn(
      `[after-sign] xattr cleanup failed (${String(error)}); the DMG may ` +
        "carry Finder detritus that fails codesign verification.",
    );
  }
};
