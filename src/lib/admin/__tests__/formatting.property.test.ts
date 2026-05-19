import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { formatActivityTimestamp, getRelatedEntity } from "@/lib/admin/metrics";
import { MemberActionType } from "@/lib/types/admin";

/**
 * Property 18: Activity log entry formatting
 *
 * For any activity log entry, the formatted output SHALL include:
 * - action type
 * - description truncated to 200 characters
 * - timestamp in "DD MMM YYYY, HH:mm" format
 * - the correct related entity:
 *   - client name for client_added/client_updated
 *   - request ID for document_request_sent/document_request_completed
 *   - null for login/settings_changed
 *
 * Validates: Requirements 5.4
 */
describe("Property 18: Activity log entry formatting", () => {
  const TIMESTAMP_REGEX =
    /^\d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}, \d{2}:\d{2}$/;

  const ALL_ACTION_TYPES: MemberActionType[] = [
    "login",
    "client_added",
    "client_updated",
    "document_request_sent",
    "document_request_completed",
    "settings_changed",
  ];

  describe("formatActivityTimestamp", () => {
    it("shall format any valid ISO date to DD MMM YYYY, HH:mm pattern", () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date("1970-01-01T00:00:00.000Z"), max: new Date("2099-12-31T23:59:59.999Z") }),
          (date) => {
          const isoString = date.toISOString();
          const result = formatActivityTimestamp(isoString);

          // Verify the output matches the expected format
          expect(result).toMatch(TIMESTAMP_REGEX);

          // Verify the values are correct for the given date
          const day = String(date.getDate()).padStart(2, "0");
          const months = [
            "Jan", "Feb", "Mar", "Apr", "May", "Jun",
            "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
          ];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");

          const expected = `${day} ${month} ${year}, ${hours}:${minutes}`;
          expect(result).toBe(expected);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("getRelatedEntity", () => {
    it("shall return client name for client_added and client_updated actions", () => {
      const clientActions: MemberActionType[] = ["client_added", "client_updated"];
      const arbClientAction = fc.constantFrom(...clientActions);
      const arbClientName = fc.string({ minLength: 1, maxLength: 100 });

      fc.assert(
        fc.property(arbClientAction, arbClientName, (actionType, clientName) => {
          const metadata = { client_name: clientName };
          const result = getRelatedEntity(actionType, metadata);
          expect(result).toBe(clientName);
        }),
        { numRuns: 100 }
      );
    });

    it("shall return request ID for document_request_sent and document_request_completed actions", () => {
      const requestActions: MemberActionType[] = [
        "document_request_sent",
        "document_request_completed",
      ];
      const arbRequestAction = fc.constantFrom(...requestActions);
      const arbRequestId = fc.uuid();

      fc.assert(
        fc.property(arbRequestAction, arbRequestId, (actionType, requestId) => {
          const metadata = { request_id: requestId };
          const result = getRelatedEntity(actionType, metadata);
          expect(result).toBe(requestId);
        }),
        { numRuns: 100 }
      );
    });

    it("shall return null for login and settings_changed actions", () => {
      const nullActions: MemberActionType[] = ["login", "settings_changed"];
      const arbNullAction = fc.constantFrom(...nullActions);
      const arbMetadata = fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 0, maxLength: 50 })
      );

      fc.assert(
        fc.property(arbNullAction, arbMetadata, (actionType, metadata) => {
          const result = getRelatedEntity(actionType, metadata);
          expect(result).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it("shall return null for client actions when client_name is missing from metadata", () => {
      const clientActions: MemberActionType[] = ["client_added", "client_updated"];
      const arbClientAction = fc.constantFrom(...clientActions);
      // Metadata without client_name key
      const arbMetadata = fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s !== "client_name"),
        fc.string({ minLength: 0, maxLength: 50 })
      );

      fc.assert(
        fc.property(arbClientAction, arbMetadata, (actionType, metadata) => {
          const result = getRelatedEntity(actionType, metadata);
          expect(result).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it("shall return null for document request actions when request_id is missing from metadata", () => {
      const requestActions: MemberActionType[] = [
        "document_request_sent",
        "document_request_completed",
      ];
      const arbRequestAction = fc.constantFrom(...requestActions);
      // Metadata without request_id key
      const arbMetadata = fc.dictionary(
        fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s !== "request_id"),
        fc.string({ minLength: 0, maxLength: 50 })
      );

      fc.assert(
        fc.property(arbRequestAction, arbMetadata, (actionType, metadata) => {
          const result = getRelatedEntity(actionType, metadata);
          expect(result).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it("shall return the correct related entity for any valid action type with appropriate metadata", () => {
      const arbActionType = fc.constantFrom(...ALL_ACTION_TYPES);
      const arbClientName = fc.string({ minLength: 1, maxLength: 100 });
      const arbRequestId = fc.uuid();

      fc.assert(
        fc.property(
          arbActionType,
          arbClientName,
          arbRequestId,
          (actionType, clientName, requestId) => {
            const metadata = { client_name: clientName, request_id: requestId };
            const result = getRelatedEntity(actionType, metadata);

            switch (actionType) {
              case "client_added":
              case "client_updated":
                expect(result).toBe(clientName);
                break;
              case "document_request_sent":
              case "document_request_completed":
                expect(result).toBe(requestId);
                break;
              case "login":
              case "settings_changed":
                expect(result).toBeNull();
                break;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
