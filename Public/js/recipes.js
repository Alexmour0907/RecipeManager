/**
 * Recipe Manager - Recipes Page
 * Handles displaying, filtering, and managing recipes
 */

// Load recipes and categories when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        window.location.href = '/login.html';
        return;
    }
    
    try {
        // Check if we need to filter for favorites from URL
        const urlParams = new URLSearchParams(window.location.search);
        const showFavorites = urlParams.get('favorites') === '1';
        
        // Set up favorites filter button if it exists
        const favFilterBtn = document.getElementById('favorites-filter');
        if (favFilterBtn) {
            if (showFavorites) {
                favFilterBtn.classList.add('active');
            }
            
            favFilterBtn.addEventListener('click', () => {
                const isActive = favFilterBtn.classList.contains('active');
                
                if (isActive) {
                    // Remove filter
                    favFilterBtn.classList.remove('active');
                    loadRecipes(document.getElementById('category-select').value);
                } else {
                    // Apply filter
                    favFilterBtn.classList.add('active');
                    loadRecipes(document.getElementById('category-select').value, true);
                }
            });
        }
        
        // Load categories for filter dropdown
        await loadCategories();
        
        // Load recipes with appropriate filters
        await loadRecipes(null, showFavorites);
        
        // Set up category filter functionality
        const categorySelect = document.getElementById('category-select');
        if (categorySelect) {
            categorySelect.addEventListener('change', async (e) => {
                const categoryId = e.target.value;
                const showFavoritesOnly = document.getElementById('favorites-filter')?.classList.contains('active') || false;
                await loadRecipes(categoryId, showFavoritesOnly);
            });
        }
    } catch (err) {
        console.error('Error initializing page:', err);
    }
});

// Load categories into dropdown
async function loadCategories() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`/categories?user_id=${user.id}`);
        if (!response.ok) throw new Error('Failed to fetch categories');
        
        const categories = await response.json();
        const select = document.getElementById('category-select');
        
        if (!select) return; // Skip if element doesn't exist
        
        // Clear existing options except the first one
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Create category groups
        const defaultGroup = document.createElement('optgroup');
        defaultGroup.label = 'Default Categories';
        
        const userGroup = document.createElement('optgroup');
        userGroup.label = 'My Categories';
        
        // Sort categories into appropriate groups
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
        
        // Add groups to select if they have options
        if (defaultGroup.children.length > 0) {
            select.appendChild(defaultGroup);
        }
        
        if (userGroup.children.length > 0) {
            select.appendChild(userGroup);
        }
    } catch (err) {
        console.error('Error loading categories:', err);
    }
}

// Load recipes, optionally filtered by category and/or favorites
async function loadRecipes(categoryId = null, favoritesOnly = false) {
    // Get user from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!user || !user.id) {
        console.error('User not logged in');
        window.location.href = '/login.html';
        return;
    }
    
    const recipesContainer = document.getElementById('recipes-container');
    if (!recipesContainer) return;
    
    recipesContainer.innerHTML = '<div class="loading">Loading recipes...</div>';
    
    try {
        // Determine which URL to use based on filters
        let url;
        if (categoryId) {
            url = `/categories/${categoryId}/recipes?user_id=${user.id}`;
        } else {
            url = `/recipes?user_id=${user.id}`;
        }
        
        // Add favorites filter if needed
        if (favoritesOnly) {
            url += '&favorites=1';
        }
        
        console.log('Fetching recipes from:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to fetch recipes: ${response.status}`);
        }
        
        const recipes = await response.json();
        console.log('Recipes loaded:', recipes);
        
        // Update recipe count
        const countDisplay = document.getElementById('recipe-count-display');
        if (countDisplay) {
            countDisplay.textContent = recipes.length;
        }
        
        recipesContainer.innerHTML = '';
        
        if (recipes.length === 0) {
            recipesContainer.innerHTML = '<p class="no-recipes">No recipes found. Try adding your first recipe!</p>';
            return;
        }
        
        // Create recipe cards with images
        recipes.forEach(recipe => {
            const card = createRecipeCard(recipe);
            recipesContainer.appendChild(card);
        });
        
        // Add event listeners for interactive buttons
        addEventListeners();
        
    } catch (err) {
        console.error('Error loading recipes:', err);
        recipesContainer.innerHTML = `<p class="error-message">Error loading recipes: ${err.message}</p>`;
    }
}

// Create a recipe card with image support
// Update this function in recipes.js
function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.dataset.id = recipe.id;
    
    if (recipe.is_favorite) {
        card.classList.add('is-favorite');
    }
    
    // Create the image part
    const imageSection = recipe.image_url 
        ? `<div class="recipe-card-image" style="background-image: url('${recipe.image_url}')"></div>`
        : `<div class="recipe-card-image no-image">
             <i class="fas fa-utensils"></i>
           </div>`;
    
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

// Add event listeners to recipe buttons
function addEventListeners() {
    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-recipe').forEach(button => {
        button.addEventListener('click', deleteRecipe);
    });
    
    // Add event listeners for favorite buttons
    document.querySelectorAll('.favorite-btn').forEach(button => {
        button.addEventListener('click', toggleFavorite);
    });
}

// Handle recipe deletion
async function deleteRecipe(e) {
    const recipeId = e.target.getAttribute('data-id');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (confirm('Are you sure you want to delete this recipe?')) {
        try {
            const response = await fetch(`/recipes/${recipeId}?user_id=${user.id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                // Visual feedback before reload
                const card = e.target.closest('.recipe-card');
                if (card) {
                    card.classList.add('deleting');
                    setTimeout(() => {
                        // Reload the current recipe list after deletion
                        const categoryId = document.getElementById('category-select')?.value || null;
                        const showFavoritesOnly = document.getElementById('favorites-filter')?.classList.contains('active') || false;
                        loadRecipes(categoryId, showFavoritesOnly);
                    }, 300);
                } else {
                    // Fallback if card element not found
                    const categoryId = document.getElementById('category-select')?.value || null;
                    const showFavoritesOnly = document.getElementById('favorites-filter')?.classList.contains('active') || false;
                    loadRecipes(categoryId, showFavoritesOnly);
                }
            } else {
                const error = await response.json();
                alert(error.message || 'Failed to delete recipe');
            }
        } catch (err) {
            console.error('Error deleting recipe:', err);
            alert('An error occurred while trying to delete the recipe');
        }
    }
}

// Toggle favorite status
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
            // Toggle active class
            btn.classList.toggle('active');
            
            // Add animation class
            btn.classList.add('just-favorited');
            setTimeout(() => {
                btn.classList.remove('just-favorited');
            }, 500);
            
            // Toggle icon
            btn.innerHTML = !isFavorite ? 
                '<i class="fas fa-star"></i>' : 
                '<i class="far fa-star"></i>';
                
            // Toggle parent card class
            const card = btn.closest('.recipe-card');
            if (card) {
                card.classList.toggle('is-favorite');
            }
            
            // If we're in favorites-only view and we're unfavoriting, we might need to remove the card
            if (isFavorite && document.getElementById('favorites-filter')?.classList.contains('active')) {
                // Reload to remove the card from view
                setTimeout(() => {
                    const categoryId = document.getElementById('category-select')?.value || null;
                    loadRecipes(categoryId, true);
                }, 300);
            }
        } else {
            const error = await response.json();
            console.error('Failed to update favorite status:', error);
        }
    } catch (err) {
        console.error('Error toggling favorite:', err);
    }
}