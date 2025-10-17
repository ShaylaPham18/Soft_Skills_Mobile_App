import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, Clock, Star, Trophy, SkipForward } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';

const SKILL_BASED_CHALLENGES = {
  'Communication': [
    {
      id: 'compliment-stranger',
      title: 'Spread Positivity',
      description: 'Compliment a stranger or coworker today',
      difficulty: 'Easy',
      points: 10
    },
    {
      id: 'genuine-question',
      title: 'Active Listening',
      description: 'Ask someone a genuine question and actively listen to their answer',
      difficulty: 'Medium',
      points: 15
    },
    {
      id: 'new-conversation',
      title: 'Break the Ice',
      description: 'Start a short conversation with someone you don\'t usually talk to',
      difficulty: 'Medium',
      points: 15
    },
    {
      id: 'share-opinion',
      title: 'Speak Up',
      description: 'Share your opinion in a group discussion (even briefly)',
      difficulty: 'Hard',
      points: 20
    },
    {
      id: 'tell-story',
      title: 'Engaging Storyteller',
      description: 'Tell a short story about your day to someone in a clear, engaging way',
      difficulty: 'Medium',
      points: 15
    }
  ],
  'Collaboration': [
    {
      id: 'offer-help',
      title: 'Lend a Hand',
      description: 'Offer help to a peer or classmate with a small task',
      difficulty: 'Easy',
      points: 10
    },
    {
      id: 'share-resource',
      title: 'Knowledge Sharing',
      description: 'Share a resource (article, tool, or tip) with a team member',
      difficulty: 'Easy',
      points: 10
    },
    {
      id: 'seek-input',
      title: 'Collaborative Decision',
      description: 'Ask someone else for their input before making a decision',
      difficulty: 'Medium',
      points: 15
    },
    {
      id: 'volunteer-notes',
      title: 'Team Support',
      description: 'In group work, volunteer to take notes or summarize decisions',
      difficulty: 'Medium',
      points: 15
    },
    {
      id: 'recognize-contribution',
      title: 'Acknowledge Others',
      description: 'Recognize someone else\'s contribution in a group setting',
      difficulty: 'Medium',
      points: 20
    }
  ],
  'Emotional Intelligence': [
    {
      id: 'pause-react',
      title: 'Mindful Response',
      description: 'Pause before reacting to a stressful situation today',
      difficulty: 'Medium',
      points: 20
    },
    {
      id: 'emotion-journal',
      title: 'Emotion Awareness',
      description: 'Notice and write down one emotion you felt strongly and why',
      difficulty: 'Easy',
      points: 10
    },
    {
      id: 'check-feelings',
      title: 'Empathetic Inquiry',
      description: 'Ask a friend or peer how they are feeling, and really listen',
      difficulty: 'Medium',
      points: 15
    },
    {
      id: 'rephrase-perspective',
      title: 'Active Understanding',
      description: 'Practice rephrasing someone\'s perspective back to them ("So you\'re saying…")',
      difficulty: 'Medium',
      points: 15
    },
    {
      id: 'compliment-effort',
      title: 'Meaningful Recognition',
      description: 'Compliment someone specifically on their effort, not just the outcome',
      difficulty: 'Easy',
      points: 10
    }
  ],
  'Leadership': [
    {
      id: 'take-initiative-task',
      title: 'Take Initiative',
      description: 'Take initiative on a small task in a group (e.g., organizing notes, setting agenda)',
      difficulty: 'Medium',
      points: 20
    },
    {
      id: 'share-encouragement',
      title: 'Inspire Others',
      description: 'Share encouragement with someone who seems discouraged',
      difficulty: 'Easy',
      points: 15
    },
    {
      id: 'suggest-idea',
      title: 'Contribute Ideas',
      description: 'Suggest one idea in a group discussion',
      difficulty: 'Medium',
      points: 15
    },
    {
      id: 'delegate-small-task',
      title: 'Smart Delegation',
      description: 'Delegate one small task instead of trying to do it yourself',
      difficulty: 'Hard',
      points: 25
    },
    {
      id: 'acknowledge-strength',
      title: 'Public Recognition',
      description: 'Acknowledge someone\'s strength in front of others',
      difficulty: 'Medium',
      points: 20
    }
  ],
  'Self-Awareness': [
    {
      id: 'daily-journal',
      title: 'Daily Reflection',
      description: 'Spend 5 minutes journaling about what went well today and what didn\'t',
      difficulty: 'Easy',
      points: 10
    },
    {
      id: 'identify-strength',
      title: 'Strength Recognition',
      description: 'Identify one personal strength you used today',
      difficulty: 'Easy',
      points: 10
    },
    {
      id: 'improvement-area',
      title: 'Growth Mindset',
      description: 'Identify one area where you could improve tomorrow',
      difficulty: 'Easy',
      points: 10
    },
    {
      id: 'seek-feedback',
      title: 'Constructive Input',
      description: 'Ask a trusted friend to give you one piece of constructive feedback',
      difficulty: 'Medium',
      points: 20
    },
    {
      id: 'stress-trigger',
      title: 'Trigger Awareness',
      description: 'Notice when you feel stressed and write down what triggered it',
      difficulty: 'Medium',
      points: 15
    }
  ],
  'Adaptability': [
    {
      id: 'new-method',
      title: 'Try Something New',
      description: 'Try a new way of doing a familiar task',
      difficulty: 'Easy',
      points: 10
    },
    {
      id: 'accept-change',
      title: 'Embrace Change',
      description: 'Accept a small change today without complaining',
      difficulty: 'Medium',
      points: 15
    },
    {
      id: 'learn-approach',
      title: 'Learn from Others',
      description: 'Ask someone else how they usually solve a problem, and try their method',
      difficulty: 'Medium',
      points: 15
    },
    {
      id: 'break-routine',
      title: 'Step Outside Routine',
      description: 'Do something outside your routine (e.g., sit in a different seat, take a new route)',
      difficulty: 'Easy',
      points: 10
    },
    {
      id: 'positive-outcome',
      title: 'Find the Silver Lining',
      description: 'When plans change, write down one positive outcome that came from it',
      difficulty: 'Medium',
      points: 20
    }
  ]
};

// Fallback challenges for when no assessment is available
const DEFAULT_CHALLENGES = [
  {
    id: 'compliment',
    title: 'Spread Positivity',
    description: 'Give a genuine compliment to someone today',
    category: 'Communication',
    difficulty: 'Easy',
    points: 10
  },
  {
    id: 'gratitude',
    title: 'Express Gratitude',
    description: 'Thank someone for something specific they did',
    category: 'Emotional Intelligence',
    difficulty: 'Easy',
    points: 10
  },
  {
    id: 'help-colleague',
    title: 'Lend a Hand',
    description: 'Offer help to a colleague or friend without being asked',
    category: 'Collaboration',
    difficulty: 'Easy',
    points: 10
  }
];

interface DailyChallengeProps {
  user: any;
  accessToken: string;
  onChallengeCompleted: () => void;
}

export function DailyChallenge({ user, accessToken, onChallengeCompleted }: DailyChallengeProps) {
  const [todaysChallenge, setTodaysChallenge] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [skipsUsed, setSkipsUsed] = useState(0);
  const [skipsRemaining, setSkipsRemaining] = useState(2);
  const [assessmentResults, setAssessmentResults] = useState<any>(null);

  useEffect(() => {
    loadAssessmentResults();
  }, [user]);

  useEffect(() => {
    if (assessmentResults !== null) {
      loadTodaysChallenge();
    }
  }, [assessmentResults]);

  const loadAssessmentResults = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-93cd01be/assessment/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setAssessmentResults(result.assessment?.results || null);
      } else {
        setAssessmentResults(null);
      }
    } catch (error) {
      console.error('Error loading assessment results:', error);
      setAssessmentResults(null);
    }
  };

  const loadTodaysChallenge = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-93cd01be/daily-challenge/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      const result = await response.json();
      
      if (response.ok && result.challenge) {
        setTodaysChallenge(result.challenge);
        setIsCompleted(result.completed);
        setSkipsUsed(result.skipsUsed || 0);
        setSkipsRemaining(result.skipsRemaining || 2);
      } else {
        // Generate a new challenge for today
        setSkipsUsed(result.skipsUsed || 0);
        setSkipsRemaining(result.skipsRemaining || 2);
        generateTodaysChallenge();
      }
    } catch (error) {
      console.error('Error loading daily challenge:', error);
      generateTodaysChallenge();
    }
  };

  const generateTodaysChallenge = () => {
    const today = new Date().toDateString();
    // Include skip count in seed to generate different challenges when skipping
    const baseSeed = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const seed = baseSeed + (skipsUsed * 1000); // Multiply by 1000 to ensure different challenges
    
    let selectedChallenge;
    let targetSkill;
    
    if (assessmentResults && assessmentResults.length > 0) {
      // Find skills that need improvement (lowest scores)
      const skillsNeedingImprovement = assessmentResults
        .filter((result: any) => result.level === 'Needs Improvement' || result.score < 60)
        .sort((a: any, b: any) => a.score - b.score);
      
      if (skillsNeedingImprovement.length > 0) {
        // Focus on the skill with the lowest score
        targetSkill = skillsNeedingImprovement[0].skill;
        const challengesForSkill = SKILL_BASED_CHALLENGES[targetSkill as keyof typeof SKILL_BASED_CHALLENGES];
        
        if (challengesForSkill && challengesForSkill.length > 0) {
          const challengeIndex = seed % challengesForSkill.length;
          const challenge = challengesForSkill[challengeIndex];
          selectedChallenge = {
            ...challenge,
            category: targetSkill
          };
        }
      } else {
        // If no skills need improvement, focus on average skills to make them strong
        const averageSkills = assessmentResults
          .filter((result: any) => result.level === 'Average')
          .sort((a: any, b: any) => a.score - b.score);
          
        if (averageSkills.length > 0) {
          targetSkill = averageSkills[0].skill;
          const challengesForSkill = SKILL_BASED_CHALLENGES[targetSkill as keyof typeof SKILL_BASED_CHALLENGES];
          
          if (challengesForSkill && challengesForSkill.length > 0) {
            const challengeIndex = seed % challengesForSkill.length;
            const challenge = challengesForSkill[challengeIndex];
            selectedChallenge = {
              ...challenge,
              category: targetSkill
            };
          }
        }
      }
    }
    
    // Fallback to default challenges if no assessment or specific challenge found
    if (!selectedChallenge) {
      const challengeIndex = seed % DEFAULT_CHALLENGES.length;
      selectedChallenge = DEFAULT_CHALLENGES[challengeIndex];
    }
    
    setTodaysChallenge(selectedChallenge);
    
    // Store the generated challenge on the server
    storeGeneratedChallenge(selectedChallenge);
  };

  const generateNewChallengeWithSkips = (currentSkipCount: number) => {
    const today = new Date().toDateString();
    
    let selectedChallenge;
    let targetSkill;
    
    if (assessmentResults && assessmentResults.length > 0) {
      // Find skills that need improvement (lowest scores)
      const skillsNeedingImprovement = assessmentResults
        .filter((result: any) => result.level === 'Needs Improvement' || result.score < 60)
        .sort((a: any, b: any) => a.score - b.score);
      
      if (skillsNeedingImprovement.length > 0) {
        // Focus on the skill with the lowest score - keep same target skill
        targetSkill = skillsNeedingImprovement[0].skill;
        const challengesForSkill = SKILL_BASED_CHALLENGES[targetSkill as keyof typeof SKILL_BASED_CHALLENGES];
        
        if (challengesForSkill && challengesForSkill.length > 0) {
          // Get the current challenge to avoid repeating it
          const currentChallengeId = todaysChallenge?.id;
          
          // Filter out the current challenge to ensure we get a different one
          const availableChallenges = challengesForSkill.filter(c => c.id !== currentChallengeId);
          
          if (availableChallenges.length > 0) {
            // Use skip count to select from available challenges
            const challengeIndex = currentSkipCount % availableChallenges.length;
            const challenge = availableChallenges[challengeIndex];
            selectedChallenge = {
              ...challenge,
              category: targetSkill
            };
          } else {
            // If somehow all challenges are filtered out, use the skip count with original list
            const baseSeed = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
            const seed = baseSeed + (currentSkipCount * 7); // Use different multiplier
            const challengeIndex = seed % challengesForSkill.length;
            const challenge = challengesForSkill[challengeIndex];
            selectedChallenge = {
              ...challenge,
              category: targetSkill
            };
          }
        }
      } else {
        // If no skills need improvement, focus on average skills
        const averageSkills = assessmentResults
          .filter((result: any) => result.level === 'Average')
          .sort((a: any, b: any) => a.score - b.score);
          
        if (averageSkills.length > 0) {
          targetSkill = averageSkills[0].skill;
          const challengesForSkill = SKILL_BASED_CHALLENGES[targetSkill as keyof typeof SKILL_BASED_CHALLENGES];
          
          if (challengesForSkill && challengesForSkill.length > 0) {
            // Get the current challenge to avoid repeating it
            const currentChallengeId = todaysChallenge?.id;
            
            // Filter out the current challenge to ensure we get a different one
            const availableChallenges = challengesForSkill.filter(c => c.id !== currentChallengeId);
            
            if (availableChallenges.length > 0) {
              // Use skip count to select from available challenges
              const challengeIndex = currentSkipCount % availableChallenges.length;
              const challenge = availableChallenges[challengeIndex];
              selectedChallenge = {
                ...challenge,
                category: targetSkill
              };
            } else {
              // If somehow all challenges are filtered out, use the skip count with original list
              const baseSeed = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
              const seed = baseSeed + (currentSkipCount * 7); // Use different multiplier
              const challengeIndex = seed % challengesForSkill.length;
              const challenge = challengesForSkill[challengeIndex];
              selectedChallenge = {
                ...challenge,
                category: targetSkill
              };
            }
          }
        }
      }
    }
    
    // Fallback to default challenges if no assessment or specific challenge found
    if (!selectedChallenge) {
      const currentChallengeId = todaysChallenge?.id;
      const availableChallenges = DEFAULT_CHALLENGES.filter(c => c.id !== currentChallengeId);
      
      if (availableChallenges.length > 0) {
        const challengeIndex = currentSkipCount % availableChallenges.length;
        selectedChallenge = availableChallenges[challengeIndex];
      } else {
        const baseSeed = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
        const seed = baseSeed + (currentSkipCount * 7);
        const challengeIndex = seed % DEFAULT_CHALLENGES.length;
        selectedChallenge = DEFAULT_CHALLENGES[challengeIndex];
      }
    }
    
    setTodaysChallenge(selectedChallenge);
    
    // Store the generated challenge on the server with the current skip count
    storeGeneratedChallengeWithSkips(selectedChallenge, currentSkipCount);
  };

  const storeGeneratedChallenge = async (challenge: any) => {
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-93cd01be/store-daily-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userId: user.id,
          challenge,
          skipsUsed: skipsUsed
        })
      });
    } catch (error) {
      console.error('Error storing generated challenge:', error);
      // Don't show error to user, it's just for consistency
    }
  };

  const storeGeneratedChallengeWithSkips = async (challenge: any, currentSkipCount: number) => {
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-93cd01be/store-daily-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userId: user.id,
          challenge,
          skipsUsed: currentSkipCount
        })
      });
    } catch (error) {
      console.error('Error storing generated challenge:', error);
      // Don't show error to user, it's just for consistency
    }
  };

  const skipChallenge = async () => {
    if (skipsRemaining <= 0 || skipping) return;
    
    setSkipping(true);
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-93cd01be/skip-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userId: user.id
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        // Update skip counts first
        setSkipsUsed(result.skipsUsed);
        setSkipsRemaining(result.skipsRemaining);
        setTodaysChallenge(null); // Clear current challenge
        
        // Generate a new challenge with the updated skip count
        // Use the skip count from the server response directly
        generateNewChallengeWithSkips(result.skipsUsed);
        
        toast.success(`Challenge skipped! ${result.skipsRemaining} skips remaining today.`);
      } else {
        throw new Error(result.error || 'Failed to skip challenge');
      }
    } catch (error) {
      console.error('Error skipping challenge:', error);
      toast.error('Failed to skip challenge');
    } finally {
      setSkipping(false);
    }
  };

  const completeChallenge = async () => {
    if (!todaysChallenge || isCompleted) return;
    
    setLoading(true);
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-93cd01be/complete-challenge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userId: user.id,
          challengeId: todaysChallenge.id,
          points: todaysChallenge.points
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        setIsCompleted(true);
        onChallengeCompleted();
        toast.success(`Great job! You earned ${todaysChallenge.points} points! 🎉`);
      } else {
        throw new Error(result.error || 'Failed to complete challenge');
      }
    } catch (error) {
      console.error('Error completing challenge:', error);
      toast.error('Failed to complete challenge');
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-blue-100 text-blue-800';
      case 'Medium': return 'bg-blue-200 text-blue-900';
      case 'Hard': return 'bg-blue-300 text-blue-900';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  if (!todaysChallenge) {
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

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-25 to-sky-25">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Star className="h-5 w-5 text-yellow-500" />
            Today's Challenge
          </CardTitle>
          <Badge variant="outline" className={getDifficultyColor(todaysChallenge.difficulty)}>
            {todaysChallenge.difficulty}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardDescription className="text-sm text-blue-700">
              {todaysChallenge.category}
            </CardDescription>
            {assessmentResults && assessmentResults.some((r: any) => 
              r.skill === todaysChallenge.category && (r.level === 'Needs Improvement' || r.score < 60)
            ) && (
              <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-200">
                Growth Area
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <SkipForward className="h-3 w-3" />
            <span>{skipsRemaining} skips left</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium mb-2 text-blue-900">{todaysChallenge.title}</h3>
          <p className="text-blue-700">{todaysChallenge.description}</p>
          
          {assessmentResults && assessmentResults.length > 0 && 
           assessmentResults.some((r: any) => 
             r.skill === todaysChallenge.category && (r.level === 'Needs Improvement' || r.score < 60)
           ) && (
            <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 This challenge targets your {todaysChallenge.category} skills - an area where you can grow!
              </p>
            </div>
          )}
          
          {!assessmentResults && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                💭 Take our skills assessment to get personalized challenges based on your growth areas!
              </p>
            </div>
          )}
        </div>
        
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-blue-800 font-medium">{todaysChallenge.points} points</span>
            </div>
            
            {isCompleted ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm">Completed!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {skipsRemaining > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={skipChallenge} 
                    disabled={skipping || loading}
                    className="flex items-center gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <SkipForward className="h-3 w-3" />
                    {skipping ? 'Skipping...' : 'Skip'}
                  </Button>
                )}
                <Button 
                  onClick={completeChallenge} 
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {loading ? 'Completing...' : 'Mark Complete'}
                </Button>
              </div>
            )}
          </div>
          
          {skipsUsed > 0 && (
            <div className="text-xs text-blue-600 text-center">
              You've used {skipsUsed} of 2 daily skips
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}