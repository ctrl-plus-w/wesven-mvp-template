---
name: drag-and-drop
description: Drag and drop (DnD) cookbook and reference guide using @dnd-kit. Use this skill when asked to implement, update, or debug drag-and-drop features, sortable lists, draggable tables, or reorderable trees. Contains exact patterns, component locations, styling conventions, and step-by-step checklists.
---

# Drag & Drop Cookbook (DnD Kit)

This cookbook documents the three drag-and-drop patterns used in the codebase. Follow these patterns when implementing new DnD features.

---

## Packages & Imports

Installed versions:

| Package              | Version |
| -------------------- | ------- |
| `@dnd-kit/core`      | ^6.3.1  |
| `@dnd-kit/modifiers` | ^9.0.0  |
| `@dnd-kit/sortable`  | ^10.0.0 |
| `@dnd-kit/utilities` | ^3.2.2  |

### Common imports by role

**Container** (the component that wraps sortable items):

```ts
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  MeasuringStrategy,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
```

**Sortable item** (each draggable row/card):

```ts
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
```

**Drag handle icon** (used in all patterns):

```ts
// Use any grip/dots icon from your preferred icon library.
// For example, with lucide-react:
import { GripVertical } from "lucide-react";
```

---

## Pattern 1: Simple Sortable Table

**Use when:** You have a flat list of entities displayed in a `<Table>` that users can reorder, with order changes persisted to the server.

### Key files

| File                                             | Role                                                                                   |
| ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `src/components/elements/sortable-table.tsx`     | Reusable container: wraps DndContext + SortableContext around a `<table>`              |
| `src/components/elements/sortable-table-row.tsx` | Reusable row: calls `useSortable`, renders drag handle + cells                         |
| `src/hooks/use-sortable-table.tsx`               | Reusable hook: manages local state, handles `arrayMove`, computes diff, calls mutation |
| `src/utils/array.client.ts`                      | `DiffResult` type and `diffHelper` factory for diffing prev/next arrays                |

### Consumers (examples to follow)

| File                                                                                | Entity               |
| ----------------------------------------------------------------------------------- | -------------------- |
| `src/components/features/catalog/products/sortable-products-table.tsx`              | Products             |
| `src/components/features/rules/price-rules/sortable-price-rule-modifiers-table.tsx` | Price rule modifiers |

### Step-by-step

#### 1. Define your diff function

The `diffHelper` factory from `src/utils/array.client.ts` takes two comparators and returns a diff function:

```ts
import { diffHelper } from "@/util/array.client";

// diffHelper(areIdsEqual, areValuesEqual) => (prev, next) => DiffResult
const diffMyEntities = diffHelper<MyEntity>(
  (a, b) => a.id === b.id, // identity check
  (a, b) => a.order === b.order, // equality check (fields that matter for update)
);
```

If your entity has more complex equality (like `diffProducts`), create a dedicated function in a `*.client.ts` utility file.

#### 2. Define your mutation

Create a React Query `useMutation` that receives a `DiffResult` and persists changes:

```ts
const { mutate } = useMutation({
  mutationFn: async ({ updated }: DiffResult<MyEntity>) => {
    for (const item of updated) {
      await unwrapServerAction(upsertMyEntity(item));
    }
  },
  onError: onErrorToast,
  onSettled: () =>
    queryClient.invalidateQueries({
      predicate: (q) => q.queryKey.includes("my-entities"),
    }),
});
```

#### 3. Call `useSortableTable`

```ts
import useSortableTable from "@/hook/use-sortable-table";

const table = useSortableTable({
  data: myEntities, // TData[] from your query
  columns: myColumns, // TanStack Table column defs
  getCoreRowModel: getCoreRowModel(),
  getId: (entity) => entity.id, // unique string id extractor
  getDiff: diffMyEntities, // from step 1
  mutate: mutate, // from step 2
});
```

The hook internally:

- Maintains a local `items` state synced with `data` via `useEffect`
- Creates a TanStack `useReactTable` instance
- Provides a `handleDragEnd` that calls `arrayMove`, recomputes `order` fields, diffs, and calls `mutate`

#### 4. Render `<SortableTable>`

```tsx
import SortableTable from "@/element/sortable-table";

return <SortableTable {...table} />;
```

`SortableTable` renders:

- `<DndContext>` with `closestCenter`, `MeasuringStrategy.Always`, vertical+parent modifiers
- `<SortableContext>` with `verticalListSortingStrategy`
- A `<table>` with a drag-handle column header + `<SortableTableRow>` per row
- An outline on the table (`data-active`) while dragging (styled in `globals.css`)

Optional props:

- `getRowHref?: (row) => string` — makes rows clickable (navigates on click)

#### How `SortableTableRow` works

Each row calls `useSortable({ id })` and applies:

- `CSS.Translate.toString(transform)` for drag transform
- `transition` for animation
- `opacity: 0.5` when `isDragging`
- A grip/dots icon as the drag handle with `{...attributes} {...listeners}`

---

## Pattern 2: Form-local Sortable List

**Use when:** You have a list of items inside a `react-hook-form` that users can reorder. Order changes update form state only — no server call on drag.

### Key files

| File                                                                       | Role                                                                  |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/components/features/rules/price-rules/upsert-price-rule-dialog.tsx`   | Container: DndContext inside a form dialog                            |
| `src/components/features/rules/price-rules/upsert-price-rule-modifier.tsx` | Sortable item: calls `useSortable`, renders drag handle + form fields |

### Step-by-step

#### 1. Set up state and handlers in the form component

```tsx
const [activeId, setActiveId] = useState<UniqueIdentifier | undefined>(
  undefined,
);

const modifiers = watch("myFieldArray"); // watch the array field

const handleDragStart = (event: DragStartEvent) => {
  if (!event.active) return;
  setActiveId(event.active.id);
};

const handleDragEnd = ({ over }: DragEndEvent) => {
  if (over) {
    const overIndex = modifiers.findIndex(({ id }) => id === over.id);
    const activeIndex = modifiers.findIndex(({ id }) => id === activeId);
    const next = arrayMove(modifiers, activeIndex, overIndex).map(
      (item, order) => ({ ...item, order }),
    );
    setValue("myFieldArray", next); // update form state, no server call
  }
  setActiveId(undefined);
};
```

#### 2. Wrap items in DndContext + SortableContext

```tsx
<DndContext
  measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
  modifiers={[restrictToVerticalAxis, restrictToParentElement]}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  <SortableContext strategy={verticalListSortingStrategy} items={modifiers}>
    <div
      className={cn(
        "flex flex-col gap-6 overflow-hidden rounded-md",
        activeId && "outline outline-offset-2 outline-blue-300",
      )}
    >
      {modifiers.map((modifier) => (
        <MySortableItem id={modifier.id} key={modifier.id} />
      ))}
    </div>
  </SortableContext>
</DndContext>
```

#### 3. Create the sortable item component

Each item uses `useFormContext` to access form state and `useSortable` for drag:

```tsx
const MySortableItem = ({ id }: { id: string }) => {
  const { watch, setValue, getValues } = useFormContext<MyFormSchema>();

  const items = watch("myFieldArray");
  const index = items.findIndex((m) => m.id === id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-50")}>
      <button type="button" {...attributes} {...listeners}>
        <GripVertical /> {/* or any grip/dots icon */}
      </button>
      {/* form fields using index-based paths like `myFieldArray.${index}.value` */}
    </div>
  );
};
```

### Key differences from Pattern 1

| Aspect             | Pattern 1                                | Pattern 2                                      |
| ------------------ | ---------------------------------------- | ---------------------------------------------- |
| State management   | `useSortableTable` hook with local state | `react-hook-form` `setValue`                   |
| Server persistence | Immediate via mutation on drag end       | Deferred — saved when form submits             |
| Diff computation   | `diffHelper` computes `DiffResult`       | Not needed                                     |
| Outline feedback   | On `<table>` via `data-active` attr      | On wrapper `<div>` via conditional `className` |
| Drag styling       | `opacity: 0.5`                           | `z-50` (raise above siblings)                  |

---

## Pattern 3: Sortable Tree

**Use when:** You have a nested parent-child hierarchy (like categories) where users can both reorder items AND change their depth (parent) by dragging horizontally.

### Key files

| File                                                              | Role                                                                                                                                            |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/features/catalog/categories/categories-table.tsx` | Container: DndContext with `onDragMove` for depth tracking, tree transform logic                                                                |
| `src/components/features/catalog/categories/category-row.tsx`     | Sortable item: uses `setDraggableNodeRef`/`setDroppableNodeRef` separately                                                                      |
| `src/utils/categories.ts`                                         | Tree utilities: `asTree`, `flattenEnhancedTree`, `getFlattenTreeParent`, `isFlattenTreeDescendant`, `fixFlattenTreeMaxDepth`, `flattenTreeDiff` |
| `src/utils/math.ts`                                               | `clamp(value, min, max)`                                                                                                                        |
| `src/constants/tree.ts`                                           | `MAX_DEPTH = 2` (0-indexed)                                                                                                                     |

### Data model

Categories are stored flat with:

- `id` — unique identifier
- `categoryId` — parent category id (`null` for root)
- `order` — position among siblings
- `depth` — computed nesting level (added by `flattenEnhancedTree`)

The tree structure type:

```ts
type CategoriesTree = {
  item: CategoryWithProductsCount;
  children: CategoriesTree;
}[];

type CategoryTreeItem = CategoryWithProductsCount & { depth: number };
```

### Tree utility functions

| Function                                              | Purpose                                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `asTree(categories, parentId?, sort?)`                | Convert flat list to nested tree                                             |
| `flattenEnhancedTree(tree, inferOrder?, depth?)`      | Flatten tree back to flat list with `depth` field                            |
| `getFlattenTreeParent(flatTree, index)`               | Find the parent node for a given index by scanning backwards for `depth - 1` |
| `isFlattenTreeDescendant(flatTree, parentId, itemId)` | Check if `itemId` is a descendant of `parentId`                              |
| `fixFlattenTreeMaxDepth(flatTree, maxDepth)`          | Clamp all nodes to `maxDepth`, reassigning `categoryId` as needed            |
| `flattenTreeDiff(prev, next)`                         | Diff two flat category lists using `diffHelper` with `isShallowEq`           |

### Step-by-step

#### 1. Page setup — convert flat data to tree items

In the page component (`categories-page.tsx`):

```tsx
const { data: categories } = useGetCategories();
const [items, setItems] = useState<CategoryTreeItem[]>(
  flattenEnhancedTree(asTree(categories ?? [], null, true)),
);

useEffect(() => {
  setItems(flattenEnhancedTree(asTree(categories ?? [], null, true)));
}, [categories]);
```

Pass `items` and `setItems` to the table component.

#### 2. Container — DndContext with `onDragMove`

Unlike patterns 1 and 2, the tree pattern uses `onDragMove` to track horizontal offset:

```tsx
const [activeId, setActiveId] = useState<UniqueIdentifier | undefined>(
  undefined,
);
const [overId, setOverId] = useState<UniqueIdentifier | undefined>(undefined);
const [offsetLeft, setOffsetLeft] = useState<number | undefined>(undefined);
const offsetSizeRef = useRef<HTMLTableCellElement>(null);

// Convert pixel offset to depth delta
const activeDepth = useMemo(() => {
  if (!offsetSizeRef.current || offsetLeft === undefined) return undefined;
  const { width } = offsetSizeRef.current.getBoundingClientRect();
  return Math.round(offsetLeft / width);
}, [offsetLeft]);

const handleDragMove = (event: DragMoveEvent) => {
  setOffsetLeft(event.delta.x);
  setOverId(event.over?.id ?? undefined);
};
```

The `offsetSizeRef` is attached to the first header cell — its width defines one "depth unit" in pixels.

#### 3. Depth calculation — `getDepth`

The `getDepth` function determines the new depth for any item during drag. It uses:

- `activeDepth` (horizontal offset converted to depth delta)
- `overId` (which item is being hovered)
- `clamp(depth, min, max)` to enforce valid depth ranges

Rules:

- First item in tree must be depth 0
- A node's depth can be at most `prevItem.depth + 1`
- A node's depth cannot exceed `MAX_DEPTH`
- If item stays in place (same position), depth changes are constrained by prev/next siblings

See the full implementation in `categories-table.tsx` lines 89–142 for the complete logic.

#### 4. Drag end — reorder + reparent + persist

```tsx
const handleDragEnd = ({ over }: DragEndEvent) => {
  if (over) {
    const overIndex = items.findIndex(({ id }) => id === over.id);
    const activeIndex = items.findIndex(({ id }) => id === activeId);

    setItems((items) => {
      // 1. Apply depth to the active item, then move it
      const copy = arrayMove(
        items.map((item, i) =>
          i === activeIndex ? { ...item, depth: getDepth(item, i) } : item,
        ),
        activeIndex,
        overIndex,
      );

      // 2. Reassign parent based on new position
      const newParent = getFlattenTreeParent(copy, overIndex);
      copy[overIndex].categoryId = newParent?.id ?? null;

      // 3. Rebuild tree and fix any depth violations
      const next = fixFlattenTreeMaxDepth(
        flattenEnhancedTree(asTree(copy), true),
        MAX_DEPTH,
      );

      // 4. Diff and persist
      void mutate(flattenTreeDiff(items, next));

      return next;
    });
  }

  setActiveId(undefined);
  setOffsetLeft(undefined);
};
```

#### 5. Hide descendants during drag

While dragging a parent, hide its descendants so the tree looks collapsed:

```tsx
{
  items.map((row, i) => {
    const show =
      !activeId ||
      typeof activeId !== "string" ||
      !isFlattenTreeDescendant(items, activeId, row.id);

    if (!show) return <></>;
    return (
      <CategoryRow
        key={row.id}
        category={{ ...row, depth: getDepth(row, i) }}
      />
    );
  });
}
```

#### 6. DragOverlay

Render a floating card showing the dragged item's name:

```tsx
<DragOverlay>
  {activeId && (
    <div className="w-fit rounded-md border bg-white p-3 shadow-md">
      <div className="flex w-fit items-center justify-center">
        <GripVertical /> {/* or any grip/dots icon */}
        <span className="whitespace-nowrap">
          {items.find(({ id }) => id === activeId)?.name ?? "?"}
        </span>
      </div>
    </div>
  )}
</DragOverlay>
```

#### 7. Sortable row — separate draggable/droppable refs

Unlike patterns 1 and 2, the tree row uses `setDraggableNodeRef` and `setDroppableNodeRef` separately:

```tsx
const {
  attributes,
  listeners,
  setDraggableNodeRef,
  setDroppableNodeRef,
  transform,
  transition,
} = useSortable({ id: category.id });

const style = {
  transform: CSS.Transform.toString(transform), // note: CSS.Transform, not CSS.Translate
  transition,
};

return (
  <tr ref={setDroppableNodeRef} style={style}>
    {/* Render depth offset cells, then the drag handle cell */}
    {new Array(depth + 1).fill(0).map((_, j) =>
      depth === j ? (
        <td key={j} ref={setDraggableNodeRef} {...attributes} {...listeners}>
          <GripVertical /> {/* or any grip/dots icon */}
        </td>
      ) : (
        <td key={j} ref={setDraggableNodeRef} />
      ),
    )}
    {/* Content cell spans remaining columns */}
    <td colSpan={maxDepth + 1 - depth}>{/* category name + avatar */}</td>
  </tr>
);
```

### Key differences from Pattern 1

| Aspect                | Pattern 1                                            | Pattern 3                                              |
| --------------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| `onDragMove`          | Not used                                             | Tracks `event.delta.x` for depth                       |
| `DragOverlay`         | Not used                                             | Floating card with item name                           |
| Node refs             | Single `setNodeRef`                                  | Separate `setDraggableNodeRef` + `setDroppableNodeRef` |
| CSS transform         | `CSS.Translate`                                      | `CSS.Transform`                                        |
| Drag modifiers        | `restrictToVerticalAxis` + `restrictToParentElement` | None (horizontal movement needed for depth)            |
| Descendant visibility | N/A                                                  | Hidden via `isFlattenTreeDescendant`                   |
| State management      | `useSortableTable` hook                              | Direct `setItems` with tree rebuild                    |

---

## Common Configuration

All three patterns share these DndContext settings:

```tsx
<DndContext
  measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
  collisionDetection={closestCenter}
  // ...handlers
>
  <SortableContext strategy={verticalListSortingStrategy} items={items}>
    {/* ... */}
  </SortableContext>
</DndContext>
```

- **`MeasuringStrategy.Always`** — re-measures droppable areas on every render
- **`closestCenter`** — determines which droppable the dragged item is closest to
- **`verticalListSortingStrategy`** — optimizes for vertical list reordering

### Modifiers

| Pattern                  | Modifiers                                              |
| ------------------------ | ------------------------------------------------------ |
| Pattern 1 (Simple Table) | `[restrictToVerticalAxis, restrictToParentElement]`    |
| Pattern 2 (Form List)    | `[restrictToVerticalAxis, restrictToParentElement]`    |
| Pattern 3 (Tree)         | None — horizontal movement is needed for depth changes |

---

## Reorder Logic & Persistence

### `arrayMove`

All patterns use `arrayMove` from `@dnd-kit/sortable` to reorder the array:

```ts
const next = arrayMove(items, activeIndex, overIndex).map((item, order) => ({
  ...item,
  order,
}));
```

Always `.map()` afterwards to reassign `order` values (0-indexed).

### `diffHelper` and `DiffResult`

For server persistence (patterns 1 and 3), diff the previous and next arrays:

```ts
type DiffResult<TPrev, TNext = TPrev> = {
  added: TNext[];
  updated: (TNext & TPrev)[];
  removed: TPrev[];
  notUpdated: (TPrev & TNext)[];
};

const diff = diffHelper<MyEntity>(
  (a, b) => a.id === b.id, // are same entity?
  (a, b) => a.order === b.order, // are values equal?
);
```

For tree operations, use `flattenTreeDiff` from `src/utils/categories.ts` which uses `isShallowEq` (compares `categoryId`, `name`, `order`, `image`).

### Mutation patterns

- **Pattern 1:** `mutate` is called inside `useSortableTable`'s `handleDragEnd` via the `mutate` callback
- **Pattern 2:** No mutation on drag — form state is updated, mutation happens on form submit
- **Pattern 3:** `mutate` is called directly in the component's `handleDragEnd` after tree rebuild

---

## Styling Conventions

### Drag handle

Always use a grip/dots icon (e.g. `GripVertical` from lucide-react) as the drag handle:

```tsx
<td
  className="!w-[1px] cursor-pointer align-middle hover:text-blue-600"
  {...attributes}
  {...listeners}
>
  <GripVertical /> {/* or any grip/dots icon */}
</td>
```

Or as a `<button>` in non-table layouts:

```tsx
<button type="button" {...attributes} {...listeners}>
  <GripVertical /> {/* or any grip/dots icon */}
</button>
```

### Drag feedback

| Style                       | Where                                        | Code                                                  |
| --------------------------- | -------------------------------------------- | ----------------------------------------------------- |
| Opacity 0.5 on dragging row | Pattern 1 (`sortable-table-row.tsx`)         | `opacity: isDragging ? 0.5 : 1` in style              |
| Opacity 0.5 via className   | Pattern 3 (`categories-table.tsx`)           | `className={cn(row.id === activeId && 'opacity-50')}` |
| z-50 on dragging item       | Pattern 2 (`upsert-price-rule-modifier.tsx`) | `className={cn(isDragging && 'z-50')}`                |

### Container outline while dragging

- **Pattern 1:** Applied via CSS on `<table data-active={!!activeId}>` in `globals.css`:
  ```css
  .sortable-table[data-active="true"] {
    @apply outline outline-offset-2 outline-blue-300 rounded-md;
  }
  ```
- **Pattern 2:** Applied via conditional className on wrapper `<div>`:
  ```tsx
  className={cn('rounded-md', activeId && 'outline outline-offset-2 outline-blue-300')}
  ```
- **Pattern 3:** No container outline

---

## Checklist

Use this checklist when implementing a new DnD feature:

### Choose your pattern

- [ ] **Flat list in a table with server persistence?** -> Pattern 1 (Simple Sortable Table)
- [ ] **List inside a form, no server call on drag?** -> Pattern 2 (Form-local Sortable List)
- [ ] **Nested tree with depth changes?** -> Pattern 3 (Sortable Tree)

### Pattern 1 checklist

- [ ] Create a diff function using `diffHelper` from `@/util/array.client`
- [ ] Create a mutation with `useMutation` that handles `DiffResult`
- [ ] Call `useSortableTable` with `data`, `columns`, `getId`, `getDiff`, `mutate`
- [ ] Render `<SortableTable {...table} />`
- [ ] Entities must have `id: UniqueIdentifier` and `order: number` fields

### Pattern 2 checklist

- [ ] Add `activeId` state to the form component
- [ ] Implement `handleDragStart` and `handleDragEnd` using `setValue` from react-hook-form
- [ ] Wrap items in `<DndContext>` + `<SortableContext>` with standard modifiers
- [ ] Create sortable item component using `useSortable` + `useFormContext`
- [ ] Each item needs a stable unique `id` field
- [ ] Add outline feedback on the wrapping container while dragging

### Pattern 3 checklist

- [ ] Convert flat data to tree items: `flattenEnhancedTree(asTree(data, null, true))`
- [ ] Manage `activeId`, `overId`, `offsetLeft` state
- [ ] Use `offsetSizeRef` on header cell to calculate depth from pixel offset
- [ ] Implement `getDepth` with `clamp` and sibling depth constraints
- [ ] In `handleDragEnd`: apply depth, `arrayMove`, `getFlattenTreeParent`, `fixFlattenTreeMaxDepth`, rebuild tree, diff, mutate
- [ ] Hide descendants during drag with `isFlattenTreeDescendant`
- [ ] Add `<DragOverlay>` with floating card
- [ ] Use separate `setDraggableNodeRef`/`setDroppableNodeRef` in row component
- [ ] Do NOT use `restrictToVerticalAxis` modifier (horizontal movement needed)

```

```
