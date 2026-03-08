/**
 * Drag and drop hook for node reordering.
 *
 * @example
 *   const { dragOver, handlers } = useDragDrop(node, moveNode);
 *
 * @consumers components/NodeItem
 * @depends nothing
 */

import type { Node } from '@cherrytree/shared';
import { useCallback, useState } from 'react';

export type DropPosition = 'above' | 'below' | 'child' | null;

export function useDragDrop(
  node: Node,
  moveNode: (id: string, parentId: string | null, position: number) => void,
) {
  const [dragOver, setDragOver] = useState<DropPosition>(null);

  const onDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/plain', node.id);
      e.dataTransfer.effectAllowed = 'move';
    },
    [node.id],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const third = rect.height / 3;
    if (y < third) setDragOver('above');
    else if (y > third * 2) setDragOver('below');
    else setDragOver('child');
  }, []);

  const onDragLeave = useCallback(() => setDragOver(null), []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const draggedId = e.dataTransfer.getData('text/plain');
      if (!draggedId || draggedId === node.id) {
        setDragOver(null);
        return;
      }
      if (dragOver === 'above') {
        moveNode(draggedId, node.parentId, node.position);
      } else if (dragOver === 'below') {
        moveNode(draggedId, node.parentId, node.position + 1);
      } else if (dragOver === 'child') {
        moveNode(draggedId, node.id, 0);
      }
      setDragOver(null);
    },
    [node, dragOver, moveNode],
  );

  return {
    dragOver,
    handlers: { onDragStart, onDragOver, onDragLeave, onDrop },
  };
}
