import { Accordion } from '@/components/ui/accordion';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { LayerParams, PatternState } from '../types';
import { MAX_LAYERS, MIN_LAYERS } from '../state';
import { LayerPanel } from './LayerPanel';

interface SortableLayerProps {
  layer: LayerParams;
  index: number;
  canDuplicate: boolean;
  canRemove: boolean;
  onUpdate: (patch: Partial<LayerParams>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function SortableLayer({
  layer,
  index,
  canDuplicate,
  canRemove,
  onUpdate,
  onDuplicate,
  onRemove,
}: SortableLayerProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: `layer-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <LayerPanel
        layer={layer}
        index={index}
        canDuplicate={canDuplicate}
        canRemove={canRemove}
        dragHandleProps={{ ...attributes, ...listeners }}
        onUpdate={onUpdate}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
      />
    </div>
  );
}

interface LayerAccordionProps {
  state: PatternState;
  onUpdateLayer: (index: number, patch: Partial<LayerParams>) => void;
  onDuplicateLayer: (index: number) => void;
  onRemoveLayer: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export function LayerAccordion({
  state,
  onUpdateLayer,
  onDuplicateLayer,
  onRemoveLayer,
  onReorder,
}: LayerAccordionProps) {
  const sensors = useSensors(useSensor(PointerSensor));
  const ids = state.layers.map((_, i) => `layer-${i}`);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const fromIndex = ids.indexOf(String(active.id));
    const toIndex = ids.indexOf(String(over.id));
    if (fromIndex !== -1 && toIndex !== -1) {
      onReorder(fromIndex, toIndex);
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <Accordion multiple>
          {state.layers.map((layer, index) => (
            <SortableLayer
              key={ids[index]}
              layer={layer}
              index={index}
              canDuplicate={state.layers.length < MAX_LAYERS}
              canRemove={state.layers.length > MIN_LAYERS}
              onUpdate={(patch) => onUpdateLayer(index, patch)}
              onDuplicate={() => onDuplicateLayer(index)}
              onRemove={() => onRemoveLayer(index)}
            />
          ))}
        </Accordion>
      </SortableContext>
    </DndContext>
  );
}
