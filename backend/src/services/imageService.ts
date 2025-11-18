import fs from "fs";
import path from "path";
import crypto from "crypto";
import { redisClient } from "@redis";

interface ImageData {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const CACHE_EXPIRY = 60 * 60 * 24; // 24 hours in seconds

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log("Created uploads directory:", UPLOADS_DIR);
}

/* Immagini salvate temporaneamente in Redis prima della creazione del report */
const storeTemporaryImages = async (images: ImageData[]): Promise<string[]> => {
  const tempKeys: string[] = [];

  for (const image of images) {
    const tempKey = `temp:image:${crypto.randomUUID()}`;

    const imageObject = {
      buffer: image.buffer.toString("base64"),
      mimetype: image.mimetype,
      originalname: image.originalname,
    };

    await redisClient.setex(tempKey, CACHE_EXPIRY, JSON.stringify(imageObject));
    tempKeys.push(tempKey);
  }

  return tempKeys;
};

/* Sposta immagini temporanee in storage permanente organizzato per report ID */
const persistImagesForReport = async (
  tempKeys: string[],
  reportId: number,
): Promise<string[]> => {
  const reportDir = path.join(UPLOADS_DIR, reportId.toString());

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const filePaths: string[] = [];

  for (let i = 0; i < tempKeys.length; i++) {
    const tempKey = tempKeys[i];

    // Prendi immagine da Redis
    const imageDataString = await redisClient.get(tempKey);
    if (!imageDataString) {
      console.warn(`Temporary image not found: ${tempKey}`);
      continue;
    }

    const imageObject = JSON.parse(imageDataString);
    const buffer = Buffer.from(imageObject.buffer, "base64");
    const extension = imageObject.mimetype.split("/")[1] || "jpg";

    // Genera nome del file: reportId_index.extension
    const filename = `${reportId}_${i + 1}.${extension}`;
    const filepath = path.join(reportDir, filename);

    await fs.promises.writeFile(filepath, buffer);

    // Path relativo da salvare nel DB
    const relativePath = `${reportId}/${filename}`;
    filePaths.push(relativePath);

    // Cache in Redis per ottenere velocemente l'immagine
    const cacheKey = `image:${relativePath}`;
    await redisClient.set(
      cacheKey,
      JSON.stringify({
        buffer: imageObject.buffer,
        mimetype: imageObject.mimetype,
      }),
    );

    // Elimina chiave temporanea
    await redisClient.del(tempKey);

    console.log(`Persisted image: ${relativePath}`);
  }

  return filePaths;
};

/* Prende immagine o da cache o da filesystem*/
const getImage = async (relativePath: string): Promise<string | null> => {
  const cacheKey = `image:${relativePath}`;

  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) {
    const { buffer, mimetype } = JSON.parse(cachedData);
    return `data:${mimetype};base64,${buffer}`;
  }

  const filepath = path.join(UPLOADS_DIR, relativePath);

  if (!fs.existsSync(filepath)) {
    console.warn(`Image not found: ${relativePath}`);
    return null;
  }

  const buffer = await fs.promises.readFile(filepath);
  const extension = path.extname(filepath).substring(1);
  const mimetype = `image/${extension}`;

  // Memorizza nella cache per la prossima volta
  await redisClient.set(
    cacheKey,
    JSON.stringify({
      buffer: buffer.toString("base64"),
      mimetype,
    }),
  );

  return `data:${mimetype};base64,${buffer.toString("base64")}`;
};

/* Prende multiple immagini (con caching) */
const getMultipleImages = async (
  relativePaths: string[],
): Promise<string[]> => {
  const images: string[] = [];

  for (const path of relativePaths) {
    const image = await getImage(path);
    if (image) {
      images.push(image);
    }
  }

  return images;
};

const deleteImages = async (relativePaths: string[]): Promise<void> => {
  for (const relativePath of relativePaths) {
    const filepath = path.join(UPLOADS_DIR, relativePath);

    // Elimina da filesystem
    if (fs.existsSync(filepath)) {
      await fs.promises.unlink(filepath);
      console.log(`Deleted image: ${relativePath}`);
    }

    // Elimina da cache
    const cacheKey = `image:${relativePath}`;
    await redisClient.del(cacheKey);
  }

  if (relativePaths.length > 0) {
    const reportId = relativePaths[0].split("/")[0];
    const reportDir = path.join(UPLOADS_DIR, reportId);

    try {
      const files = await fs.promises.readdir(reportDir);
      if (files.length === 0) {
        await fs.promises.rmdir(reportDir);
        console.log(`Deleted empty directory: ${reportId}`);
      }
    } catch (err) {
      // La directory potrebbe non esistere o non essere vuota, ignora
    }
  }
};

const getImageUrl = (relativePath: string): string => {
  return `/uploads/${relativePath}`;
};

const getMultipleImageUrls = (relativePaths: string[]): string[] => {
  return relativePaths.map(getImageUrl);
};

const preloadCache = async (relativePaths: string[]): Promise<void> => {
  for (const relativePath of relativePaths) {
    await getImage(relativePath); // This will cache it
  }
};

export default {
  storeTemporaryImages,
  persistImagesForReport,
  getImage,
  getMultipleImages,
  deleteImages,
  getImageUrl,
  getMultipleImageUrls,
  preloadCache,
};
