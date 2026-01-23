# GraphQL Profile Dashboard - Reboot01

A modern, responsive profile dashboard that uses GraphQL to display user statistics, XP progress, and project analytics from the Reboot01 platform.

## 🚀 Features

### Authentication
- Secure login with username/email and password
- Basic Authentication with base64 encoding
- JWT token management
- Session persistence with localStorage
- Logout functionality

### Profile Dashboard
- **User Information**: Display login, ID, email, and member since date
- **Statistics Cards**: 
  - Total XP earned
  - Number of projects completed
  - Audit ratio
  - Account creation date

### Interactive SVG Charts
1. **XP Progress Over Time** (Line/Area Chart)
   - Shows cumulative XP earned chronologically
   - Interactive tooltips on hover
   - Smooth gradient fill animation
   - Grid lines and axis labels

2. **Project Success Rate** (Donut Chart)
   - Visual representation of pass/fail ratio
   - Interactive hover effects
   - Percentage breakdown
   - Color-coded statistics

### GraphQL Queries
- ✅ Simple queries (user data)
- ✅ Nested queries (results with object info)
- ✅ Queries with arguments (filtering by type)
- ✅ Multiple table queries (user, transaction, result, object)

## 📁 Project Structure

```
graphql-profile/
├── index.html              # Login page
├── profile.html            # Main profile dashboard
├── css/
│   ├── common.css         # Shared styles and variables
│   ├── login.css          # Login page specific styles
│   └── profile.css        # Profile page specific styles
├── js/
│   ├── auth.js            # Authentication logic
│   ├── graphql.js         # GraphQL query functions
│   ├── charts.js          # SVG chart generation
│   └── profile.js         # Profile page logic
└── README.md              # This file
```

## 🛠️ Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript**: No frameworks, pure JS
- **GraphQL**: Data fetching from Reboot01 API
- **SVG**: Custom interactive charts
- **JWT**: Secure authentication

## 📋 API Endpoints

- **Authentication**: `https://learn.reboot01.com/api/auth/signin`
- **GraphQL**: `https://learn.reboot01.com/api/graphql-engine/v1/graphql`
- **GraphiQL Explorer**: `https://learn.reboot01.com/api/graphiql`

## 🎯 How to Use

### 1. Login
- Navigate to `index.html`
- Enter your Reboot01 username or email
- Enter your password
- Click "Sign In"

### 2. View Dashboard
- Automatically redirected to profile page after login
- View your statistics and charts
- Hover over chart elements for detailed information

### 3. Logout
- Click the "Logout" button in the header
- Redirected back to login page
- JWT token cleared from localStorage

## 🌐 Deployment

This project can be hosted on any static hosting platform:

### GitHub Pages
1. Push code to GitHub repository
2. Go to Settings → Pages
3. Select branch and root folder
4. Save and get your URL

### Netlify
1. Drag and drop folder to Netlify
2. Or connect GitHub repository
3. Deploy automatically

### Vercel
1. Import GitHub repository
2. Deploy with one click

## 🔒 Security Features

- JWT token validation
- Automatic session expiry handling
- Secure credential encoding
- Protected routes (redirect if not authenticated)

## 📊 GraphQL Queries Used

### User Information
```graphql
{
  user {
    id
    login
    email
    createdAt
  }
}
```

### XP Transactions
```graphql
{
  transaction(
    where: { type: { _eq: "xp" } }
    order_by: { createdAt: asc }
  ) {
    id
    amount
    createdAt
    path
  }
}
```

### Project Results (Nested Query)
```graphql
{
  result(order_by: { createdAt: desc }) {
    id
    grade
    path
    createdAt
    object {
      name
      type
    }
  }
}
```

### Audit Ratio
```graphql
{
  user {
    auditRatio
    totalUp
    totalDown
  }
}
```

## 🎨 Design Features

- Modern, clean UI with gradient backgrounds
- Responsive design (mobile, tablet, desktop)
- Smooth animations and transitions
- Loading states with spinner
- Error handling with user-friendly messages
- Color-coded statistics
- Interactive SVG charts

## 🔧 Customization

### Changing Colors
Edit `css/common.css` and modify the CSS variables:
```css
:root {
    --color-primary: #6366f1;
    --color-success: #10b981;
    --color-danger: #ef4444;
    /* ... */
}
```

### Adding More Charts
1. Create new chart function in `js/charts.js`
2. Add chart container in `profile.html`
3. Call chart function in `js/profile.js`

## 📝 License

This project is created for educational purposes as part of the Reboot01 curriculum.

## 👨‍💻 Author

Created for Reboot01 Bahrain - GraphQL Project

---

**Note**: Make sure you have valid Reboot01 credentials to use this application.