const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;
const ALLOWED: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".pdf": ["application/pdf"],
};

export function validateSelectedFiles(files: File[], existingCount = 0): { valid: File[]; errors: string[] } {
  const valid: File[] = [];
  const errors: string[] = [];

  for (const file of files) {
    if (existingCount + valid.length >= MAX_FILES) {
      errors.push(`${file.name}: a Ticket can have at most five active attachments.`);
      continue;
    }
    const extension = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
    if (!ALLOWED[extension]?.includes(file.type)) {
      errors.push(`${file.name}: use JPG, PNG, WEBP, or PDF with a matching file type.`);
      continue;
    }
    if (file.size > MAX_FILE_BYTES) {
      errors.push(`${file.name}: each file must be 5 MB or smaller.`);
      continue;
    }
    valid.push(file);
  }

  return { valid, errors };
}
