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

// ─────────────────────── helpers ───────────────────────

function toDateString(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    return new Date(value).toISOString().slice(0, 10);
}

/**
 * Given an assessment row, figure out the weakest skills.
 * 1) Prefer the `weakest_skill` column if present.
 * 2) Otherwise fall back to the lowest value(s) in `scores`.
 */
function extractWeakestSkills(assessment: any): string[] {
    if (!assessment) return [];

    // 1) Use stored weakest_skill if present
    if (assessment.weakest_skill) {
        const wk = String(assessment.weakest_skill).trim();
        if (wk.length > 0) {
            console.log('🔥 Using weakest_skill column:', wk);
            return [wk];
        }
    }

    // 2) Fallback: compute from scores JSON
    const scores = assessment.scores as Record<string, number> | undefined;
    if (!scores || typeof scores !== 'object') return [];

    const entries = Object.entries(scores)
        .map(([skill, score]) => [skill, Number(score)] as [string, number])
        .filter(([, n]) => !Number.isNaN(n));

    if (entries.length === 0) return [];

    let min = entries[0][1];
    for (const [, n] of entries) {
        if (n < min) min = n;
    }

    const weakest = entries
        .filter(([, n]) => n === min)
        .map(([skill]) => skill.trim())
        .filter((s) => s.length > 0);

    console.log('🔥 Computed weakest skills from scores:', weakest);
    return weakest;
}

// ─────────────────────── assessment routes ───────────────────────

// GET latest assessment for a user
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

// POST save assessment scores
app.post('/make-server-93cd01be/assessment/:userId', async (c) => {
    try {
        const userId = c.req.param('userId');
        const body = await c.req.json();

        console.log('Incoming assessment POST:', { userId, body });

        if (!userId) {
            return c.json({ error: 'Missing userId in URL' }, 400);
        }

        if (!body || typeof body !== 'object' || Array.isArray(body)) {
            return c.json(
                { error: 'Body must be a JSON object of skill scores' },
                400
            );
        }

        // Normalize all scores to numbers
        const scores: Record<string, number> = {};
        for (const [skill, value] of Object.entries(body)) {
            const num = Number(value);
            if (Number.isNaN(num)) {
                return c.json(
                    { error: `Score for skill "${skill}" is not a valid number` },
                    400
                );
            }
            scores[skill] = num;
        }

        const skillKeys = Object.keys(scores);
        if (skillKeys.length === 0) {
            return c.json({ error: 'No scores provided' }, 400);
        }

        // Compute weakest skill for convenience column
        const weakestSkill = skillKeys.reduce((curr, key) =>
            scores[key] < scores[curr] ? key : curr
        );

        console.log('Computed weakestSkill:', weakestSkill, 'scores:', scores);

        const { data, error } = await supabaseAdmin
            .from('user_assessments')
            .insert({
                user_id: userId,
                scores,
                weakest_skill: weakestSkill,
            })
            .select()
            .single();

        if (error) {
            console.error('Error saving assessment to user_assessments:', error);
            return c.json(
                {
                    error: 'Failed to save assessment',
                    details: error.message ?? error,
                },
                500
            );
        }

        console.log('Saved assessment row:', data);
        return c.json({ assessment: data }, 200);
    } catch (err: any) {
        console.error('Unexpected error in POST /assessment:', err);
        return c.json(
            { error: 'Unexpected error saving assessment', details: String(err) },
            500
        );
    }
});

// ─────────────────────── daily challenge ───────────────────────

app.get('/make-server-93cd01be/daily-challenge/:userId', async (c) => {
    try {
        const authHeader = c.req.header('Authorization');
        const accessToken = authHeader?.replace(/^Bearer\s+/i, '').trim();

        if (!accessToken) return c.json({ error: 'Unauthorized' }, 401);

        const { data: userData } = await supabaseAuth.auth.getUser(accessToken);
        if (!userData?.user) return c.json({ error: 'Unauthorized' }, 401);

        const userId = userData.user.id;
        const today = new Date().toISOString().slice(0, 10);

        // 1) If there's already a challenge for today, return it
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

        // 2) Load latest assessment to figure out weakest skill(s)
        let weakestSkills: string[] = [];
        try {
            const { data: assessment, error: assessmentErr } = await supabaseAdmin
                .from('user_assessments')
                .select('scores, weakest_skill')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (assessmentErr) {
                console.warn(
                    '⚠️ Error loading assessment for daily-challenge:',
                    assessmentErr
                );
            } else {
                console.log('🧪 Assessment loaded for daily-challenge:', assessment);
                weakestSkills = extractWeakestSkills(assessment);
            }
        } catch (e) {
            console.warn(
                '⚠️ Could not load assessment for daily-challenge, will use random challenge.',
                e
            );
        }

        // 3) Load all challenges
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

        // 4) Filter by weakest skill(s) if we have them
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

        // 5) Pick one at random
        const selected = pool[Math.floor(Math.random() * pool.length)];
        console.log('✅ Selected challenge skill:', selected.skill);

        // 6) Store today's challenge
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

// ─────────────────────── skip challenge ───────────────────────

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

        // Load weakest skills again
        let weakestSkills: string[] = [];
        try {
            const { data: assessment, error: assessmentErr } = await supabaseAdmin
                .from('user_assessments')
                .select('scores, weakest_skill')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (assessmentErr) {
                console.warn(
                    '⚠️ Error loading assessment for skip-challenge:',
                    assessmentErr
                );
            } else {
                weakestSkills = extractWeakestSkills(assessment);
            }
        } catch (e) {
            console.warn(
                '⚠️ Could not load assessment for skip-challenge, using random.',
                e
            );
        }

        const { data: allChallenges, error: challengesError } = await supabaseAdmin
            .from('daily_challenges')
            .select('*');

        if (challengesError || !allChallenges || allChallenges.length === 0) {
            console.error('Error loading daily_challenges for skip:', challengesError);
            return c.json({ error: 'Failed to skip challenge' }, 500);
        }

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

        // Don't pick the same challenge again if possible
        if (record.challenge?.id) {
            pool = pool.filter((ch: any) => ch.id !== record.challenge.id);
        }

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

// ─────────────────────── complete challenge ───────────────────────

app.post('/make-server-93cd01be/complete-challenge', async (c) => {
    try {
        const { userId, challengeId, points } = await c.req.json();
        const awardedPoints =
            typeof points === 'number' && !Number.isNaN(points) ? points : 10;

        const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

        const { error: updateErr } = await supabaseAdmin
            .from('user_challenges')
            .update({ completed: true })
            .eq('user_id', userId)
            .eq('date', todayStr);

        if (updateErr) {
            console.error('Error marking challenge complete:', updateErr);
            return c.json({ error: 'Failed to complete challenge' }, 500);
        }

        let progressRecord: any = null;
        try {
            const { data, error: progressErr } = await supabaseAdmin
                .from('user_progress')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
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

        try {
            const { error: upsertErr } = await supabaseAdmin
                .from('user_progress')
                .upsert({
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
                console.error('Error upserting user_progress (non-fatal):', upsertErr);
            }
        } catch (err) {
            console.error(
                'Unexpected error upserting user_progress (non-fatal):',
                err
            );
        }

        console.log(
            `✅ Challenge ${challengeId} completed by ${userId}, +${awardedPoints} pts, total=${totalPoints}, streak=${currentStreak}, lvl=${level}`
        );

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

// ─────────────────────── user progress ───────────────────────

app.get('/make-server-93cd01be/progress/:userId', async (c) => {
    try {
        const userId = c.req.param('userId');
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
        const dateSet = new Set(completedDates);
        const dateObjs = [...dateSet].map(
            (ds) => new Date(ds + 'T00:00:00Z')
        );
        dateObjs.sort((a, b) => a.getTime() - b.getTime());
        const todayStr = new Date().toISOString().slice(0, 10);
        let currentStreak = 0;
        let cursor = new Date(todayStr + 'T00:00:00Z');

        while (dateSet.has(cursor.toISOString().slice(0, 10))) {
            currentStreak++;
            cursor.setUTCDate(cursor.getUTCDate() - 1);
        }

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

        const todayLocal = new Date();
        const todayLocalStr = todayLocal.toISOString().slice(0, 10);
        const [ty, tm, td] = todayLocalStr.split('-').map(Number);
        const today = new Date(Date.UTC(ty, tm - 1, td));
        const ONE_DAY = 1000 * 60 * 60 * 24;

        // weeklyProgress
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
