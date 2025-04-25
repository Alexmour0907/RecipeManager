/**
 * RecipeManager - Oppskriftsside
 * ------------------------------
 * Denne filen håndterer funksjonaliteten for oppskriftsoversikten, inkludert:
 * - Visning av alle brukerens oppskrifter i et rutenettformat
 * - Filtrering av oppskrifter etter kategori
 * - Filtrering av favorittmerkte oppskrifter
 * - Håndtering av favorittmarkering
 * - Sletting av oppskrifter
 * - Navigasjon til detaljvisning og redigeringssider
 */

// Last inn oppskrifter og kategorier når siden lastes
document.addEventListener('DOMContentLoaded', async () => {
    // Sjekk autentisering - sikrer at bare innloggede brukere får tilgang
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        window.location.href = '/login.html';
        return;
    }
    
    try {
        // Sjekk om vi skal filtrere favoritter basert på URL-parameter
        const urlParams = new URLSearchParams(window.location.search);
        const showFavorites = urlParams.get('favorites') === '1';
        
        // Sett opp favorittfilterknapp hvis den eksisterer
        const favFilterBtn = document.getElementById('favorites-filter');
        if (favFilterBtn) {
            if (showFavorites) {
                favFilterBtn.classList.add('active');
            }
            
            // Legg til klikkhåndterer for favorittfiltrering
            favFilterBtn.addEventListener('click', () => {
                const isActive = favFilterBtn.classList.contains('active');
                
                if (isActive) {
                    // Fjern filter
                    favFilterBtn.classList.remove('active');
                    loadRecipes(document.getElementById('category-select').value);
                } else {
                    // Aktiver filter
                    favFilterBtn.classList.add('active');
                    loadRecipes(document.getElementById('category-select').value, true);
                }
            });
        }
        
        // Last inn kategorier til filterdropdown
        await loadCategories();
        
        // Last inn oppskrifter med passende filtre
        await loadRecipes(null, showFavorites);
        
        // Sett opp kategorifiltrering
        const categorySelect = document.getElementById('category-select');
        if (categorySelect) {
            categorySelect.addEventListener('change', async (e) => {
                const categoryId = e.target.value;
                const showFavoritesOnly = document.getElementById('favorites-filter')?.classList.contains('active') || false;
                await loadRecipes(categoryId, showFavoritesOnly);
            });
        }
    } catch (err) {
        console.error('Feil ved initialisering av siden:', err);
    }
});

/**
 * Laster inn kategorier i nedtrekksmenyen
 * Kategoriene deles inn i standardkategorier og brukerdefinerte kategorier
 */
async function loadCategories() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`/categories?user_id=${user.id}`);
        if (!response.ok) throw new Error('Kunne ikke hente kategorier');
        
        const categories = await response.json();
        const select = document.getElementById('category-select');
        
        if (!select) return; // Hopp over hvis elementet ikke eksisterer
        
        // Tøm eksisterende alternativer unntatt det første (som er "Alle kategorier")
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Opprett kategorigupper
        const defaultGroup = document.createElement('optgroup');
        defaultGroup.label = 'Standard Categories';
        
        const userGroup = document.createElement('optgroup');
        userGroup.label = 'My Categories';
        
        // Sorter kategorier i passende grupper
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            
            if (category.user_id) {
                userGroup.appendChild(option);
            } else {
                defaultGroup.appendChild(option);
            }
        });
        
        // Legg til gruppene i nedtrekkslisten hvis de har alternativer
        if (defaultGroup.children.length > 0) {
            select.appendChild(defaultGroup);
        }
        
        if (userGroup.children.length > 0) {
            select.appendChild(userGroup);
        }
    } catch (err) {
        console.error('Feil ved lasting av kategorier:', err);
    }
}

/**
 * Laster inn oppskrifter, valgfritt filtrert etter kategori og/eller favoritter
 * @param {number|string|null} categoryId - ID-en til kategorien som skal filtreres på, eller null for alle
 * @param {boolean} favoritesOnly - Hvis true, vis bare favorittoppskrifter
 */
async function loadRecipes(categoryId = null, favoritesOnly = false) {
    // Hent brukerdata fra lokal lagring
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || !user.id) {
        console.error('Bruker ikke innlogget');
        window.location.href = '/login.html';
        return;
    }
    
    const recipesContainer = document.getElementById('recipes-container');
    if (!recipesContainer) return;
    
    // Vis lastindikator
    recipesContainer.innerHTML = '<div class="loading">Loading recipes...</div>';
    
    try {
        // Bestem hvilken URL som skal brukes basert på filtrering
        let url;
        if (categoryId) {
            url = `/categories/${categoryId}/recipes?user_id=${user.id}`;
        } else {
            url = `/recipes?user_id=${user.id}`;
        }
        
        // Legg til favorittfilter hvis aktivert
        if (favoritesOnly) {
            url += '&favorites=1';
        }
        
        console.log('Henter oppskrifter fra:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Kunne ikke hente oppskrifter: ${response.status}`);
        }
        
        const recipes = await response.json();
        console.log('Oppskrifter lastet:', recipes);
        
        // Oppdater oppskriftsantall
        const countDisplay = document.getElementById('recipe-count-display');
        if (countDisplay) {
            countDisplay.textContent = recipes.length;
        }
        
        recipesContainer.innerHTML = '';
        
        if (recipes.length === 0) {
            recipesContainer.innerHTML = '<p class="no-recipes">No recipes found. Try adding your first recipe!</p>';
            return;
        }
        
        // Opprett oppskriftskort med bilder
        recipes.forEach(recipe => {
            const card = createRecipeCard(recipe);
            recipesContainer.appendChild(card);
        });
        
        // Legg til hendelsesfunksjon for interaktive knapper
        addEventListeners();
        
    } catch (err) {
        console.error('Feil ved lasting av oppskrifter:', err);
        recipesContainer.innerHTML = `<p class="error-message">Error loading recipes: ${err.message}</p>`;
    }
}

/**
 * Oppretter et oppskriftskort med bildestøtte
 * @param {Object} recipe - Oppskriftsobjektet som skal vises
 * @returns {HTMLElement} Det opprettede oppskriftskortelementet
 */
function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.dataset.id = recipe.id;
    
    if (recipe.is_favorite) {
        card.classList.add('is-favorite');
    }
    
    // Opprett bildedelen
    const imageSection = recipe.image_url 
        ? `<div class="recipe-card-image" style="background-image: url('${recipe.image_url}')"></div>`
        : `<div class="recipe-card-image no-image">
             <i class="fas fa-utensils"></i>
           </div>`;
    
    // Her bør vi bruke encodeRecipeId(recipe.id) i href for å skjule ID-ene i URL-en,
    // men vi beholder ren tekst for kompatibilitet med eksisterende kode
    card.innerHTML = `
        ${imageSection}
        <div class="recipe-card-content">
            <h3>${recipe.title}</h3>
            <div class="recipe-card-category">${recipe.category_name || 'Uncategorized'}</div>
        </div>
        <div class="recipe-card-actions">
            <button class="favorite-btn ${recipe.is_favorite ? 'active' : ''}" data-id="${recipe.id}">
                <i class="${recipe.is_favorite ? 'fas' : 'far'} fa-star"></i>
            </button>
            <a href="/recipe-detail.html?id=${recipe.id}" class="action-btn btn-view">
                <i class="fas fa-eye"></i> View
            </a>
            <a href="/edit-recipe.html?id=${recipe.id}" class="action-btn btn-edit">
                <i class="fas fa-edit"></i> Edit
            </a>
            <button class="action-btn btn-delete delete-recipe" data-id="${recipe.id}">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    return card;
}

/**
 * Legger til hendelsesfunksjoner til oppskriftsknapper
 */
function addEventListeners() {
    // Legg til hendelsesfunksjoner for sletteknapper
    document.querySelectorAll('.delete-recipe').forEach(button => {
        button.addEventListener('click', deleteRecipe);
    });
    
    // Legg til hendelsesfunksjoner for favorittknapper
    document.querySelectorAll('.favorite-btn').forEach(button => {
        button.addEventListener('click', toggleFavorite);
    });
}

/**
 * Håndterer sletting av oppskrifter
 * @param {Event} e - Hendelseobjektet fra klikket
 */
async function deleteRecipe(e) {
    const recipeId = e.target.getAttribute('data-id');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (confirm('Are you sure you want to delete this recipe?')) {
        try {
            const response = await fetch(`/recipes/${recipeId}?user_id=${user.id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Visuell tilbakemelding før omladning
                const card = e.target.closest('.recipe-card');
                if (card) {
                    card.classList.add('deleting');
                    setTimeout(() => {
                        // Last inn gjeldende oppskriftsliste på nytt etter sletting
                        const categoryId = document.getElementById('category-select')?.value || null;
                        const showFavoritesOnly = document.getElementById('favorites-filter')?.classList.contains('active') || false;
                        loadRecipes(categoryId, showFavoritesOnly);
                    }, 300);
                } else {
                    // Fallback hvis kort-elementet ikke finnes
                    const categoryId = document.getElementById('category-select')?.value || null;
                    const showFavoritesOnly = document.getElementById('favorites-filter')?.classList.contains('active') || false;
                    loadRecipes(categoryId, showFavoritesOnly);
                }
            } else {
                const error = await response.json();
                alert(error.message || 'Could not delete recipe');
            }
        } catch (err) {
            console.error('Feil ved sletting av oppskrift:', err);
            alert('An error occurred while deleting the recipe');
        }
    }
}

/**
 * Veksler favoritt-status for en oppskrift
 * @param {Event} e - Hendelseobjektet fra klikket
 */
async function toggleFavorite(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const btn = e.currentTarget;
    const recipeId = btn.getAttribute('data-id');
    const user = JSON.parse(localStorage.getItem('user'));
    const isFavorite = btn.classList.contains('active');
    
    try {
        const response = await fetch(`/recipes/${recipeId}/favorite?user_id=${user.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_favorite: !isFavorite })
        });
        
        if (response.ok) {
            // Veksle aktiv-klasse
            btn.classList.toggle('active');
            
            // Legg til animasjonsklasse
            btn.classList.add('just-favorited');
            setTimeout(() => {
                btn.classList.remove('just-favorited');
            }, 500);
            
            // Veksle ikon
            btn.innerHTML = !isFavorite ? 
                '<i class="fas fa-star"></i>' : 
                '<i class="far fa-star"></i>';
                
            // Veksle kortklasse
            const card = btn.closest('.recipe-card');
            if (card) {
                card.classList.toggle('is-favorite');
            }
            
            // Hvis vi er i kun-favoritter-visning og vi fjerner favorittmarkering, må vi kanskje fjerne kortet
            if (isFavorite && document.getElementById('favorites-filter')?.classList.contains('active')) {
                // Last inn på nytt for å fjerne kortet fra visningen
                setTimeout(() => {
                    const categoryId = document.getElementById('category-select')?.value || null;
                    loadRecipes(categoryId, true);
                }, 300);
            }
        } else {
            const error = await response.json();
            console.error('Kunne ikke oppdatere favoritt-status:', error);
        }
    } catch (err) {
        console.error('Feil ved veksling av favoritt-status:', err);
    }
}