import { useState, useEffect, FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Plus, Edit, Trash2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';

interface CustomChallenge {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  points: number;
  createdBy: string;
  isActive: boolean;
  timesCompleted: number;
}

interface CustomChallengesProps {
  user: any;
  accessToken: string;
}

const CATEGORIES = [
  'Communication',
  'Leadership',
  'Collaboration',
  'Emotional Intelligence',
  'Self-Awareness',
  'Adaptability',
  'Problem Solving',
  'Time Management',
  'Networking',
  'Other'
];

const DIFFICULTIES = [
  { value: 'Easy', points: 10 },
  { value: 'Medium', points: 15 },
  { value: 'Hard', points: 25 }
];

export function CustomChallenges({ user, accessToken }: CustomChallengesProps) {
  const [challenges, setChallenges] = useState<CustomChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<CustomChallenge | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty: 'Easy'
  });

  useEffect(() => {
    loadChallenges();
  }, [user]);

  const loadChallenges = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-93cd01be/custom-challenges/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setChallenges(result.challenges || []);
      }
    } catch (error) {
      console.error('Error loading custom challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      difficulty: 'Easy'
    });
    setEditingChallenge(null);
  };

  const handleNewChallenge = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.title.trim()) {
      toast.error('Please enter a challenge title');
      return;
    }
    
    if (!formData.description.trim()) {
      toast.error('Please enter a challenge description');
      return;
    }
    
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }

    setIsCreating(true);

    try {
      const difficulty = DIFFICULTIES.find(d => d.value === formData.difficulty);
      
      const challengeData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        difficulty: formData.difficulty,
        points: difficulty?.points || 10,
        createdBy: user.id,
        isActive: true,
        timesCompleted: 0
      };

      console.log('Submitting challenge data:', challengeData);

      const url = editingChallenge 
        ? `https://${projectId}.supabase.co/functions/v1/make-server-93cd01be/custom-challenges/${editingChallenge.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-93cd01be/custom-challenges`;

      const response = await fetch(url, {
        method: editingChallenge ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(challengeData)
      });

      const result = await response.json();
      console.log('Server response:', response.status, result);

      if (response.ok) {
        if (editingChallenge) {
          setChallenges(prev => prev.map(c => c.id === editingChallenge.id ? result.challenge : c));
          toast.success('Challenge updated successfully!');
        } else {
          setChallenges(prev => [...prev, result.challenge]);
          toast.success('Challenge created successfully!');
        }
        
        resetForm();
        setIsDialogOpen(false);
      } else {
        console.error('Server error:', result);
        toast.error(result.error || 'Failed to save challenge. Please try again.');
      }
    } catch (error) {
      console.error('Error saving challenge:', error);
      toast.error('Failed to save challenge. Please check your connection and try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (challenge: CustomChallenge) => {
    setFormData({
      title: challenge.title,
      description: challenge.description,
      category: challenge.category,
      difficulty: challenge.difficulty
    });
    setEditingChallenge(challenge);
    setIsDialogOpen(true);
  };

  const handleDelete = async (challengeId: string) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-93cd01be/custom-challenges/${challengeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (response.ok) {
        setChallenges(prev => prev.filter(c => c.id !== challengeId));
        toast.success('Challenge deleted successfully');
      } else {
        throw new Error('Failed to delete challenge');
      }
    } catch (error) {
      console.error('Error deleting challenge:', error);
      toast.error('Failed to delete challenge');
    }
  };

  const toggleChallengeStatus = async (challenge: CustomChallenge) => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-93cd01be/custom-challenges/${challenge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          ...challenge,
          isActive: !challenge.isActive
        })
      });

      if (response.ok) {
        setChallenges(prev => prev.map(c => 
          c.id === challenge.id ? { ...c, isActive: !c.isActive } : c
        ));
        toast.success(`Challenge ${!challenge.isActive ? 'activated' : 'deactivated'}`);
      }
    } catch (error) {
      console.error('Error toggling challenge status:', error);
      toast.error('Failed to update challenge status');
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Medium': return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200';
      case 'Hard': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      default: return 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-25 via-white to-sky-25 dark:from-blue-950/50 dark:via-slate-900 dark:to-indigo-950/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                My Custom Challenges
              </CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                Create personalized challenges that target your specific goals
              </CardDescription>
            </div>
            <Button onClick={handleNewChallenge} className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600">
              <Plus className="h-4 w-4 mr-2" />
              New Challenge
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : challenges.length === 0 ? (
            <div className="text-center py-8">
              <Target className="mx-auto h-12 w-12 text-blue-400 dark:text-blue-500 mb-4" />
              <h3 className="text-lg font-medium mb-2 text-blue-900 dark:text-blue-100">No custom challenges yet</h3>
              <p className="text-blue-700 dark:text-blue-300 mb-4">
                Create your first challenge to start personalizing your growth journey
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {challenges.map((challenge) => (
                <Card key={challenge.id} className={`border-blue-200 dark:border-blue-800 ${!challenge.isActive ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{challenge.title}</h4>
                          <Badge
                            variant="outline"
                            className={getDifficultyColor(challenge.difficulty)}
                          >
                            {challenge.difficulty}
                          </Badge>
                          {!challenge.isActive && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {challenge.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{challenge.category}</span>
                          <span>•</span>
                          <span>{challenge.points} points</span>
                          {challenge.timesCompleted > 0 && (
                            <>
                              <span>•</span>
                              <span>Completed {challenge.timesCompleted} times</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(challenge)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => toggleChallengeStatus(challenge)}
                        >
                          {challenge.isActive ? '⏸️' : '▶️'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(challenge.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingChallenge ? 'Edit Challenge' : 'Create New Challenge'}
            </DialogTitle>
            <DialogDescription>
              Design a challenge that helps you grow in specific areas
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Challenge Title</Label>
              <Input
                id="title"
                placeholder="e.g., Practice active listening"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this challenge involves..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map((diff) => (
                    <SelectItem key={diff.value} value={diff.value}>
                      {diff.value} ({diff.points} points)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={isCreating} className="flex-1">
                {isCreating ? 'Saving...' : editingChallenge ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}