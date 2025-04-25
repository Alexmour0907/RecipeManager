/**
 * RecipeManager - Redigering av oppskrifter
 * ---------------------------------------
 * Denne filen håndterer lasting av oppskriftsdata og oppdatering av eksisterende oppskrifter.
 * 
 * Hovedfunksjonalitet:
 * - Laste inn oppskriftsdetaljer for redigering
 * - Håndtere bildeopplasting og forhåndsvisning
 * - Kategoribehandling (legge til, slette, gruppere)
 * - Validering og innsending av redigeringsskjema
 * 
 * Dette er den sentrale kontrolleren for redigeringssiden, som samler alle 
 * nødvendige komponenter for å la brukeren redigere eksisterende oppskrifter
 * på en brukervennlig måte, med støtte for rike medier som bilder.
 */

// Initialiser når DOM er lastet
document.addEventListener('DOMContentLoaded', async () => {
    // Sjekk autentisering først for å forhindre uautorisert tilgang
    // Dette sikrer at bare innloggede brukere kan redigere oppskrifter
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        // Hvis ingen bruker er funnet, omdiriger til innloggingssiden
        window.location.href = '/login.html';
        return;
    }
    
    // Hent oppskrifts-ID og bruker-ID fra URL-parametere
    // Dette er nødvendig for å identifisere hvilken oppskrift som skal redigeres
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');
    
    // Hent bruker-ID fra URL hvis tilgjengelig, ellers bruk fra localStorage
    // Dette støtter både direkte lenker og normal navigasjon i appen
    const userId = urlParams.get('user_id') || user.id;
    
    // Verifiser at oppskrifts-ID eksisterer
    if (!recipeId) {
        alert('Recipe ID is missing');
        window.location.href = '/recipes.html';
        return;
    }
    
    console.log(`Loading recipe ${recipeId} for user ${userId}`);
    
    try {
        // Initialiser alle nødvendige komponenter i riktig rekkefølge
        // Dette sikrer at avhengigheter er oppfylt før relaterte komponenter lastes
        
        // Sett opp bildeopplastingsfunksjonalitet først
        // Dette må gjøres før oppskriften lastes for å håndtere eksisterende bilder
        setupImageUpload();
        
        // Last inn kategorier med riktig gruppering til nedtrekksmenyen
        // Dette må gjøres før oppskriften lastes for å velge riktig kategori
        await loadCategoriesGrouped(userId);
        
        // Last inn brukerens egendefinerte kategorier for administrasjonsdelen
        // Dette viser kategorier som kan slettes eller redigeres
        await loadUserCategories(userId);
        
        // Last inn oppskriftsdataene med bruker-ID
        // Dette fyller ut skjemaet med eksisterende verdier for redigering
        await loadRecipe(recipeId, userId);
        
        // Sett opp skjemainnsending når all data er lastet og tilgjengelig
        const recipeForm = document.getElementById('recipe-form');
        if (recipeForm) {
            recipeForm.addEventListener('submit', (e) => handleFormSubmit(e, recipeId, userId));
        }
        
        // Sett opp kategoribehandlingsfunksjonalitet
        // Dette gir mulighet til å legge til nye kategorier under redigering
        setupCategoryManagement(userId);
        
        console.log('Edit recipe page initialized successfully');
    } catch (error) {
        // Håndter eventuelle feil under initialisering
        // Dette gir brukeren en tydelig tilbakemelding hvis noe går galt
        console.error('Error initializing edit recipe page:', error);
        alert('There was a problem loading the page. Please try again.');
    }
});

/**
 * Laster oppskriftsdata og fyller ut skjemaet
 * 
 * Denne funksjonen henter en spesifikk oppskrift fra API-et og
 * fyller ut redigeringsskjemaet med eksisterende verdier. Dette
 * inkluderer tittel, ingredienser, instruksjoner, kategorivalg,
 * favoritt-status og eventuelle bildeopplastinger.
 * 
 * @param {string|number} recipeId - ID-en til oppskriften som skal redigeres
 * @param {string|number} userId - ID-en til gjeldende bruker for autentisering
 */
async function loadRecipe(recipeId, userId) {
    try {
        // Logg henting for feilsøkingsformål
        console.log(`Fetching recipe ${recipeId} with user ID ${userId}`);
        
        // Hent oppskriftsdata fra API-et med bruker-ID for autorisasjon
        const response = await fetch(`/recipes/${recipeId}?user_id=${userId}`);
        
        // Sjekk om forespørselen var vellykket
        if (!response.ok) {
            throw new Error(`Failed to fetch recipe: ${response.status}`);
        }
        
        // Konverter responsen til JSON og logg for feilsøking
        const recipe = await response.json();
        console.log('Recipe loaded successfully:', recipe);
        
        // Fyll ut skjemafeltene med eksisterende oppskriftsdata
        // Dette gir brukeren mulighet til å se og endre gjeldende verdier
        document.getElementById('title').value = recipe.title || '';
        document.getElementById('ingredients').value = recipe.ingredients || '';
        document.getElementById('instructions').value = recipe.instructions || '';
        
        // Sett kategori i nedtrekksmenyen hvis oppskriften har en kategori
        const categorySelect = document.getElementById('category');
        if (categorySelect && recipe.category_id) {
            categorySelect.value = recipe.category_id;
        }
        
        // Sett favoritt-status for avkrysningsboksen
        // Konverterer databasens 0/1-verdier til JavaScript-booleans
        const favoriteCheckbox = document.getElementById('is_favorite');
        if (favoriteCheckbox) {
            favoriteCheckbox.checked = recipe.is_favorite === 1;
        }
        
        // Håndter bildevisning hvis oppskriften allerede har et bilde
        if (recipe.image_url) {
            const imagePreview = document.getElementById('image-preview');
            const removeImageBtn = document.getElementById('remove-image');
            
            if (imagePreview) {
                // Sett bakgrunnsbilde for forhåndsvisning
                imagePreview.style.backgroundImage = `url('${recipe.image_url}')`;
                imagePreview.classList.add('has-image');
                
                // Lagre gjeldende bilde-URL for senere referanse
                // Dette brukes hvis brukeren ikke oppdaterer bildet
                imagePreview.dataset.currentImage = recipe.image_url;
                
                // Vis knappen for å fjerne bildet
                if (removeImageBtn) {
                    removeImageBtn.style.display = 'block';
                }
            }
        }
        
    } catch (err) {
        // Håndter eventuelle feil under datahenting
        console.error('Error loading recipe:', err);
        alert('Error loading recipe data. Redirecting to recipes page.');
        window.location.href = '/recipes.html';
    }
}

/**
 * Laster kategorier inn i nedtrekksmeny med gruppering
 * 
 * Denne funksjonen henter alle tilgjengelige kategorier og organiserer dem
 * i to grupper: standardkategorier og brukerdefinerte kategorier. Dette gir
 * en bedre brukeropplevelse ved å skille mellom systemets forhåndsdefinerte
 * kategorier og brukerens egne kategorier.
 * 
 * @param {string|number} userId - ID-en til gjeldende bruker for riktig datafiltrering
 */
async function loadCategoriesGrouped(userId) {
    try {
        // Hent alle kategorier fra API-et
        const response = await fetch(`/categories?user_id=${userId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        
        // Parse responsen og logg for feilsøking
        const categories = await response.json();
        console.log('All categories loaded:', categories);
        
        // Finn kategori-nedtrekksmenyen i DOM-en
        const select = document.getElementById('category');
        
        // Hvis nedtrekksmenyen ikke finnes, avbryt funksjonen
        if (!select) return; 
        
        // Tøm eksisterende alternativer, men behold første element hvis det finnes
        // Dette bevarer eventuelle "Velg kategori"-plassholdere
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Opprett kategorigrupper med beskrivende etiketter
        const defaultGroup = document.createElement('optgroup');
        defaultGroup.label = 'Default Categories';
        
        const userGroup = document.createElement('optgroup');
        userGroup.label = 'My Categories';
        
        // Flagg for å spore om vi har kategorier i hver gruppe
        let hasUserCategories = false;
        let hasDefaultCategories = false;
        
        // Iterer gjennom kategoriene og plasser dem i riktig gruppe
        // Dette separerer systemkategorier fra brukerdefinerte kategorier
        categories.forEach(category => {
            // Opprett et nytt alternativ for hver kategori
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            
            // Legg til i riktig gruppe basert på om den tilhører brukeren
            if (category.user_id) {
                userGroup.appendChild(option);
                hasUserCategories = true;
            } else {
                defaultGroup.appendChild(option);
                hasDefaultCategories = true;
            }
        });
        
        // Legg bare til gruppene hvis de inneholder alternativer
        // Dette forhindrer tomme gruppeoverskrifter
        if (hasDefaultCategories) {
            select.appendChild(defaultGroup);
        }
        
        if (hasUserCategories) {
            select.appendChild(userGroup);
        }
        
        console.log('Categories grouped in dropdown');
    } catch (err) {
        // Håndter feil, men la resten av siden laste
        console.error('Error loading categories for dropdown:', err);
        // Vi fortsetter kjøringen i stedet for å stoppe hele siden
    }
}

/**
 * Laster brukerens egendefinerte kategorier for administrasjonsdelen
 * 
 * Denne funksjonen henter brukerens egendefinerte kategorier og viser dem
 * i kategoribehandlingsdelen av skjemaet. Dette gir brukeren mulighet til
 * å administrere (slette) eksisterende kategorier direkte fra redigeringssiden.
 * 
 * @param {string|number} userId - ID-en til gjeldende bruker for å filtrere kategorier
 */
async function loadUserCategories(userId) {
    // Finn kategorilisten i DOM-en
    const categoryList = document.getElementById('category-list');
    if (!categoryList) return;
    
    try {
        // Hent alle kategorier fra API-et
        const response = await fetch(`/categories?user_id=${userId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        
        // Parse responsen og logg for feilsøking
        const categories = await response.json();
        console.log('Categories for management loaded:', categories);
        
        // Filtrer til kun brukerens egendefinerte kategorier
        // Vi vil bare vise og tillate administrering av brukerens egne kategorier
        const userCategories = categories.filter(cat => cat.user_id);
        
        // Tøm kategorilisten før vi legger til nye elementer
        categoryList.innerHTML = '';
        
        // Hvis det ikke er noen kategorier, vis en melding
        if (userCategories.length === 0) {
            categoryList.innerHTML = '<li class="no-categories">No custom categories created yet</li>';
            return;
        }
        
        // Opprett listelementer for hver egendefinert kategori
        userCategories.forEach(cat => {
            const li = document.createElement('li');
            // Inkluder både kategorinavn og en sletteknapp
            li.innerHTML = `
                <span>${cat.name}</span>
                <button class="btn-delete" data-id="${cat.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            categoryList.appendChild(li);
        });
        
        // Legg til klikkhendelser for sletteknappene
        // Dette setter opp hendelsesfunksjoner for kategorisletting
        categoryList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => deleteCategory(e, userId));
        });
        
        console.log('Custom categories displayed in management section');
    } catch (err) {
        // Håndter feil ved å vise en feilmelding i kategorilisten
        console.error('Error loading user categories for management:', err);
        categoryList.innerHTML = '<li class="error-message">Failed to load categories</li>';
    }
}

/**
 * Setter opp kategoriadministrasjonsfunksjonalitet
 * 
 * Denne funksjonen konfigurerer brukergrensesnittet for å legge til nye
 * kategorier. Den håndterer validering, oppretting av nye kategorier via
 * API-et, og oppdatering av de relevante deler av brukergrensesnittet.
 * 
 * @param {string|number} userId - ID-en til gjeldende bruker for kategoriopprettelse
 */
function setupCategoryManagement(userId) {
    // Hent nødvendige DOM-elementer for kategoribehandling
    const addCategoryBtn = document.getElementById('add-category-btn');
    const categoryInput = document.getElementById('new-category');
    
    // Hvis nødvendige elementer mangler, avslutt funksjonen tidlig
    if (!addCategoryBtn || !categoryInput) return;
    
    // Legg til klikkhendelse for knappen for å legge til kategorier
    addCategoryBtn.addEventListener('click', async () => {
        // Hent og trim kategoriinndataverdien
        const name = categoryInput.value.trim();
        
        // Valider at navnet ikke er tomt
        if (!name) return;
        
        try {
            // Send forespørsel om å opprette en ny kategori
            const response = await fetch('/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, user_id: userId })
            });
            
            // Sjekk om forespørselen var vellykket
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create category');
            }
            
            // Tøm inndatafeltet for neste kategori
            categoryInput.value = '';
            
            // Last inn kategorier på nytt for å oppdatere både nedtrekksmeny og administrasjonsliste
            await loadCategoriesGrouped(userId);
            await loadUserCategories(userId);
            
            console.log('New category added successfully');
        } catch (err) {
            // Håndter eventuelle feil under kategoriopprettelse
            console.error('Error adding category:', err);
            alert(err.message || 'Failed to add category');
        }
    });
    
    console.log('Category management setup complete');
}

/**
 * Håndterer kategorisletting
 * 
 * Denne funksjonen håndterer prosessen med å slette en egendefinert kategori.
 * Den inkluderer bekreftelsesinput fra brukeren, API-forespørsel for sletting,
 * og oppdatering av brukergrensesnittet. Den håndterer også situasjoner der 
 * kategorien ikke kan slettes fordi den er i bruk.
 * 
 * @param {Event} e - Klikkhendelsesobjekt som inneholder informasjon om klikket
 * @param {string|number} userId - ID-en til gjeldende bruker for autorisasjon
 */
async function deleteCategory(e, userId) {
    // Hent kategori-ID fra klikkede elementets dataattributter
    const categoryId = e.currentTarget.getAttribute('data-id');
    
    // Be om bekreftelse før sletting for å forhindre uhell
    if (confirm('Are you sure you want to delete this category?')) {
        try {
            // Send sletteforespørsel til API
            const response = await fetch(`/categories/${categoryId}?user_id=${userId}`, {
                method: 'DELETE'
            });
            
            // Håndter feilresponser
            if (!response.ok) {
                const error = await response.json();
                
                // Spesiell håndtering hvis kategorien brukes av oppskrifter
                if (error.recipeCount > 0) {
                    alert(`Cannot delete this category because it's used by ${error.recipeCount} recipes.`);
                } else {
                    alert(error.error || 'Failed to delete category');
                }
                return;
            }
            
            console.log('Category deleted successfully');
            
            // Last inn kategorier på nytt for å oppdatere både nedtrekksmeny og administrasjonsliste
            await loadCategoriesGrouped(userId);
            await loadUserCategories(userId);
        } catch (err) {
            // Håndter eventuelle nettverks- eller andre feil
            console.error('Error deleting category:', err);
            alert('An error occurred while deleting the category');
        }
    }
}

/**
 * Setter opp bildeopplastingsforhåndsvisning og funksjonalitet
 * 
 * Denne funksjonen håndterer all bilderelatert funksjonalitet inkludert:
 * - Lytting etter når brukeren velger en ny bildefil
 * - Validering av filtype og størrelse for å sikre kompatibilitet
 * - Generering av en live forhåndsvisning av bildet før opplasting
 * - Funksjonalitet for å fjerne eksisterende eller nylig valgte bilder
 * - Håndtering av skjulte felt for å signalisere bildesletting til serveren
 */
function setupImageUpload() {
    // Hent nødvendige DOM-elementer for bildehåndtering
    const imageInput = document.getElementById('recipe-image');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image');
    
    // Tidlig retur hvis påkrevde elementer mangler - forhindrer feil
    if (!imageInput || !imagePreview) return;
    
    // Håndter bildevalg når brukeren velger en fil
    // Dette aktiveres når brukeren velger en fil via filinndialogboksen
    imageInput.addEventListener('change', (e) => {
        // Hent den første (og vanligvis eneste) filen som er valgt
        const file = e.target.files[0];
        if (!file) return; // Ingen fil valgt eller dialogboksen ble avbrutt
        
        // Valider at filen faktisk er et bilde
        // Dette forhindrer opplasting av ikke-bildefiler som kan føre til visningsproblemer
        if (!file.type.match('image.*')) {
            alert('Please select an image file');
            imageInput.value = ''; // Tilbakestill inputfeltet
            return;
        }
        
        // Valider filstørrelse (maksimalt 5MB)
        // Denne begrensningen forhindrer serveroverbelastning og lange opplastingstider
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            imageInput.value = ''; // Tilbakestill inputfeltet
            return;
        }
        
        // Opprett forhåndsvisning av bildet før opplasting
        // Dette gir brukeren umiddelbar visuell tilbakemelding
        const reader = new FileReader();
        reader.onload = (e) => {
            // Sett bakgrunnsbildet til forhåndsvisningsområdet
            imagePreview.style.backgroundImage = `url('${e.target.result}')`;
            imagePreview.classList.add('has-image');
            
            // Fjern eventuelt eksisterende flagg for bildefjerning
            // Dette er viktig hvis brukeren først fjerner et bilde og deretter velger et nytt
            const existingFlag = document.getElementById('remove-image-flag');
            if (existingFlag) {
                existingFlag.remove();
            }
            
            // Vis knappen for å fjerne bildet
            if (removeImageBtn) {
                removeImageBtn.style.display = 'block';
            }
        };
        
        // Start asynkron lesing av filobjektet som en data-URL
        reader.readAsDataURL(file);
    });
    
    // Håndter knappen for å fjerne bilde
    // Denne koden kjører når brukeren klikker på "Fjern bilde"-knappen
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', () => {
            // Tilbakestill alle relaterte felt og visninger
            imageInput.value = ''; // Tøm filvelgeren
            imagePreview.style.backgroundImage = ''; // Fjern bakgrunnsbilde
            imagePreview.classList.remove('has-image'); // Fjern CSS-klasse
            removeImageBtn.style.display = 'none'; // Skjul fjern-knappen
            
            // Legg til et skjult inndatafelt for å fortelle serveren at bildet skal fjernes
            // Dette er nødvendig fordi manglende fil i input ikke nødvendigvis betyr at bildet skal slettes
            const removeImageFlag = document.getElementById('remove-image-flag') || document.createElement('input');
            removeImageFlag.type = 'hidden';
            removeImageFlag.id = 'remove-image-flag';
            removeImageFlag.name = 'remove-image-flag';
            removeImageFlag.value = '1'; // '1' indikerer at bildet skal fjernes
            
            // Legg inn dette skjulte feltet i DOM-en sammen med bildeinputen
            imageInput.parentNode.appendChild(removeImageFlag);
        });
    }
    
    console.log('Bildeopplastingsfunksjonalitet initialisert og klar til bruk');
}

/**
 * Håndterer skjemainnsending for å oppdatere oppskriften
 * 
 * Denne komplekse funksjonen håndterer hele prosessen med å sende inn et redigeringsskjema:
 * - Forhindrer standard skjemainnsending for å bruke AJAX i stedet
 * - Oppdaterer brukergrensesnittets tilstand under innsending
 * - Håndterer bildeopplasting før oppskriftsoppdatering
 * - Samler alle oppskriftsdata og sender til API-et
 * - Håndterer feilstater og vellykket oppdatering
 * 
 * @param {Event} e - Innsendingshendelsesobjekt som inneholder skjemadata
 * @param {string|number} recipeId - ID-en til oppskriften som skal oppdateres
 * @param {string|number} userId - ID-en til gjeldende bruker for autorisasjon
 */
async function handleFormSubmit(e, recipeId, userId) {
    // Forhindre standard skjemainnsending
    e.preventDefault();
    
    // Hent skjemareferanse og viktige UI-elementer
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorElement = document.getElementById('form-error');
    
    // Oppdater brukergrensesnitt for å vise lastestatus
    // Dette gir brukeren tilbakemelding om at handlingen pågår
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Updating Recipe...';
    }
    
    // Nullstill eventuelle tidligere feilmeldinger
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
    
    try {
        // Kompleks logikk for bildehåndtering
        // Vi må bestemme om vi skal laste opp et nytt bilde, beholde det eksisterende, eller fjerne det
        let imageUrl = null;
        const removeImageFlag = document.getElementById('remove-image-flag');
        
        // Sjekk om vi har et nytt bilde som skal lastes opp
        const imageInput = document.getElementById('recipe-image');
        
        if (imageInput && imageInput.files && imageInput.files[0]) {
            // Bruker har valgt et nytt bilde - last opp det
            const formData = new FormData();
            formData.append('recipeImage', imageInput.files[0]);
            formData.append('user_id', userId); // Inkluder bruker-ID for autorisasjon
            
            // Send bildet til en separat opplastingsendepunkt
            const uploadResponse = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error('Failed to upload image');
            }
            
            // Hent URL-en til det opplastede bildet
            const uploadResult = await uploadResponse.json();
            imageUrl = uploadResult.imageUrl;
        } else if (!removeImageFlag) {
            // Ingen ny fil OG ingen fjerningsflagg - behold eksisterende bilde
            
            // Prøv først å få eksisterende bilde fra forhåndsvisningselementet
            const imagePreview = document.getElementById('image-preview');
            imageUrl = imagePreview.dataset.currentImage || null;
            
            if (!imageUrl) {
                // Hvis vi ikke kan få det fra datasettet (som kan skje ved siden-refresh),
                // hent oppskriften for å få den nåværende URL-en
                const recipeResponse = await fetch(`/recipes/${recipeId}?user_id=${userId}`);
                if (recipeResponse.ok) {
                    const recipeData = await recipeResponse.json();
                    imageUrl = recipeData.image_url;
                }
            }
        }
        // Hvis removeImageFlag eksisterer, forblir imageUrl null, som fører til bildesletting
        
        // Samle alle oppskriftsdata fra skjemaet
        const recipeData = {
            title: form.title.value,
            ingredients: form.ingredients.value,
            instructions: form.instructions.value,
            category_id: form.category.value || null, // Håndter ukategoriserte oppskrifter
            user_id: userId,
            is_favorite: document.getElementById('is_favorite')?.checked ? 1 : 0,
            image_url: imageUrl // Kan være ny URL, eksisterende URL, eller null for å fjerne
        };
        
        console.log('Updating recipe:', recipeData);
        
        // Send oppdateringsforespørselen til API-et
        const response = await fetch(`/recipes/${recipeId}?user_id=${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recipeData)
        });
        
        // Håndter feilrespons fra serveren
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update recipe');
        }
        
        console.log('Recipe updated successfully');
        
        // Ved vellykket oppdatering, naviger til oppskriftsdetaljsiden
        // Dette lar brukeren se endringene umiddelbart
        window.location.href = `/recipe-detail.html?id=${recipeId}`;
    } catch (err) {
        // Håndter eventuelle feil under oppdateringsprosessen
        console.error('Error updating recipe:', err);
        
        // Vis feilmelding til brukeren
        if (errorElement) {
            // Hvis vi har et dedikert feilelement, bruk det
            errorElement.textContent = err.message;
            errorElement.style.display = 'block';
        } else {
            // Ellers vis en vanlig varsel
            alert(`Failed to update recipe: ${err.message}`);
        }
        
        // Aktiver innsendingsknappen igjen så brukeren kan prøve på nytt
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Update Recipe';
        }
    }
}