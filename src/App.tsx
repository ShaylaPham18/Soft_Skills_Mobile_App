import { useState, useEffect } from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeToggle';
import { AuthScreen } from './components/AuthScreen';
import { DailyChallenge } from './components/DailyChallenge';
import { SkillsAssessment } from './components/SkillsAssessment';
import { ProgressTracker } from './components/ProgressTracker';
import { CustomChallenges } from './components/CustomChallenges';
import { UserProfile } from './components/UserProfile';
import { MobileNavigation } from './components/MobileNavigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Toaster } from './components/ui/sonner';
import { Brain, Target, TrendingUp, Users } from 'lucide-react';

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [activeTab, setActiveTab] = useState('home');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Check for existing session on app load
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    // In a real app, you might want to store the session in localStorage
    // For this demo, users will need to sign in each time
  };

  const handleAuthSuccess = (token: string, userData: any) => {
    setAccessToken(token);
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setAccessToken('');
    setActiveTab('home');
  };

  const handleChallengeCompleted = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!user || !accessToken) {
    return (
      <div className="min-h-screen bg-background">
        <AuthScreen onAuthSuccess={handleAuthSuccess} />
        <Toaster />
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-6">
            {/* Welcome Header */}
            <Card className="bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 border-blue-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-sm">⬆</span>
                      </div>
                      <h1 className="text-2xl font-bold text-blue-900">
                        Leveling You Up
                      </h1>
                    </div>
                    <p className="text-blue-700 mb-1">
                      Welcome back, {user.user_metadata?.name || 'Skill Builder'}!
                    </p>
                    <p className="text-blue-600">
                      Ready to level up your soft skills today?
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Level 1</Badge>
                    </div>
                    <p className="text-sm text-blue-600">Keep climbing!</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's Challenge */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-blue-900">Today's Challenge</h2>
              <DailyChallenge
                user={user}
                accessToken={accessToken}
                onChallengeCompleted={handleChallengeCompleted}
              />
            </div>

            {/* Quick Actions */}
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">Quick Actions</CardTitle>
                <CardDescription className="text-blue-700">
                  Jump to different sections of the app
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                    onClick={() => setActiveTab('assessment')}
                  >
                    <Brain className="h-6 w-6 text-blue-500" />
                    <span>Take Assessment</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                    onClick={() => setActiveTab('challenges')}
                  >
                    <Target className="h-6 w-6 text-blue-500" />
                    <span>My Challenges</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                    onClick={() => setActiveTab('progress')}
                  >
                    <TrendingUp className="h-6 w-6 text-blue-500" />
                    <span>View Progress</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center gap-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                    onClick={() => setActiveTab('profile')}
                  >
                    <Users className="h-6 w-6 text-blue-500" />
                    <span>Profile</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tips Card */}
            <Card className="border-blue-200 bg-gradient-to-r from-blue-25 to-sky-25">
              <CardHeader>
                <CardTitle className="text-blue-900 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-yellow-400 flex items-center justify-center">
                    💡
                  </div>
                  Daily Tip
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-700">
                  Consistency is key! Even completing one small challenge daily can lead to
                  significant improvements in your soft skills over time.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'challenges':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2 text-blue-900">Custom Challenges</h1>
              <p className="text-blue-700">
                Create and manage your personalized skill-building challenges
              </p>
            </div>
            <CustomChallenges user={user} accessToken={accessToken} />
          </div>
        );

      case 'assessment':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2 text-blue-900">Skills Assessment</h1>
              <p className="text-blue-700">
                Discover your strengths and areas for improvement
              </p>
            </div>
            <SkillsAssessment user={user} accessToken={accessToken} />
          </div>
        );

      case 'progress':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2 text-blue-900">Your Progress</h1>
              <p className="text-blue-700">
                Track your journey and celebrate your achievements
              </p>
            </div>
            <ProgressTracker
              user={user}
              accessToken={accessToken}
              refreshTrigger={refreshTrigger}
            />
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold mb-2 text-blue-900">Profile</h1>
              <p className="text-blue-700">
                Manage your account settings and preferences
              </p>
            </div>
            <UserProfile user={user} accessToken={accessToken} />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto pb-20">
        <div className="p-4">
          {renderContent()}
        </div>
      </div>

      <MobileNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
      />

      <Toaster />
    </div>
  );
}

export default AppContent;
