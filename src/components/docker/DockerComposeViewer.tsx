import React, { useState, useEffect } from 'react';
import { FileCode, RefreshCw, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from '@/utils/toast';
import { ampBridge } from '@/services/AMPBridge';

export function DockerComposeViewer() {
  const [activeTab, setActiveTab] = useState<'main' | 'override'>('main');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchFile = async (type: 'main' | 'override') => {
    setLoading(true);
    setError(null);
    try {
      if (!ampBridge.isAvailable()) {
        setContent('# Mock Docker Compose Content\nservices:\n  php:\n    image: php:8.3-fpm\n  angie:\n    image: angie:latest');
        return;
      }

      const filename = type === 'main' ? 'docker-compose.yml' : 'docker-compose.override.yml';
      // In Neutralino, NL_PATH is the application directory
      const env = await ampBridge.envCheck();
      const nlPath = env.project_root;
      const path = `${nlPath}/${filename}`;
      
      try {
        const text = await ampBridge.fs.readTextFile(path);
        setContent(text);
      } catch (err: any) {
        if (type === 'override') {
          setContent('# No override file found.\n# This file is optional and used for local customizations.');
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      setError(`Failed to load ${type === 'main' ? 'docker-compose.yml' : 'docker-compose.override.yml'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFile(activeTab);
  }, [activeTab]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card bg-base-100 border border-base-200 shadow overflow-hidden">
      <div className="card-body bg-base-100 p-0">
        <div className="flex items-center justify-between border-b border-base-200 p-4">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-500" />
            <h2 className="card-title bg-base-100 text-sm font-bold uppercase tracking-wider">Docker Compose</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              className="btn btn-xs btn-ghost"
              onClick={() => fetchFile(activeTab)}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              className="btn btn-xs btn-ghost"
              onClick={handleCopy}
              disabled={!content || loading}
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        </div>

        <div className="tabs tabs-sm tabs-box bg-base-200 rounded-sm">
          <button 
            className={`tab tab-sm text-xs flex-1 ${activeTab === 'main' ? 'tab-active font-bold text-blue-500' : ''}`}
            onClick={() => setActiveTab('main')}
          >
            docker-compose.yml
          </button>
          <button 
            className={`tab tab-sm text-xs flex-1 ${activeTab === 'override' ? 'tab-active font-bold text-blue-500' : ''}`}
            onClick={() => setActiveTab('override')}
          >
            docker-compose.override.yml
          </button>
        </div>

        <div className="relative min-h-full max-h-[384px] overflow-auto bg-base-300 p-4 font-mono text-xs text-zinc-300">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <RefreshCw className="w-8 h-8 animate-spin opacity-20" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
              <AlertCircle className="w-8 h-8 text-error" />
              <p>{error}</p>
            </div>
          ) : (
            <pre className="whitespace-pre-wrap leading-relaxed">
              {content || '# Empty file'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
