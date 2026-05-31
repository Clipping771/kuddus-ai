/**
 * Unified Client-side File Parser
 * Dynamically loads trusted CDNs to extract readable text content from 
 * PDFs, Word Documents, Excel sheets, and Images (using OCR).
 */

const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("DOM is not available"));
      return;
    }
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.head.appendChild(script);
  });
};

export async function parseAnyFile(file: File): Promise<string> {
  const extension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

  // 1. Image OCR (All Image Types, including mobile HEIC/HEIF)
  if (file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "heic", "heif"].some((ext) => file.name.toLowerCase().endsWith(ext))) {

    // 0. Compress the image before anything else! (Reduces 15MB 4K photos to ~1MB for fast OCR and zero payload crashes, while keeping text sharp)
    const compressedFile = await new Promise<File>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;
        const maxDim = 2500; // Increased to 2500px to maintain high-res text clarity for Tesseract OCR

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(file); // Fallback to original if canvas fails

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) return resolve(file); // Fallback
          resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: "image/jpeg" }));
        }, "image/jpeg", 0.85); // 85% quality JPEG to prevent text artifacting
      };
      img.onerror = () => resolve(file); // Fallback if browser doesn't support the image format (e.g., HEIC on Windows Chrome)

      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    });

    // A. Convert compressed image to Base64 for rendering and history
    const base64Promise = new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(compressedFile);
    });
    const base64Data = await base64Promise;

    // B. Run fallback OCR to assist text extraction (on compressed file, significantly faster!)
    let ocrText = "";
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js");
      const Tesseract = (window as any).Tesseract;
      if (Tesseract) {
        const result = await Tesseract.recognize(compressedFile, "eng+ben");
        ocrText = result.data.text || "";
      }
    } catch (ocrErr) {
      console.warn("OCR client parser fallback failed:", ocrErr);
    }

    return `[IMAGE_BASE64:${base64Data}]\n[OCR TEXT DETECTED IN IMAGE: ${file.name}]\n\n${ocrText}`;
  }

  // 2. PDF Documents
  if (extension === ".pdf") {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js");
    const pdfjsLib = (window as any)["pdfjs-dist/build/pdf"];
    if (!pdfjsLib) throw new Error("PDF parser failed to load");

    // Set worker URL from CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";

    // Cap at 50 pages max to avoid sending massive payloads that crash the API
    const maxPages = Math.min(pdf.numPages, 50);
    const totalPages = pdf.numPages;

    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item: any) => item.str);
      fullText += `[Page ${i}]\n${strings.join(" ")}\n\n`;

      // Stop early if we've already extracted enough text (30k chars is plenty for AI context)
      if (fullText.length > 30000) {
        fullText += `\n[Note: Document truncated at page ${i} of ${totalPages} to fit AI context window. First ${i} pages shown.]`;
        break;
      }
    }

    if (totalPages > maxPages) {
      fullText += `\n[Note: PDF has ${totalPages} pages. Only first ${maxPages} pages extracted.]`;
    }

    return fullText || "No text could be extracted from this PDF.";
  }

  // 3. Word Documents (.docx)
  if (extension === ".docx") {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js");
    const mammoth = (window as any).mammoth;
    if (!mammoth) throw new Error("Word parser failed to load");

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  // 4. Excel Sheets (.xlsx, .xls)
  if (extension === ".xlsx" || extension === ".xls") {
    await loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js");
    const XLSX = (window as any).XLSX;
    if (!XLSX) throw new Error("Excel parser failed to load");

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    let textResult = "";

    workbook.SheetNames.forEach((sheetName: string) => {
      const worksheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      textResult += `\n--- SHEET NAME: ${sheetName} ---\n${csv}\n`;
    });

    return textResult;
  }

  // 5. Standard Text / Code files (txt, md, csv, json, js, py, yaml etc.)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      resolve(text);
    };
    reader.onerror = () => reject(new Error("Failed to read text file."));
    reader.readAsText(file);
  });
}
