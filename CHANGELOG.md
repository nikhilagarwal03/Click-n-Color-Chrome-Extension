# Changelog

All notable changes to this project are documented in this file.

## [1.1.0] - 2026-03-02

### Fixed
- Fixed HEX conversion output so exported and displayed HEX values are valid.
- Fixed intermittent first-attempt picking failures by adding robust popup/content handshake and retries.
- Fixed picker startup race so early clicks are buffered and processed once screenshot data is ready.
- Fixed multiple event-listener leaks in picker lifecycle cleanup.
- Fixed potential popup crashes from malformed persisted settings/theme values.
- Fixed image export edge case when `canvas.toBlob` returns null.
- Fixed max palette size handling with proper validation and clamping.
- Fixed content injection edge case when `document.body` is unavailable.
- Fixed invalid CSS declarations and removed conflicting duplicate `.colors-grid` styles.

### Improved
- Improved error feedback for unsupported/restricted pages and injection failures.
- Improved copy behavior with robust clipboard error handling.
- Improved clear-all UX with non-blocking two-step confirmation.
- Improved keyboard accessibility for format chips and focus-visible states.
- Improved popup spacing, alignment, and narrow-width responsive behavior.
- Reduced unnecessary permission scope by removing persistent `<all_urls>` host permission.
