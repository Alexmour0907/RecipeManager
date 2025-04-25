/**
 * RecipeManager - Legg til oppskrift
 * ---------------------------------
 * Denne filen håndterer funksjonalitet for opprettelse av nye oppskrifter,
 * inkludert skjemahåndtering, bildeopplasting, og kategoribehandling.
 * 
 * Hovedfunksjoner:
 * - Opprettelse og validering av nye oppskrifter
 * - Håndtering av bildeopplasting med forhåndsvisning
 * - Håndtering av brukeropprettede kategorier
 * - Organisering av kategorier i grupperte nedtrekksmenyer
 */

// Initialiser når DOM er lastet
document.addEventListener('DOMContentLoaded', async () => {
    // Sjekk autentisering for å sikre at bare innloggede brukere kan legge til oppskrifter
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        window.location.href = '/login.html';
        return;
    }
    
    // Last inn kategorier med riktig gruppering for nedtrekksmenyen
    await loadCategoriesGrouped();
    
    // Last inn brukerens egendefinerte kategorier for administrasjonsdelen
    await loadUserCategories();
    
    // Sett opp skjemainnsending for den nye oppskriften
    const recipeForm = document.getElementById('recipe-form');
    if (recipeForm) {
        recipeForm.addEventListener('submit', handleFormSubmit);
    }
    
    // Sett opp kategoribehandlingsfunksjonalitet
    setupCategoryManagement();
    
    // Sett opp bildeopplastingsfunksjonalitet
    setupImageUpload();
    
    // Feilsøk sjekk for favoritt-avkrysningsboks
    const favoriteCheckbox = document.getElementById('is_favorite');
    console.log('Favoritt-avkrysningsboks funnet ved sideinnlasting:', !!favoriteCheckbox);
    
    console.log('Legg til oppskrift-siden initialisert');
});

/**
 * Laster kategorier inn i nedtrekksmeny med gruppering
 * 
 * Denne funksjonen henter alle tilgjengelige kategorier og organiserer dem
 * i to grupper: standardkategorier og brukerdefinerte kategorier. Dette gir
 * en bedre brukeropplevelse ved å skille mellom forhåndsdefinerte og brukerens
 * egne kategorier.
 */
async function loadCategoriesGrouped() {
    try {
        // Hent brukerdata for å inkludere bruker-ID i forespørselen
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`/categories?user_id=${user.id}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        
        // Parse kategoridataene fra serveren
        const categories = await response.json();
        console.log('Alle kategorier lastet inn:', categories);
        
        // Finn kategori-nedtrekksmenyen i DOM
        const select = document.getElementById('category');
        
        // Hvis nedtrekksmenyen ikke finnes, avbryt funksjonen
        if (!select) return;
        
        // Tøm eksisterende alternativer, men behold første element hvis det er en plassholder
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Opprett kategorigrupper for organisering i nedtrekksmenyen
        const defaultGroup = document.createElement('optgroup');
        defaultGroup.label = 'Default Categories';
        
        const userGroup = document.createElement('optgroup');
        userGroup.label = 'My Categories';
        
        // Flagg for å spore om vi har kategorier i hver gruppe
        let hasUserCategories = false;
        let hasDefaultCategories = false;
        
        // Sorter kategorier inn i passende grupper basert på om de er brukeropprettet
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            
            // Sjekk om kategorien tilhører brukeren (har en user_id)
            if (category.user_id) {
                userGroup.appendChild(option);
                hasUserCategories = true;
            } else {
                defaultGroup.appendChild(option);
                hasDefaultCategories = true;
            }
        });
        
        // Legg bare til gruppene hvis de inneholder alternativer
        if (hasDefaultCategories) {
            select.appendChild(defaultGroup);
        }
        
        if (hasUserCategories) {
            select.appendChild(userGroup);
        }
        
        console.log('Kategorier gruppert i nedtrekksmeny');
    } catch (err) {
        // Logg eventuelle feil, men la resten av siden fungere
        console.error('Feil ved lasting av kategorier for nedtrekksmeny:', err);
    }
}

/**
 * Laster brukerens egendefinerte kategorier for administrasjonsdelen
 * 
 * Denne funksjonen henter og viser brukerens egendefinerte kategorier i
 * kategoriadministrasjonsseksjonen, med mulighet for å slette dem.
 * Dette gir brukeren kontroll over sine egne kategorier direkte fra
 * siden for å legge til oppskrifter.
 */
async function loadUserCategories() {
    // Finn kategoriliste-elementet i DOM
    const categoryList = document.getElementById('category-list');
    if (!categoryList) return;
    
    try {
        // Hent brukerdata for å identifisere brukerens kategorier
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Hent kategorier fra API-et
        const response = await fetch(`/categories?user_id=${user.id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        
        // Parse responsen og logg for feilsøking
        const categories = await response.json();
        console.log('Kategorier for administrasjon lastet:', categories);
        
        // Filtrer til bare brukerens egendefinerte kategorier
        // Vi vil bare vise kategorier som brukeren selv har opprettet
        const userCategories = categories.filter(cat => cat.user_id);
        
        // Tøm kategorilisten før vi legger til nye elementer
        categoryList.innerHTML = '';
        
        // Vis en melding hvis brukeren ikke har opprettet noen kategorier ennå
        if (userCategories.length === 0) {
            categoryList.innerHTML = '<li class="no-categories">No custom categories created yet</li>';
            return;
        }
        
        // Opprett listelement for hver egendefinert kategori
        userCategories.forEach(cat => {
            const li = document.createElement('li');
            // Inkluder både kategorinavn og en sletteknapp i hvert element
            li.innerHTML = `
                <span>${cat.name}</span>
                <button class="btn-delete" data-id="${cat.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            categoryList.appendChild(li);
        });
        
        // Legg til slettehendelseslyttere på alle sletteknappene
        // Dette gjør at brukeren kan slette kategorier direkte fra listen
        categoryList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', deleteCategory);
        });
        
        console.log('Egendefinerte kategorier vist i administrasjonsdelen');
    } catch (err) {
        // Ved feil, vis en feilmelding i kategorilisten
        console.error('Feil ved lasting av brukerkategorier for administrasjon:', err);
        categoryList.innerHTML = '<li class="error-message">Failed to load categories</li>';
    }
}

/**
 * Setter opp kategoribehandlingsfunksjonalitet
 * 
 * Denne funksjonen konfigurerer brukergrensesnittet for å legge til
 * nye kategorier, inkludert validering og innsending av kategoridata
 * til serveren. Den oppdaterer også grensesnittet etter vellykket oppretting.
 */
function setupCategoryManagement() {
    // Hent nødvendige DOM-elementer for kategoribehandling
    const addCategoryBtn = document.getElementById('add-category-btn');
    const categoryInput = document.getElementById('new-category');
    
    // Avslutt tidlig hvis nødvendige elementer mangler
    if (!addCategoryBtn || !categoryInput) return;
    
    // Konfigurer hendelseshåndtering for "Legg til kategori"-knappen
    addCategoryBtn.addEventListener('click', async () => {
        // Hent og trim kategorinavnet for å fjerne overflødig mellomrom
        const name = categoryInput.value.trim();
        
        // Valider at kategorinavnet ikke er tomt før vi fortsetter
        if (!name) return;
        
        try {
            // Hent brukerdata for å inkludere bruker-ID i kategorien
            const user = JSON.parse(localStorage.getItem('user'));
            
            // Send forespørsel til serveren for å opprette en ny kategori
            const response = await fetch('/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, user_id: user.id })
            });
            
            // Håndter feilresponser fra serveren
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create category');
            }
            
            // Tøm inndatafeltet for neste kategori
            categoryInput.value = '';
            
            // Last inn kategorier på nytt for å oppdatere både nedtrekksmeny og administrasjonsliste
            await loadCategoriesGrouped();
            await loadUserCategories();
            
            console.log('Ny kategori lagt til');
        } catch (err) {
            // Håndter og vis eventuelle feil som oppstår under kategoriopprettelse
            console.error('Feil ved opprettelse av kategori:', err);
            alert(err.message);
        }
    });
    
    console.log('Kategori-administrasjon oppsett fullført');
}

/**
 * Håndterer sletting av kategorier
 * 
 * Denne funksjonen håndterer slettingen av en brukerdefinert kategori,
 * inkludert bekreftelse fra brukeren og håndtering av situasjoner der
 * kategorien ikke kan slettes fordi den er i bruk av oppskrifter.
 * 
 * @param {Event} e - Klikkhendelsesobjektet fra sletteknappen
 */
async function deleteCategory(e) {
    // Hent kategori-ID fra knappens dataattributt
    const categoryId = e.currentTarget.getAttribute('data-id');
    const user = JSON.parse(localStorage.getItem('user'));
    
    // Be om bekreftelse før sletting for å hindre utilsiktet tap av data
    if (confirm('Are you sure you want to delete this category?')) {
        try {
            // Send sletteforespørsel til API-et
            const response = await fetch(`/categories/${categoryId}?user_id=${user.id}`, {
                method: 'DELETE'
            });
            
            // Håndter tilfeller der kategorien ikke kan slettes
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
            
            console.log('Kategori slettet');
            
            // Last inn kategorier på nytt for å oppdatere grensesnittet
            await loadCategoriesGrouped();
            await loadUserCategories();
        } catch (err) {
            // Håndter eventuelle nettverks- eller andre feil
            console.error('Feil ved sletting av kategori:', err);
            alert('An error occurred while deleting the category');
        }
    }
}

/**
 * Setter opp bildeopplastingsforhåndsvisning og funksjonalitet
 * 
 * Denne funksjonen konfigurerer brukergrensesnittet for bildeopplasting,
 * inkludert filvalg, validering av filtype og størrelse, live forhåndsvisning,
 * og muligheten til å fjerne et valgt bilde før innsending.
 */
function setupImageUpload() {
    // Hent nødvendige DOM-elementer for bildehåndtering
    const imageInput = document.getElementById('recipe-image');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image');
    
    // Avslutt tidlig hvis nødvendige elementer mangler
    if (!imageInput || !imagePreview) return;
    
    // Håndter hendelsen når brukeren velger en bildefil
    imageInput.addEventListener('change', (e) => {
        // Hent den valgte filen fra inndatafeltet
        const file = e.target.files[0];
        if (!file) return; // Ingen fil valgt
        
        // Valider at filen faktisk er et bilde
        // Dette hindrer opplasting av ugyldige filtyper
        if (!file.type.match('image.*')) {
            alert('Please select an image file');
            return;
        }
        
        // Valider filstørrelse (maks 5MB) for å hindre store opplastinger
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            imageInput.value = ''; // Nullstill inndatafeltet
            return;
        }
        
        // Opprett forhåndsvisning av bildet for umiddelbar tilbakemelding
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.style.backgroundImage = `url('${e.target.result}')`;
            imagePreview.classList.add('has-image');
            // Vis fjernknappen slik at brukeren kan angre bildevalget
            if (removeImageBtn) {
                removeImageBtn.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    });
    
    // Håndter hendelsen når brukeren klikker på "Fjern bilde"-knappen
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', () => {
            // Nullstill alle relaterte felt og visninger
            imageInput.value = '';
            imagePreview.style.backgroundImage = '';
            imagePreview.classList.remove('has-image');
            removeImageBtn.style.display = 'none';
        });
    }
}

/**
 * Håndterer innsending av oppskriftsskjema med bildeopplasting og favoritter
 * 
 * Denne komplekse funksjonen håndterer hele prosessen med å sende inn
 * en ny oppskrift, inkludert validering, bildeopplasting, opprettelse av
 * oppskriftsdata, og håndtering av både vellykkede innsendinger og feil.
 * 
 * @param {Event} e - Skjemainnsendingshendelsen
 */
async function handleFormSubmit(e) {
    // Forhindre standard skjemainnsending for å bruke AJAX i stedet
    e.preventDefault();
    
    // Hent skjema og viktige UI-elementer for statusoppdateringer
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorElement = document.getElementById('form-error');
    
    // Oppdater knappens tilstand for å vise lasting
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Saving Recipe...';
    }
    
    // Fjern eventuelle tidligere feilmeldinger
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
    
    try {
        // Hent brukerdata for å knytte oppskriften til riktig bruker
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Feilsøk favoritt-avkrysningsboksen for å sikre at den fungerer riktig
        const favoriteCheckbox = document.getElementById('is_favorite');
        console.log('Favoritt-avkrysningsboks funnet:', !!favoriteCheckbox);
        console.log('Favoritt-avkrysningsboks ID:', favoriteCheckbox?.id);
        console.log('Favoritt-avkrysningsboks avkrysset:', favoriteCheckbox?.checked);
        
        // Håndter bildeopplasting først hvis et bilde er valgt
        // Dette gjøres separat før oppskriftsopprettelse
        let imageUrl = null;
        const imageInput = document.getElementById('recipe-image');
        
        if (imageInput && imageInput.files && imageInput.files[0]) {
            // Opprett FormData-objekt for å håndtere fileopplasting
            const formData = new FormData();
            formData.append('recipeImage', imageInput.files[0]);
            
            // Last opp bildet til serveren
            const uploadResponse = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            // Håndter feil ved bildeopplasting
            if (!uploadResponse.ok) {
                throw new Error('Failed to upload image');
            }
            
            // Hent bilde-URL-en fra serverresponsen
            const uploadResult = await uploadResponse.json();
            imageUrl = uploadResult.imageUrl;
        }
        
        // Hent favorittverdien eksplisitt for å unngå problemer
        // Konverterer boolean til 1/0 for databaseformål
        const isFavorite = favoriteCheckbox && favoriteCheckbox.checked ? 1 : 0;
        console.log('Er favoritt-verdi:', isFavorite);
        
        // Opprett oppskriftsobjektet med alle nødvendige data
        const recipeData = {
            title: form.title.value,
            ingredients: form.ingredients.value,
            instructions: form.instructions.value,
            category_id: form.category.value || null, // Null hvis ingen kategori er valgt
            user_id: user.id,
            image_url: imageUrl, // Kan være null hvis ingen bilde er lastet opp
            is_favorite: isFavorite
        };
        
        console.log('Sender inn oppskrift:', recipeData);
        
        // Send oppskriftsdataene til serveren for å opprette en ny oppskrift
        const response = await fetch('/recipes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recipeData)
        });
        
        // Håndter feilresponser fra serveren
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create recipe');
        }
        
        // Parse og logg det vellykkede resultatet
        const result = await response.json();
        console.log('Oppskrift opprettet:', result);
        
        // Omdiriger til oppskriftssiden etter vellykket opprettelse
        window.location.href = '/recipes.html';
    } catch (err) {
        // Logg og vis eventuelle feil som oppstår under prosessen
        console.error('Feil ved opprettelse av oppskrift:', err);
        
        // Vis feilmelding til brukeren
        if (errorElement) {
            errorElement.textContent = err.message;
            errorElement.style.display = 'block';
        }
        
        // Aktiver innsendingsknappen igjen så brukeren kan prøve på nytt
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Save Recipe';
        }
    }
}