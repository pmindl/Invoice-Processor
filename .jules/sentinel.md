## 2024-03-10 - Secure Compare Usage
**Vulnerability:** Weak string comparison for API key
**Learning:** `===` shouldn't be used for secrets. Needs `crypto.timingSafeEqual` or custom secure compare.
**Prevention:** Always use secure comparison functions for API keys and tokens.

## 2024-03-10 - Fail-Open API Key Authentication
**Vulnerability:** If `APP_API_KEY` is undefined in the environment, endpoints using `authHeader !== 'Bearer ' + process.env.APP_API_KEY` can be bypassed by sending an `Authorization: Bearer undefined` header.
**Learning:** Comparing against environment variables directly without checking if they exist can lead to fail-open vulnerabilities where missing configuration grants access.
**Prevention:** Always explicitly check for the existence of required secret environment variables and fail securely (e.g., return 500) if they are missing before performing authentication checks.
