# Contributing to Noir Playground

We welcome contributions to the Noir Playground! This document provides guidelines for contributing to the project.

## Getting Started

### Prerequisites
- Node.js 18+ ([install with nvm](https://github.com/nvm-sh/nvm))
- npm or yarn package manager
- Git

### Setting up the Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/noir-playground.git
   cd noir-playground
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Development Guidelines

### Code Style
- Follow the existing TypeScript and React patterns
- Use meaningful variable and function names
- Add proper TypeScript types for all new functionality
- Follow the established file and folder structure

### Testing
- Test your changes thoroughly in the browser
- Ensure the Monaco editor functionality works correctly
- Verify circuit compilation simulation works as expected

### Git Workflow
1. Create a new branch for your feature/fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "feat: description of your changes"
   ```
3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Create a Pull Request

### Commit Message Format
We follow conventional commit standards:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `style:` - Code style changes
- `test:` - Test additions or modifications

## Types of Contributions

### 🐛 Bug Reports
- Use GitHub Issues to report bugs
- Include steps to reproduce the issue
- Provide browser and environment details
- Include screenshots if applicable

### 💡 Feature Requests
- Open a GitHub Issue to discuss new features
- Explain the use case and expected behavior
- Consider implementation complexity

### 🔧 Code Contributions
- Implement bug fixes or new features
- Ensure code follows existing patterns
- Update documentation if necessary
- Test your changes thoroughly

### 📚 Documentation
- Improve README or other documentation
- Add code comments for complex logic
- Update examples and usage guides

## Project Structure

```
src/
├── components/
│   ├── CodePlayground.tsx     # Main playground component
│   ├── NoirEditor.tsx         # Monaco editor wrapper
│   └── ui/                    # ShadCN UI components
├── services/
│   ├── NoirService.ts         # Circuit execution simulation
│   └── NoirWasmCompiler.ts    # WASM compilation interfaces
├── data/
│   └── noirExamples.ts        # Example circuits
└── hooks/                     # Custom React hooks
```

## Areas for Contribution

### High Priority
- Real Noir WASM integration
- Circuit compilation improvements
- Better error handling and user feedback
- Performance optimizations

### Medium Priority
- Additional example circuits
- UI/UX improvements
- Mobile responsiveness
- Accessibility enhancements

### Low Priority
- Advanced editor features
- Theme customization
- Export/import functionality

## Questions?

- Open a GitHub Issue for questions
- Check existing issues and discussions
- Review the README for technical details

Thank you for contributing to Noir Playground! 🎉