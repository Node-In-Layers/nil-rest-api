# Conventional Commits Standards

This document outlines the commit message standards we follow, based on the Conventional Commits specification. This helps in maintaining a clear and structured commit history.

## Commit Message Format

Each commit message should consist of a header, an optional body, and an optional footer. The header has a specific format that includes a type, an optional scope, and a description:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- **feat:** A new feature
- **fix:** A bug fix
- **docs:** Documentation only changes
- **style:** Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc.)
- **refactor:** A code change that neither fixes a bug nor adds a feature
- **perf:** A code change that improves performance
- **test:** Adding missing tests or correcting existing tests
- **build:** Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- **ci:** Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)
- **chore:** Other changes that don't modify src or test files
- **revert:** Reverts a previous commit

### Example

```
fix(parser): handle null pointer exception

Ensure that the parser correctly handles null inputs to prevent crashes.

Closes #123
```
