# 🎮 Minecraft GraphQL Dashboard: Project Overview

This project is a web-based dashboard that transforms complex educational data from a GraphQL API into an immersive, Minecraft-themed visual experience.

## 🏗 Architecture & Tech Stack

-   **Frontend**: Pure Vanilla HTML5, CSS3, and JavaScript (ES6+). No external frameworks or libraries were used for the UI or logic.
-   **API**: GraphQL Engine (Reboot01 API).
-   **Authentication**: Custom implementation using **Basic Auth** to obtain a **JWT (JSON Web Token)**.
-   **Charts**: Custom-built SVG chart system developed from scratch to fit the Minecraft theme.
-   **Theming**: Advanced Vanilla CSS using HSL color variables, 3D inset/outset shadows, and pixelated font integration.

## 🚀 Key Features

### 1. Immersive Minecraft UI
The entire interface is built with a "blocky" aesthetic.
-   **Border-Radius: 0**: No rounded corners.
-   **3D Effects**: Every card and button uses a combination of light and dark inset shadows to simulate 3D blocks.
-   **Pixelated Typography**: Uses the `VT323` font for all labels and data.
-   **Animated Background**: A high-opacity `background.gif` and soft looping atmospheric music create a game-like environment.

### 2. Live Data Dashboard
-   **Total XP**: Aggregated from all valid transactions.
-   **Monthly Growth**: Dynamically calculated percentage change from the previous month.
-   **Audit Statistics**: Displays raw numeric values for precise tracking of audits done vs received.
-   **Recent Projects**: A detailed list of the last 10 projects, including specialized XP formatting (KB/MB/GB).

### 3. Custom Visualizations
-   **XP Timeline**: A linear SVG chart showing cumulative XP growth over time.
-   **Success Rate**: A donut chart visualizing the ratio of passed to failed projects.
-   **Technologies**: Data processing for skill categories, ready for radar or bar visualization.

### 4. Robust Error Handling
Specially prepared for edge cases and testing:
-   **404 Nether Theme**: A dedicated page for missing paths.
-   **500 TNT Theme**: A dedicated page for server failures or missing critical files.
-   **Authentication**: Unified error messages for incorrect credentials.

## ⚙️ How it Works (Data Flow)

1.  **Login**: User enters credentials -> `auth.js` sends a Base64 encoded Basic Auth request -> Receives JWT.
2.  **Authentication**: JWT is stored in `localStorage` and cleaned of any escaping characters.
3.  **Fetching**: `api.js` runs multiple parallel GraphQL queries for user info, transactions, and project progress.
4.  **Processing**: The application processes raw XP numbers into human-readable formats (e.g., 2,200 XP -> 2.2 KB).
5.  **Rendering**: `dashboard.js` updates the DOM and triggers `charts.js` to draw the SVGs based on the processed data.
