
import React from 'react';
import { SWATCH_COLORS } from './uiConstants';
import { Check } from 'lucide-react';

const SOLID_BG_MAP: Record<string, string> = {
    'slate': 'bg-slate-500',
    'gray': 'bg-gray-500',
    'zinc': 'bg-zinc-500',
    'neutral': 'bg-neutral-500',
    'stone': 'bg-stone-500',
    'red': 'bg-red-500',
    'orange': 'bg-orange-500',
    'amber': 'bg-amber-500',
    'yellow': 'bg-yellow-500',
    'lime': 'bg-lime-500',
    'green': 'bg-green-500',
    'emerald': 'bg-emerald-500',
    'teal': 'bg-teal-500',
    'cyan': 'bg-cyan-500',
    'sky': 'bg-sky-500',
    'blue': 'bg-blue-500',
    'indigo': 'bg-indigo-500',
    'violet': 'bg-violet-500',
    'purple': 'bg-purple-500',
    'fuchsia': 'bg-fuchsia-500',
    'pink': 'bg-pink-500',
    'rose': 'bg-rose-500',
};

interface Props {
  selectedColor: string;
  onSelect: (color: string) => void;
  className?: string;
  /** 
   * If true, renders colors as text-color (foreground) styles for preview. 
   * If false (default), renders as background-color swatches.
   */
  mode?: 'swatch' | 'text'; 
}

const Palette: React.FC<Props> = ({ selectedColor, onSelect, className = '', mode = 'swatch' }) => {
  return (
    <div className={`grid grid-cols-11 gap-1 ${className}`}>
        {SWATCH_COLORS.map(c => {
            const isSelected = selectedColor === c;
            
            // Render logic
            if (mode === 'text') {
                // Tailwind mapping for text colors requires full safelist or inline styles.
                // Since SWATCH_COLORS are names like 'red', 'blue', we rely on tailwind classes.
                // However, for a generic palette used in text editor, we might need hex codes 
                // OR we accept that 'onSelect' will pass the name, and the parent handles the hex conversion.
                // NOTE: TipTap @extension-color expects HEX codes usually. 
                // We'll define a quick map here for the editor or use a utility.
                // For now, let's keep it abstract: we pass the ID.
                return (
                    <button
                        key={c}
                        onClick={() => onSelect(c)}
                        className={`
                            w-6 h-6 rounded flex items-center justify-center transition-all
                            hover:bg-base-100
                            ${isSelected ? 'ring-1 ring-base-100 bg-base-300' : ''}
                        `}
                        title={c}
                    >
                        <div className={`w-4 h-4 rounded-full ${SOLID_BG_MAP[c] || 'bg-base-300'}`}></div>
                    </button>
                );
            }

            // Default Swatch Mode (Backgrounds)
            return (
                <button
                    key={c}
                    onClick={() => onSelect(c)}
                    className={`
                        w-full aspect-square rounded-md transition-all flex items-center justify-center
                        ${SOLID_BG_MAP[c] || 'bg-base-300'} hover:opacity-80
                        ${isSelected ? 'ring-2 ring-base-100 ring-offset-1 ring-offset-base-100 scale-110 z-10' : 'opacity-60 hover:opacity-100'}
                    `}
                    title={c}
                >
                    {isSelected && <Check size={12} className="text-white drop-shadow-md" />}
                </button>
            );
        })}
        
        {/* Reset / Default Option (Mainly for text editor to remove color) */}
        {mode === 'text' && (
            <button
                onClick={() => onSelect('default')}
                className="col-span-11 mt-2 text-[10px] text-base-content hover:text-white border border-base-100 rounded py-1 transition-colors"
            >
                Reset Color
            </button>
        )}
    </div>
  );
};

export default Palette;
