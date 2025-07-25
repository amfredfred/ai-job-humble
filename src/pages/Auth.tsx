
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FullScreenSignup } from '@/components/ui/full-screen-signup';
import OnboardingSteps from '@/components/auth/OnboardingSteps';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isLogin = searchParams.get('tab') === 'signin';

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Check onboarding status before redirecting
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.onboarding_completed) {
          navigate('/dashboard');
        } else {
          setCurrentUser(session.user);
          setShowOnboarding(true);
        }
      }
    };
    checkUser();
  }, [navigate]);

  const handleSignUp = async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    setError('');

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: {
            full_name: fullName
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('This email is already registered. Please sign in instead.');
        } else {
          setError(signUpError.message);
        }
      } else if (data.user) {
        // Show onboarding immediately after signup
        setCurrentUser(data.user);
        setShowOnboarding(true);
        toast({
          title: "Account created successfully!",
          description: "Let's complete your profile setup.",
        });
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
        } else {
          setError(signInError.message);
        }
      } else if (data.user) {
        // Check onboarding status
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('onboarding_completed')
          .eq('id', data.user.id)
          .single();
        
        if (profile?.onboarding_completed) {
          toast({
            title: "Welcome back!",
            description: "You have successfully signed in.",
          });
          navigate('/dashboard');
        } else {
          setCurrentUser(data.user);
          setShowOnboarding(true);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOnboardingComplete = () => {
    navigate('/dashboard');
  };

  const handleSubmit = (email: string, password: string, fullName?: string) => {
    if (isLogin) {
      handleSignIn(email, password);
    } else {
      handleSignUp(email, password, fullName || '');
    }
  };

  if (showOnboarding && currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <OnboardingSteps 
          user={currentUser} 
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  return (
    <FullScreenSignup
      onSubmit={handleSubmit}
      isLogin={isLogin}
      loading={isLoading}
      error={error}
    />
  );
};

export default Auth;
