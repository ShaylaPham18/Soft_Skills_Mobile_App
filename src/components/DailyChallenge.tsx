import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, Star } from 'lucide-react';
import { Button } from './ui/button';
import { CheckCircle, SkipForward } from 'lucide-react';
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
}

interface DailyChallengeProps {
    user: any;
    accessToken: string;
    onChallengeCompleted: () => void;
}

export function DailyChallenge({ user, accessToken, onChallengeCompleted }: DailyChallengeProps) {
    const [todaysChallenge, setTodaysChallenge] = useState<Challenge | null>(null);
    const [loading, setLoading] = useState(true);
    const [skipsUsed, setSkipsUsed] = useState(0);
    const [skipsRemaining, setSkipsRemaining] = useState(2);
    const [assessmentResults, setAssessmentResults] = useState<any[]>([]);

    const baseUrl = process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001'
        : `https://${projectId}.supabase.co/functions/v1`;

    const loadAssessmentResults = async () => {
        try {
            if (!accessToken) return;
            const res = await fetch(`${baseUrl}/make-server-93cd01be/assessment/${user.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const result = await res.json();
            setAssessmentResults(result.assessment?.results || []);
        } catch (err) {
            console.error('Error loading assessment results:', err);
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

            const res = await fetch(`${baseUrl}/make-server-93cd01be/daily-challenge/${user.id}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });

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
                setTodaysChallenge(result.challenge);
                setSkipsUsed(result.skipsUsed || 0);
                setSkipsRemaining(result.skipsRemaining ?? 2);
            } else {
                await loadAssessmentResults();
                const newChallenge = await generateChallengeFromAssessment();
                if (newChallenge) setTodaysChallenge(newChallenge);
            }
        } catch (err) {
            console.error('Error loading or generating challenge:', err);
            toast.error('Failed to load challenge');
        } finally {
            setLoading(false);
        }
    };

    const generateChallengeFromAssessment = async () => {
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
                await loadOrGenerateChallenge(); // reload a new challenge
            } else {
                toast.error(result.error || 'Failed to skip challenge');
            }
        } catch (err) {
            console.error('Error skipping challenge:', err);
            toast.error('Unable to skip challenge.');
        }
    };

    const handleCompleteChallenge = async () => {
        try {
            const res = await fetch(`${baseUrl}/make-server-93cd01be/complete-challenge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    userId: user.id,
                    challengeId: todaysChallenge?.id,
                    points: todaysChallenge?.points || 10,
                }),
            });

            const result = await res.json();
            if (res.ok) {
                toast.success('Challenge completed!');
                setTodaysChallenge({ ...todaysChallenge, completed: true }); // mark done
                onChallengeCompleted(); // <-- This tells the parent (Dashboard) to refresh ProgressTracker
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
            loadOrGenerateChallenge();
        } else {
            setLoading(false);
        }
    }, [user, accessToken]);

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
                <h3 className="font-medium text-blue-900">{todaysChallenge.title}</h3>
                <p className="text-blue-700 mb-6">{todaysChallenge.description}</p><br></br>

                {/* ✅ If challenge completed */}
                {todaysChallenge.completed ? (
                    <div className="flex items-center justify-center gap-2 text-green-700 font-medium">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Challenge completed! 🎉
                    </div>
                ) : (
                    <>
                        {/* ✅ Skip + Complete Buttons */}
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

                                <Button
                                    onClick={async () => {
                                        await handleCompleteChallenge();
                                        // ✅ Update local state to mark as completed
                                        setTodaysChallenge({
                                            ...todaysChallenge,
                                            completed: true,
                                        });
                                    }}
                                >
                                    <CheckCircle className="h-4 w-4 mr-1" /> Complete
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );

}