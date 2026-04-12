import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SettingsPathProps {
  projectRoot: string;
}

export default function SettingsPath({ projectRoot }: SettingsPathProps) {
  return (
    <div className="mt-4">

        
      <div className="alert alert-warning alert-soft shadow mb-4">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">Any modification of docker or directory structure would break the app functionality.</span>
      </div>
      
      <div className="space-y-2">
        <div className="form-control w-full">
          <label className="label" htmlFor="projects-path">
            <span className="label-text font-medium">Project Root Path</span>
          </label>
          <input 
            type="text" 
            id="projects-path" 
            value={projectRoot} 
            readOnly
            className="input input-sm input-bordered w-full bg-base-200 opacity-70 cursor-not-allowed" 
          />
        </div>
        <div className="form-control w-full">
          <label className="label" htmlFor="config-path">
            <span className="label-text font-medium">Domain Server Configuration</span>
          </label>
          <input 
            type="text" 
            id="config-path" 
            value={projectRoot === 'error' ? 'error' : `${projectRoot}config\\angie-sites\\`} 
            readOnly
            className="input input-sm input-bordered w-full bg-base-200 opacity-70 cursor-not-allowed" 
          />
        </div>
        <div className="form-control w-full">
          <label className="label" htmlFor="ssl-path">
            <span className="label-text font-medium">Domain local SSL</span>
          </label>
          <input 
            type="text" 
            id="ssl-path" 
            value={projectRoot === 'error' ? 'error' : `${projectRoot}config\\certs\\`} 
            readOnly
            className="input input-sm input-bordered w-full bg-base-200 opacity-70 cursor-not-allowed" 
          />
        </div>
        <div className="form-control w-full">
          <label className="label" htmlFor="db-path">
            <span className="label-text font-medium">Database Storage</span>
          </label>
          <input 
            type="text" 
            id="db-path" 
            value={projectRoot === 'error' ? 'error' : `${projectRoot}data\\`} 
            readOnly
            className="input input-sm input-bordered w-full bg-base-200 opacity-70 cursor-not-allowed" 
          />
        </div>
        <div className="form-control w-full">
          <label className="label" htmlFor="www-path">
            <span className="label-text font-medium">Domain files</span>
          </label>
          <input 
            type="text" 
            id="www-path" 
            value={projectRoot === 'error' ? 'error' : `${projectRoot}www\\`} 
            readOnly
            className="input input-sm input-bordered w-full bg-base-200 opacity-70 cursor-not-allowed" 
          />
        </div>
      </div>
     
    </div>
  );
}
