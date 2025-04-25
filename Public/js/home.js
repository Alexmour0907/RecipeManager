/**
 * RecipeManager - Hjemmeside-Controller
 * -------------------------------------
 * Denne filen håndterer funksjonalitet for hjemmesiden/dashbordet, 
 * inkludert visning av brukerdata, statistikk og oppskriftssamlinger.
 * 
 * Hovedfunksjoner:
 * - Verifiserer brukerinnlogging og viser riktig visning
 * - Laster dashbord-data fra API
 * - Viser statistikk (antall oppskrifter, favoritter, kategorier)
 * - Rendrer nylige og favorittmerkede oppskrifter
 */

// Initialiser siden når DOM er lastet
document.addEventListener('DOMContentLoaded', () => {
    // Hent brukerdata fra lokal lagring
    const user = JSON.parse(localStorage.getItem('user'));
    const loginView = document.getElementById('login-view');
    const dashboardView = document.getElementById('dashboard-view');
    
    if (user && user.id) {
        // Bruker er innlogget - vis dashbord
        loginView.style.display = 'none';
        dashboardView.style.display = 'block';
        
        // Vis brukernavn i velkomstmeldingen
        document.getElementById('username-display').textContent = user.username;
        
        // Last inn dashbord-data for den innloggede brukeren
        loadDashboard(user.id);
    } else {
        // Bruker er ikke innlogget - vis innloggingsvisning
        loginView.style.display = 'block';
        dashboardView.style.display = 'none';
    }
});

/**
 * Laster inn dashbord-data fra API-et
 * Henter statistikk og oppskriftssamlinger for å fylle dashbordet
 * 
 * @param {string|number} userId - ID-en til den innloggede brukeren
 */
async function loadDashboard(userId) {
    try {
        // Hent dashbord-data fra serveren
        const response = await fetch(`/dashboard?user_id=${userId}`);
        
        if (!response.ok) {
            throw new Error('Failed to load dashboard data');
        }
        
        const data = await response.json();
        
        // Oppdater statistikk-tellere i brukergrensesnittet
        document.getElementById('total-recipes').textContent = data.stats.totalRecipes;
        document.getElementById('favorite-recipes').textContent = data.stats.favoriteRecipes;
        document.getElementById('total-categories').textContent = data.stats.categories;
        
        // Vis nylige oppskrifter
        renderRecipeList(data.recentRecipes, 'recent-recipes');
        
        // Vis favorittmerkede oppskrifter
        renderRecipeList(data.favoriteRecipes, 'favorite-recipes-container');
        
    } catch (err) {
        // Logg feil som oppstår under datahenting
        console.error('Dashboard error:', err);
    }
}

/**
 * Rendrer en liste med oppskrifter i den spesifiserte beholderen
 * Oppretter visuelle kort for hver oppskrift med tittel og handlingsknapper
 * 
 * @param {Array} recipes - Samlingen av oppskriftsobjekter som skal vises
 * @param {string} containerId - ID-en til HTML-elementet som skal inneholde oppskriftene
 */
function renderRecipeList(recipes, containerId) {
    // Finn målbeholderen i DOM
    const container = document.getElementById(containerId);
    
    // Håndter tilfeller der ingen oppskrifter er tilgjengelige
    if (!recipes || recipes.length === 0) {
        container.innerHTML = '<p class="empty-message">No recipes found.</p>';
        return;
    }
    
    // Tøm beholderen før nye elementer legges til
    container.innerHTML = '';
    
    // Opprett og legg til et kort for hver oppskrift
    recipes.forEach(recipe => {
        // Opprett kortelementet
        const card = document.createElement('div');
        card.className = 'recipe-preview-card';
        
        // Legg til spesiell klasse for favorittmerkede oppskrifter
        if (recipe.is_favorite) {
            card.classList.add('is-favorite');
        }
        
        // Sett opp HTML-strukturen for kortet med tittel, lenke og favorittindikator
        card.innerHTML = `
            <h3>${recipe.title}</h3>
            <div class="card-actions">
                <a href="/recipe-detail.html?id=${recipe.id}" class="btn btn-sm">View</a>
                ${recipe.is_favorite ? 
                    '<i class="fas fa-star favorite-indicator"></i>' : 
                    ''}
            </div>
        `;
        
        // Legg til det ferdige kortet i beholderen
        container.appendChild(card);
    });
}