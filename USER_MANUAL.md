# User Manual - Leveling You UP!

**Developer: Shayla Pham**
**Software Project/Capstone - GGC - Dr. B**

Date: August-November 2025 

This project or part of this project was developed as part of the SD Capstone course at GGC under Dr. B.

# Table of Contents

Introduction

System Requirements

Installation Instructions

Getting Started

Feature-by-Feature Guide

Troubleshooting & FAQs

AI Features

Future Developer Guidance

Support & Contact Information

## Introduction 
The Soft Skills Challenge App helps students and young professionals improve communication, teamwork, and leadership skills through daily, personalized challenges. The app encourages users to grow consistently by completing bite-sized activities each day, tracking progress, and earning points and streaks.

**The app transforms skill-building into a gamified experience through:**

Daily challenges

Points and leveling

Streak tracking

Assessment-based personalization

**Intended for:**

Students

Early-career professionals

Anyone who wants structured soft-skills improvement

**Key Features**

Daily soft skill challenges retrieved from a live Supabase database

Option to complete or skip challenges

Progress tracking with streaks, points, and levels

Secure login and user authentication

Scalable backend using Hono + Supabase

## System Requirements 

**Hardware**

Modern laptop or desktop with internet access

Minimum 4GB RAM recommended


**Software**

Node.js v20+

npm (Node Package Manager)

Modern browser (Chrome, Edge, or Firefox)


**Frameworks & Libraries**

React (frontend)

TypeScript

Supabase (database & authentication)

Hono (backend API framework)

Vite (build tool)

## Installation Instructions
Clone the repository
git clone https://github.com/ShaylaPham18/Soft_Skills_Mobile_App.git
cd soft-skills-app

Install dependencies
npm install

Add your environment variables
Create a .env file in the root with:
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key

Run the backend
npm run server

Run the frontend
npm run dev

Open your browser at:
http://localhost:3000/

## Getting Started

Click Sign In / Register to create your account.
After logging in, you’ll be redirected to the Home screen showing your Daily Challenge.
Use the Skip or Complete buttons to interact with challenges.
Navigate using the bottom tab menu to access Progress, Assessment, or Profile pages.

## Feature-by-Feature Guide

Home / Daily Challenge
Displays one challenge per day.
Buttons:
Complete – marks challenge as done.
Skip – allows up to 2 skips per day.
Progress Tracker
Shows streaks, levels, and points.
Progress updates automatically when challenges are completed.
Skills Assessment
(Future feature) Determines which soft skills need improvement and personalizes challenge generation.
Profile Page
Displays your name, total points, and level.


## Troubleshooting & FAQs

“Daily challenge won’t load”

Ensure backend is running

Ensure Supabase keys are correct

“Cannot complete or skip challenge”

Check if backend server route is reachable

Verify user_challenges table exists

“Login not working”

Check Supabase Auth settings

## AI Features (if applicable) - None but wanted to plan some for the future 

Future versions will integrate an AI module that:
Generates challenges dynamically based on skill gaps.
Analyzes user patterns to suggest personalized learning paths.

Limitations:
Currently, all challenges are pulled from a static database.

## Future Developer Guidance

**Architecture Overview**

Frontend: React + TypeScript
Backend: Hono API server
Database: Supabase

**Setting Up Dev Environment**

Clone repo

Add .env

Run npm install

Start backend → npm run server

Start frontend → npm run dev

**Extending the App**

Add streak freeze

Add leaderboard

Add AI generation directly during challenge creation

**Known Issues**

Progress updating needs improvement

Backend routes should be modularized

Service role key should be moved to secure server hosting

## Support & Contact Information

Developer: Shayla Pham

Email: spham5@ggc.edu

Version: 1.0.0

Date: November 2025



