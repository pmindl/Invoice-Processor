## 2024-02-23 - File Upload Vulnerability
**Vulnerability:** Unrestricted file upload allows attackers to upload arbitrarily large files or malicious file types, potentially leading to DoS or RCE.
**Learning:** File uploads must be validated for size and type before processing. Filenames must be sanitized to prevent path traversal.
**Prevention:** Implement strict input validation and sanitization using dedicated helper functions (`validateFile`, `sanitizeFilename`) before any file operations.
