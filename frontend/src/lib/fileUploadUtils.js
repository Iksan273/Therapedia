/**
 * Utility functions for handling file uploads (images & PDF documents)
 * with client-side compression, validation, and format detection.
 */

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getProofFileType(proofUrl = "", explicitType = "", fileName = "") {
  if (explicitType) {
    if (explicitType.includes("pdf")) return "pdf";
    if (explicitType.startsWith("image/")) return "image";
  }
  if (fileName) {
    if (fileName.toLowerCase().endsWith(".pdf")) return "pdf";
    if (/\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(fileName)) return "image";
  }
  if (!proofUrl) return "image";
  if (proofUrl.startsWith("data:application/pdf") || proofUrl.toLowerCase().includes(".pdf")) {
    return "pdf";
  }
  if (
    proofUrl.startsWith("data:image/") ||
    /\.(jpe?g|png|webp|gif|bmp|svg)/i.test(proofUrl) ||
    proofUrl.includes("images.unsplash.com")
  ) {
    return "image";
  }
  return "image";
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        dataUrl: reader.result,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
      });
    };
    reader.onerror = (err) => reject(new Error("Gagal membaca file: " + (err?.message || "Unknown error")));
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image client-side using Canvas to avoid localStorage quota limits.
 * Reduces 5MB-15MB phone camera photos to ~150KB-300KB with crystal clear quality for receipts.
 */
export async function compressImage(file, { maxWidth = 1600, maxHeight = 1600, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    // If not in browser environment
    if (typeof window === "undefined" || !window.FileReader) {
      return readFileAsDataUrl(file).then(resolve).catch(reject);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Scale down if larger than maximum dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        // Fill white background for transparent PNGs converted to JPEG
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        // Approximate size of base64
        const stringLength = dataUrl.length - "data:image/jpeg;base64,".length;
        const sizeInBytes = Math.round((stringLength * 3) / 4);

        resolve({
          dataUrl,
          fileName: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
          fileType: "image/jpeg",
          fileSize: sizeInBytes,
          originalSize: file.size,
          width,
          height,
        });
      };
      img.onerror = () => reject(new Error("Gagal memproses gambar slip transfer"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.readAsDataURL(file);
  });
}

/**
 * Validates and processes any uploaded proof file (Image or PDF).
 */
export async function processProofFile(file) {
  if (!file) throw new Error("File tidak ditemukan.");

  const isImg = file.type.startsWith("image/") || /\.(jpe?g|png|webp|bmp)$/i.test(file.name);
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isImg && !isPdf) {
    throw new Error("Format file tidak didukung. Silakan pilih foto (JPG, PNG, WEBP) atau dokumen PDF.");
  }

  // PDF handling
  if (isPdf) {
    const MAX_PDF_SIZE = 8 * 1024 * 1024; // 8MB
    if (file.size > MAX_PDF_SIZE) {
      throw new Error(`Ukuran file PDF terlalu besar (${formatFileSize(file.size)}). Maksimal ukuran file adalah 8 MB.`);
    }
    const res = await readFileAsDataUrl(file);
    return {
      dataUrl: res.dataUrl,
      fileName: file.name,
      fileType: "application/pdf",
      fileSize: file.size,
      originalSize: file.size,
      isPdf: true,
    };
  }

  // Image handling with smart compression
  const MAX_IMAGE_RAW = 25 * 1024 * 1024; // 25MB raw camera limit
  if (file.size > MAX_IMAGE_RAW) {
    throw new Error(`Ukuran foto terlalu besar (${formatFileSize(file.size)}). Maksimal ukuran file adalah 25 MB.`);
  }

  const compressed = await compressImage(file);
  return {
    dataUrl: compressed.dataUrl,
    fileName: file.name, // keep original file name
    fileType: compressed.fileType,
    fileSize: compressed.fileSize,
    originalSize: compressed.originalSize,
    isPdf: false,
  };
}
