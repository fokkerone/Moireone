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

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="mb-2 flex items-center gap-2">
      <Label className="w-32 shrink-0 text-xs">{label}</Label>
      <div className="relative flex-1 pt-7">
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded bg-foreground px-2 py-0.5 text-xs font-semibold text-background tabular-nums"
          style={{ left: `${percentage}%` }}
        >
          {value}
          <div className="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-foreground" />
        </div>
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={(next) => {
            const nextValue = Array.isArray(next) ? next[0] : next;
            onChange(clamp(nextValue));
          }}
        />
      </div>
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
