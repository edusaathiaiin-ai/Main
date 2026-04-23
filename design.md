# Brand Design Identity: Edusaathi AI

## 1. Visual Vibe
The website should feel trustworthy, academic, yet high-tech. 
- Style: "Modern Classroom" – Clean, plenty of white space, and professional.
- Corners: Slightly rounded (8px) to feel friendly but not "bubbly."

## 2. Colors (The Edusaathi Palette)
- Primary: #1A73E8 (Trustworthy Blue - for main buttons and links)
- Accent: #34A853 (Growth Green - for success messages or "Start" buttons)
- Background: #FFFFFF (Clean White)
- Text: #202124 (Soft Black - easier on the eyes than pure black)

## 3. Typography
- Headings: Bold and clear (use 'Inter' or 'Roboto' fonts).
- Body: Simple and readable.

## 4. Specific Rules (Do's and Don'ts)
- DO: Use clear icons next to labels.
- DO: Add a subtle shadow to cards so they "pop" off the page.
- DON'T: Use bright neon colors.
- DON'T: Use messy or "handwritten" looking fonts.
## 5. Premium UI Components (The "Rich" Layer)

### Cards & Containers
- **The Floating Look:** Don't just use flat borders. Use a very soft shadow: `box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03)`.
- **Inner Padding:** Never let content feel "squashed." Every card must have at least `24px` of padding inside.

### Buttons & Actions
- **The "BioSaathi" Green:** Use `#14532D` (Dark Forest Green) for primary headers and `#22C55E` for active buttons.
- **Micro-interactions:** When a user hovers over a sidebar item (like "Student Demand"), the background should turn a very pale green (`#F0FDF4`) with a rounded corner of `8px`.

### Sidebar Refinement
- **Icon Spacing:** Maintain exactly `12px` between the icon and the text.
- **Text Style:** Sidebar links should be `14px` weight `500` (Medium) so they look sharp and professional.
## 6. Depth & Elevation (The "Expensive" Look)
To make the UI feel "rich," we use shadows to show what is important.
- **Level 1 (Flat):** Main background.
- **Level 2 (Raised):** Sidebars and secondary navigation. Shadow: `0 1px 3px rgba(0,0,0,0.05)`.
- **Level 3 (Floating):** Main content cards and the "Research Basket." Shadow: `0 10px 15px -3px rgba(0,0,0,0.1)`.

## 7. Interactive States (The "Feeling")
A website feels high-quality when it reacts to the user's touch.
- **Hover State:** When a mouse is over a card, it should lift up slightly (`translate-y: -2px`) and the shadow should get deeper.
- **Active State:** When a button is clicked, it should shrink by 2% (`scale: 0.98`) to feel like a real physical button.

## 8. Typography Hierarchy (The "Bible" Integration)
*Note: This is where we link your Typography Bible.*
- **Display (H1):** 32px, Bold, Letter-spacing: -0.02em. (Used for "Welcome, Laxita").
- **Sub-headings (H2):** 20px, Semibold. (Used for Section Titles).
- **Body Text:** 16px, Regular, Line-height: 1.6. (This ensures text is never "crowded").
- **Caption:** 12px, Medium, All-caps, Letter-spacing: 0.05em. (Used for labels like "QUICK ACTIONS").
## 9. Grid & Alignment (The "Invisible Lines")
To look professional, everything must align to an invisible grid.
- **Sidebar Alignment:** All icons must be centered within a 24px wide invisible box. The text should start exactly 12px after that box.
- **Card Alignment:** The "Quick Actions" grid should have a 16px gap between boxes. Each box must be the exact same height, regardless of the text length inside.

## 10. The "Quick Action" Button Recipe
*Use this for the 'Create Live Session' style boxes:*
- **Background:** Very subtle off-white or light grey (#F9FAFB).
- **Border:** 1px solid #F3F4F6.
- **Icon Style:** Use a soft "tint" background behind the icon (e.g., a pale purple circle behind the microphone).
- **Text:** 14px, Medium weight (#374151).
- **Hover:** On hover, the border color should change to our Brand Green (#1A73E8) and the shadow should appear.

## 11. Consistency Check (The "Gold Standard")
- **Radius Rule:** Every single corner on the website must use `border-radius: 12px`. Currently, some boxes look sharper than others. Let's make them all uniform.
- **Icon Colors:** Don't use "Full Color" icons everywhere. Use "Duo-tone" icons where the secondary part of the icon is 30% transparent. This looks much more modern.
## 12. Dark Mode & Login Aesthetics
When using the "Midnight Navy" background (#0B1120):
- **Card Background:** Use a slightly lighter navy (#111827) with a subtle 1px border (#1F2937). This creates "layering."
- **Inputs:** The email input box should have a dark background. Only the border should glow when clicked.
- **Button Hierarchy:** 1. **Primary (Magic Link):** Solid Brand Green (#22C55E) with White text.
    2. **Secondary (Google):** Transparent background with a thin white border.
    3. **Tertiary (WhatsApp):** Simple text with an icon, no big green box (unless it's the most important action).

## 13. Transparency & Glassmorphism
To make things look "Rich," use subtle transparency:
- Use `backdrop-filter: blur(10px)` on the login card so it feels like frosted glass sitting on top of the dark background.
## 14. Typography for Dark Backgrounds
- **Contrast:** Never use pure grey on dark navy. Use "Blue-Grey" (#94A3B8) so it feels harmonious.
- **Line Height:** For small instructions, use a line height of 1.5 to prevent the letters from "bleeding" into each other.