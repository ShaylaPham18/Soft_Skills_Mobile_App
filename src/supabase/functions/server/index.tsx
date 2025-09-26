import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
);

// Health check endpoint
app.get("/make-server-93cd01be/health", (c) => {
  return c.json({ status: "ok" });
});

// User authentication endpoints
app.post("/make-server-93cd01be/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    
    // Validate input
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }
    
    if (password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters long' }, 400);
    }
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log('Signup error:', error);
      let errorMessage = error.message;
      
      // Provide more user-friendly error messages
      if (error.message.includes('already_registered')) {
        errorMessage = 'An account with this email already exists';
      } else if (error.message.includes('invalid_email')) {
        errorMessage = 'Please provide a valid email address';
      } else if (error.message.includes('weak_password')) {
        errorMessage = 'Password is too weak. Please choose a stronger password';
      }
      
      return c.json({ error: errorMessage }, 400);
    }

    // Initialize user progress
    try {
      await kv.set(`progress:${data.user.id}`, {
        currentStreak: 0,
        longestStreak: 0,
        totalPoints: 0,
        challengesCompleted: 0,
        weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
        monthlyStats: [],
        level: 1,
        pointsToNextLevel: 100,
        lastChallengeDate: null
      });
    } catch (kvError) {
      console.log('Progress initialization error:', kvError);
      // Don't fail signup if progress initialization fails
    }

    return c.json({ user: data.user, message: 'Account created successfully' });
  } catch (error) {
    console.log('Signup error:', error);
    return c.json({ error: 'Signup failed. Please try again.' }, 500);
  }
});

app.post("/make-server-93cd01be/signin", async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    // Create a separate Supabase client for authentication without service role
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY')
    );
    
    // Use Supabase's proper authentication
    const { data, error } = await authClient.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.session) {
      console.log('Signin error:', error);
      return c.json({ error: error?.message || 'Invalid login credentials' }, 400);
    }

    return c.json({ 
      access_token: data.session.access_token,
      user: data.user 
    });
  } catch (error) {
    console.log('Signin error:', error);
    return c.json({ error: 'Signin failed' }, 500);
  }
});

// Helper function to verify token
const verifyToken = async (accessToken: string | undefined) => {
  if (!accessToken) return null;
  
  try {
    // First try to verify as a real Supabase token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    if (user && !error) {
      return user.id;
    }
    
    // Fallback to mock token for backwards compatibility
    const tokenData = JSON.parse(atob(accessToken));
    if (tokenData.exp && tokenData.exp < Date.now()) {
      return null;
    }
    return tokenData.user_id;
  } catch {
    return null;
  }
};

// Daily challenge endpoints
app.get("/make-server-93cd01be/daily-challenge/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const authenticatedUserId = await verifyToken(accessToken);
    if (!authenticatedUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const today = new Date().toDateString();
    const challengeKey = `challenge:${userId}:${today}`;
    const existingChallenge = await kv.get(challengeKey);
    
    if (existingChallenge) {
      const skipsUsed = existingChallenge.skipsUsed || 0;
      return c.json({
        ...existingChallenge,
        skipsUsed,
        skipsRemaining: 2 - skipsUsed
      });
    }

    // If no challenge exists for today, the client will generate one
    return c.json({ 
      challenge: null, 
      completed: false, 
      skipsUsed: 0, 
      skipsRemaining: 2 
    });
  } catch (error) {
    console.log('Get daily challenge error:', error);
    return c.json({ error: 'Failed to get daily challenge' }, 500);
  }
});

// Store generated challenge
app.post("/make-server-93cd01be/store-daily-challenge", async (c) => {
  try {
    const { userId, challenge, skipsUsed: currentSkipsUsed } = await c.req.json();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const authenticatedUserId = await verifyToken(accessToken);
    if (!authenticatedUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const today = new Date().toDateString();
    const challengeKey = `challenge:${userId}:${today}`;
    
    // Get existing challenge data to preserve skip count
    const existingData = await kv.get(challengeKey);
    const skipsUsed = currentSkipsUsed !== undefined ? currentSkipsUsed : (existingData?.skipsUsed || 0);
    
    // Store the challenge for today
    await kv.set(challengeKey, {
      challenge,
      completed: false,
      skipsUsed,
      generatedAt: new Date().toISOString()
    });

    return c.json({ success: true });
  } catch (error) {
    console.log('Store daily challenge error:', error);
    return c.json({ error: 'Failed to store daily challenge' }, 500);
  }
});

// Skip daily challenge
app.post("/make-server-93cd01be/skip-challenge", async (c) => {
  try {
    const { userId } = await c.req.json();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const authenticatedUserId = await verifyToken(accessToken);
    if (!authenticatedUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const today = new Date().toDateString();
    const challengeKey = `challenge:${userId}:${today}`;
    
    // Get current challenge data
    const challengeData = await kv.get(challengeKey);
    if (!challengeData) {
      return c.json({ error: 'No challenge found for today' }, 404);
    }

    const currentSkips = challengeData.skipsUsed || 0;
    
    // Check if user has already used 2 skips
    if (currentSkips >= 2) {
      return c.json({ error: 'Maximum skips reached for today' }, 400);
    }

    // Update skip count and clear the current challenge so a new one can be generated
    await kv.set(challengeKey, {
      challenge: null,
      completed: false,
      skipsUsed: currentSkips + 1,
      lastSkippedAt: new Date().toISOString()
    });

    return c.json({ 
      success: true, 
      skipsUsed: currentSkips + 1,
      skipsRemaining: 2 - (currentSkips + 1)
    });
  } catch (error) {
    console.log('Skip challenge error:', error);
    return c.json({ error: 'Failed to skip challenge' }, 500);
  }
});

app.post("/make-server-93cd01be/complete-challenge", async (c) => {
  try {
    const { userId, challengeId, points } = await c.req.json();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const authenticatedUserId = await verifyToken(accessToken);
    if (!authenticatedUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const today = new Date().toDateString();
    const challengeKey = `challenge:${userId}:${today}`;
    
    // Get existing challenge data to preserve skip count
    const existingData = await kv.get(challengeKey);
    const skipsUsed = existingData?.skipsUsed || 0;
    
    // Mark challenge as completed while preserving skip data
    await kv.set(challengeKey, {
      challenge: { id: challengeId, points },
      completed: true,
      skipsUsed,
      completedAt: new Date().toISOString()
    });

    // Update user progress
    const progressKey = `progress:${userId}`;
    let progress = await kv.get(progressKey) || {
      currentStreak: 0,
      longestStreak: 0,
      totalPoints: 0,
      challengesCompleted: 0,
      weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
      monthlyStats: [],
      level: 1,
      pointsToNextLevel: 100,
      lastChallengeDate: null
    };

    // Update streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    if (progress.lastChallengeDate === yesterdayStr) {
      progress.currentStreak += 1;
    } else if (progress.lastChallengeDate !== today) {
      progress.currentStreak = 1;
    }
    
    progress.longestStreak = Math.max(progress.longestStreak, progress.currentStreak);
    progress.lastChallengeDate = today;
    
    // Update other stats
    progress.totalPoints += points;
    progress.challengesCompleted += 1;
    
    // Update weekly progress (current day of week)
    const dayOfWeek = new Date().getDay();
    progress.weeklyProgress[dayOfWeek] += 1;
    
    // Update monthly stats
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const monthIndex = progress.monthlyStats.findIndex(stat => stat.month === currentMonth);
    
    if (monthIndex >= 0) {
      progress.monthlyStats[monthIndex].challengesCompleted += 1;
      progress.monthlyStats[monthIndex].pointsEarned += points;
    } else {
      progress.monthlyStats.push({
        month: currentMonth,
        challengesCompleted: 1,
        pointsEarned: points
      });
    }

    // Update level
    while (progress.totalPoints >= progress.level * 100) {
      progress.level += 1;
    }
    progress.pointsToNextLevel = (progress.level * 100) - progress.totalPoints;

    await kv.set(progressKey, progress);

    return c.json({ success: true, progress });
  } catch (error) {
    console.log('Complete challenge error:', error);
    return c.json({ error: 'Failed to complete challenge' }, 500);
  }
});

// Skills assessment endpoints
app.get("/make-server-93cd01be/assessment/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const authenticatedUserId = await verifyToken(accessToken);
    if (!authenticatedUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const assessment = await kv.get(`assessment:${userId}`);
    return c.json({ assessment });
  } catch (error) {
    console.log('Get assessment error:', error);
    return c.json({ error: 'Failed to get assessment' }, 500);
  }
});

app.post("/make-server-93cd01be/save-assessment", async (c) => {
  try {
    const { userId, results, answers } = await c.req.json();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const authenticatedUserId = await verifyToken(accessToken);
    if (!authenticatedUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    await kv.set(`assessment:${userId}`, {
      results,
      answers,
      completedAt: new Date().toISOString()
    });

    return c.json({ success: true });
  } catch (error) {
    console.log('Save assessment error:', error);
    return c.json({ error: 'Failed to save assessment' }, 500);
  }
});

// Progress tracking endpoints
app.get("/make-server-93cd01be/progress/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const authenticatedUserId = await verifyToken(accessToken);
    if (!authenticatedUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const progress = await kv.get(`progress:${userId}`) || {
      currentStreak: 0,
      longestStreak: 0,
      totalPoints: 0,
      challengesCompleted: 0,
      weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
      monthlyStats: [],
      level: 1,
      pointsToNextLevel: 100,
      lastChallengeDate: null
    };

    return c.json(progress);
  } catch (error) {
    console.log('Get progress error:', error);
    return c.json({ error: 'Failed to get progress' }, 500);
  }
});

// Custom challenges endpoints
app.get("/make-server-93cd01be/custom-challenges/:userId", async (c) => {
  try {
    const userId = c.req.param('userId');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const authenticatedUserId = await verifyToken(accessToken);
    if (!authenticatedUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const challenges = await kv.getByPrefix(`custom-challenge:${userId}:`);
    return c.json({ challenges });
  } catch (error) {
    console.log('Get custom challenges error:', error);
    return c.json({ error: 'Failed to get custom challenges' }, 500);
  }
});

app.post("/make-server-93cd01be/custom-challenges", async (c) => {
  try {
    const challengeData = await c.req.json();
    console.log('Received challenge data:', challengeData);
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    console.log('Access token present:', !!accessToken);
    
    const authenticatedUserId = await verifyToken(accessToken);
    console.log('Authenticated user ID:', authenticatedUserId);
    
    if (!authenticatedUserId) {
      console.log('Authentication failed');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Validate required fields
    if (!challengeData.title || !challengeData.description || !challengeData.category) {
      console.log('Missing required fields:', { 
        title: !!challengeData.title, 
        description: !!challengeData.description, 
        category: !!challengeData.category 
      });
      return c.json({ error: 'Missing required fields' }, 400);
    }

    const challengeId = crypto.randomUUID();
    const challenge = {
      id: challengeId,
      ...challengeData,
      createdAt: new Date().toISOString()
    };

    console.log('Saving challenge with key:', `custom-challenge:${challengeData.createdBy}:${challengeId}`);
    console.log('Challenge object:', challenge);

    await kv.set(`custom-challenge:${challengeData.createdBy}:${challengeId}`, challenge);

    console.log('Challenge saved successfully');
    return c.json({ challenge });
  } catch (error) {
    console.log('Create custom challenge error:', error);
    console.log('Error details:', error.message, error.stack);
    return c.json({ error: 'Failed to create custom challenge: ' + error.message }, 500);
  }
});

app.put("/make-server-93cd01be/custom-challenges/:challengeId", async (c) => {
  try {
    const challengeId = c.req.param('challengeId');
    const challengeData = await c.req.json();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const authenticatedUserId = await verifyToken(accessToken);
    if (!authenticatedUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const challenge = {
      id: challengeId,
      ...challengeData,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`custom-challenge:${challengeData.createdBy}:${challengeId}`, challenge);

    return c.json({ challenge });
  } catch (error) {
    console.log('Update custom challenge error:', error);
    return c.json({ error: 'Failed to update custom challenge' }, 500);
  }
});

app.delete("/make-server-93cd01be/custom-challenges/:challengeId", async (c) => {
  try {
    const challengeId = c.req.param('challengeId');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const authenticatedUserId = await verifyToken(accessToken);
    if (!authenticatedUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Find and delete the challenge
    const challengeKey = `custom-challenge:${authenticatedUserId}:${challengeId}`;
    await kv.del(challengeKey);

    return c.json({ success: true });
  } catch (error) {
    console.log('Delete custom challenge error:', error);
    return c.json({ error: 'Failed to delete custom challenge' }, 500);
  }
});

// Profile management
app.put("/make-server-93cd01be/profile", async (c) => {
  try {
    const profileData = await c.req.json();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    const authenticatedUserId = await verifyToken(accessToken);
    if (!authenticatedUserId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    await kv.set(`profile:${authenticatedUserId}`, profileData);
    return c.json({ success: true });
  } catch (error) {
    console.log('Update profile error:', error);
    return c.json({ error: 'Failed to update profile' }, 500);
  }
});

Deno.serve(app.fetch);