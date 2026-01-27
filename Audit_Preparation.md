# 🧠 Audit Preparation: Technical Deep Dive

This document is designed to help you answer complex technical questions during the project audit.

## 🔐 Authentication & Security

**Q: How do you handle login and session persistence?**
- **Process**: We use `fetch()` to send credentials via `Authorization: Basic [Base64]` to the `/api/auth/signin` endpoint. The server returns a JWT.
- **Persistence**: The JWT is saved in `localStorage`. We use a `cleanToken()` function to handle both raw strings and JSON-wrapped tokens that some APIs return.
- **Header Structure**: For all subsequent GraphQL requests, we include the header `'Authorization': 'Bearer ' + token`.

## 📉 GraphQL Integration

**Q: How do you fetch the specific data needed for the dashboard?**
- **Parallel Requests**: We use `Promise.all()` to fetch user info, XP, projects, and skills simultaneously, significantly reducing load time.
- **Aggregates**: While we calculate many things locally, we use `transaction_aggregate` for counting audits to minimize the amount of data transferred over the network.
- **Filtering**: We filter transactions by `eventId: 763` and `type: "xp"` to ensure we only count bootcamp-specific progress.

## 📊 Data Processing Logic

**Q: How is "Total XP" calculated?**
- We iterate through all `xp` transactions and sum the `amount`. In Python or JS, this is a simple `reduce()` or `forEach` loop.

**Q: How do you handle the KB/MB/GB scaling?**
- We treat the raw XP value as "bytes". Since XP values can be small (e.g., 2,200), we force even small values to show as `KB` (2.2 KB) using a custom `formatBytes` helper to make the numbers feel meaningful.

**Q: How is the "Success Rate" calculated?**
- `(Passed Projects / Total Projects) * 100`. We define "Passed" as any project with a `grade >= 1`.

## 🎨 Custom Charts (SVG)

**Q: Why did you build charts from scratch?**
- To maintain the 0-radius Minecraft aesthetic and full control over pixel fonts.
- **XP Chart**: We calculate the `viewBox` scale. `X` is time (months), `Y` is cumulative XP. We use `<polyline>` for the line and a `<path>` with a closing line to the bottom for the transparent area fill.
- **Donut Chart**: We use CSS `stroke-dasharray` and `stroke-dashoffset` tricks on SVG `<circle>` elements to create segments. 
- **100% Case Fix**: Standard SVG arcs can break if they cover exactly 360 degrees. We fixed this by capping full arcs at `359.99` degrees so the browser always renders the loop.

## 🧩 Minecraft Theme Technicalities

**Q: How do you create the 3D block effect without images?**
- **Inset Box Shadows**: We use `box-shadow: inset -4px -4px 0 var(--dark), inset 4px 4px 0 var(--light);`. The light shadow on the top-left and dark on the bottom-right creates the illusion of a raised block.
- **Pixelated Images**: We use `image-rendering: pixelated;` on the background GIF and Grass Block images to prevent the browser from smoothing the edges, preserving the sharp "Retro" look.

## ⚠️ Edge Cases Handled
- **Missing index.html**: Redirection logic prepared for 500 errors.
- **Empty Profiles**: Default values (0 XP, No charts) ensure the app doesn't crash if a new user logs in.
- **Token Expiry**: The `executeQuery` function automatically logs the user out if a 401 or 403 status is returned during an active session.
