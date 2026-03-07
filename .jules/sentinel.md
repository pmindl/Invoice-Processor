## 2024-02-23 - File Upload Vulnerability
**Vulnerability:** Unrestricted file upload allows attackers to upload arbitrarily large files or malicious file types, potentially leading to DoS or RCE.
**Learning:** File uploads must be validated for size and type before processing. Filenames must be sanitized to prevent path traversal.
**Prevention:** Implement strict input validation and sanitization using dedicated helper functions (`validateFile`, `sanitizeFilename`) before any file operations.

## 2024-02-27 - Open Proxy Vulnerability
**Vulnerability:** An unauthenticated proxy endpoint (`/api/upload-proxy`) allowed anyone to upload files by bypassing the API key requirement enforced on the main upload endpoint.
**Learning:** Proxy endpoints can inadvertently bypass security controls if they don't mirror the authentication requirements of the target service.
**Prevention:** Avoid creating "convenience" proxies that strip authentication. Ensure client-side components handle authentication directly (e.g., prompting for keys) or use secure session-based proxies.

## 2024-03-07 - Fix Error Message Information Leakage
**Vulnerability:** API routes returned native error messages and stack traces (e.g. `(error as Error).message`) in 500 HTTP responses.
**Learning:** Exposing raw error strings can leak internal system logic, file paths, or third-party dependency details to users.
**Prevention:** Always log full errors server-side via `console.error` and return a generic 'Internal Server Error' to the client.
