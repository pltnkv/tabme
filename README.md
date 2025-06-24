# TabMe Monorepo

This is a monorepo setup for the TabMe browser extension, containing both client and server applications.

## Structure

```
tabme/
├── package.json              # Root workspace configuration
├── apps/
│   ├── client/              # Browser extension
│   │   ├── package.json
│   │   └── src/
│   └── server/              # Backend server
│       ├── package.json
│       └── src/
└── node_modules/            # Shared dependencies
```

## Getting Started

### Installation

Install all dependencies for the entire monorepo:

```bash
npm install
```

This will install dependencies for all workspaces and hoist shared dependencies to the root `node_modules`.

### Development

Run commands for specific apps:

```bash
# Client development
npm run client:dev

# Server development  
npm run server:dev

# Build client
npm run client:build

# Build server
npm run server:build
```

### Run commands for all workspaces:

```bash
# Build all apps
npm run build:all

# Test all apps
npm run test:all

# Clean all apps
npm run clean
```

## Workspace Benefits

1. **Shared Dependencies**: Common dependencies like TypeScript and Prettier are installed once at the root
2. **Easy Management**: Single `npm install` command sets up everything
3. **Cross-package Development**: Apps can easily reference each other
4. **Consistent Tooling**: Shared configuration files can be used across apps

## Adding New Apps

To add a new app to the workspace:

1. Create a new directory in `apps/`
2. Add a `package.json` with a unique name
3. The app will automatically be included in the workspace

## Working with Individual Apps

You can still run commands in individual app directories:

```bash
cd apps/client
npm run watch

cd apps/server  
npm run dev
```

## Dependencies

- **Root Level**: Shared development tools (TypeScript, Prettier, etc.)
- **App Level**: App-specific dependencies (React for client, Express for server) 