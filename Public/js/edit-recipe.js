document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !user.id) {
        window.location.href = '/login.html';
        return;
    }
    
    // Get recipe ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const recipeId = urlParams.get('id');
    
    if (!recipeId) {
        alert('Recipe ID is missing');
        window.location.href = '/recipes.html';
        return;
    }
    
    // Load categories with proper grouping
    await loadCategoriesGrouped();
    
    // Load user's custom categories for the management section
    await loadUserCategories();
    
    // Load the recipe data
    await loadRecipe(recipeId);
    
    // Set up form submission
    const recipeForm = document.getElementById('recipe-form');
    if (recipeForm) {
        recipeForm.addEventListener('submit', (e) => handleFormSubmit(e, recipeId));
    }
    
    // Set up category management
    setupCategoryManagement();
    
    console.log('Edit recipe page initialized');
});

// Load recipe data and populate form
async function loadRecipe(recipeId) {
    try {
        const response = await fetch(`/recipes/${recipeId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch recipe');
        }
        
        const recipe = await response.json();
        console.log('Recipe loaded:', recipe);
        
        // Populate form fields
        document.getElementById('title').value = recipe.title;
        document.getElementById('ingredients').value = recipe.ingredients;
        document.getElementById('instructions').value = recipe.instructions;
        
        // Set category
        const categorySelect = document.getElementById('category');
        if (categorySelect && recipe.category_id) {
            categorySelect.value = recipe.category_id;
        }
        
        // Set favorite status if checkbox exists
        const favoriteCheckbox = document.getElementById('is_favorite');
        if (favoriteCheckbox) {
            favoriteCheckbox.checked = recipe.is_favorite === 1;
        }
        
    } catch (err) {
        console.error('Error loading recipe:', err);
        alert('Error loading recipe data. Redirecting to recipes page.');
        window.location.href = '/recipes.html';
    }
}

// Load categories into dropdown with grouping
async function loadCategoriesGrouped() {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        const response = await fetch(`/categories?user_id=${user.id}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        
        const categories = await response.json();
        console.log('All categories loaded:', categories);
        
        const select = document.getElementById('category');
        
        if (!select) return; // Skip if element doesn't exist
        
        // Clear existing options except the first one if it's a placeholder
        while (select.options.length > 1) {
            select.remove(1);
        }
        
        // Create category groups
        const defaultGroup = document.createElement('optgroup');
        defaultGroup.label = 'Default Categories';
        
        const userGroup = document.createElement('optgroup');
        userGroup.label = 'My Categories';
        
        let hasUserCategories = false;
        let hasDefaultCategories = false;
        
        // Sort categories into appropriate groups
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            
            if (category.user_id) {
                userGroup.appendChild(option);
                hasUserCategories = true;
            } else {
                defaultGroup.appendChild(option);
                hasDefaultCategories = true;
            }
        });
        
        // Add groups to select if they have options
        if (hasDefaultCategories) {
            select.appendChild(defaultGroup);
        }
        
        if (hasUserCategories) {
            select.appendChild(userGroup);
        }
        
        console.log('Categories grouped in dropdown');
    } catch (err) {
        console.error('Error loading categories for dropdown:', err);
    }
}

// Load user's custom categories for management section
async function loadUserCategories() {
    const categoryList = document.getElementById('category-list');
    if (!categoryList) return;
    
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        const response = await fetch(`/categories?user_id=${user.id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch categories');
        }
        
        const categories = await response.json();
        console.log('Categories for management loaded:', categories);
        
        // Filter to user's custom categories only
        const userCategories = categories.filter(cat => cat.user_id);
        
        categoryList.innerHTML = '';
        
        if (userCategories.length === 0) {
            categoryList.innerHTML = '<li class="no-categories">No custom categories created yet</li>';
            return;
        }
        
        userCategories.forEach(cat => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${cat.name}</span>
                <button class="btn-delete" data-id="${cat.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            categoryList.appendChild(li);
        });
        
        // Add delete event listeners
        categoryList.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', deleteCategory);
        });
        
        console.log('Custom categories displayed in management section');
    } catch (err) {
        console.error('Error loading user categories for management:', err);
        categoryList.innerHTML = '<li class="error-message">Failed to load categories</li>';
    }
}

// Set up category management functionality
function setupCategoryManagement() {
    const addCategoryBtn = document.getElementById('add-category-btn');
    const categoryInput = document.getElementById('new-category');
    
    if (!addCategoryBtn || !categoryInput) return;
    
    // Add category button handler
    addCategoryBtn.addEventListener('click', async () => {
        const name = categoryInput.value.trim();
        if (!name) return;
        
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            
            const response = await fetch('/categories', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, user_id: user.id })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create category');
            }
            
            // Clear input
            categoryInput.value = '';
            
            // Reload categories
            await loadCategoriesGrouped();
            await loadUserCategories();
            
            console.log('New category added successfully');
        } catch (err) {
            console.error('Error adding category:', err);
            alert(err.message);
        }
    });
    
    console.log('Category management setup complete');
}

// Handle category deletion
async function deleteCategory(e) {
    const categoryId = e.currentTarget.getAttribute('data-id');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (confirm('Are you sure you want to delete this category?')) {
        try {
            const response = await fetch(`/categories/${categoryId}?user_id=${user.id}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const error = await response.json();
                
                if (error.recipeCount > 0) {
                    alert(`Cannot delete this category because it's used by ${error.recipeCount} recipes.`);
                } else {
                    alert(error.error || 'Failed to delete category');
                }
                return;
            }
            
            console.log('Category deleted successfully');
            
            // Reload categories
            await loadCategoriesGrouped();
            await loadUserCategories();
        } catch (err) {
            console.error('Error deleting category:', err);
            alert('An error occurred while deleting the category');
        }
    }
}

// Handle form submission to update recipe
async function handleFormSubmit(e, recipeId) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorElement = document.getElementById('form-error');
    
    // Disable button and show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Updating Recipe...';
    }
    
    // Clear previous errors
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
    
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Get favorite status from checkbox if it exists
        const isFavorite = document.getElementById('is_favorite')?.checked ? 1 : 0;
        
        const recipeData = {
            title: form.title.value,
            ingredients: form.ingredients.value,
            instructions: form.instructions.value,
            category_id: form.category.value || null,
            user_id: user.id,
            is_favorite: isFavorite
        };
        
        console.log('Updating recipe:', recipeData);
        
        const response = await fetch(`/recipes/${recipeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recipeData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update recipe');
        }
        
        console.log('Recipe updated successfully');
        
        // Redirect to recipes page on success
        window.location.href = '/recipes.html';
    } catch (err) {
        console.error('Error updating recipe:', err);
        
        // Show error message
        if (errorElement) {
            errorElement.textContent = err.message;
            errorElement.style.display = 'block';
        }
        
        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Update Recipe';
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    setupImageUpload();
});

// Set up image upload preview and functionality
function setupImageUpload() {
    const imageInput = document.getElementById('recipe-image');
    const imagePreview = document.getElementById('image-preview');
    const removeImageBtn = document.getElementById('remove-image');
    
    if (!imageInput || !imagePreview) return;
    
    // Handle image selection
    imageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Validate file is an image
        if (!file.type.match('image.*')) {
            alert('Please select an image file');
            return;
        }
        
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            imageInput.value = '';
            return;
        }
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.style.backgroundImage = `url('${e.target.result}')`;
            imagePreview.classList.add('has-image');
            if (removeImageBtn) {
                removeImageBtn.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    });
    
    // Handle remove image button
    if (removeImageBtn) {
        removeImageBtn.addEventListener('click', () => {
            imageInput.value = '';
            imagePreview.style.backgroundImage = '';
            imagePreview.classList.remove('has-image');
            removeImageBtn.style.display = 'none';
            
            // Set a hidden input to indicate image should be removed
            const removeImageFlag = document.getElementById('remove-image-flag') || document.createElement('input');
            removeImageFlag.type = 'hidden';
            removeImageFlag.id = 'remove-image-flag';
            removeImageFlag.name = 'remove-image-flag';
            removeImageFlag.value = '1';
            imageInput.parentNode.appendChild(removeImageFlag);
        });
    }
}

// When loading recipe data, show the existing image
// Update the loadRecipe function to handle the favorite checkbox
async function loadRecipe(recipeId) {
    try {
        const response = await fetch(`/recipes/${recipeId}`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch recipe');
        }
        
        const recipe = await response.json();
        console.log('Recipe loaded:', recipe);
        
        // Populate form fields
        document.getElementById('title').value = recipe.title;
        document.getElementById('ingredients').value = recipe.ingredients;
        document.getElementById('instructions').value = recipe.instructions;
        
        // Set category
        const categorySelect = document.getElementById('category');
        if (categorySelect && recipe.category_id) {
            categorySelect.value = recipe.category_id;
        }
        
        // Set favorite status - THIS LINE FIXES YOUR ISSUE
        const favoriteCheckbox = document.getElementById('is_favorite');
        if (favoriteCheckbox) {
            favoriteCheckbox.checked = recipe.is_favorite === 1;
        }
        
        // Set image preview if the recipe has an image
        if (recipe.image_url) {
            const imagePreview = document.getElementById('image-preview');
            const removeImageBtn = document.getElementById('remove-image');
            
            if (imagePreview) {
                imagePreview.style.backgroundImage = `url('${recipe.image_url}')`;
                imagePreview.classList.add('has-image');
                
                if (removeImageBtn) {
                    removeImageBtn.style.display = 'block';
                }
            }
        }
        
    } catch (err) {
        console.error('Error loading recipe:', err);
        alert('Error loading recipe data. Redirecting to recipes page.');
        window.location.href = '/recipes.html';
    }
}

// Update handleFormSubmit to handle image upload/removal
async function handleFormSubmit(e, recipeId) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorElement = document.getElementById('form-error');
    
    // Disable button and show loading state
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Updating Recipe...';
    }
    
    // Clear previous errors
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }
    
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        // Get current image URL or null if being removed
        let imageUrl = null;
        const removeImageFlag = document.getElementById('remove-image-flag');
        
        // Check if we have a new image to upload
        const imageInput = document.getElementById('recipe-image');
        
        if (imageInput && imageInput.files && imageInput.files[0]) {
            // Upload the new image
            const formData = new FormData();
            formData.append('recipeImage', imageInput.files[0]);
            
            const uploadResponse = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error('Failed to upload image');
            }
            
            const uploadResult = await uploadResponse.json();
            imageUrl = uploadResult.imageUrl;
        } else if (!removeImageFlag) {
            // Keep existing image (we need to fetch it)
            const recipeResponse = await fetch(`/recipes/${recipeId}`);
            if (recipeResponse.ok) {
                const recipeData = await recipeResponse.json();
                imageUrl = recipeData.image_url;
            }
        }
        // If removeImageFlag exists, imageUrl stays null to remove the image
        
        // Now update the recipe with image url
        const recipeData = {
            title: form.title.value,
            ingredients: form.ingredients.value,
            instructions: form.instructions.value,
            category_id: form.category.value || null,
            user_id: user.id,
            is_favorite: document.getElementById('is_favorite')?.checked ? 1 : 0,
            image_url: imageUrl
        };
        
        console.log('Updating recipe:', recipeData);
        
        const response = await fetch(`/recipes/${recipeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recipeData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update recipe');
        }
        
        console.log('Recipe updated successfully');
        
        // Redirect to recipes page on success
        window.location.href = '/recipes.html';
    } catch (err) {
        console.error('Error updating recipe:', err);
        
        // Show error message
        if (errorElement) {
            errorElement.textContent = err.message;
            errorElement.style.display = 'block';
        }
        
        // Re-enable button
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Update Recipe';
        }
    }
}