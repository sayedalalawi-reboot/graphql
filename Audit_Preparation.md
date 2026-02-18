# 🧠 Audit Preparation: Technical Deep Dive & Process Documentation

This document provides a comprehensive A-Z breakdown of the core technologies and logic implemented in this Minecraft-themed GraphQL profile. Use this to explain the "How" and "Why" behind the architecture during your audit.

---

## 🔑 1. Authentication & Token Management (A-Z)

The application uses **JWT (JSON Web Token)** for secure authentication. Unlike traditional session-based auth, JWTs are stateless and passed in the headers of every request.

### The Flow:
1.  **Submission**: User submits a username and password via the Minecraft-themed login form.
2.  **Encoding**: Credentials are encoded into a **Base64** string (Standard Basic Auth format: `username:password`).
3.  **Signin**: A `POST` request is sent to `/api/auth/signin` with the `Authorization: Basic [Base64]` header.
4.  **Token Storage**: The server returns a JWT. We store this in `localStorage` as `jwt`.
5.  **Persistence**: The `requireAuth()` helper checks `localStorage` on every page load. If missing or invalid, it redirects back to `index.html`.

### Process Flow Header:
```mermaid
sequenceDiagram
    participant User as 👤 User
    participant Browser as 🌐 Browser (localStorage)
    participant Server as 🖥️ Reboot01 Auth API

    User->>Browser: Enter Credentials
    Browser->>Server: POST /api/auth/signin (Basic Auth)
    Server-->>Browser: Returns JWT "eyJhbG..."
    Browser->>Browser: Store in localStorage.jwt
    Note over Browser: Token used for all GraphQL calls
```

### Key Functions in `auth.js`:
-   `cleanToken()`: Crucial logic to handle some APIs that return the token wrapped in quotes or JSON objects.
-   `validateToken()`: Ensures the token follows the three-part JWT structure (`header.payload.signature`).

### 🔐 What Even IS a JWT?

Think of a JWT like a **theme park wristband**. The park (server) gives it to you after checking your ID (login). Every ride (API endpoint) just checks your wrist — they don't call the front gate again. That's what makes it *stateless*.

A JWT is a long string that looks like this:

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEyMzR9.abc123signature
```

It has **3 parts**, separated by dots:

| Part | What It Contains | Analogy |
| :--- | :--- | :--- |
| **Header** | The algorithm used to sign it (e.g., `HS256`) | The wristband material — how it was made |
| **Payload** | User data: `userId`, `expiry`, `login`, etc. | The info printed ON the wristband — your name, ticket type |
| **Signature** | A cryptographic hash combining the header + payload + a secret key only the server knows | The holographic stamp — proves the wristband is real, not a fake |

> [!IMPORTANT]
> The Payload is **Base64-encoded, NOT encrypted**. Anyone can decode it and read the contents. That's why you **never** store passwords or secrets in a JWT. It's like writing your name on a wristband — anyone can read it, but only the park can stamp it as authentic.

**Why "Bearer" tokens?** Every time we make a GraphQL call, we include this header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```
The word "Bearer" just means: *"Whoever bears (carries) this token is authorized."* It's a standard convention — the server sees `Bearer`, knows the next part is a JWT, and validates it.

**Why does `cleanToken()` exist?** Different APIs return tokens in different formats. Sometimes the response is a clean string: `eyJhbG...`. But sometimes it comes wrapped in quotes `"eyJhbG..."` or inside a JSON object `{"token": "eyJhbG..."}`. Our `cleanToken()` function handles all these cases:

```javascript
function cleanToken(token) {
    token = token.trim();                    // Remove whitespace
    if (token.startsWith('{')) {             // If it looks like JSON...
        const parsed = JSON.parse(token);
        token = parsed.token || parsed.jwt;  // ...extract the actual token
    }
    if (token.startsWith('"')) {             // If wrapped in quotes...
        token = token.slice(1, -1);          // ...strip them off
    }
    return token;
}
```

This way, no matter what format the server throws at us, we always store a clean, usable JWT.

---

## 📉 2. GraphQL Integration (A-Z)

GraphQL serves as the data layer. Instead of hitting multiple REST endpoints (like `/users`, `/xp`, `/projects`), we request exactly what we need in a single structured query.

### The Strategy:
-   **Parallel Fetching**: We use `Promise.all()` to trigger multiple GraphQL queries simultaneously. This prevents "Waterfall loading" where one request waits for another.
-   **Custom Querying**: We query `user`, `transaction_aggregate` (for XP and Audit counts), and `progress` (for projects) in balanced chunks.

### Request Flow:
```mermaid
graph TD
    A[Dashboard Load] --> B{auth.getToken}
    B -- Found --> C[Execute GraphQL Query]
    B -- Missing --> D[Redirect to Login]
    C --> E[Fetch User Profile]
    C --> F[Fetch XP Transactions]
    C --> G[Fetch Audit Stats]
    E & F & G --> H[Combine Results in JSON]
    H --> I[Update UI Components]
```

### Deep Dive: Aggregate Queries
We use `transaction_aggregate` to calculate the total number of audits directly on the server. This is more efficient than downloading 1000 audit records and counting them in JavaScript.
-   **Filter**: `where: { type: { _eq: "down" } }` -> Counts audits you received (Xp Decrease).
-   **Filter**: `where: { type: { _eq: "up" } }` -> Counts audits you gave (Xp Increase).

### 🌐 What Even IS GraphQL?

Imagine you're at a restaurant. With **REST**, the menu has fixed combo meals — you order Combo #1 (`GET /users`), then Combo #2 (`GET /xp`), then Combo #3 (`GET /projects`). That's three orders (network requests), and each one comes with sides you didn't ask for (extra fields). With **GraphQL**, there's no menu — you tell the chef *exactly* what you want, item by item, and it all arrives in a single plate (one request).

**GraphQL is a query language.** You write a query that describes the exact shape of the data you want, and the server returns *only that* — nothing extra.

#### The Structure of a GraphQL Query

```graphql
{
    user {
        id
        login
        attrs
    }
}
```

This says: *"Give me the user, and inside that, I only want their `id`, `login`, and `attrs`."* You nest fields inside fields to describe relationships. Need only 2 fields? Ask for 2. Need 20? Ask for 20. You're in control.

#### Adding Filters with `where`

```graphql
{
    transaction(
        where: { 
            type: { _eq: "xp" }
            amount: { _gt: 0 }
        }
        order_by: { createdAt: asc }
    ) {
        amount
        createdAt
        path
    }
}
```

The `where` clause works like a SQL `WHERE` — it filters data before the server sends it to you:
- `_eq` means "equals" → `type: { _eq: "xp" }` = only XP transactions
- `_gt` means "greater than" → `amount: { _gt: 0 }` = only positive amounts
- `order_by` sorts the results before they arrive

#### What Is `transaction_aggregate`?

Instead of fetching 1000 rows of audit data and then looping through them in JavaScript to get a total, we let the **server do the math**:

```graphql
{
    upTransactions: transaction_aggregate(where: { type: { _eq: "up" } }) {
        aggregate {
            sum { amount }
            count
        }
    }
}
```

This returns a single number: the sum and count that the server calculated. It's like asking the librarian "how many books are in Section A?" instead of counting every book yourself.

#### How `executeQuery()` Works

This is the backbone function. It's surprisingly simple — it's just a `fetch()` call:

```javascript
async function executeQuery(query) {
    const token = window.auth.getToken();          // Get JWT from localStorage

    const response = await fetch(GRAPHQL_API_URL, {
        method: 'POST',                            // GraphQL always uses POST
        headers: {
            'Authorization': `Bearer ${token}`,    // JWT goes here
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })            // The GraphQL query as a string
    });

    const result = await response.json();
    return result.data;                            // The server's response
}
```

Every single data request in this app flows through this one function. Write a query string → pass it to `executeQuery()` → get data back.

#### Why `Promise.all()` Matters

```mermaid
graph LR
    subgraph "❌ Sequential (Waterfall)"
        A1[Fetch User] --> A2[Fetch XP] --> A3[Fetch Projects] --> A4[Fetch Audits] --> A5[Fetch Skills]
        A5 --> A6["⏱️ Total: 5 seconds"]
    end
```

```mermaid
graph LR
    subgraph "✅ Parallel with Promise.all"
        B1[Fetch User]
        B2[Fetch XP]
        B3[Fetch Projects]
        B4[Fetch Audits]
        B5[Fetch Skills]
        B1 & B2 & B3 & B4 & B5 --> B6["⏱️ Total: ~1 second"]
    end
```

**Sequential**: Each request waits for the previous one to finish. 5 queries × 1 second each = 5 seconds.

**Parallel with `Promise.all()`**: All 5 requests fire at the same time. The total time is only as long as the *slowest* one — roughly 1 second.

Here's how we use it:

```javascript
const [user, xpTransactions, projects, auditData, skillsData] = await Promise.all([
    fetchUserInfo(),        // These all fire simultaneously
    fetchXPTransactions(),
    fetchProjects(),
    fetchAuditRatio(),
    fetchSkills()
]);
```

The `[user, xpTransactions, ...]` part is called **destructuring** — it unpacks the array of results in order.

---

## 📊 3. Data Visualization & SVG Drawings (A-Z)

To keep the Minecraft aesthetic (sharp edges, no anti-aliasing), we built all charts using **Vanilla SVG** instead of heavy libraries like Chart.js or D3.

### 📈 XP Timeline (Line/Area Chart)
-   **Math**: We calculate the ratio of `XP / Max_XP` to map vertical (Y) coordinates.
-   **Polylines**: The line is drawn using a `<polyline>` element.
-   **Area Fill**: We create a closed shape by adding two extra points at the bottom-right and bottom-left to fill the "under-mountain" area with a semi-transparent blue.

### 🍩 Success Rate (Donut Chart)
We use a mathematical approach to create the "Circle Segments".
1.  **Polar to Cartesian**: We convert project percentages into X/Y coordinates using `Math.cos()` and `Math.sin()`.
2.  **Arc Path**: We use the SVG `<path>` element with the `A` (Arc) command.
3.  **The 360° Fix**: Since SVG arcs fail if they start and end at the exact same point (100%), we cap full circles at `359.99` degrees to ensure the browser renders the path correctly.

### Drawing Logic Visualization:
```mermaid
graph LR
    A[Raw Data] --> B[Normalize Values 0-1]
    B --> C[Scale to SVG ViewBox]
    C --> D[Generate Path Strings]
    D --> E[Inject Path into DOM]
    E --> F[CSS Animations Applied]
```

---

## 🔄 4. Complete User Journey — From Login to Loaded Dashboard

This is the end-to-end walkthrough of what happens from the moment a user opens the app to the moment they see a fully loaded dashboard. Read it like a story — each step triggers the next.

### Phase 1 — 🔐 Login (Getting the Wristband)

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant L as 📄 login.js
    participant A as 🔐 auth.js
    participant S as 🖥️ Reboot01 Server

    U->>L: Types username & password, clicks "Sign In"
    L->>L: e.preventDefault() stops page reload
    L->>L: Validates fields aren't empty
    L->>A: Calls window.auth.login(username, password)
    A->>A: btoa("username:password") → Base64 string
    A->>S: POST /api/auth/signin with "Authorization: Basic dXNlcjpwYXNz"
    S-->>A: Returns raw token (maybe with quotes/JSON wrapping)
    A->>A: cleanToken() strips quotes, extracts JWT string
    A->>A: validateToken() checks it has 3 dot-separated parts
    A->>A: localStorage.setItem("jwt", cleanToken)
    A-->>L: Returns successfully
    L->>L: window.location.replace("dashboard.html")
```

**Step by step:**

1. **The user opens `index.html`** and sees the Minecraft-themed login form. Before the form even appears, `login.js` runs `window.auth.redirectIfAuthenticated()` — if there's already a valid JWT in `localStorage`, the user gets automatically bounced to the dashboard. No need to log in again.

2. **The user types their username and password and clicks "Sign In."** This fires the `submit` event listener in `login.js`. The handler calls `e.preventDefault()` to stop the browser from refreshing the page, then grabs the input values and trims whitespace.

3. **Input validation happens.** If either field is empty, `showError('Please enter both username and password')` displays a Minecraft-styled error message and stops everything.

4. **The button enters a loading state.** It changes to "Signing in..." and gets disabled to prevent double-clicks.

5. **`login.js` calls `window.auth.login(usernameValue, passwordValue)`.** This is the function inside `auth.js` that does the real work.

6. **Inside `login()`, credentials get Base64-encoded.** The code `btoa(\`${username}:${password}\`)` takes your plain text `sayed:mypassword123` and converts it to a Base64 string like `c2F5ZWQ6bXlwYXNzd29yZDEyMw==`. This isn't encryption — it's just encoding into a transport-safe format, as required by the HTTP Basic Auth standard.

7. **A `POST` request fires to `https://learn.reboot01.com/api/auth/signin`** with the header `Authorization: Basic c2F5ZWQ6bXlwYXNzd29yZDEyMw==`. The server checks the credentials against its database.

8. **The server responds with a JWT.** But the response format can vary — it might be a clean string, or it might be wrapped in quotes (`"eyJ..."`) or nested in JSON (`{"token": "eyJ..."}`).

9. **`cleanToken()` handles all those formats.** It trims whitespace, checks if the string looks like JSON (starts with `{`), parses it if so, and strips surrounding quotes. The result is always a clean JWT like `eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOjEyMzR9.abc123`.

10. **`validateToken()` verifies the token structure** by splitting on dots and checking there are exactly 3 parts. If not, it throws an error.

11. **The clean token is saved to `localStorage`** via `localStorage.setItem('jwt', token)`. This persists across page reloads and browser tabs.

12. **`login.js` redirects to `dashboard.html`** using `window.location.replace()`, which replaces the login page in browser history so the back button doesn't take you back to the login form.

---

### Phase 2 — 🚀 Dashboard Boot (The Gatekeeper & Data Fetch)

```mermaid
sequenceDiagram
    participant B as 🌐 Browser
    participant D as 📊 dashboard.js
    participant A as 🔐 auth.js
    participant API as 📡 api.js
    participant S as 🖥️ GraphQL Server

    B->>D: dashboard.html loads, script runs
    D->>A: window.auth.requireAuth()
    A->>A: Checks localStorage for JWT
    alt No valid JWT
        A->>B: Redirect to index.html
    else JWT found
        A-->>D: Continue
    end
    D->>D: DOMContentLoaded fires
    D->>D: loadDashboard() called
    D->>API: window.api.fetchAllUserData()
    API->>S: 5 GraphQL queries in parallel (Promise.all)
    S-->>API: All responses received
    API->>API: Process raw data into clean objects
    API-->>D: Returns combined result object
```

**Step by step:**

13. **`dashboard.html` loads and `dashboard.js` runs immediately.** The very first line of executable code is `window.auth.requireAuth()` — this is the **gatekeeper**. It calls `isAuthenticated()`, which calls `getToken()`, which reads from `localStorage`. If there's no token or it doesn't pass `validateToken()`, the user gets instantly redirected back to `index.html`. This prevents anyone from accessing the dashboard by just typing the URL.

14. **The `DOMContentLoaded` event fires**, and `loadDashboard()` is called. This is the **master orchestrator** — the one function that kicks off everything.

15. **`loadDashboard()` sets a loading state** — the username display shows "Loading..." while data is being fetched.

16. **`loadDashboard()` calls `window.api.fetchAllUserData()`** — this is the big one. It lives in `api.js` and is responsible for fetching *all* the data the dashboard needs.

17. **Inside `fetchAllUserData()`, five fetch functions fire simultaneously** using `Promise.all()`:
    - `fetchUserInfo()` → gets `id`, `login`, `email`, `createdAt`
    - `fetchXPTransactions()` → gets all XP transactions (filtered to `eventId: 763`)
    - `fetchProjects()` → gets all completed projects with grades
    - `fetchAuditRatio()` → gets audit totals (`totalUp`, `totalDown`)
    - `fetchSkills()` → gets skill-type transactions

    Each of these functions internally calls `executeQuery()` with a specific GraphQL query. All five fire at the same time — the total wait is only as long as the slowest one.

18. **After the parallel fetch completes**, a second fetch runs: `fetchProjectXP(allProjectPaths)`. This one needs the project paths from step 17, so it can't run in parallel. It fetches the XP amount earned for each specific project.

---

### Phase 3 — ⚙️ Data Processing (Raw → Clean)

```mermaid
graph TD
    R1[Raw XP Transactions] --> P1[processXPData]
    P1 --> O1["{ totalXP, xpProgress[], xpGrowth }"]

    R2[Raw Projects + XP Map] --> P2[processProjects]
    P2 --> O2["{ projectsDone, passFailRatio, recentProjects[], successRate }"]

    R3[Raw Skill Transactions] --> P3[processSkills]
    P3 --> O3["{ name, level, xp }[]"]

    O1 & O2 & O3 --> FINAL[Combined Result Object]
```

**Step by step:**

19. **`processXPData(xpTransactions)` runs.** It takes the raw transaction array and:
    - Loops through every transaction, adding each `amount` to a running `totalXP`
    - Groups XP by month (key format: `2024-03`) and stores the *cumulative* total at each month
    - Sorts months chronologically to create a timeline array: `[{ date: "2024-01", xp: 5000 }, { date: "2024-02", xp: 12000 }, ...]`
    - Calculates `xpGrowth` as the percentage change between the last two months

20. **`processProjects(projects, projectXPMap)` runs.** It:
    - Maps each project to a clean object with `name`, `status` (passed if `grade >= 1`, failed otherwise), `xp`, `date`, and `path`
    - Counts total passed and failed
    - Calculates `successRate` as a percentage
    - Slices the first 10 as `recentProjects` for the dashboard preview

21. **`processSkills(skillsData)` runs.** It:
    - Extracts skill names from transaction types (e.g., `skill_go` → `Go`, `skill_js` → `JavaScript`)
    - Sums XP per skill, sorts by total, takes the top 8
    - Calculates each skill's percentage of the total

22. **All processed data is combined** into a single result object that looks like:
    ```javascript
    {
        user: { id, login, email, createdAt },
        totalXP: 150000,
        projectsDone: 25,
        auditRatio: 1.2,
        xpProgress: [{ date, xp }, ...],
        passFailRatio: { passed: 20, failed: 5 },
        skills: [{ name: "Go", level: 35, xp: 5000 }, ...],
        recentProjects: [...],
        auditStats: { given: 180000, received: 150000 }
    }
    ```

---

### Phase 4 — 🎨 Rendering (Data → Pixels)

```mermaid
sequenceDiagram
    participant D as 📊 dashboard.js
    participant C as 📈 charts.js
    participant DOM as 🖥️ Browser DOM

    D->>DOM: updateNavbar() → sets username text
    D->>DOM: updateStats() → injects XP, projects, ratio into cards
    D->>DOM: updateUserInfo() → fills user info section
    D->>DOM: updateAuditStats() → sets audit bars + percentages
    D->>C: createXPChart(xpProgress)
    C->>DOM: Builds SVG string → injects into #xpChart
    D->>C: createPassFailChart(passFailRatio)
    C->>DOM: Builds donut SVG → injects into #passFailChart
    D->>D: loadRecentProjects() → generates project cards HTML
    D->>D: loadAllProjects() → populates modal with all projects
    D->>D: initializeAnimations()
    D->>DOM: IntersectionObserver watches all cards
    DOM-->>D: Card scrolls into view → fade-in animation triggers
```

**Step by step:**

23. **`updateNavbar(data)`** sets the username in the top nav by updating `#userName` text content.

24. **`updateStats(data)`** injects the core numbers into the three stat cards:
    - `#totalXP` gets the XP formatted with `formatBytes()` (shows as KB/MB/GB)
    - `#projectsDone` gets the project count
    - `#auditRatio` gets the ratio formatted to 2 decimal places
    - It also updates the "change" labels: XP growth percentage, success rate, and audit performance descriptor

25. **`updateUserInfo(data)`** fills in the user profile card: login, ID, email, and "Member Since" date.

26. **`updateAuditStats(data)`** calculates done/received percentages, then after a 100ms delay (for CSS transition), sets the progress bar widths and percentage labels.

27. **`createXPChart(data.xpProgress)` draws the XP timeline** — this is covered in detail in Section 5 below.

28. **`createPassFailChart(data.passFailRatio)` draws the donut chart** — also covered in detail in Section 5.

29. **`loadRecentProjects(data)`** generates HTML cards for the 10 most recent projects and injects them into `#projectsList`.

30. **`initializeAnimations()` creates an `IntersectionObserver`** — a browser API that watches elements and fires a callback when they scroll into view. It observes all `.stat-card`, `.info-card`, `.chart-card`, and `.project-item` elements. When any card enters the viewport (at least 10% visible), it:
    - Immediately sets `opacity: 0` and `translateY(20px)` (invisible, shifted down)
    - After 100ms, applies a CSS transition and sets `opacity: 1` and `translateY(0)` (fade in, slide up)
    - Calls `observer.unobserve()` so the animation only fires once per card

---

## 📊 5. How We Draw Charts Without Any Library

This is one of the most impressive parts of the project. We draw professional-looking charts using **raw SVG elements and JavaScript math** — no Chart.js, no D3, no external libraries. Just `<svg>`, math, and string building.

### SVG Elements Cheat Sheet

Before diving into the charts, here are the SVG elements we use and what they do:

| Element | What It Does | Our Usage |
| :--- | :--- | :--- |
| `<svg>` | The canvas — defines the coordinate space via `viewBox` | Wraps every chart |
| `<path>` | The Swiss Army knife — draws any shape using commands (`M`, `L`, `A`, `Z`) | XP line, area fill, donut arcs |
| `<polyline>` | Connects a list of `x,y` points with straight lines | *(Available but we use `<path>` instead)* |
| `<circle>` | Draws a circle at `cx, cy` with radius `r` | Data point dots on the XP chart |
| `<text>` | Renders text at an `x, y` position inside the SVG | Axis labels, values, donut percentages |
| `<line>` | A straight line from `x1,y1` to `x2,y2` | Grid lines on the XP chart |
| `<defs>` + `<linearGradient>` | Defines reusable styles like gradients | Semi-transparent fill under the XP line |

### 📈 XP Line / Area Chart — Step by Step

**The goal:** Turn a list of `{ date, xp }` objects into a visual timeline showing XP growth over months.

#### Step 1: Set Up the Canvas

```javascript
const width = 600;
const height = 300;
const padding = { top: 20, right: 30, bottom: 50, left: 60 };
const chartWidth = width - padding.left - padding.right;   // 510
const chartHeight = height - padding.top - padding.bottom;  // 230
```

The `viewBox="0 0 600 300"` on the `<svg>` creates a 600×300 virtual coordinate system. The padding reserves space for axis labels. The actual chart area is 510×230 pixels.

#### Step 2: Normalize & Scale

```javascript
const maxXP = Math.max(...data.map(d => d.xp));  // e.g., 200000

const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((d.xp - 0) / (maxXP - 0)) * chartHeight;
    return { x, y, xp: d.xp, date: d.date };
});
```

**What's happening here:**

- **X coordinate**: Evenly space each data point across the chart width. If you have 12 months, point 0 is at the left edge, point 11 at the right edge: `i / (data.length - 1)` gives a number from 0 to 1, multiplied by `chartWidth` to get the pixel position.

- **Y coordinate**: This is the normalization step. `d.xp / maxXP` gives a value between 0 and 1, which we scale to the chart height. We subtract from `chartHeight` because **SVG Y-axis is inverted** — `y=0` is the TOP of the screen, not the bottom. So higher XP values need a smaller Y value to appear higher on the chart.

```
               y=0  ┌──────────────┐
  Higher XP →  ↑    │    ╱\         │
               │    │   ╱  \  ╱\    │
               │    │  ╱    ╱  \   │
               ↓    │ ╱    ╱    \  │
              y=300 └──────────────┘
```

#### Step 3: Build the Path String

```javascript
const pathData = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
).join(' ');
// Result: "M 60 200 L 110 180 L 160 150 L 210 120 ..."
```

- `M 60 200` = **Move** to the starting point (don't draw)
- `L 110 180` = **Line** to the next point
- Each subsequent `L` draws a line segment

#### Step 4: Create the Area Fill

```javascript
const areaPath = `${pathData} L ${points[points.length-1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;
```

To fill the area under the line, we take the line path and add two extra points:
1. **Bottom-right corner**: from the last data point, drop straight down to the bottom edge
2. **Bottom-left corner**: go straight left to close the shape
3. `Z` closes the path back to the start

```
   Line path:    ╱\    ╱\
                ╱  \  ╱  \
               ╱    ╱    \
              ╱    ╱      \
   Added:    │←─────────── │  ← Bottom edge closes the shape
```

This closed polygon gets filled with a semi-transparent gradient: `fill="#78A7FF20"` (the `20` at the end is 12% opacity in hex).

#### Step 5: Add Data Points and Labels

```javascript
points.forEach((p) => {
    svg += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#667eea" stroke="white"/>`;
});
```

Each data point gets a `<circle>` element with a tooltip (`<title>` inside it) showing the date and XP value.

---

### 🍩 Donut Chart — Step by Step

**The goal:** Turn `{ passed: 20, failed: 5 }` into a donut chart showing success rate.

#### Step 1: Calculate the Angle

```javascript
const passPercentage = (passed / total) * 100;   // e.g., 80%
const passAngle = (passPercentage / 100) * 360;  // e.g., 288°
```

The "pass" slice covers 288° of the circle, and the "fail" slice covers the remaining 72°.

#### Step 2: Polar to Cartesian Conversion

This is the key math. A circle is defined in **polar coordinates**: an angle and a radius from the center. But SVG draws in **cartesian coordinates**: plain X,Y positions. We need to convert.

```javascript
const polarToCartesian = (cx, cy, r, angle) => {
    const rad = (angle - 90) * Math.PI / 180;    // Convert degrees to radians, offset by -90°
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad)
    };
};
```

**Why subtract 90°?** By default, 0° in math points to the right (→). We want 0° to point **up** (↑), like a clock. Subtracting 90° rotates the starting position from 3 o'clock to 12 o'clock.

```
   Without -90°:       With -90°:
        270°                0°
         │                  │
  180° ──┼── 0°    270° ──┼── 90°
         │                  │
        90°               180°
  (starts right →)    (starts top ↑)
```

**Why `Math.PI / 180`?** JavaScript's `Math.cos()` and `Math.sin()` expect **radians**, not degrees. The formula `degrees × π ÷ 180` converts degrees to radians.

#### Step 3: Build the Arc Path

```javascript
const createArc = (startAngle, endAngle, outerR, innerR) => {
    if (endAngle - startAngle >= 360) {
        endAngle = startAngle + 359.99;  // THE FIX
    }

    const start = polarToCartesian(center, center, outerR, endAngle);
    const end = polarToCartesian(center, center, outerR, startAngle);
    const innerStart = polarToCartesian(center, center, innerR, endAngle);
    const innerEnd = polarToCartesian(center, center, innerR, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1';

    return `M ${start.x} ${start.y} A ${outerR} ${outerR} 0 ${largeArc} 0 ${end.x} ${end.y} L ${innerEnd.x} ${innerEnd.y} A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y} Z`;
};
```

Let's break down the SVG `A` (Arc) command: `A rx ry rotation largeArcFlag sweep endX endY`

| Parameter | What It Does |
| :--- | :--- |
| `rx ry` | Radius in X and Y (same value = circle) |
| `rotation` | Rotation of the ellipse (always `0` for circles) |
| `largeArcFlag` | `0` = take the shorter path, `1` = take the longer path around |
| `sweep` | `0` = counterclockwise, `1` = clockwise |
| `endX endY` | Where the arc ends |

**The donut shape** is made by drawing:
1. An outer arc (radius 100) from start angle to end angle
2. A straight line (`L`) inward to the inner radius
3. An inner arc (radius 65) going back in the opposite direction
4. `Z` closes the shape

This creates a curved "slice" shape — like a slice of pie with the center eaten out.

#### The 359.99° Fix

```javascript
if (endAngle - startAngle >= 360) {
    endAngle = startAngle + 359.99;
}
```

**Why?** If a slice is exactly 360° (100%), the start and end points are *mathematically identical*. SVG says: "I'm already there, nothing to draw." Result: the entire arc disappears. By capping at 359.99°, the start and end points are *nearly* identical but technically different, so the browser draws the full circle. The 0.01° gap is invisible to the human eye.

**The `largeArcFlag`** determines which way to go around the circle:

```
  largeArc = 0          largeArc = 1
  (short way)           (long way)

     ╭──╮                 ╭──╮
     │  │                 │  │
     ╰──╯ ← small arc    ╰──╯
                    ↗ takes the big route around
```

If the slice is ≤ 180°, use the short way (`0`). If > 180°, use the long way (`1`).

---

## 🏹 6. Summary for the Audit

| Concept | Implementation | Logic |
| :--- | :--- | :--- |
| **Tokens** | JWT + localStorage | Bearer authentication for stateless security. |
| **GraphQL** | `fetch()` + POST | Declarative data fetching; fetch only what is needed. |
| **Graphs** | Vanilla SVG `<path>` | Custom math-to-coordinate rendering for pixel-perfect UI. |
| **Theme** | CSS Shadow + `pixelated` | Using `inset` shadows to create 3D block effects without textures. |

---

## 🛠️ 7. JavaScript Method Dictionary (Simple)

This section breaks down the "Workhorse" functions used in the project. Use these definitions to explain the logic during the audit.

### 🔐 `auth.js` (Security)
| Method | Purpose |
| :--- | :--- |
| `login(user, pass)` | Encodes credentials and fetches a JWT token from the server. |
| `logout()` | Erases the token from memory and kicks the user back to login. |
| `requireAuth()` | A "security guard" that redirects to login if no token is found. |
| `cleanToken(token)` | Fixes messy tokens (removes quotes or extra JSON wrappers). |

### 📊 `api.js` (Data Fetching)
| Method | Purpose |
| :--- | :--- |
| `executeQuery(query)` | Sends a POST request to the GraphQL endpoint with the token. |
| `fetchAllUserData()` | Triggers all data fetches (XP, Projects, Skills) at once (Parallel). |
| `processXPData()` | Calculates total XP and monthly growth from raw transactions. |
| `processProjects()` | Sorts through projects to find which passed or failed. |

### 📈 `charts.js` (Visuals)
| Method | Purpose |
| :--- | :--- |
| `createXPChart(data)` | Draws the SVG line graph for your XP progress. |
| `createPassFailChart()`| Calculates the angles for the donut chart "slices". |
| `polarToCartesian()` | Math helper: converts circle angles into X/Y coordinates for drawing. |

### 🏠 `dashboard.js` (UI Sync)
| Method | Purpose |
| :--- | :--- |
| `loadDashboard()` | The "Master Script" that starts everything when the page opens. |
| `updateStats()` | Injects the actual numbers (XP, Ratio) into the HTML cards. |
| `initializeAnimations()`| Uses the `IntersectionObserver` to fade-in cards as you scroll. |

> [!NOTE]
> All helper functions (like `formatNumber` or `formatDate`) are centralized to ensure numbers and dates look consistent across the entire app.

---

## ❓ 8. Audit Q&A Cheat Sheet — "If They Ask You..."

### "What is a JWT and how does your app use it?"
- A JWT is a token with 3 parts: **Header** (algorithm), **Payload** (user data), **Signature** (server's proof it's legit)
- After login, the server gives us a JWT. We store it in `localStorage`
- Every GraphQL request includes it as `Authorization: Bearer <token>`
- It's **stateless** — the server doesn't track sessions, it just validates the signature on each request
- If the token is missing or expired, `requireAuth()` immediately redirects to the login page

### "Why did you use GraphQL instead of REST?"
- With REST, fetching a dashboard would require 4-5 separate HTTP calls (`/users`, `/xp`, `/projects`, etc.)
- With GraphQL, we send **one POST request** and specify exactly which fields we need — nothing extra
- We also use `transaction_aggregate` to do calculations on the server instead of downloading thousands of rows
- Combined with `Promise.all()`, our 5 queries fire in parallel, so the dashboard loads in ~1 second instead of 5

### "How do you draw the charts? What library did you use?"
- **No library** — everything is raw SVG elements built with JavaScript string concatenation
- For the **XP timeline**: we normalize XP values (divide by max), scale to the SVG viewBox, and create `<path>` elements with `M` (move) and `L` (line) commands
- For the **donut chart**: we convert percentages to angles, use `polarToCartesian()` to get X,Y points on the circle edge, and draw arcs with the SVG `A` command
- We use the `359.99°` trick to prevent 100% slices from disappearing

### "What is Base64 encoding and why do you use it for login?"
- Base64 converts binary/text data into a set of 64 ASCII characters (letters, numbers, `+`, `/`)
- It's NOT encryption — anyone can decode it. It's just a safe transport format
- HTTP Basic Auth requires credentials in the format `Base64("username:password")`
- We use `btoa()` (a built-in browser function) to encode, and the server uses `atob()` (or equivalent) to decode
- The actual security comes from HTTPS (encrypted connection), not from the encoding

### "What does `Promise.all()` do and why is it better here?"
- `Promise.all()` takes an array of promises and fires them all **simultaneously** (in parallel)
- It returns a single promise that resolves when **all** the inner promises have resolved
- Without it, 5 queries × ~1 second each = 5 seconds (sequential). With it, total time = ~1 second (the slowest query)
- If any one promise fails, the whole `Promise.all()` rejects — so we wrap it in a `try/catch` for error handling
- We destructure the result: `const [user, xp, projects, ...] = await Promise.all([...])`

### "What is `polarToCartesian()` and why do you need it?"
- A circle is naturally described in **polar coordinates**: angle + radius from center
- SVG draws in **cartesian coordinates**: X,Y positions on a grid
- `polarToCartesian()` converts between them: `x = cx + r * cos(angle)`, `y = cy + r * sin(angle)`
- We subtract 90° so 0° starts at the **top** (12 o'clock) instead of the **right** (3 o'clock)
- Without this function, we wouldn't be able to draw arcs because we wouldn't know where on the circle edge each slice starts and ends

### "What happens if the JWT is missing or expired?"
- **On page load**: `requireAuth()` runs immediately in `dashboard.js`. It calls `getToken()` → `validateToken()`. If the token is missing or malformed, the user is instantly redirected to `index.html`
- **During API calls**: `executeQuery()` checks the response status. If the server returns a `401` or `403` (unauthorized/forbidden), it calls `window.auth.logout()`, which clears the token and redirects to login
- **On the login page**: `redirectIfAuthenticated()` runs — if there IS a valid token, it skips the login page entirely and sends you straight to the dashboard

### "Why do you use `transaction_aggregate` instead of fetching all records?"
- `transaction_aggregate` asks the **server** to run calculations (sum, count) and return just the result
- Without it, we'd fetch thousands of individual transaction records, transfer all that data over the network, then loop through them in JavaScript to calculate totals
- This saves **bandwidth** (less data transferred), **memory** (less data stored in the browser), and **processing time** (the server's database is optimized for aggregation, JavaScript isn't)
- Example: instead of downloading 500 audit records and counting them, we ask the server `count` and get back the number `500`
