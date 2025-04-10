/**
 * Recipe Manager - Recipe Detail Page
 * Handles loading and displaying detailed recipe information
 */

// Check authentication when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Get user from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        // User not logged in, redirect to login
        window.location.href = '/login.html';
        return;
    }
    
    // Get recipe ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for both regular id and encoded r parameter
    const regularId = urlParams.get('id');
    const encodedId = urlParams.get('r');
    
    // Determine which ID to use
    let recipeId;
    
    if (encodedId) {
        // If we have an encoded ID, decode it
        recipeId = decodeRecipeId(encodedId);
        if (!recipeId) {
            showError('Invalid recipe identifier');
            return;
        }
    } else if (regularId) {
        // Use the regular ID if no encoded ID is present
        recipeId = regularId;
    } else {
        showError('Recipe ID is missing');
        return;
    }
    
    // Load recipe details
    loadRecipeDetails(recipeId, user.id);
    
    // Set up event listeners
    setupEventListeners(recipeId, user.id);
});

/**
 * Load recipe details from the API
 * @param {string|number} recipeId - The ID of the recipe to load
 * @param {string|number} userId - The ID of the current user
 */
async function loadRecipeDetails(recipeId, userId) {
    try {
        // Show loading state
        const container = document.getElementById('recipe-detail-container');
        container.innerHTML = '<div class="loading">Loading recipe details...</div>';
        
        // Fetch recipe data with user ID for authorization
        const response = await fetch(`/recipes/${recipeId}?user_id=${userId}`);
        
        if (!response.ok) {
            // Handle errors, including 404 for not found or not authorized
            if (response.status === 404) {
                showError('Recipe not found or you do not have permission to view it');
            } else {
                showError('Failed to load recipe details');
            }
            return;
        }
        
        const recipe = await response.json();
        console.log('Recipe loaded:', recipe);
        
        // Display recipe details
        displayRecipeDetails(recipe);
    } catch (err) {
        console.error('Error loading recipe details:', err);
        showError('An error occurred while loading the recipe');
    }
}

/**
 * Display detailed recipe information
 * @param {Object} recipe - Recipe data object
 */
function displayRecipeDetails(recipe) {
    const container = document.getElementById('recipe-detail-container');
    
    // Prepare ingredients and instructions lists
    const ingredientsList = recipe.ingredients.split('\n')
        .filter(item => item.trim())
        .map(item => `<li>${item.trim()}</li>`)
        .join('');
    
    const instructionsList = recipe.instructions.split('\n')
        .filter(item => item.trim())
        .map((item, index) => `<li><span class="step-number">${index + 1}</span> ${item.trim()}</li>`)
        .join('');
    
    // Determine image HTML
    const imageHtml = recipe.image_url
        ? `<div class="recipe-detail-image" style="background-image: url('${recipe.image_url}')"></div>`
        : `<div class="recipe-detail-image no-image">
             <i class="fas fa-utensils"></i>
             <p>No image available</p>
           </div>`;
    
    // Generate category badge if category exists
    const categoryBadge = recipe.category_name
        ? `<span class="category-badge">${recipe.category_name}</span>`
        : '<span class="category-badge">Uncategorized</span>';
        
    // Favorite star icon
    const favoriteIcon = recipe.is_favorite
        ? '<i class="fas fa-star"></i>'
        : '<i class="far fa-star"></i>';
    
    // Build the HTML with a new structure for better layout
    container.innerHTML = `
        <div class="recipe-detail-header">
            <div class="recipe-detail-title-section">
                <h1>${recipe.title}</h1>
            </div>
            
            <div class="recipe-detail-meta">
                ${categoryBadge}
                <button id="favorite-toggle" class="favorite-btn" data-is-favorite="${recipe.is_favorite ? 'true' : 'false'}">
                    ${favoriteIcon} ${recipe.is_favorite ? 'Favorite' : 'Add to favorites'}
                </button>
            </div>
            
            <div class="recipe-detail-actions">
                <a href="/edit-recipe.html?id=${recipe.id}" class="btn">
                    <i class="fas fa-edit"></i> Edit Recipe
                </a>
                <button id="delete-recipe" class="btn btn-danger">
                    <i class="fas fa-trash"></i> Delete Recipe
                </button>
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
        
        <div class="recipe-detail-footer">
            <a href="/recipes.html" class="btn">
                <i class="fas fa-arrow-left"></i> Back to Recipes
            </a>
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
 * Set up event listeners for recipe actions
 * @param {string|number} recipeId - The ID of the current recipe
 * @param {string|number} userId - The ID of the current user
 */
function setupEventListeners(recipeId, userId) {
    // We need to wait a bit for the content to be rendered
    setTimeout(() => {
        // Favorite toggle button
        const favoriteToggle = document.getElementById('favorite-toggle');
        if (favoriteToggle) {
            favoriteToggle.addEventListener('click', () => toggleFavorite(recipeId, userId, favoriteToggle));
        }
        
        // Delete recipe button and modal controls
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
        
        // Modal overlay click to cancel
        const modalOverlay = document.querySelector('.modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', hideDeleteConfirmation);
        }
        
        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('modal-open')) {
                hideDeleteConfirmation();
            }
        });
    }, 100);
}

/**
 * Toggle favorite status for a recipe
 * @param {string|number} recipeId - The ID of the recipe
 * @param {string|number} userId - The ID of the current user
 * @param {HTMLElement} button - The favorite toggle button
 */
async function toggleFavorite(recipeId, userId, button) {
    try {
        // Get current favorite status from data attribute
        const isFavorite = button.dataset.isFavorite !== 'true';
        
        // Disable button during request
        button.disabled = true;
        
        // Send request to toggle favorite status
        const response = await fetch(`/recipes/${recipeId}/favorite?user_id=${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ is_favorite: isFavorite })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update favorite status');
        }
        
        const data = await response.json();
        console.log('Favorite status updated:', data);
        
        // Update button text and icon
        button.dataset.isFavorite = isFavorite;
        if (isFavorite) {
            button.innerHTML = '<i class="fas fa-star"></i> Favorite';
        } else {
            button.innerHTML = '<i class="far fa-star"></i> Add to favorites';
        }
    } catch (err) {
        console.error('Error updating favorite status:', err);
        alert('Failed to update favorite status. Please try again.');
    } finally {
        // Re-enable button
        button.disabled = false;
    }
}

/**
 * Show delete confirmation modal
 */
function showDeleteConfirmation() {
    const modal = document.getElementById('delete-modal');
    if (modal) {
        document.body.classList.add('modal-open');
        modal.classList.add('show');
    }
}

/**
 * Hide delete confirmation modal
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
 * Delete a recipe and redirect to recipes page
 * @param {string|number} recipeId - The ID of the recipe to delete
 * @param {string|number} userId - The ID of the current user
 */
async function deleteRecipe(recipeId, userId) {
    try {
        // Show a deleting state in the modal
        const confirmDeleteBtn = document.getElementById('confirm-delete');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
        }
        
        // Send delete request
        const response = await fetch(`/recipes/${recipeId}?user_id=${userId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete recipe');
        }
        
        // Redirect to recipes page on success
        window.location.href = '/recipes.html';
    } catch (err) {
        console.error('Error deleting recipe:', err);
        alert('Failed to delete recipe. Please try again.');
        
        // Reset button on error
        const confirmDeleteBtn = document.getElementById('confirm-delete');
        if (confirmDeleteBtn) {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = 'Delete';
        }
        
        // Hide the modal
        hideDeleteConfirmation();
    }
}

/**
 * Show error message when recipe can't be loaded
 * @param {string} message - The error message to display
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