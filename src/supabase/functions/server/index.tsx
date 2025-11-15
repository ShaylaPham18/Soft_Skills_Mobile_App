import 'dotenv/config';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createClient } from '@supabase/supabase-js';

const app = new Hono();

// Supabase clients
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

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function toDateString(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    return new Date(value).toISOString().slice(0, 10);
}

// results is an array like [{ skill: 'Communication', score: 60, level: 'Average' }, ...]
function getWeakestSkills(results: any[]): string[] {
    if (!Array.isArray(results) || results.length === 0) return [];

    // Only consider entries that actually have a numeric score
    const numericResults = results.filter(
        (r) => typeof r.score === 'number' && !Number.isNaN(r.score)
    );
    if (numericResults.length === 0) return [];

    const minScore = Math.min(...numericResults.map((r) => r.score as number));

    const weakestSkills = numericResults
        .filter((r) => r.score === minScore)
        .map((r) => String(r.skill || '').trim())
        .filter((s) => s.length > 0);

    console.log('🔥 Weakest skills detected from assessment:', weakestSkills);
    return weakestSkills;
}

/* ------------------------------------------------------------------ */
/* ✅ Assessment routes (match SkillsAssessment + DailyChallenge)      */
/* ------------------------------------------------------------------ */

// GET latest assessment
app.get('/make-server-93cd01be/assessment/:userId', async (c) => {
    try {
        const userId = c.req.param('userId');

        const { data, error } = await supabaseAdmin
            .from('user_assessments')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error loading assessment:', error);
            return c.json({ error: 'Failed to load assessment' }, 500);
        }

        if (!data) {
            // what DailyChallenge expects when none
            return c.json({ assessment: null });
        }

        return c.json({ assessment: data });
    } catch (err) {
        console.error('Error in /assessment:', err);
        return c.json({ error: 'Failed to load assessment' }, 500);
    }
});

// SAVE assessment
app.post('/make-server-93cd01be/save-assessment', async (c) => {
    try {
        const { userId, results, answers } = await c.req.json();

        if (!userId || !Array.isArray(results)) {
            return c.json({ error: 'Missing userId or results' }, 400);
        }

        // if user_assessments.user_id is NOT unique, this will just insert new rows,
        // which is fine because we always order by created_at when reading.
        const { error } = await supabaseAdmin.from('user_assessments').upsert({
            user_id: userId,
            results,
            answers: answers || {},
            created_at: new Date().toISOString(),
        });

        if (error) {
            console.error('Error saving assessment:', error);
            return c.json({ error: 'Failed to save assessment' }, 500);
        }

        return c.json({ success: true });
    } catch (err) {
        console.error('Error in /save-assessment:', err);
        return c.json({ error: 'Failed to save assessment' }, 500);
    }
});

app.get('/make-server-93cd01be/daily-challenge/:userId', async (c) => {
    try {
        const authHeader = c.req.header('Authorization');
        const accessToken = authHeader?.replace(/^Bearer\s+/i, '').trim();

        if (!accessToken) return c.json({ error: 'Unauthorized' }, 401);

        const { data: userData } = await supabaseAuth.auth.getUser(accessToken);
        if (!userData?.user) return c.json({ error: 'Unauthorized' }, 401);

        const userId = userData.user.id;
        const today = new Date().toISOString().slice(0, 10);

        // 1) Already have today's challenge? Just return it.
        const { data: storedChallenge } = await supabaseAdmin
            .from('user_challenges')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today)
            .maybeSingle();

        if (storedChallenge) {
            console.log(
                '📦 Returning stored challenge for today:',
                storedChallenge.challenge?.skill
            );
            return c.json({
                challenge: storedChallenge.challenge,
                completed: storedChallenge.completed,
                skipsUsed: storedChallenge.skips_used || 0,
                skipsRemaining: 2 - (storedChallenge.skips_used || 0),
            });
        }

        // 2) No stored challenge → use assessment to pick one
        let weakestSkills: string[] = [];
        try {
            const { data: assessment } = await supabaseAdmin
                .from('user_assessments')
                .select('results')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            console.log('🧪 Assessment loaded for daily-challenge:', assessment);

            if (assessment?.results) {
                weakestSkills = getWeakestSkills(assessment.results as any[]);
            }
        } catch (e) {
            console.warn(
                '⚠️ Could not load assessment for daily-challenge, will use random challenge.',
                e
            );
        }

        // 3) Load all challenges once
        const { data: allChallenges, error: challengesError } = await supabaseAdmin
            .from('daily_challenges')
            .select('*');

        if (challengesError) {
            console.error('Error loading daily_challenges:', challengesError);
            return c.json({ error: 'Failed to load challenge' }, 500);
        }

        if (!allChallenges || allChallenges.length === 0) {
            return c.json({ error: 'No challenges available' }, 404);
        }

        // Filter by weakest skills (case-insensitive) if we have them
        let pool = allChallenges;
        if (weakestSkills.length > 0) {
            const normalizedWeak = weakestSkills.map((s) =>
                s.toLowerCase().trim()
            );

            pool = allChallenges.filter((ch: any) => {
                const skillStr = String(ch.skill || '').toLowerCase().trim();
                return normalizedWeak.includes(skillStr);
            });

            console.log('🎯 Weakest skills:', weakestSkills);
            console.log(
                '🎯 Challenges matching weakest skills:',
                pool.map((ch: any) => ch.skill)
            );
        }

        // If none matched, fall back to all challenges
        if (pool.length === 0) {
            console.log('ℹ️ No challenges matched weakest skills, using full pool.');
            pool = allChallenges;
        }

        const selected = pool[Math.floor(Math.random() * pool.length)];
        console.log('✅ Selected challenge skill:', selected.skill);

        await supabaseAdmin.from('user_challenges').insert({
            user_id: userId,
            date: today,
            challenge: selected,
            completed: false,
            skips_used: 0,
        });

        return c.json({
            challenge: selected,
            completed: false,
            skipsUsed: 0,
            skipsRemaining: 2,
        });
    } catch (err) {
        console.error('Error in daily-challenge:', err);
        return c.json({ error: 'Failed to load challenge' }, 500);
    }
});

app.post('/make-server-93cd01be/skip-challenge', async (c) => {
    try {
        const { userId } = await c.req.json();
        const today = new Date().toISOString().slice(0, 10);

        const { data: record } = await supabaseAdmin
            .from('user_challenges')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today)
            .maybeSingle();

        if (!record) return c.json({ error: 'No active challenge found.' }, 404);

        const skipsUsed = record.skips_used ?? 0;
        if (skipsUsed >= 2) return c.json({ error: 'No skips remaining.' }, 400);

        // 1) Load latest assessment to get weakest skills
        let weakestSkills: string[] = [];
        try {
            const { data: assessment } = await supabaseAdmin
                .from('user_assessments')
                .select('results')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (assessment?.results) {
                weakestSkills = getWeakestSkills(assessment.results as any[]);
            }
        } catch (e) {
            console.warn(
                '⚠️ Could not load assessment for skip-challenge, using random.',
                e
            );
        }

        // 2) Load all challenges
        const { data: allChallenges, error: challengesError } = await supabaseAdmin
            .from('daily_challenges')
            .select('*');

        if (challengesError || !allChallenges || allChallenges.length === 0) {
            console.error('Error loading daily_challenges for skip:', challengesError);
            return c.json({ error: 'Failed to skip challenge' }, 500);
        }

        // 3) Filter by weakest skills if we have them
        let pool = allChallenges;
        if (weakestSkills.length > 0) {
            const normalizedWeak = weakestSkills.map((s) =>
                s.toLowerCase().trim()
            );
            pool = allChallenges.filter((ch: any) => {
                const skillStr = String(ch.skill || '').toLowerCase().trim();
                return normalizedWeak.includes(skillStr);
            });
        }

        // 4) Try not to give the exact same challenge again
        if (record.challenge?.id) {
            pool = pool.filter((ch: any) => ch.id !== record.challenge.id);
        }

        // If filtering emptied the pool, fall back to all except current
        if (pool.length === 0) {
            pool = allChallenges.filter((ch: any) => ch.id !== record.challenge?.id);
        }

        if (pool.length === 0) {
            // literally only one challenge exists
            pool = allChallenges;
        }

        const newChallenge = pool[Math.floor(Math.random() * pool.length)];

        await supabaseAdmin
            .from('user_challenges')
            .update({ challenge: newChallenge, skips_used: skipsUsed + 1 })
            .eq('id', record.id);

        console.log(
            '⏭ Skip picked challenge with skill:',
            newChallenge.skill,
            'for user',
            userId
        );

        return c.json({
            challenge: newChallenge,
            skipsUsed: skipsUsed + 1,
            skipsRemaining: 2 - (skipsUsed + 1),
        });
    } catch (err) {
        console.error('Error in skip-challenge:', err);
        return c.json({ error: 'Failed to skip challenge' }, 500);
    }
});

/* ------------------------------------------------------------------ */
/* ✅ Complete challenge – robust version                             */
/* ------------------------------------------------------------------ */
app.post('/make-server-93cd01be/complete-challenge', async (c) => {
    try {
        const { userId, challengeId, points } = await c.req.json();

        // always treat points as a number, default 10
        const awardedPoints =
            typeof points === 'number' && !Number.isNaN(points) ? points : 10;

        const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

        // 1) Mark today's challenge complete
        const { error: updateErr } = await supabaseAdmin
            .from('user_challenges')
            .update({ completed: true })
            .eq('user_id', userId)
            .eq('date', todayStr);

        if (updateErr) {
            console.error('Error marking challenge complete:', updateErr);
            return c.json({ error: 'Failed to complete challenge' }, 500);
        }

        // 2) Try to fetch existing progress (latest row if multiple)
        let progressRecord: any = null;
        try {
            const { data, error: progressErr } = await supabaseAdmin
                .from('user_progress')
                .select('*')
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (progressErr) {
                console.error(
                    'Error fetching user_progress (non-fatal, will treat as new user):',
                    progressErr
                );
            } else {
                progressRecord = data;
            }
        } catch (err) {
            console.error(
                'Unexpected error reading user_progress (non-fatal):',
                err
            );
        }

        // 3) Compute progress numbers
        let currentStreak = 1;
        let longestStreak = 1;
        let totalPoints = awardedPoints;
        let challengesCompleted = 1;

        if (progressRecord) {
            currentStreak = (progressRecord.current_streak ?? 0) + 1;
            longestStreak = Math.max(
                progressRecord.longest_streak ?? 0,
                currentStreak
            );
            totalPoints = (progressRecord.total_points ?? 0) + awardedPoints;
            challengesCompleted = (progressRecord.challenges_completed ?? 0) + 1;
        }

        const POINTS_PER_LEVEL = 100;
        const level = Math.floor(totalPoints / POINTS_PER_LEVEL) + 1;
        const pointsToNextLevel = level * POINTS_PER_LEVEL - totalPoints;

        // 4) Upsert progress WITHOUT onConflict (simpler / safer)
        try {
            const { error: upsertErr } = await supabaseAdmin.from('user_progress').upsert({
                user_id: userId,
                current_streak: currentStreak,
                longest_streak: longestStreak,
                total_points: totalPoints,
                challenges_completed: challengesCompleted,
                level,
                points_to_next_level: pointsToNextLevel,
                updated_at: new Date().toISOString(),
            });

            if (upsertErr) {
                console.error(
                    'Error upserting user_progress (non-fatal):',
                    upsertErr
                );
                // we DO NOT return 500 here anymore
            }
        } catch (err) {
            console.error(
                'Unexpected error upserting user_progress (non-fatal):',
                err
            );
            // still no 500
        }

        console.log(
            `✅ Challenge ${challengeId} completed by ${userId}, +${awardedPoints} pts, total=${totalPoints}, streak=${currentStreak}, lvl=${level}`
        );

        // 5) Always return success as long as marking the challenge complete worked
        return c.json({
            success: true,
            currentStreak,
            longestStreak,
            totalPoints,
            challengesCompleted,
            level,
            pointsToNextLevel,
        });
    } catch (err) {
        console.error('Error in /complete-challenge:', err);
        return c.json({ error: 'Failed to complete challenge' }, 500);
    }
});

/* ------------------------------------------------------------------ */
/* ✅ Get user progress – computed from user_challenges                */
/* ------------------------------------------------------------------ */
app.get('/make-server-93cd01be/progress/:userId', async (c) => {
    try {
        const userId = c.req.param('userId');

        // 1) Pull all completed challenges for this user
        const { data: userChallenges, error: challengesErr } = await supabaseAdmin
            .from('user_challenges')
            .select('date, completed, challenge')
            .eq('user_id', userId)
            .eq('completed', true);

        if (challengesErr) {
            console.error('Error fetching user_challenges for progress:', challengesErr);
            return c.json({
                currentStreak: 0,
                longestStreak: 0,
                totalPoints: 0,
                challengesCompleted: 0,
                weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
                monthlyStats: [],
                level: 1,
                pointsToNextLevel: 100,
            });
        }

        if (!userChallenges || userChallenges.length === 0) {
            return c.json({
                currentStreak: 0,
                longestStreak: 0,
                totalPoints: 0,
                challengesCompleted: 0,
                weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
                monthlyStats: [],
                level: 1,
                pointsToNextLevel: 100,
            });
        }

        // --------------------------------------------------------------
        // 2) Compute totals from challenge JSON
        // --------------------------------------------------------------
        const completedDates: string[] = [];
        let totalPoints = 0;

        for (const row of userChallenges) {
            const challengeData: any = (row as any).challenge || {};
            const pts =
                typeof challengeData.points === 'number' ? challengeData.points : 10;
            totalPoints += pts;

            const dateStr = toDateString((row as any).date);
            if (dateStr) completedDates.push(dateStr);
        }

        const challengesCompleted = completedDates.length;

        // --------------------------------------------------------------
        // 3) Compute current streak and longest streak
        // --------------------------------------------------------------
        const dateSet = new Set(completedDates);
        const dateObjs = [...dateSet].map(
            (ds) => new Date(ds + 'T00:00:00Z')
        );
        dateObjs.sort((a, b) => a.getTime() - b.getTime());

        // current streak – consecutive days ending today
        const todayStr = new Date().toISOString().slice(0, 10);
        let currentStreak = 0;
        let cursor = new Date(todayStr + 'T00:00:00Z');

        while (dateSet.has(cursor.toISOString().slice(0, 10))) {
            currentStreak++;
            cursor.setUTCDate(cursor.getUTCDate() - 1);
        }

        // longest streak – max consecutive run in history
        let longestStreak = 0;
        if (dateObjs.length > 0) {
            let streak = 1;
            longestStreak = 1;

            for (let i = 1; i < dateObjs.length; i++) {
                const prev = dateObjs[i - 1];
                const curr = dateObjs[i];

                const diffDays =
                    (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

                if (diffDays === 1) {
                    streak++;
                } else if (diffDays >= 2) {
                    if (streak > longestStreak) longestStreak = streak;
                    streak = 1;
                }
            }
            if (streak > longestStreak) longestStreak = streak;
        }

        // --------------------------------------------------------------
        // 4) Weekly activity & monthly stats
        // --------------------------------------------------------------
        const todayLocal = new Date();
        const todayLocalStr = todayLocal.toISOString().slice(0, 10);
        const [ty, tm, td] = todayLocalStr.split('-').map(Number);
        const today = new Date(Date.UTC(ty, tm - 1, td));
        const ONE_DAY = 1000 * 60 * 60 * 24;

        // weeklyProgress: index 0 = Mon, ... 6 = Sun
        const weeklyProgress = Array(7).fill(0);
        let challengesThisMonth = 0;
        let pointsThisMonth = 0;

        for (const row of userChallenges) {
            const dateStr = toDateString((row as any).date);
            if (!dateStr) continue;

            const [y, m, d] = dateStr.split('-').map(Number);
            const dayDate = new Date(Date.UTC(y, m - 1, d));

            // weekly
            const diff = Math.floor((today.getTime() - dayDate.getTime()) / ONE_DAY);
            if (diff >= 0 && diff < 7) {
                const jsDay = dayDate.getUTCDay(); // 0=Sun..6=Sat
                const idx = jsDay === 0 ? 6 : jsDay - 1; // Mon(0)..Sun(6)
                weeklyProgress[idx]++;
            }

            // monthly
            if (
                dayDate.getUTCFullYear() === today.getUTCFullYear() &&
                dayDate.getUTCMonth() === today.getUTCMonth()
            ) {
                challengesThisMonth++;
                const challengeData: any = (row as any).challenge || {};
                const pts =
                    typeof challengeData.points === 'number' ? challengeData.points : 10;
                pointsThisMonth += pts;
            }
        }

        const monthName = today.toLocaleString('default', { month: 'long' });

        // --------------------------------------------------------------
        // 5) Level info (based purely on totalPoints)                    |
        // --------------------------------------------------------------
        const POINTS_PER_LEVEL = 100;
        const level = Math.floor(totalPoints / POINTS_PER_LEVEL) + 1;
        const pointsToNextLevel = level * POINTS_PER_LEVEL - totalPoints;

        return c.json({
            currentStreak,
            longestStreak,
            totalPoints,
            challengesCompleted,
            weeklyProgress,
            monthlyStats: [
                {
                    month: monthName,
                    challengesCompleted: challengesThisMonth,
                    pointsEarned: pointsThisMonth,
                },
            ],
            level,
            pointsToNextLevel,
        });
    } catch (err) {
        console.error('Error fetching progress:', err);
        return c.json({ error: 'Failed to fetch progress' }, 500);
    }
});

serve({ fetch: app.fetch, port: 3001 });
console.log('Server running at http://localhost:3001');
