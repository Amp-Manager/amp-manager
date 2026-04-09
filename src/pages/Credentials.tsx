import { useState, useEffect, Suspense, lazy } from 'react';
import { toast } from '@/utils/toast';
import { useAuth } from '@/context/AuthContext';
import { initDB, logActivity } from '@/lib/db';
import { encryptWithKey, decryptWithKey } from '@/lib/crypto';
import { Key, Lock, Plus, Trash2, Eye, EyeOff, Save, Unlock, Loader2, Tag as TagIcon, Copy, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Tag } from '@/types';
import { COLOR_MAP } from '@/components/layout/uiConstants';
import { ampBridge } from '@/services/AMPBridge';

const TagSelector = lazy(() => import("@/components/layout/TagSelector"));

export default function Credentials() {
  const { user, encryptionKey } = useAuth();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState<string | null>(null);
  const [decryptedSecrets, setDecryptedSecrets] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [ampSshKeyInfo, setAmpSshKeyInfo] = useState<{ publicKey: string; keyPath: string; fingerprint?: string } | null>(null);
  const [copiedPublicKey, setCopiedPublicKey] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'api_key',
    username: '',
    secret: '',
    publicKey: '',
    tags: [] as string[]
  });

  useEffect(() => {
    if (user) {
      loadCredentials();
      loadTags();
    }
  }, [user]);

  // Load SSH key fingerprint from backend
  useEffect(() => {
    const loadFingerprint = async () => {
      if (!ampBridge.isAvailable()) return;
      try {
        const res = await ampBridge.sshKeyStatus();
        if (res.key_exists && res.fingerprint) {
          setAmpSshKeyInfo(prev => prev ? { ...prev, fingerprint: res.fingerprint } : null);
        }
      } catch (e) {
        // Silently fail - fingerprint will not be displayed
      }
    };
    loadFingerprint();
  }, []);

  // Decrypt AMP SSH key info for display
  useEffect(() => {
    const decryptAmpSshKey = async () => {
      const ampKey = credentials.find(c => c.id === 'ssh_amp_manager');
      if (ampKey && encryptionKey && ampKey.iv && ampKey.secret) {
        try {
          const decrypted = await decryptWithKey(ampKey.iv, ampKey.secret, encryptionKey);
          const parsed = JSON.parse(decrypted);
          setAmpSshKeyInfo({ publicKey: parsed.publicKey || '', keyPath: parsed.keyPath || '' });
        } catch (e) {
          // Silently fail - SSH key info will not be displayed
        }
      }
    };
    decryptAmpSshKey();
  }, [credentials, encryptionKey]);

  const loadTags = async () => {
    if (!user) return;
    const db = await initDB(user);
    const t = await db.getAll('tags');
    setAllTags(t);
  };

  const loadCredentials = async () => {
    if (!user) return;
    const db = await initDB(user);
    const creds = await db.getAll('credentials');
    const normalized = creds.map(c => ({
      ...c,
      tags: Array.isArray(c.tags) ? c.tags : (typeof (c.tags as any) === 'string' ? (c.tags as any).split(',').map((t: string) => t.trim()).filter(Boolean) : [])
    }));
    setCredentials(normalized);
  };

  const handleSave = async () => {
    if (!user || !encryptionKey) return;

    // Validation based on type
    if (!formData.name) {
      toast.error("Name is required");
      return;
    }

    if (formData.type === 'ssh') {
      if (!formData.publicKey || !formData.publicKey.startsWith('ssh-')) {
        toast.error("Valid SSH public key is required (must start with 'ssh-')");
        return;
      }
      if (!formData.secret) {
        toast.error("Private key is required");
        return;
      }
    } else if (formData.type === 'password') {
      if (!formData.username) {
        toast.error("Username is required");
        return;
      }
      if (!formData.secret) {
        toast.error("Password is required");
        return;
      }
    } else if (formData.type === 'api_key') {
      if (!formData.secret) {
        toast.error("Token is required");
        return;
      }
    }

    try {
      const db = await initDB(user);
      
      // Encrypt the secret using the session key
      const { iv, ciphertext } = await encryptWithKey(formData.secret, encryptionKey);
      
      const newCred = {
        id: uuidv4(),
        name: formData.name,
        type: formData.type as any,
        username: formData.username || undefined,
        secret: ciphertext,
        public_key: formData.type === 'ssh' ? formData.publicKey : undefined,
        iv: iv,
        salt: 'session',
        tags: formData.tags,
        created_at: Date.now(),
        updated_at: Date.now()
      };

      await db.put('credentials', newCred);
      await logActivity(db, 'create', 'credential', newCred.id, newCred.name);
      
      await loadCredentials();
      setIsModalOpen(false);
      setFormData({ name: '', type: 'api_key', username: '', secret: '', publicKey: '', tags: [] });
      toast.success("Credential saved");
    } catch (err) {
      toast.error("Failed to encrypt credential");
    }
  };

  const getUsageCount = (tagId: string) => {
    return credentials.filter(c => c.tags?.includes(tagId)).length;
  };

  const toggleSecret = async (cred: any) => {
    if (decryptedSecrets[cred.id]) {
      const newDecrypted = { ...decryptedSecrets };
      delete newDecrypted[cred.id];
      setDecryptedSecrets(newDecrypted);
      return;
    }

    if (!encryptionKey) return;

    setIsDecrypting(cred.id);
    try {
      const plain = await decryptWithKey(cred.iv, cred.secret, encryptionKey);
      setDecryptedSecrets(prev => ({ ...prev, [cred.id]: plain }));
    } catch (err) {
      toast.error("Decryption failed. Session key might be invalid.");
    } finally {
      setIsDecrypting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    const db = await initDB(user);
    const credToDelete = credentials.find(c => c.id === id);
    await db.delete('credentials', id);
    if (credToDelete) {
      await logActivity(db, 'delete', 'credential', id, credToDelete.name);
    }
    await loadCredentials();
    setConfirmDeleteId(null);
  };

  const handleCopyPublicKey = async () => {
    if (ampSshKeyInfo?.publicKey) {
      await navigator.clipboard.writeText(ampSshKeyInfo.publicKey);
      setCopiedPublicKey(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopiedPublicKey(false), 2000);
    }
  };

  const handleCopyFingerprint = async () => {
    if (ampSshKeyInfo?.fingerprint) {
      await navigator.clipboard.writeText(ampSshKeyInfo.fingerprint);
      setCopiedFingerprint(true);
      toast.success("Fingerprint copied");
      setTimeout(() => setCopiedFingerprint(false), 2000);
    }
  };

  const handleCopyText = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-8">

      <div className="grid grid-cols-[auto_1fr_auto] items-start gap-4 w-full">
        <div className="bg-indigo-500/10 rounded-lg p-2">
          <Key className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl tracking-tight">Credentials Vault</h1>
          <p className="text-xs opacity-50">Securely manage API keys, SSH keys, and passwords for your workflows.</p>
        </div>
        <div className="justify-self-end gap-2">
          <button 
            className="btn btn-sm btn-primary"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4" /> Add Credential
          </button>
        </div>
      </div>

      {/* AMP Manager SSH Key Card */}
      <div className="card w-full shadow border border-base-300 bg-base-100">
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/20 text-orange-600">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">AMP Manager SSH Key</h3>
                <p className="text-xs opacity-50">Auto-generated for tunneling and SFTP workflows</p>
              </div>
            </div>
            <span className={`badge badge-sm ${ampSshKeyInfo ? 'badge-success' : 'badge-warning'}`}>
              {ampSshKeyInfo ? 'Configured' : 'Not Generated'}
            </span>
          </div>

          {ampSshKeyInfo && (
            <>
              {/* Public Key */}
              <div className="text-xs mb-1 opacity-70">Public Key (add this to your servers):</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 font-mono bg-base-200 p-2 rounded text-[10px] break-all max-h-16 overflow-y-auto">
                  {ampSshKeyInfo.publicKey}
                </div>
                <button 
                  className="btn btn-sm btn-ghost shrink-0"
                  onClick={handleCopyPublicKey}
                  title="Copy public key"
                >
                  {copiedPublicKey ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Fingerprint - for SSH key verification */}
              {ampSshKeyInfo.fingerprint && (
                <div className="mt-3">
                  <div className="text-xs mb-1 opacity-70">Fingerprint (SHA256):</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 font-mono bg-base-200 p-2 rounded text-[10px] break-all">
                      {ampSshKeyInfo.fingerprint}
                    </div>
                    <button 
                      className="btn btn-sm btn-ghost shrink-0"
                      onClick={handleCopyFingerprint}
                      title="Copy fingerprint"
                    >
                      {copiedFingerprint ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Key Location */}
              <div className="text-[10px] opacity-50 mt-2">
                Key location: <code className="bg-base-200 px-1 rounded">{ampSshKeyInfo.keyPath}</code>
              </div>

              {/* Short How-to Guide */}
              <div className="alert alert-sm alert-info alert-soft mt-3">
                <div className="text-xs">
                  <span className="font-bold">Add to server:</span> Copy key above → paste into <code className="bg-base-200 px-0.5 rounded">~/.ssh/authorized_keys</code>
                </div>
              </div>
            </>
          )}

          {!ampSshKeyInfo && (
            <p className="text-sm opacity-50">SSH key will be generated automatically on first login.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {credentials.filter(c => c.type !== 'ssh_key').map((cred) => (
          <div key={cred.id} className="card bg-base-100 shadow border border-base-300">
            <div className="card-body p-4">

                {/* icon type and name */}
                <div className="flex items-center mb-2 gap-4">
                  <div className={`p-2 rounded-lg ${
                    cred.type === 'ssh' ? 'bg-orange-500/20 text-orange-600' :
                    cred.type === 'password' ? 'bg-blue-500/20 text-blue-600' :
                    'bg-green-500/20 text-green-600'
                  }`}>
                    {decryptedSecrets[cred.id] ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  </div>

                  <h3 className="w-full font-bold text-sm truncate">{cred.name}</h3>
                </div>
              
                {/* type and tags */}
                <div className="flex flex-1 flex-wrap items-start gap-2 mb-2">
                  <span className={`badge badge-xs rounded-sm uppercase ${
                    cred.type === 'ssh' ? 'badge-warning' :
                    cred.type === 'password' ? 'badge-info' :
                    'badge-success'
                  }`}>
                    {cred.type === 'ssh' ? 'SSH' : cred.type === 'password' ? 'PASS' : 'TOKEN'}
                  </span>
                 
                  {cred.tags?.map((tagId: string) => {
                    const tagDef = allTags.find(t => t.id === tagId);
                    const tagName = tagDef ? tagDef.name : (tagId.startsWith('tag_') ? 'Loading...' : tagId);
                    return (
                      <span key={tagId} className={`badge badge-xs badge-outline rounded-sm ${tagDef ? COLOR_MAP[tagDef.color] : 'badge-primary'}`}>
                        {tagName}
                      </span>
                    );
                  })}
                </div>
                    
                <div className="flex-1 space-y-2">
                  {/* SSH: Public Key (always visible with copy) */}
                  {cred.type === 'ssh' && cred.public_key && (
                    <div className="text-xs">
                      <span className="opacity-70">Public Key:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="font-mono bg-base-200 p-1.5 rounded text-[9px] truncate flex-1">{cred.public_key}</div>
                        <button 
                          className="btn btn-ghost btn-xs shrink-0"
                          onClick={() => handleCopyText(cred.public_key!)}
                          title="Copy public key"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* SSH: Username (optional) */}
                  {cred.type === 'ssh' && cred.username && (
                    <div className="text-xs">
                      <span className="opacity-70">Username:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="font-mono bg-base-200 p-1.5 rounded text-[10px] truncate flex-1">{cred.username}</div>
                        <button 
                          className="btn btn-ghost btn-xs shrink-0"
                          onClick={() => handleCopyText(cred.username!)}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Password: Username */}
                  {cred.type === 'password' && cred.username && (
                    <div className="text-xs">
                      <span className="opacity-70">Username:</span>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="font-mono bg-base-200 p-1.5 rounded text-[10px] truncate flex-1">{cred.username}</div>
                        <button 
                          className="btn btn-ghost btn-xs shrink-0"
                          onClick={() => handleCopyText(cred.username!)}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Secret/Password/Token (masked, with show+copy) */}
                  <div className="text-xs">
                    <span className="opacity-70">
                      {cred.type === 'ssh' ? 'Private Key:' : 
                       cred.type === 'password' ? 'Password:' : 'Token:'}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="font-mono bg-base-200 p-1.5 rounded text-[10px] truncate flex-1 min-h-[1.75rem] flex items-center">
                        {decryptedSecrets[cred.id] ? (
                          <span className="text-primary break-all">{decryptedSecrets[cred.id]}</span>
                        ) : (
                          <span className="opacity-30 italic">••••••••••••••••</span>
                        )}
                      </div>
                      {decryptedSecrets[cred.id] && (
                        <button 
                          className="btn btn-ghost btn-xs shrink-0"
                          onClick={() => handleCopyText(decryptedSecrets[cred.id])}
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="card-action flex justify-end gap-1 mt-2">
                  <button 
                    className="btn btn-ghost btn-xs"
                    onClick={() => toggleSecret(cred)}
                    disabled={isDecrypting === cred.id}
                    title={decryptedSecrets[cred.id] ? "Hide" : "Show"}
                  >
                    {isDecrypting === cred.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                      decryptedSecrets[cred.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button 
                    className="btn btn-ghost btn-xs text-error"
                    onClick={() => setConfirmDeleteId(cred.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
            </div>
          </div>
        ))}

        {credentials.length === 0 && (
          <div className="col-span-full text-center py-12 bg-base-200/50 rounded-lg border-2 border-dashed border-base-300">
            <Key className="w-12 h-12 mx-auto text-base-content/30 mb-3" />
            <h3 className="font-bold text-lg opacity-70">No Credentials Found</h3>
            <p className="text-sm opacity-50">Add your first key to get started.</p>
          </div>
        )}
      </div>

      {/* Add Credential Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 rounded-[16px] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-base-300/80 p-6 rounded-lg shadow-2xl w-full max-w-md border border-base-100">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> New Credential
            </h3>
            
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Name</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Production SSH Key" 
                  className="input input-bordered w-full"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Type</span>
                </label>
                <select 
                  className="select select-bordered w-full"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value, username: '', secret: '', publicKey: ''})}
                >
                  <option value="ssh">SSH Key</option>
                  <option value="password">Username & Password</option>
                  <option value="api_key">API Key / Token</option>
                </select>
              </div>

              {/* SSH Key Fields */}
              {formData.type === 'ssh' && (
                <>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Username (optional)</span>
                      <span className="label-text-alt opacity-50">For SFTP connections</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. deploy" 
                      className="input input-bordered w-full"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Public Key</span>
                      <span className="label-text-alt text-error">Required</span>
                    </label>
                    <textarea 
                      className="textarea textarea-bordered w-full font-mono text-xs h-20"
                      placeholder="ssh-ed25519 AAAA..."
                      value={formData.publicKey}
                      onChange={(e) => setFormData({...formData, publicKey: e.target.value})}
                    />
                    <label className="label">
                      <span className="label-text-alt opacity-50">Paste your full public key (starts with ssh-rsa, ssh-ed25519, etc.)</span>
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Private Key</span>
                      <span className="label-text-alt text-error">Required</span>
                    </label>
                    <textarea 
                      className="textarea textarea-bordered w-full font-mono text-xs h-32"
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----&#10;...&#10;-----END OPENSSH PRIVATE KEY-----"
                      value={formData.secret}
                      onChange={(e) => setFormData({...formData, secret: e.target.value})}
                    />
                    <label className="label">
                      <span className="label-text-alt opacity-50">Paste your full private key including header and footer</span>
                    </label>
                  </div>
                </>
              )}

              {/* Password Fields */}
              {formData.type === 'password' && (
                <>
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Username</span>
                      <span className="label-text-alt text-error">Required</span>
                    </label>
                    <input 
                      type="text" 
                      placeholder="e.g. admin" 
                      className="input input-bordered w-full"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Password</span>
                      <span className="label-text-alt text-error">Required</span>
                    </label>
                    <div className="relative">
                      <input 
                        type={showSecret ? "text" : "password"}
                        placeholder="Enter password..." 
                        className="input input-bordered w-full pr-10"
                        value={formData.secret}
                        onChange={(e) => setFormData({...formData, secret: e.target.value})}
                      />
                      <button 
                        className="absolute right-3 top-3 text-base-content/50 hover:text-base-content"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* API Key Fields */}
              {formData.type === 'api_key' && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Token / API Key</span>
                    <span className="label-text-alt text-error">Required</span>
                  </label>
                  <div className="relative">
                    <input 
                      type={showSecret ? "text" : "password"}
                      placeholder="Enter token or API key..." 
                      className="input input-bordered w-full pr-10"
                      value={formData.secret}
                      onChange={(e) => setFormData({...formData, secret: e.target.value})}
                    />
                    <button 
                      className="absolute right-3 top-3 text-base-content/50 hover:text-base-content"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Tags</span>
                </label>
                <Suspense fallback={<div className="h-8 bg-zinc-800 animate-pulse rounded" />}>
                  <TagSelector 
                    selectedTagIds={formData.tags}
                    onTagsChange={(tags) => setFormData({ ...formData, tags })}
                    getUsageCount={getUsageCount}
                    onTagsUpdated={loadTags}
                  />
                </Suspense>
              </div>

            </div>

            <div className="modal-action mt-6">
              <button className="btn btn-neutral btn-sm" onClick={() => { setIsModalOpen(false); setFormData({ name: '', type: 'api_key', username: '', secret: '', publicKey: '', tags: [] }); }}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={handleSave}>
                <Save className="w-4 h-4" /> Save Credential
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="modal modal-open">
          <div className="modal-box border border-base-100">
            <h3 className="font-bold text-lg text-red-500 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Confirm Deletion
            </h3>
            <p className="py-4">
              Are you sure you want to delete the credential <strong>{credentials.find(c => c.id === confirmDeleteId)?.name}</strong>?
               <br/>
               This action cannot be undone.
            </p>
            <div className="modal-action">
              <button className="btn" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button 
                className="btn btn-error" 
                onClick={() => handleDelete(confirmDeleteId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
