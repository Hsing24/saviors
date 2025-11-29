<!--
  ============================================================================
  SYNC IMPACT REPORT
  ============================================================================
  Version Change: 1.0.0 → 1.1.0 (MINOR - Added documentation language requirement)
  
  Modified Principles: None
  
  Added Sections:
  - V. Documentation Language (Traditional Chinese requirement)
  
  Removed Sections: None
  
  Templates Requiring Updates:
  - .specify/templates/plan-template.md ✅ (No updates needed - template structure only)
  - .specify/templates/spec-template.md ✅ (No updates needed - template structure only)
  - .specify/templates/tasks-template.md ✅ (No updates needed - template structure only)
  - .specify/templates/agent-file-template.md ✅ (No direct principle refs)
  - .specify/templates/checklist-template.md ✅ (No direct principle refs)
  
  Follow-up TODOs: None
  ============================================================================
-->

# Saviors Constitution

## Core Principles

### I. Code Quality

All code committed to this repository MUST adhere to these non-negotiable standards:

- **Readability**: Code MUST be self-documenting with clear variable/function names; Comments are required only for non-obvious logic
- **Modularity**: Functions MUST have a single responsibility; Files MUST not exceed 300 lines without justification
- **Consistency**: Code style MUST follow project conventions (ESLint/Prettier when configured); No mixed coding patterns within the same file
- **Error Handling**: All user-facing errors MUST be caught and handled gracefully; Console errors in production are violations
- **No Dead Code**: Unused variables, functions, and imports MUST be removed before merge

**Rationale**: As a Chrome extension, code quality directly impacts maintainability and the ability to debug issues in a browser environment where users cannot easily report technical details.

### II. Testing Standards

Testing is REQUIRED for features that affect user data or core functionality:

- **Manual Testing**: Every change MUST be tested manually in Chrome before merge
- **Regression Testing**: Changes MUST not break existing functionality; Test all affected user flows
- **Edge Cases**: Input validation, empty states, and error scenarios MUST be verified
- **Cross-Browser Verification**: While Chrome is primary, test in Chrome-based browsers (Edge, Brave) when possible
- **Extension Lifecycle**: Test extension install, update, enable/disable, and uninstall scenarios for relevant changes

**Rationale**: Chrome extensions run in a sandboxed environment with limited debugging visibility post-deployment. Thorough testing prevents user-facing failures that are difficult to diagnose.

### III. User Experience Consistency

The extension MUST deliver a cohesive and predictable user experience:

- **Visual Consistency**: UI components MUST follow a consistent design language (colors, spacing, typography)
- **Interaction Patterns**: Similar actions MUST behave the same way throughout the extension
- **Feedback**: User actions MUST provide immediate visual feedback (loading states, success/error indicators)
- **Accessibility**: UI MUST be keyboard-navigable; Color contrast MUST meet WCAG AA standards
- **Localization-Ready**: User-facing strings SHOULD be externalized for future i18n support

**Rationale**: Users interact with extensions in quick, focused moments. Inconsistent UX creates friction and erodes trust in the extension's reliability.

### IV. Performance Requirements

The extension MUST meet these performance constraints:

- **Popup Load Time**: Popup MUST render interactive content within 200ms of click
- **Memory Footprint**: Background processes MUST not consume more than 50MB of memory
- **Storage Efficiency**: Local storage usage MUST be minimized; Clean up obsolete data
- **No Blocking**: Long-running operations MUST be asynchronous; Never block the main thread
- **Minimal Permissions**: Request only the permissions actually needed; Justify each permission in code comments

**Rationale**: Chrome penalizes resource-heavy extensions and users will disable extensions that slow their browser. Minimal permissions also improve user trust and Chrome Web Store approval likelihood.

### V. Documentation Language

All project documentation MUST be written in Traditional Chinese (zh-TW):

- **Specifications**: All feature specifications (spec.md) MUST be written in Traditional Chinese
- **Plans**: All implementation plans (plan.md) MUST be written in Traditional Chinese
- **User-Facing Documentation**: README, quickstart guides, and any documentation intended for end users MUST be in Traditional Chinese
- **Code Comments**: Code comments MAY remain in English for technical clarity and international collaboration
- **Commit Messages**: Commit messages MAY be in English for Git tooling compatibility

**Rationale**: This extension is developed for a Traditional Chinese (zh-TW) speaking audience. Using the native language ensures clarity, reduces miscommunication, and makes the project more accessible to contributors and users in the target market.

## Chrome Extension Standards

These constraints apply specifically to Chrome extension development:

- **Manifest V3 Compliance**: All features MUST comply with Manifest V3 requirements
- **Content Security Policy**: No inline scripts; All resources MUST be bundled or explicitly allowed
- **Service Worker Best Practices**: Background service workers MUST be stateless and resilient to restarts
- **API Deprecation Awareness**: Monitor Chrome extension API changes; Update deprecated APIs proactively
- **Privacy First**: User data MUST NOT be transmitted externally without explicit consent

## Development Workflow

All changes MUST follow this workflow:

1. **Branch Strategy**: Feature branches from main; Descriptive branch names required
2. **Commit Messages**: Clear, imperative commit messages describing the change
3. **Pre-Merge Checklist**: Verify linting passes, manual testing complete, no console errors
4. **Documentation**: Update README.md when adding user-facing features or changing installation steps
5. **Version Bumps**: Update manifest.json version for releases following semver

## Governance

This constitution supersedes all other development practices for the Saviors project:

- **Amendment Process**: Changes to this constitution require documentation of rationale and impact assessment
- **Compliance Verification**: All code reviews MUST verify adherence to these principles
- **Complexity Justification**: Any deviation from these principles MUST be documented with clear justification
- **Version Control**: Constitution changes follow semantic versioning (MAJOR.MINOR.PATCH)

**Version**: 1.1.0 | **Ratified**: 2025-11-29 | **Last Amended**: 2025-11-29
