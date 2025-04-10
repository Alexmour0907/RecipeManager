/**
 * Recipe Manager Utility Functions
 */

// Simple salt value to make encoding less predictable
const SALT = "RECIPE_APP_23";

/**
 * Encode a recipe ID for use in URLs
 * @param {number|string} id - The recipe ID to encode
 * @returns {string} Encoded ID string
 */
function encodeRecipeId(id) {
  if (!id) return "";
  
  // Convert to string, add salt, and encode to Base64
  const idWithSalt = `${id}:${SALT}`;
  return btoa(idWithSalt).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Decode a recipe ID from URL
 * @param {string} encoded - The encoded recipe ID
 * @returns {string|null} Original ID or null if invalid
 */
function decodeRecipeId(encoded) {
  if (!encoded) return null;
  
  try {
    // Restore Base64 padding if needed
    const paddedString = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(paddedString);
    
    // Extract the ID part (before the salt)
    const parts = decoded.split(':');
    if (parts.length > 1 && parts[1] === SALT) {
      return parts[0];
    }
    return null;
  } catch (err) {
    console.error("Error decoding recipe ID:", err);
    return null;
  }
}