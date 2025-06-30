# Shared Types Setup

This document explains how to use shared types between the client and server applications in the TabMe monorepo.

## Structure

```
tabme/
├── packages/
│   └── shared-types/           # Shared TypeScript types
│       ├── src/
│       │   ├── folder.types.ts # Folder-related types
│       │   └── index.ts        # Main exports
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   ├── client/                 # Uses shared types for requests
│   └── server/                 # Uses shared types for service layer
```

## Installation

The shared types package is automatically linked to both client and server apps via local file references:

```json
// In apps/client/package.json and apps/server/package.json
{
  "dependencies": {
    "@tabme/shared-types": "file:../../packages/shared-types"
  }
}
```

## Usage

### In Server (Service Layer)

```typescript
// apps/server/src/services/folder.service.ts
import type { 
  CreateFolderData, 
  UpdateFolderData, 
  FolderWithItems, 
  CreateSyncData 
} from '@tabme/shared-types';

class FolderService {
  async createFolder(userId: string, folderData: CreateFolderData): Promise<Folder> {
    // Implementation using shared types
  }
}
```

### In Client (API Layer)

```typescript
// apps/client/src/api/folder-api.ts
import type { CreateFolderData, UpdateFolderData } from '@tabme/shared-types';

export const folderApi = {
  async createFolder(data: CreateFolderData) {
    // Use shared types for request payloads
    const { data: folder, error } = await clientSdk.POST("/api/folders", {
      body: data  // TypeScript knows this matches CreateFolderData
    });
    
    return folder;
  }
};
```

## Building

To build the shared types:

```bash
# Build shared types
npm run types:build

# Watch for changes
npm run types:watch

# Build everything including shared types
npm run build:all
```