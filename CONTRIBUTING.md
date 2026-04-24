# Contributing to FinOS

Thank you for your interest in contributing to FinOS! This document provides guidelines and instructions for contributing.

## Getting Started

1. **Fork the repository** and clone your fork locally.
2. **Install dependencies**: `npm install`
3. **Copy the environment file**: `cp .env.example .env` and fill in your API keys.
4. **Run the dev server**: `npm run dev`
5. **Create a branch** for your feature or fix: `git checkout -b feature/my-feature`

## Development Workflow

### Project Structure

```
src/
├── components/     # Reusable UI components
├── hooks/          # Custom React hooks
├── lib/            # Utility functions and service clients
├── pages/          # Route-level page components
└── types.ts        # Shared TypeScript type definitions
```

### Code Style

- Use TypeScript for all new files.
- Follow the existing patterns for component structure (functional components with hooks).
- Use Tailwind CSS for styling — avoid inline styles or separate CSS files.
- Keep components focused and composable.

### Commit Messages

Use clear, descriptive commit messages:
- `feat: add new scenario comparison view`
- `fix: resolve metric card overflow on mobile`
- `docs: update setup instructions in README`
- `refactor: extract chart logic into custom hook`

## Submitting Changes

1. **Ensure your code builds**: `npm run build`
2. **Run the linter**: `npm run lint`
3. **Push your branch** and open a Pull Request against `main`.
4. **Describe your changes** clearly in the PR description.
5. **Link any related issues** using `Closes #123` syntax.

## Reporting Issues

When filing an issue, please include:
- A clear title and description
- Steps to reproduce (if it's a bug)
- Expected vs. actual behavior
- Your environment (OS, Node version, browser)
- Screenshots if applicable

## Setting Up Supabase (for full-stack contributors)

If you want to work on database-related features:

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the schema in `supabase_schema.sql` against your project's SQL Editor
3. Copy your project URL and anon key into `.env`

## Areas Where Help is Needed

- Improving mobile responsiveness
- Adding unit and integration tests
- Expanding AI provider support
- Accessibility improvements (ARIA labels, keyboard navigation)
- Documentation and tutorials
- Internationalization (i18n)

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
