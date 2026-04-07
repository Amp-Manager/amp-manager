import React, { useState, useEffect } from 'react';
import { Loader2, Save, RotateCcw, Volume2, VolumeX, Bell, BellOff } from 'lucide-react';
import { toast } from '@/utils/toast';
import { useToastSettings } from '@/context/ToastSettingsContext';
import { ToastPosition } from '@/utils/toastSettings';

const POSITIONS: { value: ToastPosition; label: string; gridArea: string }[] = [
  { value: 'top-left', label: 'Top Left', gridArea: '1 / 1' },
  { value: 'top-center', label: 'Top Center', gridArea: '1 / 2' },
  { value: 'top-right', label: 'Top Right', gridArea: '1 / 3' },
  { value: 'bottom-left', label: 'Bottom Left', gridArea: '2 / 1' },
  { value: 'bottom-center', label: 'Bottom Center', gridArea: '2 / 2' },
  { value: 'bottom-right', label: 'Bottom Right', gridArea: '2 / 3' },
];

export default function SettingsNotifications() {
  const { toastSettings, updateToastSettings, resetToDefaults, isLoading } = useToastSettings();
  
  const [position, setPosition] = useState<ToastPosition>(toastSettings.position);
  const [soundEnabled, setSoundEnabled] = useState(toastSettings.soundEnabled);
  const [volume, setVolume] = useState(toastSettings.volume);
  const [types, setTypes] = useState(toastSettings.types);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when settings load
  useEffect(() => {
    setPosition(toastSettings.position);
    setSoundEnabled(toastSettings.soundEnabled);
    setVolume(toastSettings.volume);
    setTypes(toastSettings.types);
    setHasChanges(false);
  }, [toastSettings]);

  // Track changes
  useEffect(() => {
    const changed = 
      position !== toastSettings.position ||
      soundEnabled !== toastSettings.soundEnabled ||
      volume !== toastSettings.volume ||
      types.success !== toastSettings.types.success ||
      types.error !== toastSettings.types.error ||
      types.info !== toastSettings.types.info ||
      types.warning !== toastSettings.types.warning;
    setHasChanges(changed);
  }, [position, soundEnabled, volume, types, toastSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateToastSettings({
        position,
        soundEnabled,
        volume,
        types,
      });
      toast.success('Notification settings saved');
      setHasChanges(false);
    } catch (err) {
      toast.error('Failed to save notification settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    await resetToDefaults();
    toast.info('Settings reset to defaults');
  };

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body h-48 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin opacity-20" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-sm opacity-70 mb-4">
        Configure toast notification position, sounds, and volume.
      </p>

      <div className="space-y-6">

        <div className="grid grid-cols-2 gap-4 w-full">

          {/* Sound Settings */}
          <div className="space-y-4 p-4 bg-base-200/50 rounded-lg">
            {/* Enable Sound Toggle */}
            <div className="flex items-center justify-between">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="toggle toggle-sm toggle-primary"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                />
                <span className="label-text font-medium flex items-center gap-2">
                  {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  Sound Notifications
                </span>
              </label>
            </div>

            {/* Volume Slider */}
            {soundEnabled && (
              <div className="space-y-4">
                <label className="label-text text-sm flex items-center justify-between">
                  <span>Volume</span>
                  <span className="badge badge-sm badge-info badge-soft">{Math.round(volume * 100)}%</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(volume * 100)}
                  onChange={(e) => setVolume(Number(e.target.value) / 100)}
                  className="range range-primary range-xs w-full"
                  step={5}
                />
                <div className="flex justify-between text-xs opacity-50 px-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            )}

            {/* Sound Types */}
            {soundEnabled && (
              <div className="space-y-2">
                <label className="label-text text-sm font-medium">Sound Types</label>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <label className="label cursor-pointer justify-start gap-4 p-2 rounded bg-base-100">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-success"
                      checked={types.success}
                      onChange={(e) => setTypes({ ...types, success: e.target.checked })}
                    />
                    <span className="label-text text-sm">Success</span>
                  </label>
                  <label className="label cursor-pointer justify-start gap-4 p-2 rounded bg-base-100">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-error"
                      checked={types.error}
                      onChange={(e) => setTypes({ ...types, error: e.target.checked })}
                    />
                    <span className="label-text text-sm">Error</span>
                  </label>
                  <label className="label cursor-pointer justify-start gap-4 p-2 rounded bg-base-100">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-info"
                      checked={types.info}
                      onChange={(e) => setTypes({ ...types, info: e.target.checked })}
                    />
                    <span className="label-text text-sm">Info</span>
                  </label>
                  <label className="label cursor-pointer justify-start gap-4 p-2 rounded bg-base-100">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm checkbox-warning"
                      checked={types.warning}
                      onChange={(e) => setTypes({ ...types, warning: e.target.checked })}
                    />
                    <span className="label-text text-sm">Warning</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Position Selector */}
          <div className="space-y-4 p-4">
            <h3 className="text font-medium flex items-center gap-2">
              <Bell className="w-4 h-4" />
              Toast Position
            </h3>
            
            <div 
              className="grid grid-cols-3 gap-4 w-full"
              style={{ gridTemplateRows: 'repeat(2, 1fr)' }}
            >
              {POSITIONS.map((pos) => (
                <label
                  key={pos.value}
                  className={`
                    flex flex-col items-center justify-center p-2 rounded-lg border-2 cursor-pointer
                    transition-all duration-200 min-w-[100px] h-18
                    ${position === pos.value 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-base-300 bg-base-200/50 hover:border-base-content/30'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="position"
                    value={pos.value}
                    checked={position === pos.value}
                    onChange={() => setPosition(pos.value)}
                    className="sr-only"
                  />
                  <div className={`
                    w-8 h-8 rounded-sm border-2 flex items-center justify-center mb-1
                    ${position === pos.value ? 'border-primary' : 'border-base-content/30'}
                  `}>
                    {/* Position indicator dot */}
                    <div className={`
                      w-2 h-2 rounded-full
                      ${pos.value.includes('top') ? 'mb-auto' : ''}
                      ${pos.value.includes('bottom') ? 'mt-auto' : ''}
                      ${pos.value.includes('left') ? 'mr-auto' : ''}
                      ${pos.value.includes('right') ? 'ml-auto' : ''}
                      ${pos.value.includes('center') ? 'mx-auto' : ''}
                      ${position === pos.value ? 'bg-primary' : 'bg-base-content/30'}
                    `} />
                  </div>
                  <span className="text-xs">{pos.label}</span>
                </label>
              ))}
            </div>

            {/* Actions */}
            <div className="flex justify-end mt-6 gap-2">
              <button
                className="btn btn-sm btn-soft"
                onClick={handleReset}
                disabled={isSaving}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-1" />
                )}
                Save
              </button>
            </div>

          </div>


        </div>


      </div>

    </div>
  );
}
