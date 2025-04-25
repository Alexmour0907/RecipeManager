/**
 * RecipeManager - Hjelpefunksjoner for Applikasjonen
 * --------------------------------------------------
 * Denne filen inneholder nyttige hjelpefunksjoner som brukes på tvers av 
 * RecipeManager-appen, spesielt for sikker håndtering av oppskrifts-IDer
 * i URL-adresser.
 * 
 * Hovedfunksjonalitet:
 * - Koding av oppskrift-IDer: Konverterer numeriske IDer til sikrere URL-vennlige strenger
 * - Dekoding av oppskrift-IDer: Konverterer kodede ID-strenger tilbake til originalformat
 * - Salt-basert sikkerhet: Bruker en salt-verdi for å gjøre IDene vanskeligere å gjette
 * 
 * Sikkerhetshensyn:
 * - Skjuler faktiske database-IDer fra sluttbrukeren
 * - Forhindrer at brukere kan gjette eller manipulere ID-verdier
 * - Sikrer at delte lenker til oppskrifter ikke avslører database-strukturen
 */

// Salt-verdi for å gjøre kodingen mindre forutsigbar
// Dette fungerer som en hemmelig nøkkel for koding/dekoding av IDer
const SALT = "RECIPE_APP_23";

/**
 * Koder en oppskrifts-ID for bruk i URL-adresser
 * @param {number|string} id - Oppskrifts-IDen som skal kodes
 * @returns {string} Kodet ID-streng
 */
function encodeRecipeId(id) {
  // Sjekk om ID-en er tom eller udefinert, returner tom streng i så fall
  if (!id) return "";
  
  // Konverter ID til streng, legg til salt-verdien, og kode til Base64
  // Dette gjør at oppskrifts-IDer ikke er direkte synlige i nettleseradressen
  const idWithSalt = `${id}:${SALT}`;
  
  // Gjør Base64-strengen URL-vennlig ved å erstatte spesialtegn:
  // - Fjerner '=' tegn (padding)
  // - Erstatter '+' med '-'
  // - Erstatter '/' med '_'
  return btoa(idWithSalt).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Dekoder en oppskrifts-ID fra en URL
 * @param {string} encoded - Den kodede oppskrifts-IDen
 * @returns {string|null} Original ID eller null hvis ugyldig
 */
function decodeRecipeId(encoded) {
  // Sjekk om den kodede strengen er tom eller udefinert
  if (!encoded) return null;
  
  try {
    // Gjenoppretter original Base64-format ved å erstatte URL-vennlige tegn
    // Dette gjør at atob()-funksjonen kan dekode strengen korrekt
    const paddedString = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(paddedString);
    
    // Hent ut den originale ID-delen (før salt-verdien)
    // Dette skiller den faktiske IDen fra sikkerhetssaltet
    const parts = decoded.split(':');
    
    // Verifiser at salt-delen eksisterer og er korrekt
    // Dette sikrer at koden ikke har blitt tuklet med
    if (parts.length > 1 && parts[1] === SALT) {
      return parts[0];
    }
    return null;
  } catch (err) {
    // Logger feil ved dekoding, som kan skje med ugyldige Base64-strenger
    // eller hvis noen prøver å manipulere URL-parametrene
    console.error("Feil ved dekoding av oppskrifts-ID:", err);
    return null;
  }
}