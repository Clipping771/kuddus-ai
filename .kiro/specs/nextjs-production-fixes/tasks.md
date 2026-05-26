# Implementation Plan: NextJS Production Fixes

## Overview

This implementation plan addresses critical production issues in the Next.js 14.2.3 application including hydration errors, custom agent deletion cascades, OpenRouter export issues, and table generation failures.

## Tasks

- [x] 1. Update dashboard `handleUploadPdfAgent` to call `/api/agents` instead of `/api/agents/upload`
- [x] 2. Add `export const dynamic = "force-dynamic"` to `/api/user/route.ts`
- [x] 3. Add `export const dynamic = "force-dynamic"` to `/api/admin/stats/route.ts`
- [x] 4. Replace `<img>` tags with Next.js `<Image>` component in dashboard page
- [ ] 5. Identify and fix dynamic content rendering differences between server and client in Dashboard component
- [ ] 6. Wrap dynamic content with `useEffect` or `suppressHydrationWarning` where appropriate
- [ ] 7. Verify no Math.random() or Date.now() usage in render path
- [ ] 8. Add cascade delete logic to delete associated chats when agent is deleted
- [ ] 9. Update agent deletion API route to handle chat cleanup
- [ ] 10. Verify localStorage is properly cleared after deletion
- [ ] 11. Verify openrouterFetchWithFallback is properly exported and imported
- [ ] 12. Check webpack bundling configuration for async function handling
- [ ] 13. Test streaming context usage of the function
- [ ] 14. Identify which table generation is failing
- [ ] 15. Implement fix for the specific table generation issue
- [ ] 16. Test table generation functionality

## Task Dependency Graph

```
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16
```

## Notes

- Tasks 1-4 are already completed
- Tasks 5-7 address the React hydration error
- Tasks 8-10 address custom agent deletion cascade
- Tasks 11-13 address OpenRouter export issue
- Tasks 14-16 address table generation issue
