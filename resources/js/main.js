// ------------------------------------------------------------
// AMP Manager - Neutralino Frontend Bridge
// ------------------------------------------------------------

// List of allowed tasks, these must match our amp-tasks.bat and UI
const AMP_TASKS = {
    version: true,
    watch: true,
    status: true,
    env_status: true,
    runtime_status: true,
    php_extensions: true,

    scan_domains: true,
    list_domains: true,
    new_domain: true,
    remove_domain: true,
    generate_config: true,
    angie_live_status: true,
    
    ca_status: true,
    ca_reset: true,
    ca_uninstall: true,
    regenerate_ssl: true,
    regenerate_all_ssl: true,
    ssh_key_status: true,
    ssh_key_generate: true,
    
    clear_cache: true,
    clear_logs: true,
    db_query: true,

    docker_up: true,
    docker_stop: true,
    docker_restart: true,
    restart_angie: true,
    restart_runtime: true,
    docker_desktop_launch: true,
    docker_env_metrics: true,
    
    workflow_action: true,
    workflow_git: true,
    workflow_sftp: true,
    workflow_webhook: true,

    user_dir_create: true,
    user_dir_delete: true
};


// Generic backend caller using built-in global NL_PATH
async function amp(task, args = "") {
    if (!AMP_TASKS[task]) {
        return { status: "error", message: `Task '${task}' is not allowed` };
    }

    const batPath = `${NL_PATH}\\amp-tasks.bat`;
    const fullCommand = `"${batPath}" ${task} ${args}`;

    const result = await Neutralino.os.execCommand(fullCommand, {
        cwd: NL_PATH   // req when elevated
    });

    let output = (result.stdOut + result.stdErr).trim();

    // Extract JSON filter
    const jsonStart = output.indexOf('{');
    const jsonEnd = output.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd >= jsonStart) {
        output = output.substring(jsonStart, jsonEnd + 1);
    } else if (jsonStart !== -1) {
        output = output.substring(jsonStart);
    }

    try {
        const parsed = JSON.parse(output);
        return parsed;
    } catch (e) {
        return {
            status: "error",
            message: "Invalid JSON from backend",
            raw: output,
            exitCode: result.exitCode
        };
    }
}


// Expose API to the UI
window.AMP = {
    version: () => amp("version"),
    status: () => amp("status"),
    runtimeStatus: () => amp("runtime_status"),
    phpExtensions: () => amp("php_extensions"),
    envCheck: () => amp("env_status"),

    scanDomains: () => amp("scan_domains"),
    listDomains: () => amp("list_domains"),
    createDomain: (name, options = {}) => {
        const scaffold = options.scaffold ? "scaffold" : "none";
        return amp("new_domain", `"${name}" ${scaffold}`);
    },
    removeDomain: (name) => amp("remove_domain", name),
    generateConfig: (name) => amp("generate_config", name),
    
    clearCache: () => amp("clear_cache"),
    clearLogs: () => amp("clear_logs"),
    dbQuery: (query) => amp("db_query", `"${query.replace(/"/g, '\\"')}"`),

    caStatus: () => amp("ca_status"),
    caReset: () => amp("ca_reset"),
    caUninstall: () => amp("ca_uninstall"),
    regenerateSsl: (domain) => amp("regenerate_ssl", `"${domain}"`),
    regenerateAllSsl: () => amp("regenerate_all_ssl"),

    // SSH Key Management (Windows)
    sshKeyStatus: () => amp("ssh_key_status"),
    sshKeyGenerate: (username) => amp("ssh_key_generate", `"${username}"`),

    // User Directory Management
    userDirCreate: (dirPath) => amp("user_dir_create", `"${dirPath}"`),
    userDirDelete: (dirPath) => amp("user_dir_delete", `"${dirPath}"`),

    // OS helpers
    os: {
        async open(url) {
            await Neutralino.os.open(url);
        },
        async execCommand(command) {
            return await Neutralino.os.execCommand(command);
        },
        async spawnProcess(command, cwd) {
            return await Neutralino.os.spawnProcess(command, cwd);
        },
        async updateSpawnedProcess(id, action, data) {
            return await Neutralino.os.updateSpawnedProcess(id, action, data);
        }
    },

    // Filesystem helpers
    fs: {
        async readTextFile(path) {
            const r = await Neutralino.filesystem.readFile(path);
            return typeof r === 'string' ? r : r.data;
        },
        async writeTextFile(path, content) {
            await Neutralino.filesystem.writeFile(path, content);
        },
        async copyFile(source, dest) {
            await Neutralino.filesystem.copyFile(source, dest);
        },
        async deleteFile(path) {
            await Neutralino.filesystem.removeFile(path);
        },
        async getFolderSize(path) {
            let totalSize = 0;
            async function scan(dir) {
                try {
                    const entries = await Neutralino.filesystem.readDirectory(dir);
                    for (const entry of entries) {
                        if (entry.entry === "." || entry.entry === "..") continue;
                        const fullPath = `${dir}\\${entry.entry}`;
                        if (entry.type === "DIRECTORY") {
                            await scan(fullPath);
                        } else {
                            try {
                                const stats = await Neutralino.filesystem.getStats(fullPath);
                                totalSize += stats.size;
                            } catch (e) {}
                        }
                    }
                } catch (e) {}
            }
            await scan(path);
            
            if (totalSize === 0) return "0 B";
            const k = 1024;
            const sizes = ["B", "KB", "MB", "GB", "TB"];
            const i = Math.floor(Math.log(totalSize) / Math.log(k));
            return parseFloat((totalSize / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
        },
        async readDirectory(path) { 
            try { 
                return await Neutralino.filesystem.readDirectory(path); 
            } catch { 
                return []; 
            } 
        },
        async createDirectory(path) {
            await Neutralino.filesystem.createDirectory(path);
        },
        async remove(path) {
            await Neutralino.filesystem.remove(path);
        },
        async getAbsolutePath(path) {
            return await Neutralino.filesystem.getAbsolutePath(path);
        },
    },

    // Angie helpers
    angie: {
        async testConfig() {
            const r = await Neutralino.os.execCommand("angie -t");
            return {
                valid: r.exitCode === 0,
                output: r.stdOut + r.stdErr
            };
        },
        async reload() {
            await Neutralino.os.execCommand("angie -s reload");
        },
        async liveStatus() {
            return amp("angie_live_status");
        }
    },

    // Docker helpers
    docker: {
        async stats() {
            const r = await Neutralino.os.execCommand('docker stats --no-stream --format "{{json .}}"');
            const out = r.stdOut.trim();
            if (!out) return [];
            return out.split("\n").map(line => JSON.parse(line));
        },
        async disk() {
            const r = await Neutralino.os.execCommand('docker system df --format "{{json .}}"');
            const out = r.stdOut.trim();
            if (!out) return [];
            return out.split("\n").map(line => JSON.parse(line));
        },
        async info() {
            const r = await Neutralino.os.execCommand('docker info --format "{{json .}}"');
            return JSON.parse(r.stdOut);
        },
        async envMetrics() {
            return amp("docker_env_metrics");
        },
        async launchDesktop() {
            return amp("docker_desktop_launch");
        },
        async startContainers() {
            return amp("docker_up");
        },
        async stopContainers() {
            return amp("docker_stop");
        },
        async restartAngie() {
            return amp("restart_angie");
        },
        async restartRuntime() {
            return amp("restart_runtime");
        },
        async restartFullStack() {
            return amp("docker_restart");
        }
    },

    // Workflow helpers
    workflow: {
        git: (path, args) => amp("workflow_git", `"${path}" "${args}"`),
        node: (path, script) => amp("workflow_action", `node "${path}" "${script}"`),
        npm: (path, command) => amp("workflow_action", `npm "${path}" "${command}"`),
        shell: (path, command) => amp("workflow_action", `shell "${path}" "${command}"`),
        
        // Orphan temp key cleanup - runs before custom key SFTP
        async cleanupOrphanKeys() {
            const userTemp = process.env.TEMP || process.env.TMP;
            try {
                const files = await Neutralino.filesystem.readDirectory(userTemp);
                const oneHourAgo = Date.now() - (60 * 60 * 1000);
                
                for (const file of files) {
                    if (file.entry.startsWith('amp_sftp_key_') && file.entry.endsWith('.key')) {
                        const filePath = `${userTemp}\\${file.entry}`;
                        try {
                            const stats = await Neutralino.filesystem.getStats(filePath);
                            if (stats.modifiedAt < oneHourAgo) {
                                await Neutralino.filesystem.removeFile(filePath);
                            }
                        } catch {}
                    }
                }
            } catch {}
        },
        
        // DEFAULT: SFTP with AMP Manager's existing SSH key (no temp file, no decryption)
        sftpWithAmpKey: async (host, username, localPath, remotePath) => {
            const keyPath = `${process.env.USERPROFILE}\\.ssh\\id_ed25519`;
            
            // Verify key exists
            try {
                await Neutralino.filesystem.getStats(keyPath);
            } catch {
                return { status: "error", message: "AMP SSH key not found. Please regenerate in Settings → SSH Key." };
            }
            
            // Pass key path directly - batch won't delete it (permanent key)
            return amp("workflow_sftp", `"${host}" "${username}" "${localPath}" "${remotePath}" "${keyPath}" permanent`);
        },
        
        // ADVANCED: SFTP with custom SSH key (temp file with icacls, always deleted)
        sftpWithCustomKey: async (host, username, localPath, remotePath, keyContent) => {
            // Cleanup orphan temp keys first
            await workflow.cleanupOrphanKeys();
            
            const userTemp = process.env.TEMP || process.env.TMP;
            const random = Math.random().toString(36).substring(2, 15);
            const tempKeyPath = `${userTemp}\\amp_sftp_key_${random}.key`;
            
            // Write key content to temp file
            await Neutralino.filesystem.writeFile(tempKeyPath, keyContent);
            
            // Set restrictive permissions via icacls (silently continue if fails)
            try {
                await Neutralino.os.execCommand(`icacls "${tempKeyPath}" /inheritance:r /grant:r "%USERNAME%:F"`);
            } catch (e) {
                // Silently continue without restricted permissions
            }
            
            // Pass "temp" flag so batch knows to delete after use
            return amp("workflow_sftp", `"${host}" "${username}" "${localPath}" "${remotePath}" "${tempKeyPath}" temp`);
        },
        
        webhook: (url, payload) => amp("workflow_webhook", `"${url}" "${payload.replace(/"/g, '\\"')}"`)
    },

    // test button handler
    async testScanDomains() {
        const outputElement = document.querySelector('#backendOutput code');
        const result = await amp("scan_domains");   // or any task
        outputElement.textContent = JSON.stringify(result, null, 2);
    }
};

// ------------------------------------------------------------
// Init
// ------------------------------------------------------------
Neutralino.init();