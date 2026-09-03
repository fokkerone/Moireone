import { Button } from '@/components/ui/button';
import { ParamSlider } from './ParamSlider';
import { loadReferenceImage } from '../widthImageLoader';
import type { LayerParams } from '../types';

interface WidthImageControlsProps {
  layer: LayerParams;
  onUpdate: (patch: Partial<LayerParams>) => void;
}

export function WidthImageControls({ layer, onUpdate }: WidthImageControlsProps) {
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const result = await loadReferenceImage(file);
      onUpdate({ widthImageData: result, widthImageEnabled: true });
    } catch {
      // Rejected file (not an image, or decode failure): leave existing state untouched.
    }
  };

  return (
    <div className="mb-2">
      <div className="mb-2 flex items-center gap-2">
        <label className="w-32 shrink-0 text-xs">Referenzbild</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="text-xs"
        />
        {layer.widthImageData && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onUpdate({ widthImageData: null, widthImageEnabled: false })}
          >
            Bild entfernen
          </Button>
        )}
      </div>
      {layer.widthImageData && (
        <>
          <div className="mb-2 flex gap-1">
            <Button
              size="sm"
              variant={layer.widthImageInvert ? 'default' : 'outline'}
              onClick={() => onUpdate({ widthImageInvert: !layer.widthImageInvert })}
            >
              Invertieren
            </Button>
          </div>
          <ParamSlider
            label="Bild-Stärke"
            min={0}
            max={1}
            step={0.01}
            value={layer.widthImageStrength}
            onChange={(v) => onUpdate({ widthImageStrength: v })}
          />
        </>
      )}
    </div>
  );
}
