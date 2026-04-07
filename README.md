# AMP Manager

Desktop app for local development. Docker-based stack with a click-and-run GUI. No terminal required. 

---


<p align="center">
  <img src="https://raw.githubusercontent.com/Amp-Manager/media/refs/heads/main/screenshots/amp-manager-desktop-prototype.jpg" width="100%" height="auto" />
</p>


## Features

AMP Manager provides a unified interface for:

- Local domain management with automatic SSL certificates
- Docker container monitoring and control
- Encrypted credentials and notes storage
- Visual workflow automation
- Tunnel services integration (share local projects)

## Activity Timeline 


<p align="center">
  <img src="https://raw.githubusercontent.com/Amp-Manager/media/refs/heads/main/screenshots/amp-manager-desktop-prototype-activity.jpg" width="100%" height="auto" />
</p>


## Docker Management


<p align="center">
  <img src="https://raw.githubusercontent.com/Amp-Manager/media/refs/heads/main/screenshots/amp-manager-desktop-prototype-docker.jpg" width="100%" height="auto" />
</p>


## First Run Setup

1. **Install Docker Desktop** - Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)
2. **Install AMP Manager** - Download a release or clone to your drive e.g. `D:\amp-manager\`

#### Run Docker and Amp Manager

1. **Start Docker Desktop** - Ensure Docker is running (check system tray icon)
2. **Initialize containers** - Open a terminal in the AMP Manager folder and run:
   ```bash
   docker compose up -d
   ```
3. **Launch AMP Manager** - The dashboard will show all systems as "Healthy"


> **Note:** Docker must be running whenever you use AMP Manager. The Dashboard's System Checks section displays the current status. You can also use AMP Manager to launch and control Docker.

---

## Bridge Architecture Summary: UI ↔ Neutralino.js ↔ amp-tasks.bat**

### **1. Bridge Overview**

The AMP Desktop app uses a **3-layer architecture**:

```
┌─────────────────┐
│   React UI      │ (Frontend - TypeScript/React)
└────────┬────────┘
         │ calls window.AMP.* APIs
         ▼
┌─────────────────┐
│  Neutralino.js  │ (Native Bridge)
└────────┬────────┘
         │ executes .bat commands via os.execCommand
         ▼
┌─────────────────┐
│ amp-tasks.bat   │ (Backend Logic - Windows Batch)
└─────────────────┘
```

---

### **2. Layer Details**

#### **🎨 Frontend (React UI)**
- **Location:** `src/pages/*.tsx`, `src/components/**/*.tsx`
- **API Access:** Via `window.AMP.*` global object
- **Type Definitions:** 
  - [`src/types/amp.d.ts`](d:\_github_gigamaster\amp-desktop\src\types\amp.d.ts) - Complete API types
  - [`src/types/neutralino.d.ts`](d:\_github_gigamaster\amp-desktop\src\types\neutralino.d.ts) - Alternative API types
  - [`src/types/docker.ts`](d:\_github_gigamaster\amp-desktop\src\types\docker.ts) - Docker-specific types

**Example Usage:**
```typescript
// From Dashboard.tsx
const data = await window.AMP.envCheck();

// From Domains.tsx
await window.AMP.createDomain('mysite.local');
await window.AMP.fs.writeTextFile(configPath, content);
await window.AMP.angie.testConfig();
```

---

#### **🌉 Bridge Layer**
- **Location:** [`main.js`](./js/main.js)
- **Purpose:** Exposes `window.AMP` API to React components
- **Key Features:**
  - **Task Whitelist:** `AMP_TASKS` object defines allowed batch tasks
  - **Generic Backend Caller:** `amp(task, args)` function
  - **JSON Parsing:** Auto-extracts JSON from batch output
  - **Error Handling:** Returns structured error responses
  - **Helper APIs:** `fs`, `angie`, `docker`, `workflow` namespaces

**Key Functions:**
```javascript
// Generic backend caller
async function amp(task, args = "") {
    const batPath = `${NL_PATH}\\amp-tasks.bat`;
    const fullCommand = `"${batPath}" ${task} ${args}`;
    const result = await Neutralino.os.execCommand(fullCommand);
    // ... JSON parsing logic
}

// Exposed API
window.AMP = {
    version: () => amp("version"),
    createDomain: (name) => amp("new_domain", name),
    dockerUp: () => amp("docker_up"),
    fs: { /* filesystem helpers */ },
    angie: { /* angie helpers */ },
    docker: { /* docker metrics */ },
    workflow: { /* git, sftp, webhook */ }
};
```

---

#### **⚙️ Backend (amp-tasks.bat)**
- **Location:** [`amp-tasks.bat`](./amp-tasks.bat)
- **Features:**
  - **Auto-Elevation:** Requests admin rights via UAC
  - **Single Instance:** Lock file prevents multiple instances
  - **JSON Output:** All responses are JSON-formatted
  - **Task Categories:**

| Category | Tasks |
|----------|-------|
| **Environment** | `env_status`, `runtime_status` |
| **Domains** | `scan_domains`, `list_domains`, `new_domain`, `remove_domain`, `generate_config` |
| **Certificates** | `ca_status`, `ca_reset`, `ca_uninstall` |
| **Docker/Angie** | `docker_up`, `docker_stop`, `docker_restart`, `restart_angie` |
| **Workflow** | `workflow_action`, `workflow_git`, `workflow_sftp`, `workflow_webhook` |
| **System** | `version` |

**Batch Output Example:**
```batch
:NEW_DOMAIN
echo {"status":"ok","domain":"!DOMAIN!","folder":"!TARGET_DIR!","config":"!CONF_FILE!"}
```

---

### **3. Data Flow Example: Creating a Domain**

```
1. User clicks "Add Domain" in UI
   ↓
2. Domains.tsx calls:
   await window.AMP.createDomain('mysite.local')
   ↓
3. neutralino-reference.js executes:
   "D:\path\to\amp-tasks.bat" new_domain mysite.local
   ↓
4. amp-tasks.bat:
   - Adds entry to C:\Windows\System32\drivers\etc\hosts
   - Creates folder in www\mysite.local
   - Generates SSL cert using mkcert.exe
   - Creates Angie config in config\angie-sites\
   - Updates docker-compose.override.yml
   - Restarts Angie container
   - Returns JSON response
   ↓
5. React UI receives response and updates state
```

---

### **4. Mock Data & Placeholders**

NOTE: This might be remmoved on stable version.

**Mock Locations:**
1. **`src/main.tsx`:** Fallback mock when `!window.Neutralino`
   - Mock `envCheck()`, `listDomains()`, `runtimeStatus()`
   - Mock `workflow.*` functions with delays
   
2. **`src/lib/mockService.ts`:** Standalone mock service (needs verification)

3. **Development Fallbacks:** Components check `if (window.AMP)` before calling APIs

---

### **5. Key Integration Points**

| Feature | UI Component | Bridge Function | Batch Task |
|---------|-------------|-----------------|------------|
| Domain List | `Domains.tsx` | `window.AMP.listDomains()` | `list_domains` |
| Create Domain | `CreateSiteModal.tsx` | `window.AMP.createDomain()` | `new_domain` |
| Delete Domain | `Domains.tsx` | `window.AMP.removeDomain()` | `remove_domain` |
| SSL Certs | `Certificates.tsx` | `window.AMP.caStatus()` | `ca_status` |
| Docker Stats | `DockerStats.tsx` | `window.AMP.docker.stats()` | Direct Docker CLI |
| Config Editor | `Domains.tsx` | `window.AMP.fs.*` | Neutralino FS API |
| Workflows | `Workflow.tsx` | `window.AMP.workflow.*` | `workflow_*` |

---

### **6. Security & Safety Features**

✅ **UAC Elevation:** Batch file auto-elevates to admin  
✅ **Single Instance:** Prevents concurrent executions  
✅ **Task Whitelist:** Only predefined tasks can be called  
✅ **JSON Validation:** Auto-extracts and validates JSON responses  
✅ **Protected Domains:** `angie.local` cannot be deleted  
✅ **AMP-Managed Tracking:** Only removes domains managed by AMP (via `# AMPMANAGER` comment in hosts)

---

This bridge architecture provides a clean separation between the React UI and system-level operations, with Neutralino.js serving as the secure middleware that exposes native capabilities through a well-defined TypeScript API.

---

For the more details check the docs.