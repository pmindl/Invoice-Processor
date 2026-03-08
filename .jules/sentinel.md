## 2024-02-23 - File Upload Vulnerability
**Vulnerability:** Unrestricted file upload allows attackers to upload arbitrarily large files or malicious file types, potentially leading to DoS or RCE.
**Learning:** File uploads must be validated for size and type before processing. Filenames must be sanitized to prevent path traversal.
**Prevention:** Implement strict input validation and sanitization using dedicated helper functions (`validateFile`, `sanitizeFilename`) before any file operations.

## 2024-02-27 - Open Proxy Vulnerability
**Vulnerability:** An unauthenticated proxy endpoint (`/api/upload-proxy`) allowed anyone to upload files by bypassing the API key requirement enforced on the main upload endpoint.
**Learning:** Proxy endpoints can inadvertently bypass security controls if they don't mirror the authentication requirements of the target service.
**Prevention:** Avoid creating "convenience" proxies that strip authentication. Ensure client-side components handle authentication directly (e.g., prompting for keys) or use secure session-based proxies.

## 2024-03-01 - Information Leakage in API Routes
**Vulnerability:** Several API routes returned raw error messages directly to the client (e.g., `(err as Error).message`). This can potentially expose internal server states, database queries, or stack traces, leading to information disclosure.
**Learning:** Returning unhandled exception messages to the client violates the "fail securely" principle and provides attackers with insights into the system's architecture and potential weaknesses.
**Prevention:** Catch blocks should log the detailed error internally (e.g., using `console.error` or a logging library) and return a generic error message like 'Internal Server Error' with a 500 status code to the client.
