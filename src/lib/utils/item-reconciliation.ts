/**
 * Item reconciliation utility for edit request form submission.
 * Compares existing items against the current edited list to determine
 * which items need to be updated, inserted, or deleted.
 *
 * Validates: Requirements 3.2, 3.3, 3.4
 */

export type ExistingItem = {
  id: string;
  label: string;
  description: string | null;
  required: boolean;
  sort_order: number;
  status?: string;
};

export type EditableItem = {
  id?: string;
  label: string;
  description: string;
  required: boolean;
  status?: string;
  isNew?: boolean;
};

export type ItemToUpdate = {
  id: string;
  label: string;
  description: string | null;
  required: boolean;
  sort_order: number;
};

export type ItemToInsert = {
  label: string;
  description: string | null;
  required: boolean;
  sort_order: number;
};

export type ItemToDelete = {
  id: string;
};

export type ReconciliationResult = {
  toUpdate: ItemToUpdate[];
  toInsert: ItemToInsert[];
  toDelete: ItemToDelete[];
};

/**
 * Reconciles existing items with the current edited items list.
 *
 * - Items with a matching id in both lists → toUpdate (with new values and sort_order)
 * - Items without an id (new items) → toInsert
 * - Existing items whose id is absent from the current list → toDelete
 */
export function reconcileItems(
  existingItems: ExistingItem[],
  currentItems: EditableItem[]
): ReconciliationResult {
  const existingIds = new Set(existingItems.map((item) => item.id));
  const currentIds = new Set(
    currentItems.filter((item) => item.id).map((item) => item.id!)
  );

  const toUpdate: ItemToUpdate[] = [];
  const toInsert: ItemToInsert[] = [];
  const toDelete: ItemToDelete[] = [];

  // Process current items: determine updates and inserts
  currentItems.forEach((item, index) => {
    if (item.id && existingIds.has(item.id)) {
      // Item exists in both lists → update
      toUpdate.push({
        id: item.id,
        label: item.label,
        description: item.description || null,
        required: item.required,
        sort_order: index,
      });
    } else {
      // Item has no id or id not in existing → insert
      toInsert.push({
        label: item.label,
        description: item.description || null,
        required: item.required,
        sort_order: index,
      });
    }
  });

  // Find deleted items: existing ids not present in current list
  existingItems.forEach((item) => {
    if (!currentIds.has(item.id)) {
      toDelete.push({ id: item.id });
    }
  });

  return { toUpdate, toInsert, toDelete };
}
