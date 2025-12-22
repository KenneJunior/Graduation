import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import { _log } from "../js/utility/logger.js";

// Configuration
const DEFAULT_CONFIG = {
  picsDir: "public/pics",
  thumbsDir: "public/pics/thumbnails",
  vidDir: "public/vid",
  outputFile: "public/gallery-data.json",
  lastFile: "The_END.jpg",

  // CUSTOM ORDER: Define the exact sequence you want the gallery to show
  imageOrder: [
    "profile_pic.jpg",
    "img1.jpg",
    "img2.jpg",
    "img3.jpg",
    "img4.jpg",
    "img5.jpg",
    "img6.JPG",
    "img7.JPG",
    "img8.JPG",
    "img9.JPG",
    "img10.JPG",
    "img11.JPG",
    "img12.JPG",
    "img13.JPG",
    "img14.JPG",
    "img15.JPG",
    "img16.JPG",
    "img17.JPG",
    "img18.JPG",
    "tata.jpg",
    // Add more if needed — "The_END.jpg" is auto-added last
  ],

  imageAltTexts: {
    "img1.jpg": "Proud Bamenda pikin 😅😅",
    "img2.jpg": "Miss Bamenda 😹😹",
    "img3.jpg": "andriod Generation and phone 😃😆",
    "img4.jpg": "when you where learning how to ngess 🤣🤣",
    "img5.jpg": "smile smile smile 😁😊",
    "tata.jpg": "Happy memory with tata 💕",
    "profile_pic.jpg": "awwww wu is my princess 🤣🤣",
    "The_END.jpg": "The last Image – Missus Fhavur forever 💖",
  },

  videoAltTexts: {
    "video1.jpg": "Under sun adey, Under rain .... 🤣🤣",
    "video2.jpg": "fine child 😘😘",
    "video3.jpg": "Ok whats happening here 🤣🤣🤣",
    "video4.jpg": "Red Carpet 🤣🤣🤣",
    "video5.jpg": "GRADUATION 🥰😍",
    "video6.jpg": "Mami play play 😂😂",
  },

  ignoreFile: ["screenshot1.jpg"],
};

let CONFIG = {};
  const PERSON_MAP = Object.freeze({
  M: "Mcckelly",
  J: "Junior",
  K: "Mama Kech",
  T: "Terence",
  CC: "Chris La Belle",
  C4: "C4",
  CM: "Takeoff",
  G: "Goto",
  LG: "Grace",
  W: "Wales",
  MN: "Marie",
});

async function generateMediaJSON(config = {}) {
  CONFIG = { ...DEFAULT_CONFIG, ...config };
  _log("📸 Generating media JSON file with WebP thumbnails and custom order...");

  // Ensure thumbnails directory exists
  if (!existsSync(CONFIG.thumbsDir)) {
    mkdirSync(CONFIG.thumbsDir, { recursive: true });
    _log(`📁 Created thumbnails directory: ${CONFIG.thumbsDir}`);
  }

  const mediaArray = [];
  let lastFileItem = null;

  try {
    // Get all image files
    const picFiles = readdirSync(CONFIG.picsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isFile() && /\.(jpg|heic|jpeg|png)$/i.test(dirent.name))
      .map((dirent) => dirent.name);

    _log(`📁 Found ${picFiles.length} image files`);

    // Process images with proper async handling
    const imagePromises = picFiles.map(async (filename) => {
      if (CONFIG.ignoreFile.includes(filename)) return null;

      const isLastFile = filename === CONFIG.lastFile;
      const srcPath = `/pics/${filename}`;

      // Use WebP for thumbnails
      const thumbFilename = filename.replace(/\.(jpg|heic|jpeg|png)$/i, ".webp");
      const fullThumbPath = join(CONFIG.thumbsDir, thumbFilename);
      const thumbUrl = `/pics/thumbnails/${thumbFilename}`;

      // Skip last file for now — we'll add it at the very end
      if (isLastFile) return null;

      let item = null;

      if (existsSync(fullThumbPath)) {
        // Thumbnail exists → use it
        const altText = CONFIG.imageAltTexts[filename] || `Memory: ${filename}`;
        item = {
          src: srcPath,
          thumb: thumbUrl,
          alt: altText,
          persons: extractPersonsFromFilename(filename),
          "data-type": "image",
        };
      } else {
        // Generate WebP thumbnail
        try {
          const inputPath = `${config.picDir}/${encodeURIComponent(filename)}`;

          const buffer = readFileSync(inputPath);

          await sharp(buffer)
            .resize({
              width: 512,
              height: 512,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality: 50 })
            .toFile(fullThumbPath);

          _log(`✅ Generated WebP thumbnail: ${thumbFilename}`);

          const altText = CONFIG.imageAltTexts[filename] || `Memory: ${filename}`;
          item = {
            src: srcPath,
            thumb: thumbUrl,
            alt: altText,
            "data-type": "image",
          };
        } catch (err) {
          _log(`⚠️ Failed to generate thumbnail for ${filename}: ${err.message}`);
        }
      }

      return item;
    });

    const imageResults = await Promise.all(imagePromises);
    imageResults.filter(Boolean).forEach((item) => mediaArray.push(item));

    // Process videos
    const thumbFiles = readdirSync(CONFIG.thumbsDir, { withFileTypes: true })
      .filter((dirent) => dirent.isFile() && /\.(jpg|heic|jpeg|png|webp)$/i.test(dirent.name))
      .map((dirent) => dirent.name);

    const videoThumbs = thumbFiles.filter((thumbFile) => {
      const baseName = thumbFile.replace(/\.(jpg|heic|jpeg|png|webp)$/i, "");
      const correspondingImage = picFiles.some((pic) =>
        pic.toLowerCase() === `${baseName}.jpg` ||
        pic.toLowerCase() === `${baseName}.jpeg` ||
        pic.toLowerCase() === `${baseName}.png`
      );
      return !correspondingImage && thumbFile !== CONFIG.lastFile.replace(".jpg", ".webp");
    });

    _log(`🎥 Detected ${videoThumbs.length} video thumbnails`);

    videoThumbs.forEach((thumbFile) => {
      const videoName = thumbFile.replace(/\.(jpg|jpeg|heic|png|webp)$/i, ".mp4");
      const videoPath = `/vid/${videoName}`;
      const fullVideoPath = join(CONFIG.vidDir, videoName);

      if (existsSync(fullVideoPath)) {
        const altText = CONFIG.videoAltTexts[thumbFile] || `Video: ${videoName}`;
        mediaArray.push({
          thumb: `/pics/thumbnails/${thumbFile}`,
          alt: altText,
          "data-type": "video",
          "video-src": videoPath,
        });
        _log(`✅ Added video: ${videoName}`);
      } else {
        _log(`⚠️ Video file missing: ${videoName}`);
      }
    });

    // Add The_END.jpg as final item (with WebP thumb if generated)
    if (picFiles.includes(CONFIG.lastFile)) {
      const srcPath = `/pics/${CONFIG.lastFile}`;
      const thumbFilename = CONFIG.lastFile.replace(".jpg", ".webp");
      const fullThumbPath = join(CONFIG.thumbsDir, thumbFilename);
      const thumbUrl = `/pics/thumbnails/${thumbFilename}`;

      let altText = CONFIG.imageAltTexts[CONFIG.lastFile] || "The End 💖";

      if (existsSync(fullThumbPath)) {
        lastFileItem = {
          src: srcPath,
          thumb: thumbUrl,
          alt: altText,
          "data-type": "image",
        };
      } else {
        // Fallback: generate it
        try {
          const buffer = readFileSync(join(CONFIG.picsDir, CONFIG.lastFile));
          await sharp(buffer)
            .resize({ width: 512, height: 512, fit: "inside" })
            .webp({ quality: 80 })
            .toFile(fullThumbPath);
          _log(`✅ Generated final WebP thumbnail: ${thumbFilename}`);

          lastFileItem = {
            src: srcPath,
            thumb: thumbUrl,
            alt: altText,
            "data-type": "image",
          };
        } catch (err) {
          _log(`⚠️ Could not generate final thumbnail: ${err.message}`);
        }
      }

      if (lastFileItem) mediaArray.push(lastFileItem);
    }

    // CUSTOM SORT: Apply your desired image order
    mediaArray.sort((a, b) => {
      if (a["data-type"] === "video" || b["data-type"] === "video") return 0; // Keep videos in detected order

      const aName = a.src.split("/").pop();
      const bName = b.src.split("/").pop();

      const aIndex = CONFIG.imageOrder.indexOf(aName);
      const bIndex = CONFIG.imageOrder.indexOf(bName);

      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });

    // Write final JSON
    const jsonOutput = { media: mediaArray };
    writeFileSync(CONFIG.outputFile, JSON.stringify(jsonOutput, null, 2));

    _log(`✅ Gallery JSON generated: ${CONFIG.outputFile}`);
    _log(`📊 Total items: ${mediaArray.length}`);
    _log(`📷 Images: ${mediaArray.filter((m) => m["data-type"] === "image").length}`);
    _log(`🎥 Videos: ${mediaArray.filter((m) => m["data-type"] === "video").length}`);

    return {
      success: true,
      stats: {
        total: mediaArray.length,
        images: mediaArray.filter((m) => m["data-type"] === "image").length,
        videos: mediaArray.filter((m) => m["data-type"] === "video").length,
      },
    };
  } catch (error) {
    console.error("❌ Error generating media JSON:", error);
    return { success: false, error: error.message };
  }
}

function extractPersonsFromFilename(filename) {
  // Remove extension
  const base = filename.replace(/\.(jpg|jpeg|png|heic|webp)$/i, "");
  //if the base includes profile_pic return all persons
  if(base.includes("profile_pic")){
    return [
      { code: "M", name: "Mcckelly" },
      { code: "J", name: "Junior" },
      { code: "K", name: "Kech" },
      { code: "T", name: "Terence" },
      { code: "CC", name: "Christabelle" },
      { code: "C4", name: "C4" },
      { code: "TO", name: "Takeoff" },
      { code: "G", name: "Gotrand" },
    ];
  }
    // Expect format: [ACR]_[A]_[B]__img123
  if (!base.includes("__")) return [];

  const [personsPart] = base.split("__");

  const matches = personsPart.match(/\[([A-Z0-9]+)\]/g) || [];
const persons = matches
    .map((m) => m.replace(/\[|\]/g, "")) // remove brackets
    .map((code) => {
      if (!PERSON_MAP[code]) {
        throw new Error(`❌ Unknown person code "${code}" in file: ${filename}`);
      }
      return {
        code,
        name: PERSON_MAP[code],
      };
    });

  if (persons.length === 0) {
    throw new Error(`❌ No person tags found in filename: ${filename}`);
  }

  return persons;
}


// Run when called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateMediaJSON().then((result) => {
    if (result.success) {
      console.log("🎉 Gallery generated perfectly!", result.stats);
    } else {
      console.error("💥 Failed:", result.error);
    }
  });
}

export { generateMediaJSON };
