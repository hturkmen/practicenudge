/**
 * Chainable stand-in for the Supabase query builder, for tests. Every query is recorded as an `Op`
 * and answered by the resolver the test supplies.
 */

export type DbError = { message: string; code?: string };

export type Op = {
  table: string;
  kind: "select" | "insert" | "update" | "delete";
  payload?: unknown;
  filters: Array<[string, ...unknown[]]>;
  single: boolean;
  /** `.select()` was chained after a write. */
  returning: boolean;
};

export type Reply = { data?: unknown; error?: DbError | null; count?: number | null };
export type Resolver = (op: Op) => Reply;

const FILTERS = ["eq", "neq", "gt", "gte", "lt", "lte", "in", "or", "not", "is", "order", "limit", "range"];

export function fakeSupabase(resolve: Resolver) {
  const ops: Op[] = [];

  function builder(table: string) {
    const op: Op = { table, kind: "select", filters: [], single: false, returning: false };
    let recorded = false;

    const exec = () => {
      if (!recorded) {
        recorded = true;
        ops.push(op);
      }
      const reply = resolve(op);
      let data = reply.data ?? null;
      let error = reply.error ?? null;
      if (op.single) {
        data = Array.isArray(data) ? (data[0] ?? null) : data;
      }
      return { data, error, count: reply.count ?? null };
    };

    const b: Record<string, unknown> = {
      select: () => {
        if (op.kind !== "select") op.returning = true;
        return b;
      },
      insert: (payload: unknown) => {
        op.kind = "insert";
        op.payload = payload;
        return b;
      },
      update: (payload: unknown) => {
        op.kind = "update";
        op.payload = payload;
        return b;
      },
      delete: () => {
        op.kind = "delete";
        return b;
      },
      single: () => {
        op.single = true;
        return Promise.resolve().then(exec);
      },
      maybeSingle: () => {
        op.single = true;
        return Promise.resolve().then(exec);
      },
      then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve().then(exec).then(onFulfilled, onRejected),
    };
    for (const name of FILTERS) {
      b[name] = (...args: unknown[]) => {
        op.filters.push([name, ...args]);
        return b;
      };
    }
    return b;
  }

  const client = { from: (table: string) => builder(table) };
  return { client, ops };
}

export const opsOf = (ops: Op[], table: string, kind: Op["kind"]) => ops.filter((o) => o.table === table && o.kind === kind);

export function hasFilter(op: Op, name: string, ...args: unknown[]): boolean {
  return op.filters.some((f) => f[0] === name && args.every((a, i) => f[i + 1] === a));
}
