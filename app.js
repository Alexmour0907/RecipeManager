const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Set up database
const db = new Database('./Database/RecipeManager.db');

// ======================== USER ROUTES ========================

// Register new user
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  try {
    // Check if username already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Hash password with bcrypt (salt is auto-generated)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert the new user
    const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const result = stmt.run(username, email, hashedPassword);
    
    // Return success without any sensitive data
    res.status(201).json({ 
      id: result.lastInsertRowid, 
      message: 'User registered successfully' 
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(400).json({ error: 'Registration failed' });
  }
});

// Login user
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    // IMPORTANT: Select only what's needed from database
    const user = db.prepare('SELECT id, username, password FROM users WHERE username = ?').get(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // IMPORTANT: Create a NEW object with ONLY the data we want to send
    const userData = {
      id: user.id,
      username: user.username,
      message: 'Login successful'
    };
    
    // Send only the safe userData object
    res.status(200).json(userData);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete user account
app.delete('/users/:id', async (req, res) => {
  try {
    // First delete all user's recipes
    db.prepare('DELETE FROM recipes WHERE user_id = ?').run(req.params.id);
    
    // Then delete the user
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User account deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ======================== RECIPE ROUTES ========================

// Get all recipes
app.get('/recipes', (req, res) => {
  try {
    const recipes = db.prepare('SELECT * FROM recipes').all();
    res.json(recipes);
  } catch (err) {
    console.error('Get recipes error:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Get single recipe by ID
app.get('/recipes/:id', (req, res) => {
  try {
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    res.json(recipe);
  } catch (err) {
    console.error('Get recipe error:', err);
    res.status(500).json({ error: 'Failed to fetch recipe' });
  }
});

// Create new recipe
app.post('/recipes', (req, res) => {
  const { title, ingredients, instructions, category_id, user_id } = req.body;
  
  try {
    // Validate required fields
    if (!title || !ingredients || !instructions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!user_id) {
      return res.status(401).json({ error: 'User must be logged in to create a recipe' });
    }

    const stmt = db.prepare(
      'INSERT INTO recipes (title, ingredients, instructions, category_id, user_id) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(title, ingredients, instructions, category_id, user_id);
    
    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Recipe created successfully'
    });
  } catch (err) {
    console.error('Create recipe error:', err);
    res.status(400).json({ error: 'Failed to create recipe' });
  }
});

// Update existing recipe
app.put('/recipes/:id', (req, res) => {
  const { title, ingredients, instructions, category_id, user_id } = req.body;
  
  try {
    // Validate required fields
    if (!title || !ingredients || !instructions) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if recipe exists and if user is authorized to modify it
    const existingRecipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(req.params.id);
    if (!existingRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    if (user_id && existingRecipe.user_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized to modify this recipe' });
    }

    const stmt = db.prepare(
      'UPDATE recipes SET title = ?, ingredients = ?, instructions = ?, category_id = ? WHERE id = ?'
    );
    const result = stmt.run(title, ingredients, instructions, category_id, req.params.id);
    
    res.json({ message: 'Recipe updated successfully' });
  } catch (err) {
    console.error('Update recipe error:', err);
    res.status(400).json({ error: 'Failed to update recipe' });
  }
});

// Delete recipe
app.delete('/recipes/:id', (req, res) => {
  try {
    const result = db.prepare('DELETE FROM recipes WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json({ message: 'Recipe deleted successfully' });
  } catch (err) {
    console.error('Delete recipe error:', err);
    res.status(400).json({ error: 'Failed to delete recipe' });
  }
});

// ======================== CATEGORY ROUTES ========================

// Get all categories
app.get('/categories', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories').all();
    res.json(categories);
  } catch (err) {
    console.error('Get categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create new category
app.post('/categories', (req, res) => {
  const { name } = req.body;
  
  try {
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    const stmt = db.prepare('INSERT INTO categories (name) VALUES (?)');
    const result = stmt.run(name);
    
    res.status(201).json({
      id: result.lastInsertRowid,
      message: 'Category created successfully'
    });
  } catch (err) {
    console.error('Create category error:', err);
    res.status(400).json({ error: 'Failed to create category' });
  }
});

// Get recipes by category
app.get('/categories/:id/recipes', (req, res) => {
  try {
    const recipes = db.prepare('SELECT * FROM recipes WHERE category_id = ?').all(req.params.id);
    res.json(recipes);
  } catch (err) {
    console.error('Get recipes by category error:', err);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('Welcome to Recipe Manager API. Available endpoints: /recipes, /categories, etc.');
});

// Start server
app.listen(port, () => {
  console.log(`Recipe Manager app listening at http://localhost:${port}`);
});