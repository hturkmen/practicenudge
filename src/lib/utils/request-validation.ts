/**
 * Validation utilities for document request forms.
 * These pure functions are used by both the new request and edit request pages.
 */

/**
 * Validates that a request title is not empty or whitespace-only.
 * @param title - The title string to validate
 * @returns true if the title contains at least one non-whitespace character, false otherwise
 */
export function validateTitle(title: string): boolean {
  return title.trim().length > 0;
}

/**
 * Validates that at least one checklist item has a non-empty label.
 * @param items - Array of items with label property
 * @returns true if at least one item has a non-whitespace label, false otherwise
 */
export function validateItems(items: { label: string }[]): boolean {
  return items.some((item) => item.label.trim().length > 0);
}

/**
 * Validates that a client has been selected.
 * @param clientId - The selected client ID string
 * @returns true if clientId is non-empty, false otherwise
 */
export function validateClientSelected(clientId: string): boolean {
  return clientId.length > 0;
}
