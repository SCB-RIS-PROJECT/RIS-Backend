/**
 * Convert a Date object to a string in the format expected by Satu Sehat.
 * This is equivalent to calling `toISOString()` on the Date object, but then replacing the trailing ".XXXZ" with "+00:00".
 * @param {Date} date - The Date object to convert.
 * @returns {string} - The converted string.
 */
export function toSatusehatDateTime(date: Date): string {
    return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}
