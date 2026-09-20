import { readFileSync, writeFileSync, existsSync } from "node:fs";
const file = "node_modules/@react-native/gradle-plugin/settings.gradle.kts";
// RN 0.83 ships Gradle 9 with a pre-Gradle-9 Foojay resolver. Upstream issue #55781.
if (existsSync(file)) {
  const source = readFileSync(file, "utf8");
  const patched = source.replace(
    'id("org.gradle.toolchains.foojay-resolver-convention").version("0.5.0")',
    'id("org.gradle.toolchains.foojay-resolver-convention").version("1.0.0")',
  );
  if (source !== patched) {
    writeFileSync(file, patched);
    console.log("Applied RN 0.83 / Gradle 9 toolchain compatibility fix.");
  }
}
