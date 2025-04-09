/**
 * Recipe Manager - Main JavaScript
 * Handles dashboard loading, recipe card creation and general functionality
 */

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the home page
    if (window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        const user = JSON.parse(localStorage.getItem('user'));
        const homeActions = document.querySelector('.home-actions');
        const loginView = document.getElementById('login-view');
        const dashboardView = document.getElementById('dashboard-view');
        
        if (user && user.id) {
            // User is logged in - show dashboard
            if (loginView) loginView.style.display = 'none';
            if (dashboardView) dashboardView.style.display = 'block';
            
            // Set username in welcome message
            const usernameDisplay = document.getElementById('username-display');
            if (usernameDisplay) {
                usernameDisplay.textContent = user.username;
            }
            
            // Show appropriate actions
            if (homeActions) {
                homeActions.innerHTML = `
                    <a href="/recipes.html" class="btn">My Recipes</a>
                    <a href="/add-recipe.html" class="btn">Add New Recipe</a>
                    <a href="#" id="logout-btn-home" class="btn">Logout</a>
                `;
            }
            
            // Load dashboard data
            loadDashboard(user.id);
            
        } else {
            // User is not logged in - show login view
            if (loginView) loginView.style.display = 'block';
            if (dashboardView) dashboardView.style.display = 'none';
            
            // Show login/register options
            if (homeActions) {
                homeActions.innerHTML = `
                    <a href="/login.html" class="btn">Login</a>
                    <a href="/register.html" class="btn">Register</a>
                `;
            }
        }
    }
});

// Registration form handling
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            username: document.getElementById('username').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };
    
        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Registration successful! Please login.');
                window.location.href = '/login.html';
            } else {
                alert(data.error || 'Registration failed');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('An error occurred. Please try again.');
        }
    });
}

// Login form handling
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            username: document.getElementById('username').value,
            password: document.getElementById('password').value
        };
    
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Save user data to local storage
                localStorage.setItem('user', JSON.stringify(data));
                window.location.href = '/';
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (err) {
            console.error('Error:', err);
            alert('An error occurred. Please try again.');
        }
    });
}

/**
 * Creates a recipe card with image support for the homepage
 * @param {Object} recipe - The recipe data object
 * @param {HTMLElement} container - The container to append the card to
 */
function createRecipeCard(recipe, container) {
    const card = document.createElement('div');
    card.className = 'recipe-preview-card';
    card.dataset.id = recipe.id;
    
    // Add is-favorite class if the recipe is marked as favorite
    if (recipe.is_favorite) {
        card.classList.add('is-favorite');
    }
    
    // Create the image part
    const imageHtml = recipe.image_url 
        ? `<div class="recipe-preview-image" style="background-image: url('${recipe.image_url}')"></div>`
        : `<div class="recipe-preview-image no-image">
             <i class="fas fa-utensils"></i>
           </div>`;
    
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
    
    container.appendChild(card);
}

/**
 * Load and display dashboard data
 * @param {string|number} userId - The user ID
 */
async function loadDashboard(userId) {
    try {
        const response = await fetch(`/dashboard?user_id=${userId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch dashboard data');
        }
        
        const data = await response.json();
        console.log('Dashboard data:', data);
        
        // Update stats
        document.getElementById('total-recipes').textContent = data.stats.totalRecipes;
        
        // The ID for favorite recipes count differs from the container ID for favorite recipes
        document.getElementById('favorite-recipes-count').textContent = data.stats.favoriteRecipes;
        document.getElementById('total-categories').textContent = data.stats.categories;
        
        // Display recent recipes
        displayRecentRecipes(data.recentRecipes);
        
        // Display favorite recipes
        displayFavoriteRecipes(data.favoriteRecipes);
        
    } catch (err) {
        console.error('Error loading dashboard:', err);
        // Display error state
        if (document.getElementById('recent-recipes')) {
            document.getElementById('recent-recipes').innerHTML = 
                '<p class="no-data">Error loading recent recipes.</p>';
        }
        
        if (document.getElementById('favorite-recipes')) {
            document.getElementById('favorite-recipes').innerHTML = 
                '<p class="no-data">Error loading favorite recipes.</p>';
        }
    }
}

/**
 * Display recent recipes
 * @param {Array} recipes - Array of recipe objects
 */
function displayRecentRecipes(recipes) {
    const recentContainer = document.getElementById('recent-recipes');
    if (!recentContainer) return;
    
    recentContainer.innerHTML = '';
    
    if (recipes.length === 0) {
        recentContainer.innerHTML = '<p class="no-data">No recipes yet. <a href="/add-recipe.html">Create your first recipe</a>!</p>';
        return;
    }
    
    recipes.forEach(recipe => createRecipeCard(recipe, recentContainer));
}

/**
 * Display favorite recipes
 * @param {Array} recipes - Array of recipe objects
 */
function displayFavoriteRecipes(recipes) {
    const favoritesContainer = document.getElementById('favorite-recipes');
    if (!favoritesContainer) return;
    
    favoritesContainer.innerHTML = '';
    
    if (recipes.length === 0) {
        favoritesContainer.innerHTML = '<p class="no-data">No favorite recipes yet. Mark recipes as favorites to see them here.</p>';
        return;
    }
    
    recipes.forEach(recipe => createRecipeCard(recipe, favoritesContainer));
}