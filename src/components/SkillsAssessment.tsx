import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Brain, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';

const assessmentBaseUrl =
    process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001'
        : `https://${projectId}.supabase.co/functions/v1`;

const ASSESSMENT_QUESTIONS = [
    // (your same 12 questions – unchanged)
    {
        id: 1,
        question: 'How comfortable are you with public speaking?',
        skill: 'Communication',
        options: [
            { value: 1, label: 'Very uncomfortable' },
            { value: 2, label: 'Somewhat uncomfortable' },
            { value: 3, label: 'Neutral' },
            { value: 4, label: 'Somewhat comfortable' },
            { value: 5, label: 'Very comfortable' },
        ],
    },
    {
        id: 2,
        question: 'How well do you handle conflict resolution?',
        skill: 'Communication',
        options: [
            { value: 1, label: 'Very poorly' },
            { value: 2, label: 'Poorly' },
            { value: 3, label: 'Adequately' },
            { value: 4, label: 'Well' },
            { value: 5, label: 'Very well' },
        ],
    },
    {
        id: 3,
        question: 'How effectively do you work in teams?',
        skill: 'Collaboration',
        options: [
            { value: 1, label: 'Very ineffectively' },
            { value: 2, label: 'Ineffectively' },
            { value: 3, label: 'Adequately' },
            { value: 4, label: 'Effectively' },
            { value: 5, label: 'Very effectively' },
        ],
    },
    {
        id: 4,
        question: 'How well do you manage your emotions under pressure?',
        skill: 'Emotional Intelligence',
        options: [
            { value: 1, label: 'Very poorly' },
            { value: 2, label: 'Poorly' },
            { value: 3, label: 'Adequately' },
            { value: 4, label: 'Well' },
            { value: 5, label: 'Very well' },
        ],
    },
    {
        id: 5,
        question: "How good are you at understanding others' emotions?",
        skill: 'Emotional Intelligence',
        options: [
            { value: 1, label: 'Very poor' },
            { value: 2, label: 'Poor' },
            { value: 3, label: 'Average' },
            { value: 4, label: 'Good' },
            { value: 5, label: 'Excellent' },
        ],
    },
    {
        id: 6,
        question: 'How well do you motivate and inspire others?',
        skill: 'Leadership',
        options: [
            { value: 1, label: 'Very poorly' },
            { value: 2, label: 'Poorly' },
            { value: 3, label: 'Adequately' },
            { value: 4, label: 'Well' },
            { value: 5, label: 'Very well' },
        ],
    },
    {
        id: 7,
        question: 'How aware are you of your own strengths and weaknesses?',
        skill: 'Self-Awareness',
        options: [
            { value: 1, label: 'Not at all aware' },
            { value: 2, label: 'Slightly aware' },
            { value: 3, label: 'Moderately aware' },
            { value: 4, label: 'Very aware' },
            { value: 5, label: 'Extremely aware' },
        ],
    },
    {
        id: 8,
        question: 'How well do you adapt to change?',
        skill: 'Adaptability',
        options: [
            { value: 1, label: 'Very poorly' },
            { value: 2, label: 'Poorly' },
            { value: 3, label: 'Adequately' },
            { value: 4, label: 'Well' },
            { value: 5, label: 'Very well' },
        ],
    },
    {
        id: 9,
        question: 'How consistently do you maintain eye contact during conversations?',
        skill: 'Non-Verbal Communication',
        options: [
            { value: 1, label: 'Rarely maintain eye contact' },
            { value: 2, label: 'Occasionally maintain eye contact' },
            { value: 3, label: 'Sometimes maintain eye contact' },
            { value: 4, label: 'Usually maintain eye contact' },
            { value: 5, label: 'Always maintain eye contact' },
        ],
    },
    {
        id: 10,
        question:
            "How aware are you of your facial expressions when interacting with others?",
        skill: 'Non-Verbal Communication',
        options: [
            { value: 1, label: 'Not aware at all' },
            { value: 2, label: 'Slightly aware' },
            { value: 3, label: 'Moderately aware' },
            { value: 4, label: 'Very aware' },
            { value: 5, label: 'Extremely aware' },
        ],
    },
    {
        id: 11,
        question:
            'How often do you use gestures or body language to emphasize your points?',
        skill: 'Non-Verbal Communication',
        options: [
            { value: 1, label: 'Never' },
            { value: 2, label: 'Rarely' },
            { value: 3, label: 'Sometimes' },
            { value: 4, label: 'Often' },
            { value: 5, label: 'Always' },
        ],
    },
    {
        id: 12,
        question:
            'How well do you control your tone of voice to match the situation?',
        skill: 'Non-Verbal Communication',
        options: [
            { value: 1, label: 'Very poorly' },
            { value: 2, label: 'Poorly' },
            { value: 3, label: 'Adequately' },
            { value: 4, label: 'Well' },
            { value: 5, label: 'Very well' },
        ],
    },
];

interface SkillsAssessmentProps {
    user: any;
    accessToken: string;
}

export function SkillsAssessment({ user, accessToken }: SkillsAssessmentProps) {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [isComplete, setIsComplete] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [hasExistingAssessment, setHasExistingAssessment] = useState(false);
    const [loading, setLoading] = useState(false);

    // 🔍 Check for existing saved assessment
    useEffect(() => {
        if (user?.id && accessToken) {
            checkExistingAssessment();
        }
    }, [user?.id, accessToken]);

    // 🔍 Load existing assessment from backend
    const checkExistingAssessment = async () => {
        try {
            const response = await fetch(
                `${assessmentBaseUrl}/make-server-93cd01be/assessment/${user.id}`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );

            if (!response.ok) return;

            const result = await response.json();
            const assessment = result.assessment;
            if (!assessment?.scores) return;

            const scoresObj = assessment.scores as Record<string, number>;

            const loadedResults = Object.entries(scoresObj).map(
                ([skill, score]) => ({
                    skill,
                    score,
                    level:
                        score >= 80
                            ? 'Strong'
                            : score >= 60
                                ? 'Average'
                                : 'Needs Improvement',
                })
            );

            setResults(loadedResults);
            setIsComplete(true);
            setHasExistingAssessment(true);
        } catch (error) {
            console.error('Error checking existing assessment:', error);
        }
    };

    const handleAnswer = (value: number) => {
        setAnswers((prev) => ({
            ...prev,
            [ASSESSMENT_QUESTIONS[currentQuestion].id]: value,
        }));
    };

    const nextQuestion = () => {
        if (currentQuestion < ASSESSMENT_QUESTIONS.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            completeAssessment();
        }
    };

    const previousQuestion = () => {
        if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1);
    };

    // 🔥 Save assessment to backend
    const completeAssessment = async () => {
        setLoading(true);

        // 1️⃣ Aggregate scores
        const skillScores: Record<string, { total: number; count: number }> = {};

        ASSESSMENT_QUESTIONS.forEach((question) => {
            const answer = answers[question.id];
            if (answer) {
                if (!skillScores[question.skill]) {
                    skillScores[question.skill] = { total: 0, count: 0 };
                }
                skillScores[question.skill].total += answer;
                skillScores[question.skill].count += 1;
            }
        });

        const calculatedResults = Object.entries(skillScores).map(([skill, d]) => {
            const avg = d.total / d.count;
            const score = Math.round(avg * 20);
            return {
                skill,
                score,
                level:
                    avg >= 4 ? 'Strong' : avg >= 3 ? 'Average' : 'Needs Improvement',
            };
        });

        // 2️⃣ Format scores for backend
        const scoresForBackend: Record<string, number> = {};
        calculatedResults.forEach((r) => {
            scoresForBackend[r.skill] = r.score;
        });

        try {
            const response = await fetch(
                `${assessmentBaseUrl}/make-server-93cd01be/assessment/${user.id}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify(scoresForBackend),
                }
            );

            const text = await response.text();
            let data = null;
            try { data = text ? JSON.parse(text) : null; } catch {}

            if (response.ok) {
                setResults(calculatedResults);
                setIsComplete(true);
                setHasExistingAssessment(true);
                toast.success('Assessment completed!');
            } else {
                toast.error(data?.error || data?.details || text);
            }
        } catch (error) {
            console.error('Error saving assessment:', error);
            toast.error('Failed to save assessment.');
        } finally {
            setLoading(false);
        }
    };

    const retakeAssessment = () => {
        setCurrentQuestion(0);
        setAnswers({});
        setIsComplete(false);
        setResults(null);
        setHasExistingAssessment(false);
    };

    // 🎉 Results screen
    if (isComplete && results) {
        const strongSkills = results.filter((r: any) => r.level === 'Strong');
        const weakSkills = results.filter((r: any) => r.level === 'Needs Improvement');

        return (
            <div className="space-y-6">
                <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-25 via-white to-sky-25 dark:from-blue-950/50 dark:via-slate-900 dark:to-indigo-950/50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            Your Skills Assessment Results
                        </CardTitle>
                        <CardDescription className="text-blue-700 dark:text-blue-300">
                            Based on your responses, here’s your skill profile
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            {results.map((result: any, index: number) => (
                                <div key={index} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{result.skill}</span>
                                        <Badge
                                            variant={
                                                result.level === 'Strong'
                                                    ? 'default'
                                                    : result.level === 'Average'
                                                        ? 'secondary'
                                                        : 'destructive'
                                            }
                                        >
                                            {result.level}
                                        </Badge>
                                    </div>
                                    <Progress value={result.score} className="h-2" />
                                    <p className="text-sm text-muted-foreground">
                                        {result.score}%
                                    </p>
                                </div>
                            ))}
                        </div>

                        {hasExistingAssessment && (
                            <Button onClick={retakeAssessment} variant="outline" className="w-full">
                                Retake Assessment
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {strongSkills.length > 0 && (
                    <Card className="border-blue-200 dark:border-blue-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                <TrendingUp className="h-5 w-5" />
                                Your Strengths
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {strongSkills.map((skill: any, index: number) => (
                                    <Badge key={index} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                        {skill.skill}
                                    </Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {weakSkills.length > 0 && (
                    <Card className="border-blue-200 dark:border-blue-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                                <TrendingDown className="h-5 w-5" />
                                Areas for Growth
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {weakSkills.map((skill: any, index: number) => (
                                    <Badge key={index} className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700">
                                        {skill.skill}
                                    </Badge>
                                ))}
                            </div>
                            <p className="text-sm text-muted-foreground mt-3">
                                Daily challenges will now focus on strengthening these areas.
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }

    // 📝 Assessment Question screen
    const currentQ = ASSESSMENT_QUESTIONS[currentQuestion];
    const progress = ((currentQuestion + 1) / ASSESSMENT_QUESTIONS.length) * 100;

    return (
        <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    Skills Assessment
                </CardTitle>
                <CardDescription className="text-blue-700 dark:text-blue-300">
                    Answer these questions to identify your strengths and areas for growth
                </CardDescription>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>
                            Question {currentQuestion + 1} of {ASSESSMENT_QUESTIONS.length}
                        </span>
                        <span>{Math.round(progress)}% Complete</span>
                    </div>
                    <Progress value={progress} />
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                <div>
                    <Badge className="mb-3 bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200">
                        {currentQ.skill}
                    </Badge>
                    <h3 className="font-medium mb-4 text-blue-900 dark:text-blue-100">
                        {currentQ.question}
                    </h3>

                    <RadioGroup
                        value={answers[currentQ.id]?.toString() || ''}
                        onValueChange={(value) => handleAnswer(parseInt(value))}
                    >
                        {currentQ.options.map((option) => {
                            const optionId = `q${currentQ.id}-option-${option.value}`;

                            return (
                                <div key={option.value} className="flex items-center space-x-2">
                                    <RadioGroupItem value={option.value.toString()} id={optionId} />
                                    <Label htmlFor={optionId} className="cursor-pointer">
                                        {option.label}
                                    </Label>
                                </div>
                            );
                        })}
                    </RadioGroup>
                </div>

                <div className="flex justify-between">
                    <Button
                        onClick={previousQuestion}
                        variant="outline"
                        disabled={currentQuestion === 0}
                    >
                        Previous
                    </Button>

                    <Button
                        onClick={nextQuestion}
                        disabled={!answers[currentQ.id] || loading}
                    >
                        {loading
                            ? 'Processing...'
                            : currentQuestion === ASSESSMENT_QUESTIONS.length - 1
                                ? 'Complete Assessment'
                                : 'Next'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}