import { describe, it, expect } from "vitest";
import {
  reconcileItems,
  ExistingItem,
  EditableItem,
  ReconciliationResult,
} from "./item-reconciliation";

describe("reconcileItems", () => {
  it("classifies items with matching ids as toUpdate", () => {
    const existing: ExistingItem[] = [
      { id: "1", label: "Doc A", description: null, required: true, sort_order: 0 },
      { id: "2", label: "Doc B", description: "desc", required: false, sort_order: 1 },
    ];
    const current: EditableItem[] = [
      { id: "1", label: "Doc A Updated", description: "new desc", required: false },
      { id: "2", label: "Doc B Updated", description: "", required: true },
    ];

    const result = reconcileItems(existing, current);

    expect(result.toUpdate).toHaveLength(2);
    expect(result.toInsert).toHaveLength(0);
    expect(result.toDelete).toHaveLength(0);
    expect(result.toUpdate[0]).toEqual({
      id: "1",
      label: "Doc A Updated",
      description: "new desc",
      required: false,
      sort_order: 0,
    });
    expect(result.toUpdate[1]).toEqual({
      id: "2",
      label: "Doc B Updated",
      description: null,
      required: true,
      sort_order: 1,
    });
  });

  it("classifies items without id as toInsert", () => {
    const existing: ExistingItem[] = [
      { id: "1", label: "Doc A", description: null, required: true, sort_order: 0 },
    ];
    const current: EditableItem[] = [
      { id: "1", label: "Doc A", description: "", required: true },
      { label: "New Doc", description: "brand new", required: false, isNew: true },
    ];

    const result = reconcileItems(existing, current);

    expect(result.toUpdate).toHaveLength(1);
    expect(result.toInsert).toHaveLength(1);
    expect(result.toDelete).toHaveLength(0);
    expect(result.toInsert[0]).toEqual({
      label: "New Doc",
      description: "brand new",
      required: false,
      sort_order: 1,
    });
  });

  it("classifies missing existing ids as toDelete", () => {
    const existing: ExistingItem[] = [
      { id: "1", label: "Doc A", description: null, required: true, sort_order: 0 },
      { id: "2", label: "Doc B", description: null, required: false, sort_order: 1 },
      { id: "3", label: "Doc C", description: null, required: true, sort_order: 2 },
    ];
    const current: EditableItem[] = [
      { id: "1", label: "Doc A", description: "", required: true },
    ];

    const result = reconcileItems(existing, current);

    expect(result.toUpdate).toHaveLength(1);
    expect(result.toInsert).toHaveLength(0);
    expect(result.toDelete).toHaveLength(2);
    expect(result.toDelete).toEqual([{ id: "2" }, { id: "3" }]);
  });

  it("handles a mix of updates, inserts, and deletes", () => {
    const existing: ExistingItem[] = [
      { id: "a", label: "Keep", description: null, required: true, sort_order: 0 },
      { id: "b", label: "Remove", description: null, required: false, sort_order: 1 },
      { id: "c", label: "Also Keep", description: "old", required: true, sort_order: 2 },
    ];
    const current: EditableItem[] = [
      { id: "c", label: "Also Keep Modified", description: "new", required: false },
      { label: "Brand New", description: "", required: true, isNew: true },
      { id: "a", label: "Keep Modified", description: "", required: true },
    ];

    const result = reconcileItems(existing, current);

    expect(result.toUpdate).toHaveLength(2);
    expect(result.toInsert).toHaveLength(1);
    expect(result.toDelete).toHaveLength(1);

    // sort_order reflects position in current array
    expect(result.toUpdate[0]).toEqual({
      id: "c",
      label: "Also Keep Modified",
      description: "new",
      required: false,
      sort_order: 0,
    });
    expect(result.toUpdate[1]).toEqual({
      id: "a",
      label: "Keep Modified",
      description: null,
      required: true,
      sort_order: 2,
    });
    expect(result.toInsert[0]).toEqual({
      label: "Brand New",
      description: null,
      required: true,
      sort_order: 1,
    });
    expect(result.toDelete[0]).toEqual({ id: "b" });
  });

  it("handles empty existing items (all inserts)", () => {
    const existing: ExistingItem[] = [];
    const current: EditableItem[] = [
      { label: "New A", description: "desc", required: true },
      { label: "New B", description: "", required: false },
    ];

    const result = reconcileItems(existing, current);

    expect(result.toUpdate).toHaveLength(0);
    expect(result.toInsert).toHaveLength(2);
    expect(result.toDelete).toHaveLength(0);
  });

  it("handles empty current items (all deletes)", () => {
    const existing: ExistingItem[] = [
      { id: "1", label: "Doc A", description: null, required: true, sort_order: 0 },
      { id: "2", label: "Doc B", description: null, required: false, sort_order: 1 },
    ];
    const current: EditableItem[] = [];

    const result = reconcileItems(existing, current);

    expect(result.toUpdate).toHaveLength(0);
    expect(result.toInsert).toHaveLength(0);
    expect(result.toDelete).toHaveLength(2);
  });

  it("handles both lists empty", () => {
    const result = reconcileItems([], []);

    expect(result.toUpdate).toHaveLength(0);
    expect(result.toInsert).toHaveLength(0);
    expect(result.toDelete).toHaveLength(0);
  });

  it("converts empty description string to null", () => {
    const existing: ExistingItem[] = [
      { id: "1", label: "Doc", description: "old desc", required: true, sort_order: 0 },
    ];
    const current: EditableItem[] = [
      { id: "1", label: "Doc", description: "", required: true },
    ];

    const result = reconcileItems(existing, current);

    expect(result.toUpdate[0].description).toBeNull();
  });

  it("ensures no duplicates across categories", () => {
    const existing: ExistingItem[] = [
      { id: "1", label: "A", description: null, required: true, sort_order: 0 },
      { id: "2", label: "B", description: null, required: false, sort_order: 1 },
    ];
    const current: EditableItem[] = [
      { id: "1", label: "A modified", description: "", required: true },
      { label: "C", description: "", required: true, isNew: true },
    ];

    const result = reconcileItems(existing, current);

    const updateIds = result.toUpdate.map((i) => i.id);
    const deleteIds = result.toDelete.map((i) => i.id);

    // No id should appear in both update and delete
    const overlap = updateIds.filter((id) => deleteIds.includes(id));
    expect(overlap).toHaveLength(0);
  });
});
