import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { minify } from "html-minifier-terser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "..", "public");

async function buildOfflineTemplate() {
  try {
    console.log("📦 Building offline page template...");

    // Read the offline HTML file
    const htmlContent = fs.readFileSync(join(publicDir, "offline.html"), "utf8");
    const svgContent = fs.readFileSync(join(publicDir, "icon", "shorcut", "Offline-SVG.svg"), "utf8");

    // Minify the HTML
    const HTMLminified = await minify(htmlContent, {
      removeComments: true,
      minifyCSS: true,
      minifyJS: true,
      collapseWhitespace: true,
      removeAttributeQuotes: true,
      removeOptionalTags: true,
      removeEmptyAttributes: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      useShortDoctype: true,
    });
    const SVGminified = await minify(svgContent, {
      removeComments: false,
      minifyCSS: false,
      minifyJS: false,
      collapseWhitespace: true,
      removeAttributeQuotes: false,
      removeOptionalTags: false,
      removeEmptyAttributes: false,
      removeRedundantAttributes: false,
      removeScriptTypeAttributes: false,
      removeStyleLinkTypeAttributes: false,
      useShortDoctype: false,
    });

    console.log("✅ HTML minified");

    // Escape for template literal
    const HTMLescaped = HTMLminified
      .replace(/\\/g, "\\\\")  // Escape backslashes
      .replace(/`/g, "\\`")    // Escape backticks
      .replace(/\$\{/g, "\\${"); // Escape template literals
    const SVGescaped = SVGminified
      .replace(/\\/g, "\\\\")  // Escape backslashes
      .replace(/`/g, "\\`")    // Escape backticks
      .replace(/\$\{/g, "\\${"); // Escape template literals

    console.log("✅ Content escaped for template literal");

    // Create the template file
    const templateContent = `// Auto-generated offline page template
// Generated: ${new Date().toISOString()}
// Source: public/offline.html
// Any changes to the original HTML file will require re-running this script.
// This file exports a constant OFFLINE_HTML containing the minified HTML content as a string.
// Note: This file is intended to be imported by the service worker to provide an offline fallback page.
// For best results, keep the original offline.html file clean and minimal, as it will be inlined into the service worker bundle.
// The Original is located at ${process.cwd()}/public/offline.html

const OFFLINE_HTML = \`${HTMLescaped}\`;
const IMAGE_PLACEHOLDER_SVG = \`${SVGescaped}\`
`;

    // Write to public directory so it's accessible by service worker
    fs.writeFileSync("./public/offline-template.js", templateContent);

    const originalSize = Buffer.from(htmlContent).length + Buffer.from(svgContent).length;
    const minifiedSize = Buffer.from(HTMLescaped).length + Buffer.from(SVGescaped).length;

    console.log("🎉 Offline template generated successfully!");
    console.log("📊 Stats:");
    console.log(`   Original: ${originalSize} bytes`);
    console.log(`   Minified: ${minifiedSize} bytes`);
    console.log(`   Reduction: ${((1 - minifiedSize / originalSize) * 100).toFixed(1)}%`);
    console.log(`   Output: public/offline-template.js`);

  } catch (error) {
    console.error("❌ Error building offline template:", error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildOfflineTemplate();
}

export { buildOfflineTemplate };
