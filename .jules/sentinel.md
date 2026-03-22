## 2024-05-24 - Missing Authentication on API Endpoints
**Vulnerability:** The `/api/invoices` API endpoint lacked authentication, allowing unauthorized users to read and update sensitive invoice data.
**Learning:** Not all API endpoints implemented the standard authentication pattern used in the project, leading to inconsistent security boundaries.
**Prevention:** Implement a middleware or a standardized helper for route authentication to enforce security uniformly across all endpoints, reducing the risk of developer oversight.
