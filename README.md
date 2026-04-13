<h1 align="center">AMP Manager</h1>

<p align="center">Desktop app for local development. Docker-based stack with a click-and-run GUI. No terminal required.</p>

<p align="center">
  <img src="public/icons/4x4.png" width="100%" height="48px" />
</p>



<p align="center">
  <img src="https://raw.githubusercontent.com/Amp-Manager/media/refs/heads/main/screenshots/amp-manager-desktop-prototype.jpg" width="100%" height="auto" />
</p>


## Prerequisites

- Windows 10/11

- Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/)   
AMP Manager uses Docker to run backend services.

- Download the latest AMP Manager release to your drive e.g. `D:\amp-manager`

## First Run Setup

1. **Start Docker Desktop**   
 Ensure Docker is running (check system tray icon)
2. **Initialize containers**  
  Open a terminal in `D:\amp-manager` and run:
   ```bash
   docker compose up -d
   ```
3. **Launch AMP Manager**   
AMP Manager will help you manage your local development environment:

- configure and trust SSL certificates
- update your Windows hosts file
- create local development domains
- start and stop Docker services
- define workflows using a node‑based UI
- share a local site using tunneling services

> [!WARNING]
> AMP Manager requires administrator privileges.

This is necessary to:

- install and trust SSL certificates
- modify the Windows hosts file
- manage Docker services that require elevated access

AMP Manager does not collect, transmit, or store any user data.   
All operations happen locally on your machine.


### Creating Your First Domain

1. Open AMP Manager
2. Click "Add Domain"
3. Enter domain name (e.g., `mysite`)
4. Click Create

Your domain is now available at `http://mysite.local` with automatic SSL!


<p align="center">
  <img src="public/icons/4x4.png" width="100%" height="48px" />
</p>

## Activity Timeline & System Checks


<p align="center">
  <img src="https://raw.githubusercontent.com/Amp-Manager/media/refs/heads/main/screenshots/amp-manager-desktop-prototype-activity.jpg" width="100%" height="auto" />
</p>


## Docker Management


<p align="center">
  <img src="https://raw.githubusercontent.com/Amp-Manager/media/refs/heads/main/screenshots/amp-manager-desktop-prototype-docker.jpg" width="100%" height="auto" />
</p>


## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS, DaisyUI |
| Backend | Neutralino.js 6.5, Windows Batch (amp-tasks.bat) |
| Storage | JSON Files (users/ folder), Web Crypto for encryption |
| Containers | Docker Compose (Angie, PHP, MariaDB) |

## Documentation

For more details, see the documentation in the [Wiki](../../wiki)


| Document | Description |
|----------|-------------|
| [Core Concepts](../..//wiki/01‐Core‐Concepts) | How AMP works |
| [For Developers](../..//wiki/02‐For-Developers) | Step-by-step for devs |
| [For Students](../../iki/02‐For-Students) | Quick start for beginners |
| [Architecture](../../wiki/03‐Architecture) | System design |
| [State Management](../../wiki/03‐State-Management) | storage systems |
| [Amp Tasks Reference](../../wiki/04‐Amp-Tasks-Reference) | Batch commands |
| [API Reference](../../wiki/05‐API-Reference) | AMPBridge API |
| [Component Reference](../../wiki/06‐Component-Reference) | UI components |
| [User Interface](../../wiki/07-User-Interface) | UI tech stack |
| [Security](../../wiki/08-Security) | Security model |
| [Workflows](../../wiki/09-Workflows-Deployment) | Deployment guides |
| [Tunneling](../../wiki/10-Local-Tunneling) | Tunnel services |
| [Contributing](../../wiki/11‐Contributing) | Developer guide |
| [Troubleshooting](../../wiki/12‐Troubleshooting) | Common issues |
| [Glossary](../../wiki/13‐Glossary) | Terms explained |


## Key Concepts

### Domains

Local domains with automatic SSL. Each domain gets:
- Auto-created folder in `www/`
- SSL certificate via mkcert
- Angie configuration
- Hosts file entry

### Containers

Docker containers managed by AMP:
- **Angie** - Web server
- **PHP** - PHP runtime
- **MariaDB** - Database
- **Mailpit** - Email & SMTP tool

### Encryption

Sensitive data (credentials, notes, settings, workflows, site configs) is encrypted using AES-256-GCM with keys derived from your password.

---

## Support

Issues: [GitHub Issues](https://github.com/amp-manager/amp-manager/issues)

---

## License

AMP Manager is released under [MIT License](/LICENSE)