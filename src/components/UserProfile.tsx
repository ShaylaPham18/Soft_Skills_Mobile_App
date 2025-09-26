import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { User, Settings, Bell, Shield, Award } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../utils/supabase/info';

interface UserProfileProps {
  user: any;
  accessToken: string;
}

export function UserProfile({ user, accessToken }: UserProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    name: user.user_metadata?.name || user.email,
    email: user.email || '',
    notifications: {
      dailyReminders: true,
      weeklyProgress: true,
      achievements: true
    }
  });

  const handleSave = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-93cd01be/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userId: user.id,
          ...profileData
        })
      });

      if (response.ok) {
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const memberSince = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long'
  });

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-25 via-white to-sky-25 dark:from-blue-950/50 dark:via-slate-900 dark:to-indigo-950/50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-blue-600 text-white dark:bg-blue-500">
                {getUserInitials(profileData.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100">{profileData.name}</h2>
              <p className="text-blue-700 dark:text-blue-300">{profileData.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200">
                  <Award className="h-3 w-3 mr-1" />
                  Level 1
                </Badge>
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  Member since {memberSince}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Settings */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Account Settings
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Manage your account information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Display Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!isEditing}
                />
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={loading}>
                      {loading ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                value={profileData.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed after account creation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Notification Preferences
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Choose what notifications you'd like to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="daily-reminders">Daily Challenge Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get reminded about your daily challenges
                </p>
              </div>
              <Switch
                id="daily-reminders"
                checked={profileData.notifications.dailyReminders}
                onCheckedChange={(checked) => 
                  setProfileData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, dailyReminders: checked }
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="weekly-progress">Weekly Progress Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly summaries of your progress
                </p>
              </div>
              <Switch
                id="weekly-progress"
                checked={profileData.notifications.weeklyProgress}
                onCheckedChange={(checked) => 
                  setProfileData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, weeklyProgress: checked }
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="achievements">Achievement Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when you unlock new achievements
                </p>
              </div>
              <Switch
                id="achievements"
                checked={profileData.notifications.achievements}
                onCheckedChange={(checked) => 
                  setProfileData(prev => ({
                    ...prev,
                    notifications: { ...prev.notifications, achievements: checked }
                  }))
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Privacy & Security
          </CardTitle>
          <CardDescription className="text-blue-700 dark:text-blue-300">
            Manage your privacy and security settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Account Created</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Last Sign In</Label>
                <p className="text-sm text-muted-foreground">
                  {user.last_sign_in_at ? 
                    new Date(user.last_sign_in_at).toLocaleDateString() : 
                    'Never'
                  }
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card className="border-blue-200 dark:border-blue-800">
        <CardContent className="p-4 text-center text-sm text-blue-600 dark:text-blue-400">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="h-4 w-4 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">⬆</span>
            </div>
            <p className="font-medium">Leveling You Up v1.0</p>
          </div>
          <p>Building better soft skills, one challenge at a time</p>
        </CardContent>
      </Card>
    </div>
  );
}