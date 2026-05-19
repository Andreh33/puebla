"use client";

/**
 * ImageSortable — wrapper de @dnd-kit/sortable para reordenar imágenes.
 *
 * Maneja sólo la UI; el caller recibe el nuevo orden vía onChange y persiste.
 *
 * Usado por el editor de producto para reordenar ProductImage.
 */
import * as React from "react";
import Image from "next/image";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortableImage = {
  id: string;
  url: string;
  alt: string;
  isMain?: boolean;
};

export type ImageSortableProps = {
  images: SortableImage[];
  onChange: (next: SortableImage[]) => void;
  onDelete?: (id: string) => void;
  onSetMain?: (id: string) => void;
};

export function ImageSortable({
  images,
  onChange,
  onDelete,
  onSetMain,
}: ImageSortableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIx = images.findIndex((i) => i.id === active.id);
    const newIx = images.findIndex((i) => i.id === over.id);
    if (oldIx < 0 || newIx < 0) return;
    onChange(arrayMove(images, oldIx, newIx));
  };

  if (images.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zs-border p-6 text-center text-sm text-zs-muted">
        No hay imágenes todavía.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
        <ul
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
          aria-label="Imágenes (arrastra para reordenar)"
        >
          {images.map((img) => (
            <SortableItem
              key={img.id}
              image={img}
              onDelete={onDelete}
              onSetMain={onSetMain}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({
  image,
  onDelete,
  onSetMain,
}: {
  image: SortableImage;
  onDelete?: (id: string) => void;
  onSetMain?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-zs-border bg-white shadow-sm",
        isDragging && "ring-2 ring-zs-blue-700",
      )}
    >
      <div className="relative aspect-square">
        <Image
          src={image.url}
          alt={image.alt || "Imagen de producto"}
          fill
          sizes="200px"
          className="object-cover"
          unoptimized
        />
        {image.isMain && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
            <Star className="h-3 w-3" aria-hidden /> Principal
          </span>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-zs-border px-2 py-1.5">
        <button
          type="button"
          className="cursor-grab rounded p-1 text-zs-muted hover:bg-zs-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
          aria-label={`Mover imagen ${image.alt}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1">
          {onSetMain && !image.isMain && (
            <button
              type="button"
              onClick={() => onSetMain(image.id)}
              className="rounded p-1 text-zs-muted hover:bg-amber-50 hover:text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
              aria-label="Marcar como principal"
              title="Marcar como principal"
            >
              <Star className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(image.id)}
              className="rounded p-1 text-zs-muted hover:bg-zs-red-50 hover:text-zs-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zs-blue-700"
              aria-label="Eliminar imagen"
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
