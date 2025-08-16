require("dotenv").config(); // Load environment variables from .env file
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const marked = require('marked');
const bcrypt = require("bcrypt");
const sanitizeHTML = require("sanitize-html");
const express = require('express'); 
const rateLimit = require('express-rate-limit');
const db = require('better-sqlite3')('OurApp.db', { timeout: 5000 }); // Database connection with timeout
const app = express(); // Create Express application instance
const port = 3000;

// Database schema setup
const createTables = db.transaction(() => {
    db.prepare(`
        CREATE TABLE IF NOT EXISTS users(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username STRING NOT NULL UNIQUE,
            password STRING NOT NULL
        )
    `).run()

    db.prepare(`
        CREATE TABLE IF NOT EXISTS posts(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            createdDate TEXT,
            title STRING NOT NULL,
            body TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `).run()
});

createTables(); // Initialize database tables if they don't exist

// View engine configuration
app.set("view engine", "ejs"); // Set EJS as the template engine for dynamic content rendering
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded request bodies for form submissions
app.use(express.static('public')); // Serve static files from the public directory
app.use(cookieParser()); // Parse cookies from incoming requests

// Rate limiting configuration
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: 'Too many attempts, please try again later',
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res) => {
        res.status(429).render('homepage', { 
            errors: ['Too many attempts. Please wait 15 minutes before trying again.'] 
        });
    }
});

const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later'
});

// Apply rate limiting to specific routes
app.use('/login', authLimiter);
app.use('/signup', authLimiter);
app.use('/', generalLimiter); // General rate limiting for all routes

// Global middleware for request processing
app.use((req, res, next) => { 
    // Make markdown parsing and HTML sanitization available to all views
    res.locals.filterUserHTML = function(content) {
        return sanitizeHTML(marked.parse(content), {
            allowedTags: ["p", "br", "ul", "ol", "strong", "bold", "i", "em", "h1", "h3", "h4", "h5"],
            allowedAttributes: {}
        })
    }
   
    res.locals.errors = []; // Initialize error array for all views

    // Authenticate user from JWT cookie
    try {
        const decoded = jwt.verify(req.cookies.oursimpleapp, process.env.JWTSECRET);
        req.user = decoded;
    } catch (err) {
        // Clear invalid or expired cookies
        req.user = false; 
        res.clearCookie('oursimpleapp');
    }

    res.locals.user = req.user; // Make user data available to all views

    next();
});

// Route: Homepage - shows dashboard for logged-in users, homepage for guests
app.get('/', (req, res) => {
    if (req.user) {
        const postsQuery = db.prepare("SELECT * FROM posts WHERE user_id = ? ORDER BY createdDate DESC");
        const userPosts = postsQuery.all(req.user.rowid); // Get all posts for the authenticated user
        res.render("dashboard", { posts: userPosts });
    } else {
        res.render("homepage");
    }
});

// Route: Login page
app.get('/login', (req, res) => {
    res.render("login");
});

// Authentication middleware - ensures user is logged in
function requireAuthentication(req, res, next) {
    if (req.user) {
        return next();
    }
    res.redirect('/');
}

// Route: Create post page (requires authentication)
app.get('/create-post', requireAuthentication, (req, res) => {
    res.render("create-post");
}); 

// Shared validation function for post creation and editing
function validatePostData(req) {
    const errors = [];

    if (typeof req.body.title !== 'string' || req.body.title.trim() === '') {
        errors.push('Invalid title');
    }
    if (typeof req.body.body !== 'string' || req.body.body.trim() === '') {
        errors.push('Invalid content');
    }

    // Add length limits to prevent DoS attacks
    if (req.body.title && req.body.title.length > 200) {
        errors.push('Title must be less than 200 characters');
    }
    if (req.body.body && req.body.body.length > 10000) {
        errors.push('Content must be less than 10,000 characters');
    }

    // Sanitize and trim input data
    const sanitizedTitle = sanitizeHTML(req.body.title.trim(), { allowedTags: [], allowedAttributes: {} });
    const sanitizedBody = sanitizeHTML(req.body.body.trim(), { allowedTags: [], allowedAttributes: {} });

    if (!sanitizedTitle || !sanitizedBody) {
        errors.push('Invalid title or content');
    }
    return errors;
}

// Route: Edit post page (requires authentication and ownership)
app.get("/edit-post/:id", requireAuthentication, (req, res) => {
    const postQuery = db.prepare("SELECT * FROM posts WHERE id = ?");
    const post = postQuery.get(req.params.id); // Get post ID from URL parameters

    if (!post) {
        return res.redirect("/");
    }

    // Ensure only the post author can edit
    if (post.user_id !== req.user.rowid) {
        return res.redirect("/");
    }
    
    res.render("edit-post", { post });
});

// Route: Update post (requires authentication and ownership)
app.post('/edit-post/:id', requireAuthentication, (req, res) => {
    const postQuery = db.prepare("SELECT * FROM posts WHERE id = ?");
    const post = postQuery.get(req.params.id);

    if (!post) {
        return res.redirect("/");
    }

    if (post.user_id !== req.user.rowid) {
        return res.redirect("/");
    }

    const errors = validatePostData(req);
    if (errors.length) {
        return res.render("edit-post", { errors, post });
    }

    const updateQuery = db.prepare("UPDATE posts SET title = ?, body = ? WHERE id = ?");
    updateQuery.run(req.body.title, req.body.body, req.params.id);

    res.redirect(`/post/${req.params.id}`);
});

// Route: Delete post (requires authentication and ownership)
app.post('/delete-post/:id', requireAuthentication, (req, res) => {
    const postQuery = db.prepare("SELECT * FROM posts WHERE id = ?");
    const post = postQuery.get(req.params.id);

    if (!post) {
        return res.redirect("/");
    }

    if (post.user_id !== req.user.rowid) {
        return res.redirect("/");
    }
    
    const deleteQuery = db.prepare("DELETE FROM posts WHERE id = ?");
    deleteQuery.run(req.params.id);
    res.redirect("/");
});

// Route: View single post
app.get('/post/:id', (req, res) => {
    const postQuery = db.prepare("SELECT posts.*, users.username FROM posts INNER JOIN users ON posts.user_id = users.id WHERE posts.id = ?");
    const post = postQuery.get(req.params.id);
    
    if (!post) {
        return res.redirect("/"); 
    }
    
    const isAuthor = post.user_id === req.user?.rowid; // Check if current user is the post author
    res.render("single-post", { post, isAuthor });
});

// Route: Create new post (requires authentication)
app.post('/create-post', requireAuthentication, (req, res) => {
    const errors = validatePostData(req);

    if (errors.length) {
        return res.render("create-post", { errors });
    }

    // Use sanitized values from validation
    const sanitizedTitle = sanitizeHTML(req.body.title.trim(), { allowedTags: [], allowedAttributes: {} });
    const sanitizedBody = sanitizeHTML(req.body.body.trim(), { allowedTags: [], allowedAttributes: {} });
    const createdDate = new Date().toISOString();
    
    // Insert new post into database
    const insertQuery = db.prepare(`INSERT INTO posts (createdDate, title, body, user_id) VALUES (?, ?, ?, ?)`);
    const result = insertQuery.run(createdDate, sanitizedTitle, sanitizedBody, req.user.rowid);

    res.redirect(`/post/${result.lastInsertRowid}`);
});

// Route: User login
app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    let errors = [];
    
    if (typeof username !== 'string' || username.trim() === '') {
        errors.push('Invalid username');
    }
    if (typeof password !== 'string' || password.trim() === '') {
        errors.push('Invalid password');
    }

    if (errors.length) {
        return res.render("login", { errors });
    }
    
    const userQuery = db.prepare(`SELECT * FROM users WHERE username = ?`);
    const user = userQuery.get(username);

    if (!user) {
        errors.push('Invalid username or password');
        return res.render("login", { errors });
    }
    
    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
        errors.push('Invalid username or password');
        return res.render("login", { errors });
    }

    // Generate JWT token for authenticated user
    const expiresInSeconds = 60 * 60 * 24; // 24 hours
    const expiryDate = Math.floor(Date.now() / 1000) + expiresInSeconds;
    
    const token = jwt.sign({
        exp: expiryDate,
        username: user.username,
        rowid: user.id
    }, process.env.JWTSECRET);
    
    // Set secure HTTP-only cookie
    res.cookie('oursimpleapp', token, {
        httpOnly: true, // Prevents JavaScript access to cookie
        secure: true, // Set to true in production with HTTPS
        sameSite: "strict", // Prevents CSRF attacks
        maxAge: expiresInSeconds * 1000 // Cookie expires after 24 hours
    });
    
    res.redirect('/');
});

// Route: User logout
app.get('/logout', (req, res) => {
    res.clearCookie("oursimpleapp"); // Remove authentication cookie
    res.redirect("/");
});

// Route: User registration
app.post('/signup', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    // Input validation
    const errors = [];

    if (typeof username !== 'string' || username.trim() === '') {
        errors.push('Invalid username');
    }
    if (typeof password !== 'string' || password.trim() === '') {
        errors.push('Invalid password');
    }

    if (!username) errors.push("You must provide a username");
    if (username && username.length < 3) errors.push("Username must be at least 3 characters long");
    if (username && username.length > 20) errors.push("Username must be at most 20 characters long");
    if (username && !username.match(/^[a-zA-Z0-9_-]+$/)) errors.push("Username can only contain letters, numbers, underscores, and hyphens");
    if (username && username.match(/^[_-]|[_-]$/)) errors.push("Username cannot start or end with underscore or hyphen");

    // Check if username already exists
    const userQuery = db.prepare("SELECT * FROM users WHERE username = ?");
    const existingUser = userQuery.get(username);
    if (existingUser) {
        errors.push("Username already exists");
    }

    if (!password) errors.push("You must provide a password");
    if (password && password.length < 8) errors.push("Password must be at least 8 characters long");
    if (password && password.length > 128) errors.push("Password must be at most 128 characters long");
    if (password && !password.match(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)) errors.push("Password must contain at least one lowercase letter, one uppercase letter, and one number");

    if (errors.length) {
        return res.render("homepage", { errors });
    }
    
    // Create new user account
    try {
        const salt = bcrypt.genSaltSync(10); // Generate cryptographic salt
        const hashedPassword = bcrypt.hashSync(password, salt);

        const insertQuery = db.prepare(`INSERT INTO users (username, password) VALUES (?, ?)`);
        const result = insertQuery.run(username, hashedPassword);

        // Automatically log in the new user
        const expiresInSeconds = 60 * 60 * 24; // 24 hours
        const expiryDate = Math.floor(Date.now() / 1000) + expiresInSeconds;
        
        const token = jwt.sign({
            exp: expiryDate,
            username: username,
            rowid: result.lastInsertRowid
        }, process.env.JWTSECRET);
        
        // Set authentication cookie
        res.cookie('oursimpleapp', token, {
            httpOnly: true,
            secure: true, // Set to true in production with HTTPS
            sameSite: "strict",
            maxAge: expiresInSeconds * 1000
        });
        
        res.redirect('/');
    } catch (err) {
        // Handle database constraint violations
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.render("homepage", { errors: ["Username already exists"] });
        }
        // Handle other database errors - don't expose internal details
        console.error("Database error during signup:", err);
        return res.render("homepage", { errors: ["An error occurred during registration. Please try again."] });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});