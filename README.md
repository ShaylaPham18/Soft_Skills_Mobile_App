
  # Leveling You Up!
  
### Description / Abstract
- This is a mobile-friendly React/Vite application designed to help students strengthen their soft skills through daily challenges, personalized assessments, streak tracking, and gamified progression. It started as mockup on Figma. 

Users take a soft-skills assessment, receive tailored daily challenges from a Supabase-powered database, and track their growth through points, levels, and activity streaks.

This project incorporates:

A React frontend

A Node.js + Hono backend

Supabase Auth for login

Supabase Postgres for challenges and user progress

-  **This project (or part of this project) was developed as part of the SD Capstone course at GGC under Dr. B.**

### Technologies
- Frontend: React (Vite), TypeScript
- Backend: Node.js + Hono (lightweight API framework), Supabase JS Client, JSON Web Token (JWT), REST API endpoints 
- Database: Supabase 
- Version Control: Git / GitHub
- Environment: IntelliJi
- Tools Github, npm + Vite Dev Server
- AI Tools: Copilot, Cursor, Figma (Mockup) 
  
### Working Features
**Secure Authentication (Supabase Auth)**
- Email/password login
- JWT access tokens
- User metadata (name, email)

**Daily Challenge System**
- Pulls challenges from Supabase database
- One challenge per day per user
- 2 skip limit with new random challenge
- Completion tracking
- Personalized challenge generation based on assessment results

**Progress Tracking**
- Streak system
- Points & level progression
- Weekly activity chart
- Monthly stats

**Skills Assessment**
- User answers questions to determine weakest soft skill
- Backend generates the challenge options from the weakest soft skill

**Custom Challenges**
- Users can add their own custom challenges
- Stored per user in Supabase

**User Profile**
- View user info
- Manage account

### Installation & Run Steps
- Clone the repository
-- https://github.com/ShaylaPham18/Soft_Skills_Mobile_App.git
-- cd soft-skills-app

- Install dependencies: npm install

- Add your environment variables - Create a .env file in the root with: 
SUPABASE_URL=https://yourproject.supabase.co 
SUPABASE_ANON_KEY=your-anon-key 
SUPABASE_SERVICE_ROLE_KEY=your-service-key

- Run the backend: npm run server
- Run the frontend: npm run dev

This will launch your app. 

## Troubleshooting 
- If backend doesn't run, check if your Supabase database is running
- npm run server

- If frontend doesn't run, npm install
- npm run dev 

## License
This project is licensed under the MIT License (Modified for Educational Use).  
See [LICENSE.md](./LICENSE.md) for full details.
