import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, Star, CheckCircle, SkipForward } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';

interface Challenge {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: string;
    points: number;
    skill: string;
    created_at: string;
    completed?: boolean;
}

interface DailyChallengeProps {
    user: any;
    accessToken: string;
    onChallengeCompleted: () => void;
}

export function DailyChallenge({
                                   user,
                                   accessToken,
                                   onChallengeCompleted,
                               }: DailyChallengeProps) {
    const [todaysChallenge, setTodaysChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [skipsUsed, setSkipsUsed] = useState(0);
    const [skipsRemaining, setSkipsRemaining] = useState(2);
    const [assessmentResults, setAssessmentResults] = useState<any[]>([]);

    // Challenge backend: Node server in dev, Supabase function in prod
    const baseUrl =
        process.env.NODE_ENV === 'development'
            ? 'http://localhost:3001'
            : `https://${projectId}.supabase.co/functions/v1`;

    // Assessment always lives in Supabase functions
    const assessmentBaseUrl = `https://${projectId}.supabase.co/functions/v1`;

    // ✅ Check if user has taken the skills assessment
    const loadAssessmentResults = async (): Promise<boolean> => {
        try {
            if (!accessToken || !user?.id) return false;

            const res = await fetch(
                `${assessmentBaseUrl}/make-server-93cd01be/assessment/${user.id}`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            console.log('DailyChallenge assessment status:', res.status);

            if (!res.ok) {
                // 404 or similar = no assessment yet
                setAssessmentResults([]);
                return false;
            }

            const result = await res.json();
            console.log('DailyChallenge assessment result:', result);

            // Match SkillsAssessment: result.assessment.results
            const results = result.assessment?.results ?? [];

            setAssessmentResults(results);
            return results.length > 0;
        } catch (err) {
            console.error('Error loading assessment results in DailyChallenge:', err);
            setAssessmentResults([]);
            return false;
        }
    };

    const generateChallengeFromAssessment = async (): Promise<Challenge | null> => {
        try {
            if (!accessToken) {
                toast.error('Session missing. Please sign in again.');
                return null;
            }

            const res = await fetch(`${baseUrl}/make-server-93cd01be/generate-challenge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ userId: user.id, assessmentResults }),
            });

            const text = await res.text();
            let data: any = {};
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                console.error('Non-JSON response from generate-challenge:', text);
                toast.error('Server error when generating challenge');
                return null;
            }

            if (!res.ok) {
                console.error('generate-challenge failed:', res.status, data);
                toast.error(data?.error || 'Failed to generate challenge');
                return null;
            }

            return data.challenge || null;
        } catch (error) {
            console.error('Error generating challenge:', error);
            toast.error('Unable to generate a new challenge.');
            return null;
        }
    };

    const loadOrGenerateChallenge = async () => {
        try {
            if (!accessToken) {
                console.warn('Missing accessToken in DailyChallenge');
                toast.error('Session missing. Please sign in again.');
                setLoading(false);
                return;
            }

            // 1️⃣ Check assessment first
            const hasAssessment = await loadAssessmentResults();
            if (!hasAssessment) {
                // Block challenges until assessment is done
                setTodaysChallenge(null);
                setLoading(false);
                return;
            }

            // 2️⃣ Load or create today's challenge
            const res = await fetch(
                `${baseUrl}/make-server-93cd01be/daily-challenge/${user.id}`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            const text = await res.text();
            let result: any = {};
            try {
                result = text ? JSON.parse(text) : {};
            } catch (e) {
                console.error('Failed to parse server response as JSON:', text);
                toast.error('Unexpected server response');
                setLoading(false);
                return;
            }

            if (!res.ok) {
                console.error('daily-challenge failed:', res.status, result);
                toast.error(result?.error || 'Failed to load challenge');
                setLoading(false);
                return;
            }

            if (result.challenge) {
                setTodaysChallenge({
                    ...result.challenge,
                    completed: result.completed ?? result.challenge.completed ?? false,
                });
                setSkipsUsed(result.skipsUsed || 0);
                setSkipsRemaining(result.skipsRemaining ?? 2);
            } else {
                const newChallenge = await generateChallengeFromAssessment();
                if (newChallenge) {
                    setTodaysChallenge({
                        ...newChallenge,
                        completed: false,
                    });
                }
            }
        } catch (err) {
            console.error('Error loading or generating challenge:', err);
            toast.error('Failed to load challenge');
        } finally {
            setLoading(false);
        }
    };

    const handleSkipChallenge = async () => {
        if (skipsRemaining <= 0) {
            toast.error('No skips remaining for today.');
            return;
        }

        try {
            const res = await fetch(`${baseUrl}/make-server-93cd01be/skip-challenge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ userId: user.id }),
            });

            const result = await res.json();
            if (res.ok) {
                toast.success('Challenge skipped! Generating a new one...');
                setSkipsUsed(result.skipsUsed);
                setSkipsRemaining(result.skipsRemaining);
                await loadOrGenerateChallenge();
            } else {
                toast.error(result.error || 'Failed to skip challenge');
            }
        } catch (err) {
            console.error('Error skipping challenge:', err);
            toast.error('Unable to skip challenge.');
        }
    };

    const handleCompleteChallenge = async () => {
        if (!todaysChallenge) return;

        try {
            const res = await fetch(`${baseUrl}/make-server-93cd01be/complete-challenge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    userId: user.id,
                    challengeId: todaysChallenge.id,
                    points: todaysChallenge.points || 10,
                }),
            });

            const result = await res.json();
            if (res.ok) {
                toast.success('Challenge completed!');
                setTodaysChallenge((prev) =>
                    prev ? { ...prev, completed: true } : prev
                );
                onChallengeCompleted();
            } else {
                toast.error(result.error || 'Failed to complete challenge');
            }
        } catch (err) {
            console.error('Error completing challenge:', err);
            toast.error('Unable to complete challenge.');
        }
    };

    useEffect(() => {
        if (user && accessToken) {
            setLoading(true);
            loadOrGenerateChallenge();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, accessToken]);

    if (loading) {
        return (
            <Card className="border-blue-200">
                <CardContent className="p-6">
                    <div className="text-center">
                        <Clock className="mx-auto h-12 w-12 text-blue-400 mb-4" />
                        <p className="text-blue-700">Loading today's challenge...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ⛔ No assessment yet → show gate
    if (!todaysChallenge && assessmentResults.length === 0) {
        return (
            <Card className="border-blue-200">
                <CardContent className="p-6 text-center text-blue-700">
                    <h2 className="text-xl font-bold mb-2">Assessment Required</h2>
                    <p className="mb-4">
                        Before you can receive daily challenges, please complete your Skills
                        Assessment first.
                    </p>
                    <p className="text-sm text-blue-600">
                        Go to the <strong>Skills Assessment</strong> section in the app to get
                        started.
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Assessment exists but no challenge for some reason
    if (!todaysChallenge) {
        return (
            <Card className="border-blue-200">
                <CardContent className="p-6 text-center text-blue-700">
                    <p>No challenge available for today.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-25 to-sky-25">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Today's Challenge
                </CardTitle>
                <Badge>{todaysChallenge.difficulty}</Badge>
            </CardHeader>

            <CardContent>
                <h3 className="font-medium text-blue-900 mb-3">{todaysChallenge.title}</h3>
                <div className="text-sm text-blue-600 mb-2">
                    Focus Skill: <span className="font-semibold">{todaysChallenge.skill}</span>
                </div>
                <p className="text-blue-700 mb-6">{todaysChallenge.description}</p>
                <br />

                {todaysChallenge.completed ? (
                    <div className="flex items-center justify-center gap-2 text-green-700 font-medium">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Challenge completed! 🎉
                    </div>
                ) : (
                    <div className="flex justify-between items-center mt-6">
                        <div className="text-sm text-blue-700">
                            Skips Remaining: {skipsRemaining}
                        </div>

                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                disabled={skipsRemaining === 0}
                                onClick={handleSkipChallenge}
                            >
                                <SkipForward className="h-4 w-4 mr-1" /> Skip
                            </Button>

                            <Button onClick={handleCompleteChallenge}>
                                <CheckCircle className="h-4 w-4 mr-1" /> Complete
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
