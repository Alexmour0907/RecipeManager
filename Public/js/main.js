/**
 * RecipeManager - Hoved-JavaScript
 * ---------------------------------
 * Håndterer dashbord-lasting, oppskriftskort-opprettelse og generell funksjonalitet
 * 
 * Denne filen inneholder sentrale funksjoner for applikasjonen:
 * - Brukerautentisering og håndtering av innloggingsstatus
 * - Dashbord-innlasting med statistikk og oppskriftssamlinger
 * - Opprettelse av oppskriftskort med bilde- og favoritt-støtte
 * - Registrerings- og innloggingsskjema-håndtering
 */

// Initialiser når DOM er klar
document.addEventListener('DOMContentLoaded', () => {
    // Sjekk om vi er på hjemmesiden
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        // Hent brukerdata fra lokal lagring for å sjekke innloggingsstatus
        const user = JSON.parse(localStorage.getItem('user'));
        const homeActions = document.querySelector('.home-actions');
        const loginView = document.getElementById('login-view');
        const dashboardView = document.getElementById('dashboard-view');
        
        if (user && user.id) {
            // Bruker er innlogget - vis dashbord
            // Skjul innloggingsvisning og vis dashbord-visning
            if (loginView) loginView.style.display = 'none';
            if (dashboardView) dashboardView.style.display = 'block';
            
            // Sett brukernavn i velkomstmelding for personalisert opplevelse
            const usernameDisplay = document.getElementById('username-display');
            if (usernameDisplay) {
                usernameDisplay.textContent = user.username;
            }
            
            // Vis relevante handlingsknapper for innlogget bruker
            // Dette inkluderer navigasjon til oppskrifter, legge til nye og logge ut
            if (homeActions) {
                homeActions.innerHTML = `
                    <a href="/recipes.html" class="btn">My Recipes</a>
                    <a href="/add-recipe.html" class="btn">Add New Recipe</a>
                    <a href="#" id="logout-btn-home" class="btn">Logout</a>
                `;
            }
            
            // Last dashbord-data med brukerens ID for å vise deres personlige data
            loadDashboard(user.id);
            
        } else {
            // Bruker er ikke innlogget - vis innloggingsvisning
            // Dette gir tilgang til innlogging/registrering før bruk av applikasjonen
            if (loginView) loginView.style.display = 'block';
            if (dashboardView) dashboardView.style.display = 'none';
            
            // Vis innloggings-/registreringsalternativer for gjestebrukere
            if (homeActions) {
                homeActions.innerHTML = `
                    <a href="/login.html" class="btn">Login</a>
                    <a href="/register.html" class="btn">Register</a>
                `;
            }
        }
    }
});

// Registreringsskjema-håndtering
// Fanger opp innsending av registreringsskjema og sender data til server
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Samle inn skjemadata for registrering
        const formData = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };
    
        try {
            // Send registreringsforespørselen til serveren via POST
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            // Håndter resultatet av registreringen
            if (response.ok) {
                // Ved vellykket registrering, informer brukeren og omdiriger til innloggingssiden
                alert('Registration successful! Please login.');
                window.location.href = '/login.html';
            } else {
                // Ved feil, vis feilmelding fra server eller generisk melding
                alert(data.error || 'Registration failed');
            }
        } catch (err) {
            // Håndter nettverksfeil eller andre uventede problemer
            console.error('Error:', err);
            alert('An error occurred. Please try again.');
        }
    });
}

// Innloggingsskjema-håndtering
// Håndterer validering og innsending av brukerinnloggingsinformasjon
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Samle inn påloggingsinformasjon fra skjemaet
        const formData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        };
    
        try {
            // Send innloggingsforespørsel til serveren
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            // Håndter innloggingsresultat
            if (response.ok) {
                // Lagre brukerdata til lokal lagring for framtidig bruk og autentisering
                // Dette gjør det mulig for appen å huske brukerens sesjon
                localStorage.setItem('user', JSON.stringify(data));
                window.location.href = '/';
            } else {
                // Ved mislykket innlogging, vis feilmelding
                alert(data.error || 'Login failed');
            }
        } catch (err) {
            // Håndter nettverksfeil eller andre uventede problemer
            console.error('Error:', err);
            alert('An error occurred. Please try again.');
        }
    });
}

/**
 * Oppretter et oppskriftskort med bildestøtte for hjemmesiden
 * Hvert kort viser oppskriftens grunnleggende informasjon og gir navigasjon til detaljer
 * 
 * @param {Object} recipe - Oppskriftsdataobjektet med all nødvendig informasjon
 * @param {HTMLElement} container - Beholderen kortet skal legges til i
 */
function createRecipeCard(recipe, container) {
    // Opprett hovedelementet for kortet
    const card = document.createElement('div');
    card.className = 'recipe-preview-card';
    card.dataset.id = recipe.id;
    
    // Legg til is-favorite-klasse hvis oppskriften er markert som favoritt
    // Dette muliggjør spesiell styling for favorittmerkte elementer
    if (recipe.is_favorite) {
        card.classList.add('is-favorite');
    }
    
    // Opprett bildedelen med støtte for manglende bilder
    // Hvis ingen bilde finnes, vises et utensils-ikon som plassholder
    const imageHtml = recipe.image_url 
        ? `<div class="recipe-preview-image" style="background-image: url('${recipe.image_url}')"></div>`
        : `<div class="recipe-preview-image no-image">
             <i class="fas fa-utensils"></i>
           </div>`;
    
    // Bygg den fullstendige HTML-strukturen for kortet
    card.innerHTML = `
        ${imageHtml}
        <div class="recipe-preview-content">
            <h3>${recipe.title}</h3>
            <div class="recipe-preview-category">
                ${recipe.category_name || 'Uncategorized'}
            </div>
            <a href="/recipe-detail.html?id=${recipe.id}" class="action-btn preview-link">
               <i class="fas fa-eye"></i> View Recipe
            </a>
        </div>
    `;
    
    // Legg til det ferdige kortet i den angitte beholderen
    container.appendChild(card);
}

/**
 * Last og vis dashbord-data for en bestemt bruker
 * Dette inkluderer statistikk, nylige oppskrifter og favoritter
 * 
 * @param {string|number} userId - Bruker-ID for datainnhenting
 */
async function loadDashboard(userId) {
    try {
        // Hent dashbord-data fra serveren for den spesifikke brukeren
        const response = await fetch(`/dashboard?user_id=${userId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }
        
        // Parse JSON-responsen med alle dashbord-elementer
        const data = await response.json();
        console.log('Dashboard data:', data);
        
        // Oppdater statistikk-tellere i brukergrensesnittet
        // Disse viser totalt antall oppskrifter, favoritter og kategorier
        document.getElementById('total-recipes').textContent = data.stats.totalRecipes;
        
        // ID for favorittoppskriftsantall er forskjellig fra beholder-ID for favorittoppskrifter
        document.getElementById('favorite-recipes-count').textContent = data.stats.favoriteRecipes;
        document.getElementById('total-categories').textContent = data.stats.categories;
        
        // Vis nylige oppskrifter i sin dedikerte seksjon
        displayRecentRecipes(data.recentRecipes);
        
        // Vis favorittoppskrifter i sin dedikerte seksjon
        displayFavoriteRecipes(data.favoriteRecipes);
        
    } catch (err) {
        // Håndter eventuelle feil under datahenting og vis feilmeldinger i brukergrensesnittet
        console.error('Error loading dashboard:', err);
        
        // Vis feiltilstand i nylige oppskrifter-seksjonen
        if (document.getElementById('recent-recipes')) {
            document.getElementById('recent-recipes').innerHTML = 
                '<p class="no-data">Error loading recent recipes.</p>';
        }
        
        // Vis feiltilstand i favorittoppskrifter-seksjonen
        if (document.getElementById('favorite-recipes')) {
            document.getElementById('favorite-recipes').innerHTML = 
                '<p class="no-data">Error loading favorite recipes.</p>';
        }
    }
}

/**
 * Vis nylige oppskrifter i dashbord-visningen
 * Dette gir brukeren rask tilgang til deres sist brukte oppskrifter
 * 
 * @param {Array} recipes - Samling av oppskriftsobjekter sortert etter nyeste først
 */
function displayRecentRecipes(recipes) {
    // Finn beholderen der de nylige oppskriftene skal vises
    const recentContainer = document.getElementById('recent-recipes');
    if (!recentContainer) return;
    
    // Tøm beholderen før nye elementer legges til
    recentContainer.innerHTML = '';
    
    // Hvis det ikke er noen oppskrifter, vis en melding med lenke til å opprette ny
    if (recipes.length === 0) {
        recentContainer.innerHTML = '<p class="no-data">No recipes yet. <a href="/add-recipe.html">Create your first recipe</a>!</p>';
        return;
    }
    
    // For hver nylig oppskrift, opprett et kort og legg det til i beholderen
    // Dette bruker createRecipeCard-funksjonen definert tidligere
    recipes.forEach(recipe => createRecipeCard(recipe, recentContainer));
}

/**
 * Vis favorittoppskrifter i dashbord-visningen
 * Dette gir brukeren enkel tilgang til oppskrifter de har markert som favoritter
 * 
 * @param {Array} recipes - Samling av oppskriftsobjekter markert som favoritter
 */
function displayFavoriteRecipes(recipes) {
    // Finn beholderen der favorittoppskriftene skal vises
    const favoritesContainer = document.getElementById('favorite-recipes');
    if (!favoritesContainer) return;
    
    // Tøm beholderen før nye elementer legges til
    favoritesContainer.innerHTML = '';
    
    // Hvis det ikke er noen favorittoppskrifter, vis en veiledende melding
    if (recipes.length === 0) {
        favoritesContainer.innerHTML = '<p class="no-data">No favorite recipes yet. Mark recipes as favorites to see them here.</p>';
        return;
    }
    
    // For hver favorittoppskrift, opprett et kort og legg det til i beholderen
    recipes.forEach(recipe => createRecipeCard(recipe, favoritesContainer));
}

// Legg til en hendelsesfunksjon for "Logg ut"-knappen, hvis den finnes
// Dette sikrer at brukere kan logge ut fra dashbordet
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutBtnHome = document.getElementById('logout-btn-home');
    
    // Felles utloggingsfunksjon som fjerner brukerdata og omdirigerer
    const handleLogout = () => {
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    };
    
    // Legger til klikkhendelse på standard utloggingsknapp hvis den finnes
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Legger til klikkhendelse på hjemmeside-utloggingsknapp hvis den finnes
    if (logoutBtnHome) {
        logoutBtnHome.addEventListener('click', handleLogout);
    }
});