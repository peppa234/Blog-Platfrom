# Blog Platform

A modern blog platform built with Node.js, Express, and SQLite. Create, manage, and share your blog posts with a clean and intuitive interface.

## ✨ Features

- **User Authentication**: JWT-based authentication with secure password hashing
- **Blog Management**: Create, edit, delete, and view blog posts
- **Markdown Support**: Write posts using Markdown with HTML formatting
- **Responsive Design**: Clean, modern UI that works on all devices
- **User Dashboard**: Manage your posts from a personal dashboard


## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   cd YOUR_REPO_NAME
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create a .env file in the root directory
   cp .env.example .env
   
   # Edit .env with your configuration
   JWTSECRET=your-super-secret-jwt-key-here
   NODE_ENV=development
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
├── app.js                 # Main application file
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (create this)
├── .gitignore            # Git ignore rules
├── public/               # Static files (CSS, JS, images)
│   └── styles.css       # Main stylesheet
├── views/                # EJS templates
│   ├── includes/         # Reusable template parts
│   ├── dashboard.ejs     # User dashboard
│   ├── homepage.ejs      # Landing page
│   ├── login.ejs         # Login form
│   ├── create-post.ejs   # Create post form
│   ├── edit-post.ejs     # Edit post form
│   └── single-post.ejs   # Individual post view
└── OurApp.db            # SQLite database (auto-created)
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
JWTSECRET=your-super-secret-jwt-key-here
NODE_ENV=development
PORT=3000
```

### Database

The app uses SQLite and will automatically create the database file (`OurApp.db`) on first run. No additional database setup required.

## 📝 API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Homepage/Dashboard | No |
| GET | `/login` | Login page | No |
| POST | `/login` | User authentication | No |
| GET | `/logout` | User logout | No |
| POST | `/signup` | User registration | No |
| GET | `/create-post` | Create post page | Yes |
| POST | `/create-post` | Create new post | Yes |
| GET | `/post/:id` | View single post | No |
| GET | `/edit-post/:id` | Edit post page | Yes |
| POST | `/edit-post/:id` | Update post | Yes |
| POST | `/delete-post/:id` | Delete post | Yes |

## 🚀 Production Deployment

Before deploying to production:

1. **Set strong JWT secret** in `.env`
2. **Enable HTTPS** for secure connections
3. **Set NODE_ENV=production**
4. **Use environment-specific database**
5. **Implement logging and monitoring**

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server with nodemon
npm start        # Start production server
```

### Adding New Features

1. Create new routes in `app.js`
2. Add corresponding EJS templates in `views/`
3. Update CSS in `public/styles.css`
4. Test your new features thoroughly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This application is designed for educational and development purposes. Always test thoroughly before using in production environments.

## 🆘 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/YOUR_USERNAME/YOUR_REPO_NAME/issues) page
2. Create a new issue with detailed information
3. Include your Node.js version and operating system

---

**Built with ❤️ for bloggers**
