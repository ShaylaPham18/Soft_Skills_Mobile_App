import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Calendar, Flame, Trophy, TrendingUp, Award } from 'lucide-react';
import { projectId } from '../utils/supabase/info';

interface ProgressTrackerProps {
    user: any;
    accessToken: string;
    refreshTrigger: number; // 🔁 comes from parent & bumps after completion
}

interface MonthlyStat {
    month: string;
    challengesCompleted: number;
    pointsEarned: number;
}

interface UserProgress {
    currentStreak: number;
    longestStreak: number;
    totalPoints: number;
    challengesCompleted: number;
    weeklyProgress: number[];
    monthlyStats: MonthlyStat[];
    level: number;
    pointsToNextLevel: number;
}

export function ProgressTracker({
                                    user,
                                    accessToken,
                                    refreshTrigger,
                                }: ProgressTrackerProps) {
    const [progress, setProgress] = useState<UserProgress | null>(null);
    const [loading, setLoading] = useState(true);

    const baseUrl =
        process.env.NODE_ENV === 'development'
            ? 'http://localhost:3001'
            : `https://${projectId}.supabase.co/functions/v1`;

    const loadProgress = async () => {
        if (!user || !accessToken) return;

        try {
            const response = await fetch(
                `${baseUrl}/make-server-93cd01be/progress/${user.id}`,
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                }
            );

            if (response.ok) {
                const result = await response.json();

                setProgress({
                    currentStreak: result.currentStreak ?? 0,
                    longestStreak: result.longestStreak ?? 0,
                    totalPoints: result.totalPoints ?? 0,
                    challengesCompleted: result.challengesCompleted ?? 0,
                    weeklyProgress: result.weeklyProgress ?? [0, 0, 0, 0, 0, 0, 0],
                    monthlyStats: result.monthlyStats ?? [],
                    level: result.level ?? 1,
                    pointsToNextLevel: result.pointsToNextLevel ?? 100,
                });
            } else {
                console.warn('No progress found, initializing empty data.');
                setProgress({
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
        } catch (error) {
            console.error('Error loading progress:', error);
            setProgress({
                currentStreak: 0,
                longestStreak: 0,
                totalPoints: 0,
                challengesCompleted: 0,
                weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
                monthlyStats: [],
                level: 1,
                pointsToNextLevel: 100,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setLoading(true);
        loadProgress();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, accessToken, refreshTrigger]);

    if (loading || !progress) {
        return (
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardContent className="p-6">
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-8 bg-gray-200 rounded"></div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="animate-pulse space-y-4">
                            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-8 bg-gray-200 rounded"></div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const levelBase = progress.level * 100 || 100; // avoid /0
    const levelProgress =
        ((levelBase - progress.pointsToNextLevel) / levelBase) * 100;

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentMonthStats =
        progress.monthlyStats.find((stat) => stat.month === currentMonth) || {
            month: currentMonth,
            challengesCompleted: 0,
            pointsEarned: 0,
        };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Current Streak</p>
                                <p className="text-2xl font-bold">{progress.currentStreak}</p>
                            </div>
                            <Flame
                                className={`h-8 w-8 ${
                                    progress.currentStreak > 0
                                        ? 'text-orange-500'
                                        : 'text-gray-400'
                                }`}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Points</p>
                                <p className="text-2xl font-bold">{progress.totalPoints}</p>
                            </div>
                            <Trophy className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Level</p>
                                <p className="text-2xl font-bold">{progress.level}</p>
                            </div>
                            <Award className="h-8 w-8 text-purple-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Challenges</p>
                                <p className="text-2xl font-bold">
                                    {progress.challengesCompleted}
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Level Progress */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5" />
                        Level Progress
                    </CardTitle>
                    <CardDescription>
                        {progress.pointsToNextLevel} points until level {progress.level + 1}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Progress value={levelProgress} className="h-3" />
                </CardContent>
            </Card>

            {/* Weekly Activity */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Weekly Activity
                    </CardTitle>
                    <CardDescription>
                        Challenges completed this week
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-2">
                        {progress.weeklyProgress.map((count, index) => (
                            <div key={index} className="text-center">
                                <div className="text-xs text-muted-foreground mb-1">
                                    {weekDays[index]}
                                </div>
                                <div
                                    className={`h-8 w-8 mx-auto rounded-full flex items-center justify-center text-xs font-medium ${
                                        count > 0
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {count}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Monthly Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        This Month&apos;s Progress
                    </CardTitle>
                    <CardDescription>
                        Your achievements in {currentMonth}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span>Challenges Completed</span>
                        <Badge variant="secondary">
                            {currentMonthStats.challengesCompleted}
                        </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Points Earned</span>
                        <Badge variant="secondary">
                            {currentMonthStats.pointsEarned}
                        </Badge>
                    </div>
                    {progress.longestStreak > 0 && (
                        <div className="flex justify-between items-center">
                            <span>Longest Streak</span>
                            <Badge
                                variant="secondary"
                                className="bg-orange-100 text-orange-800"
                            >
                                {progress.longestStreak} days
                            </Badge>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Achievements */}
            {progress.currentStreak >= 3 ||
            progress.challengesCompleted >= 10 ||
            progress.totalPoints >= 100 ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            Recent Achievements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {progress.currentStreak >= 7 && (
                                <Badge className="mr-2 bg-orange-100 text-orange-800">
                                    🔥 Week Warrior - 7 day streak!
                                </Badge>
                            )}
                            {progress.currentStreak >= 3 && progress.currentStreak < 7 && (
                                <Badge className="mr-2 bg-orange-100 text-orange-800">
                                    🔥 Getting Hot - 3+ day streak!
                                </Badge>
                            )}
                            {progress.challengesCompleted >= 50 && (
                                <Badge className="mr-2 bg-green-100 text-green-800">
                                    🎯 Challenge Master - 50 challenges completed!
                                </Badge>
                            )}
                            {progress.challengesCompleted >= 10 &&
                                progress.challengesCompleted < 50 && (
                                    <Badge className="mr-2 bg-green-100 text-green-800">
                                        🎯 Getting Started - 10 challenges completed!
                                    </Badge>
                                )}
                            {progress.totalPoints >= 500 && (
                                <Badge className="mr-2 bg-purple-100 text-purple-800">
                                    ⭐ Point Collector - 500+ points earned!
                                </Badge>
                            )}
                            {progress.totalPoints >= 100 && progress.totalPoints < 500 && (
                                <Badge className="mr-2 bg-purple-100 text-purple-800">
                                    ⭐ First Century - 100+ points earned!
                                </Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : null}
        </div>
    );
}
