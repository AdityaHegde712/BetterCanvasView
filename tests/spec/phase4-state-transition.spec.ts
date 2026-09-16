/**
 * @fileoverview Locks local-state continuity after a record collision disappears.
 */

import { describe, expect, it } from "vitest";

import { getItemState } from "../../src/dashboard/item-state-keys";
import type { ItemState } from "../../src/domain/models";

describe("Phase 4 item-state transitions", () => {
  it("retains a typed announcement state after its collision disappears", () => {
    const recordId = "101:401";
    const typedState: ItemState = {
      hidden: true,
      id: `announcement:${recordId}`,
      note: "",
    };

    expect(
      getItemState(
        new Map([[typedState.id, typedState]]),
        "announcement",
        recordId,
        new Set(),
      ),
    ).toEqual(typedState);
  });
});
