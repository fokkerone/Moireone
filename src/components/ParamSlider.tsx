import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ParamSliderProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

export function ParamSlider({ label, min, max, step, value, onChange }: ParamSliderProps) {
  function clamp(next: number): number {
    return Math.min(max, Math.max(min, next));
  }

  return (
    <div className="mb-2 flex items-center gap-2">
      <Label className="w-32 shrink-0 text-xs">{label}</Label>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(next) => {
          const nextValue = Array.isArray(next) ? next[0] : next;
          onChange(clamp(nextValue));
        }}
        className="flex-1"
      />
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (!Number.isNaN(next)) {
            onChange(clamp(next));
          }
        }}
        className="w-20 shrink-0 text-xs"
      />
    </div>
  );
}
