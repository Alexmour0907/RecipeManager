/**
 * RecipeManager - Oppskriftsdetaljer
 * ---------------------------------
 * Denne filen håndterer visning av detaljert oppskriftsinformasjon,
 * inkludert ingredienser, instruksjoner og interaktive funksjoner som 
 * favorittmarkering og sletting.
 */

// Sjekk autentisering når siden lastes
document.addEventListener('DOMContentLoaded', () => {
    // Hent bruker fra lokallagring
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        // Bruker ikke innlogget, omdiriger til innloggingssiden
        window.location.href = '/login.html';
        return;
    }
    
    // Hent oppskrifts-ID fra URL-en
    const urlParams = new URLSearchParams(window.location.search);
    
    // Sjekk for både vanlig id og kodet r-parameter
    const regularId = urlParams.get('id');
    const encodedId = urlParams.get('r');
    
    // Bestem hvilken ID som skal brukes
    let recipeId;
    
    if (encodedId) {
        // Hvis vi har en kodet ID, dekoder vi den
        recipeId = decodeRecipeId(encodedId);
        if (!recipeId) {
            showError('Invalid recipe identifier');
            return;
        }
    } else if (regularId) {
        // Bruk den vanlige ID-en hvis ingen kodet ID er tilstede
        recipeId = regularId;
    } else {
        showError('Recipe ID is missing');
        return;
    }
    
    // Last inn oppskriftsdetaljer
    loadRecipeDetails(recipeId, user.id)
        .then(() => {
            // Sett opp hendelsesfunksjoner ETTER at innholdet er lastet og vist
            setupEventListeners(recipeId, user.id);
        })
        .catch(error => {
            console.error('Error in recipe loading process:', error);
            showError('An unexpected error occurred');
        });
});

/**
 * Laster oppskriftsdetaljer fra API
 * @param {string|number} recipeId - ID-en til oppskriften som skal lastes
 * @param {string|number} userId - ID-en til gjeldende bruker
 * @returns {Promise} - Promise som løses når innholdet er lastet
 */
async function loadRecipeDetails(recipeId, userId) {
    try {
        // Vis lastestatus
        const container = document.getElementById('recipe-detail-container');
        container.innerHTML = '<div class="loading">Loading recipe details...</div>';
        
        // Hent oppskriftsdata med bruker-ID for autorisasjon
        const response = await fetch(`/recipes/${recipeId}?user_id=${userId}`);
        
        if (!response.ok) {
            // Håndterer feil, inkludert 404 for ikke funnet eller ikke autorisert
            if (response.status === 404) {
                showError('Recipe not found or you do not have permission to view it');
            } else {
                showError('Failed to load recipe details');
            }
            return;
        }
        
        const recipe = await response.json();
        console.log('Recipe loaded:', recipe);
        
        // Vis oppskriftsdetaljer
        displayRecipeDetails(recipe, userId);
    } catch (err) {
        console.error('Error loading recipe details:', err);
        showError('An error occurred while loading the recipe');
    }
}

/**
 * Viser detaljert oppskriftsinformasjon
 * @param {Object} recipe - Oppskriftsdataobjekt
 * @param {string|number} userId - ID-en til gjeldende bruker
 */
function displayRecipeDetails(recipe, userId) {
    // finner div container hvor oppskriftens detaljer skal vises
    const container = document.getElementById('recipe-detail-container');
    
    // Forbered ingrediens- og instruksjonslister
    // Deler opp ingredienser og instruksjoner i linjer og filtrerer tomme linjer
    // og lager en liste med HTML-elementer (<li>)
    const ingredientsList = recipe.ingredients.split('\n')
        .filter(item => item.trim())
        .map(item => `<li>${item.trim()}</li>`)
        .join('');
    
    // gjør det samme som ingridienser
    // i tillegg nummereres hvert punkt i instruksjonene ved å bruke index + 1
    const instructionsList = recipe.instructions.split('\n')
        .filter(item => item.trim())
        .map((item, index) => `<li><span class="step-number">${index + 1}</span> ${item.trim()}</li>`)
        .join('');
    
    // Bestem bilde-HTML
    // Hvis oppskriften har bilde, lages et div med background-image.
    // Hvis ikke, vises en standard "ingen bilde"-melding med ikon
    const imageHtml = recipe.image_url
        ? `<div class="recipe-detail-image" style="background-image: url('${recipe.image_url}')"></div>`
        : `<div class="recipe-detail-image no-image">
             <i class="fas fa-utensils"></i>
             <p>No image available</p>
           </div>`;
    
    // Generer kategorietikett hvis kategori eksisterer
    // Viser hvilken kategori oppskriften tilhører.
    // Hvis den ikke har noen, vises “Uncategorized”.
    const categoryBadge = recipe.category_name
        ? `<span class="category-badge">${recipe.category_name}</span>`
        : '<span class="category-badge">Uncategorized</span>';
        
    // Favoritt-stjerneikon - bruker aktiv-klasse for styling
    const favoriteIcon = recipe.is_favorite
        ? '<i class="fas fa-star"></i>'
        : '<i class="far fa-star"></i>';
    
    const favoriteActiveClass = recipe.is_favorite ? 'active' : '';
    
    // Bygger HTML med forbedret favorittknapp-styling og rediger-lenke med user_id
    // KI er brukt en god del brukt for å sette opp HTML-strukturen :)
    container.innerHTML = `
        <div class="top-navigation">
            <a href="/recipes.html" class="btn-back">
                <i class="fas fa-arrow-left"></i> Back to Recipes
            </a>
        </div>
        
        <div class="recipe-detail-header">
            <div class="recipe-detail-title-section">
                <h1>${recipe.title}</h1>
                <div class="recipe-detail-actions">
                    <a href="/edit-recipe.html?id=${recipe.id}&user_id=${userId}" class="action-btn btn-edit">
                        <i class="fas fa-edit"></i> Edit
                    </a>
                    <button id="delete-recipe" class="action-btn btn-delete">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            
            <div class="recipe-detail-meta">
                ${categoryBadge}
                <div class="recipe-detail-favorite">
                    <button id="favorite-toggle" class="favorite-btn recipe-favorite ${favoriteActiveClass}" 
                            data-is-favorite="${recipe.is_favorite ? 'true' : 'false'}"
                            data-recipe-id="${recipe.id}">
                        ${favoriteIcon}
                    </button>
                </div>
            </div>
        </div>
        
        ${imageHtml}
        
        <div class="recipe-detail-content">
            <div class="recipe-ingredients">
                <h2>Ingredients</h2>
                <ul class="ingredients-list">
                    ${ingredientsList}
                </ul>
            </div>
            
            <div class="recipe-instructions">
                <h2>Instructions</h2>
                <ol class="instructions-list">
                    ${instructionsList}
                </ol>
            </div>
        </div>
        
        <div id="delete-modal" class="modal">
            <div class="modal-overlay"></div>
            <div class="modal-container">
                <div class="modal-header">
                    <h3><i class="fas fa-exclamation-triangle"></i> Delete Recipe</h3>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete this recipe?</p>
                    <p class="warning">This action cannot be undone.</p>
                </div>
                <div class="modal-footer">
                    <button id="cancel-delete" class="btn">Cancel</button>
                    <button id="confirm-delete" class="btn btn-danger">Delete</button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Konfigurerer hendelsesfunksjoner for oppskriftshandlinger
 * @param {string|number} recipeId - ID-en til gjeldende oppskrift
 * @param {string|number} userId - ID-en til gjeldende bruker
 */
function setupEventListeners(recipeId, userId) {
    console.log('Setting up event listeners for recipe', recipeId);
    
    // Favorittknapp
    const favoriteToggle = document.getElementById('favorite-toggle');
    if (favoriteToggle) {
        console.log('Found favorite toggle button:', favoriteToggle);
        
        // Legg til eksplisitt klikkhåndterer med konsolllogging
        favoriteToggle.onclick = function() {
            console.log('Favorite button clicked!');
            toggleFavorite(recipeId, userId, this);
        };
    } else {
        console.warn('Favorite toggle button not found in the DOM');
    }
    
    // Sletteknapp og modalkontroller
    const deleteRecipeBtn = document.getElementById('delete-recipe');
    if (deleteRecipeBtn) {
        deleteRecipeBtn.addEventListener('click', showDeleteConfirmation);
    }
    
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', hideDeleteConfirmation);
    }
    
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', () => deleteRecipe(recipeId, userId));
    }
    
    // Modal-overtrekk-klikk for å avbryte
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', hideDeleteConfirmation);
    }
    
    // ESC-tast for å lukke modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('modal-open')) {
            hideDeleteConfirmation();
        }
    });
    
    // Sjekk om redigeringsknappen har riktig bruker-ID
    const editBtn = document.querySelector('.btn-edit');
    if (editBtn) {
        const href = editBtn.getAttribute('href');
        if (!href.includes('user_id=')) {
            // Korrigerer href hvis bruker-ID mangler
            editBtn.setAttribute('href', `${href}&user_id=${userId}`);
        }
    }
}

/**
 * Veksler favoritt-status for en oppskrift
 * @param {string|number} recipeId - ID-en til oppskriften
 * @param {string|number} userId - ID-en til gjeldende bruker
 * @param {HTMLElement} button - Favoritt-vekselknappen
 */
async function toggleFavorite(recipeId, userId, button) {
    console.log('Toggle favorite called for recipe:', recipeId);
    
    try {
        // Hent gjeldende favoritt-status fra dataattributt og veksle den
        const currentStatus = button.dataset.isFavorite === 'true';
        const newStatus = !currentStatus;
        
        console.log('Current status:', currentStatus, 'New status:', newStatus);
        
        // Lagre originalstatus før veksling (for tilbakestilling om nødvendig)
        const originalStatus = currentStatus;
        
        // Optimistisk brukergrensesnitt-oppdatering først for bedre brukeropplevelse
        button.dataset.isFavorite = String(newStatus);
        
        if (newStatus) {
            button.classList.add('active');
            button.innerHTML = '<i class="fas fa-star"></i>';
            button.classList.add('just-favorited');
            setTimeout(() => button.classList.remove('just-favorited'), 500);
        } else {
            button.classList.remove('active');
            button.innerHTML = '<i class="far fa-star"></i>';
        }
        
        // Deaktiver knappen under forespørselen
        button.disabled = true;
        
        // Send forespørsel for å veksle favoritt-status
        const response = await fetch(`/recipes/${recipeId}/favorite?user_id=${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_favorite: newStatus })
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`Failed to update favorite status: ${response.status}`);
        }
        
        // Forsøk å tolke respons, men ikke mislykkes hvis ingen JSON returneres
        try {
            const data = await response.json();
            console.log('Favorite status updated:', data);
        } catch (jsonError) {
            // Responsen kan være tom eller ikke JSON, men fortsatt vellykket
            console.log('Favorite status updated successfully (no JSON response)');
        }
        
    } catch (err) {
        console.error('Error updating favorite status:', err);
        
        // Tilbakestill brukergrensesnitt-endringer hvis API-kall mislykkes
        button.dataset.isFavorite = String(originalStatus);
        
        if (originalStatus) {
            button.classList.add('active');
            button.innerHTML = '<i class="fas fa-star"></i>';
        } else {
            button.classList.remove('active');
            button.innerHTML = '<i class="far fa-star"></i>';
        }
        
        alert('Failed to update favorite status. Please try again.');
    } finally {
        // Aktiver knappen igjen
        button.disabled = false;
    }
}

/**
 * Vis slettebekreftelsesmodal
 */
function showDeleteConfirmation() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        document.body.classList.add('modal-open');
        modal.classList.add('show');
    }
}

/**
 * Skjul slettebekreftelsesmodal
 */
function hideDeleteConfirmation() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            document.body.classList.remove('modal-open');
        }, 300);
    }
}

/**
 * Slett en oppskrift og omdiriger til oppskriftssiden
 * @param {string|number} recipeId - ID-en til oppskriften som skal slettes
 * @param {string|number} userId - ID-en til gjeldende bruker
 */
async function deleteRecipe(recipeId, userId) {
    try {
        // Vis en slettestatus i modalen
        const confirmDeleteBtn = document.getElementById('confirm-delete');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        }
        
        // Send sletteforespørsel
        const response = await fetch(`/recipes/${recipeId}?user_id=${userId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete recipe');
        }
        
        // Omdiriger til oppskriftsside ved vellykket sletting
        window.location.href = '/recipes.html';
    } catch (err) {
        console.error('Error deleting recipe:', err);
        alert('Failed to delete recipe. Please try again.');
        
        // Tilbakestill knapp ved feil
        const confirmDeleteBtn = document.getElementById('confirm-delete');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = 'Delete';
        }
        
        // Skjul modalen
        hideDeleteConfirmation();
    }
}

/**
 * Vis feilmelding når oppskriften ikke kan lastes
 * @param {string} message - Feilmeldingen som skal vises
 */
function showError(message) {
    const container = document.getElementById('recipe-detail-container');
    container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-circle"></i>
            <p>${message}</p>
            <a href="/recipes.html" class="btn">Back to My Recipes</a>
        </div>
    `;
}

/**
 * Dekoder en kodet oppskrifts-ID
 * @param {string} encodedId - Den kodede oppskrifts-ID-en
 * @returns {string|null} - Dekodet ID eller null hvis ugyldig
 */
function decodeRecipeId(encodedId) {
    // Enkel dekodingsimplementasjon - erstatt med faktisk implementering
    try {
        return atob(encodedId);
    } catch (e) {
        console.error('Invalid encoded ID:', e);
        return null;
    }
}