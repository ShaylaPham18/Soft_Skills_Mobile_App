// src/supabase/functions/server/index.ts
import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createClient } from '@supabase/supabase-js';

const app = new Hono();

const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabaseAuth = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

app.use('*', logger());
app.use(
    '/*',
    cors({
        origin: '*',
        allowHeaders: ['Content-Type', 'Authorization'],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    })
);

if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.SUPABASE_ANON_KEY
) {
    throw new Error('Missing Supabase environment variables.');
}

console.info(
    '✅ Env OK - URL:',
    process.env.SUPABASE_URL,
    '| Role key len:',
    process.env.SUPABASE_SERVICE_ROLE_KEY?.length
);

//app.get('/make-server-93cd01be/health', (c) => c.json({ status: 'ok' }));

app.get('/make-server-93cd01be/daily-challenge/:userId', async (c) => {
    try {
        const userIdParam = c.req.param('userId');
        const authHeader = c.req.header('Authorization');
        const accessToken = authHeader?.replace(/^Bearer\s+/i, '').trim();

        if (!accessToken) {
            console.warn('Missing or malformed Authorization header');
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const { data: userData, error: authError } =
            await supabaseAuth.auth.getUser(accessToken);
        if (authError || !userData?.user) {
            console.warn('Token verification failed:', authError?.message);
            return c.json({ error: 'Unauthorized' }, 401);
        }

        const userIdVerified = userData.user.id;
        const today = new Date().toISOString().slice(0, 10);

        const { data: storedChallenge, error: storedError } = await supabaseAdmin
            .from('user_challenges')
            .select('*')
            .eq('user_id', userIdVerified)
            .eq('date', today)
            .maybeSingle();

        if (storedError) console.error('DB read error:', storedError);

        if (storedChallenge) {
            return c.json({
                challenge: storedChallenge.challenge,
                completed: storedChallenge.completed,
                skipsUsed: storedChallenge.skips_used || 0,
                skipsRemaining: 2 - (storedChallenge.skips_used || 0),
            });
        }

        const { data: challenges, error: challengeError } = await supabaseAdmin
            .from('daily_challenges')
            .select('*');

        if (challengeError) {
            console.error('DB fetch error:', challengeError);
            return c.json({ error: 'Failed to fetch challenges' }, 500);
        }
        if (!challenges?.length) {
            console.info('No challenges found in table');
            return c.json({ error: 'No challenges found' }, 404);
        }

        const randomIndex = Math.floor(Math.random() * challenges.length);
        const selectedChallenge = challenges[randomIndex];
        const { error: insertError } = await supabaseAdmin
            .from('user_challenges')
            .insert({
                user_id: userIdVerified,
                date: today,
                challenge: selectedChallenge,
                completed: false,
                skips_used: 0,
            });

        if (insertError) console.error('Insert error:', insertError);

        return c.json({
            challenge: selectedChallenge,
            completed: false,
            skipsUsed: 0,
            skipsRemaining: 2,
        });
    } catch (err) {
        console.error('Unhandled error:', err);
        return c.json({ error: 'Failed to get daily challenge' }, 500);
    }
})

// Skip Challenge Route
app.post('/make-server-93cd01be/skip-challenge', async (c) => {
    try {
        const { userId } = await c.req.json();
        const today = new Date().toISOString().slice(0, 10);

        const { data: record, error } = await supabaseAdmin
            .from('user_challenges')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today)
            .maybeSingle();

        if (error || !record) {
            return c.json({ error: 'No active challenge found to skip.' }, 404);
        }

        const skipsUsed = record.skips_used ?? 0;
        if (skipsUsed >= 2) {
            return c.json({ error: 'No skips remaining today.' }, 400);
        }

        const { data: challenges, error: chErr } = await supabaseAdmin
            .from('daily_challenges')
            .select('*');

        if (chErr || !challenges?.length) {
            return c.json({ error: 'No challenges available to skip to.' }, 404);
        }

        const randomIndex = Math.floor(Math.random() * challenges.length);
        const newChallenge = challenges[randomIndex];

        const { error: updateErr } = await supabaseAdmin
            .from('user_challenges')
            .update({
                challenge: newChallenge,
                skips_used: skipsUsed + 1,
            })
            .eq('id', record.id);

        if (updateErr) throw updateErr;

        return c.json({
            challenge: newChallenge,
            skipsUsed: skipsUsed + 1,
            skipsRemaining: 2 - (skipsUsed + 1),
        });
    } catch (err) {
        console.error('Error skipping challenge:', err);
        return c.json({ error: 'Failed to skip challenge' }, 500);
    }
});

// Complete Challenge Route
 app.post('/make-server-93cd01be/complete-challenge', async (c) => {
    try {
        const { userId, challengeId, points } = await c.req.json();
        const today = new Date().toISOString().slice(0, 10);

        // mark challenge complete
        const { error: updateError } = await supabaseAdmin
            .from('user_challenges')
            .update({ completed: true })
            .eq('user_id', userId)
            .eq('date', today);

        if (updateError) throw updateError;

        console.log(`Challenge ${challengeId} completed by ${userId}, +${points} points`);

        return c.json({ success: true, message: 'Challenge completed!' });
    } catch (err) {
        console.error('Error completing challenge:', err);
        return c.json({ error: 'Failed to complete challenge' }, 500);
    }
});

// Run the server
serve({ fetch: app.fetch, port: 3001 });
console.log('🚀 Server running at http://localhost:3001');
