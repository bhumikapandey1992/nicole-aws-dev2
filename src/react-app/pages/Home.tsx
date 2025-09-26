import { useAuth } from '@getmocha/users-service/react';
import { Navigate, Link } from 'react-router';
import { useState, useEffect } from 'react';
import { Target, Users, Heart, ArrowRight, TrendingUp, Zap, Star, Snowflake, Activity, Clock, Salad, Brain, Sun } from 'lucide-react';
export default function Home() {
  const { user, isPending } = useAuth();
  const [stats, setStats] = useState({ participants: 0, raised: 0 });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/wapi/campaigns');
      if (response.ok) {
        const campaigns = await response.json();
        const totalParticipants = campaigns.reduce((sum: number, campaign: { participant_count?: number }) => 
          sum + (campaign.participant_count || 0), 0);
        const totalRaised = campaigns.reduce((sum: number, campaign: { total_raised?: number }) => 
          sum + (campaign.total_raised || 0), 0);
        
        setStats({ participants: totalParticipants, raised: totalRaised });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
      console.error('Failed to fetch stats:', errorMessage);
      // Keep default stats on error
    }
  };

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      console.log('Starting Google login process...');
      
      // Get the OAuth redirect URL from our backend
      const response = await fetch('/wapi/oauth/google/redirect_url');
      if (!response.ok) {
        throw new Error(`Failed to get login URL: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      if (!data.redirectUrl) {
        throw new Error('No redirect URL received from server');
      }
      
      console.log('Redirecting to Google OAuth:', data.redirectUrl);
      window.location.href = data.redirectUrl;
    } catch (error) {
      console.error('Login failed:', error);
      
      // Safe error message extraction with comprehensive type checking
      let errorMessage = 'Login failed';
      try {
        if (error instanceof Error) {
          errorMessage = error.message || 'Login failed';
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error && typeof error === 'object' && 'message' in error) {
          const msg = (error as { message: unknown }).message;
          errorMessage = typeof msg === 'string' ? msg : 'Login failed';
        } else {
          errorMessage = String(error || 'Login failed');
        }
        
        // Ensure errorMessage is definitely a string
        if (typeof errorMessage !== 'string') {
          errorMessage = 'Login failed';
        }
      } catch (stringifyError) {
        console.error('Error processing login error:', stringifyError);
        errorMessage = 'Login failed - please try again';
      }
      
      alert(`Login failed: ${errorMessage}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-bfrs-electric rounded-full"></div>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <img 
                src="https://mocha-cdn.com/019870bf-4695-74f8-b344-315629bf7f9f/BFRS_Logo_Square_Original.jpg" 
                alt="Brain Fog Recovery Source Logo" 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow-sm flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-xl font-bold text-black truncate">
                  Brain Fog Recovery Source
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Metabolic Challenges for Recovery</p>
              </div>
            </div>
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="bg-bfrs-electric text-black px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-bfrs-electric-dark transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base flex-shrink-0"
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-8 sm:pt-16 pb-12 sm:pb-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-3 sm:px-4 py-2 bg-black text-bfrs-electric rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6 shadow-sm">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
              Transform Challenges into Impact
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-black mb-4 sm:mb-6 leading-tight px-2">
              Turn Your
              <span className="text-bfrs-electric"> Metabolic Journey </span>
              Into Funding for Recovery
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed max-w-3xl mx-auto">
              Challenge yourself with metabolic activities, ask friends and family to pledge dollars <strong>per unit you complete</strong> (per minute, mile, rep, session, or day), 
              and raise funds to help others access life-changing psychiatric recovery education and support.
            </p>

            <div className="flex flex-col items-center justify-center space-y-4 mb-12">
              <button
                onClick={handleLogin}
                disabled={isLoading}
                className="group bg-bfrs-electric text-black px-6 sm:px-8 py-4 rounded-lg font-bold text-lg hover:bg-bfrs-electric-dark transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center w-full sm:w-auto justify-center"
              >
                <Target className="w-6 h-6 mr-3" />
                {isLoading ? 'Starting...' : 'START YOUR CHALLENGE'}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <Link
                to="/browse"
                className="group bg-black text-bfrs-electric px-6 sm:px-8 py-4 rounded-lg font-bold text-lg hover:bg-gray-900 transition-colors shadow-lg flex items-center w-full sm:w-auto justify-center"
              >
                <Heart className="w-6 h-6 mr-3" />
                BROWSE & SUPPORT CHALLENGES
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-8 mb-12">
              <div className="flex items-center text-gray-600">
                <Star className="w-5 h-5 text-bfrs-electric mr-2" />
                <span className="font-medium">Free to participate</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Users className="w-5 h-5 text-gray-600 mr-2" />
                <span className="font-medium">Support others anytime</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-bfrs-electric mb-1">{stats.participants}</div>
                <div className="text-sm text-gray-600">Active Participants</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-bfrs-electric mb-1">${stats.raised.toFixed(0)}</div>
                <div className="text-sm text-gray-600">Funds Raised</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-bfrs-electric mb-1">6</div>
                <div className="text-sm text-gray-600">Challenge Types</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-bfrs-electric mb-1">100s</div>
                <div className="text-sm text-gray-600">Get Access</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Simple, transparent fundraising through personal metabolic challenges
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Target className="w-8 h-8 text-bfrs-electric" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-3">1. Choose Your Challenge</h3>
              <p className="text-gray-600 leading-relaxed">
                Select from metabolic activities like cold exposure, exercise, fasting, or create your own custom challenge with a specific goal.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Users className="w-8 h-8 text-bfrs-electric" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-3">2. Share and Get Pledges</h3>
              <p className="text-gray-600 leading-relaxed">
                Share your campaign with supporters who pledge funds for each unit you complete. The more you do, the more you raise!
              </p>
            </div>

            <div className="text-center group">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Heart className="w-8 h-8 text-bfrs-electric" />
              </div>
              <h3 className="text-xl font-semibold text-black mb-3">3. Complete & Raise Funds</h3>
              <p className="text-gray-600 leading-relaxed">
                Log your progress as you complete your challenge. Supporters are notified when you finish to fulfill their pledges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Challenge Types */}
      <section className="py-20 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
              Popular Challenge Types
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join others in these proven metabolic interventions that support mental wellness
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-200 hover:border-bfrs-electric transition-all group">
              <div className="w-16 h-16 bg-bfrs-electric rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow">
                <Snowflake className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Cold Exposure</h3>
              <p className="text-gray-600 text-sm mb-4">
                Ice baths, cold showers, or outdoor cold exposure sessions to boost metabolic health and mental resilience.
              </p>
              <div className="text-xs text-gray-500">
                Popular goals: 30 sessions, 100 minutes, 14 days
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-200 hover:border-bfrs-electric transition-all group">
              <div className="w-16 h-16 bg-bfrs-electric rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow">
                <Activity className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Exercise Sessions</h3>
              <p className="text-gray-600 text-sm mb-4">
                Regular physical activity to support metabolic function and mental clarity through movement.
              </p>
              <div className="text-xs text-gray-500">
                Popular goals: 50 workouts, 500 minutes, 21 days
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-200 hover:border-bfrs-electric transition-all group">
              <div className="w-16 h-16 bg-bfrs-electric rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow">
                <Clock className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Intermittent Fasting</h3>
              <p className="text-gray-600 text-sm mb-4">
                Structured eating windows to promote metabolic flexibility and cognitive benefits.
              </p>
              <div className="text-xs text-gray-500">
                Popular goals: 30 days, 16 hours, 100 fasts
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-200 hover:border-bfrs-electric transition-all group">
              <div className="w-16 h-16 bg-bfrs-electric rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow">
                <Salad className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Ketogenic Days</h3>
              <p className="text-gray-600 text-sm mb-4">
                Following ketogenic nutrition principles to support brain health and metabolic function.
              </p>
              <div className="text-xs text-gray-500">
                Popular goals: 30 days, 90 days, 21 days
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-200 hover:border-bfrs-electric transition-all group">
              <div className="w-16 h-16 bg-bfrs-electric rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow">
                <Brain className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Meditation Sessions</h3>
              <p className="text-gray-600 text-sm mb-4">
                Mindfulness and meditation practices that complement metabolic interventions for mental wellness.
              </p>
              <div className="text-xs text-gray-500">
                Popular goals: 100 sessions, 500 minutes, 30 days
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border-2 border-gray-200 hover:border-bfrs-electric transition-all group">
              <div className="w-16 h-16 bg-bfrs-electric rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-shadow">
                <Sun className="w-8 h-8 text-black" />
              </div>
              <h3 className="text-lg font-semibold text-black mb-2">Sun Exposure</h3>
              <p className="text-gray-600 text-sm mb-4">
                Natural light exposure to support circadian rhythms and vitamin D synthesis for brain health.
              </p>
              <div className="text-xs text-gray-500">
                Popular goals: 30 days, 200 minutes, 60 sessions
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-2 bg-black text-bfrs-electric rounded-full text-sm font-medium mb-6">
              <TrendingUp className="w-4 h-4 mr-2" />
              Our Mission
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-black mb-6">
              Bridging the Gap to Recovery Access
            </h2>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              <span className="font-bold text-black">Brain Fog Recovery Source</span> is dedicated to making metabolic therapy education and support 
              accessible to everyone seeking to use it as part of their psychiatric recovery. Through community-powered fundraising challenges, we create 
              pathways for individuals to access life-changing metabolic therapy education and support, while building awareness 
              of the connection between metabolic health and mental wellness.
            </p>

            <div className="bg-gray-50 rounded-2xl p-8 border-2 border-gray-200">
              <h3 className="text-xl font-semibold text-black mb-4">Every Dollar Makes a Difference</h3>
              <p className="text-gray-700">
                Funds raised go directly toward providing access to metabolic psychiatric 
                education and support, educational resources, and support systems for individuals seeking 
                alternatives to traditional psychiatric approaches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Browse Campaigns CTA */}
      <section className="py-20 bg-bfrs-electric">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-black mb-6">
            🌟 Discover Amazing Challenges to Support!
          </h2>
          <p className="text-xl text-black mb-8">
            Browse active campaigns and pledge support for people doing metabolic challenges to fund psychiatric recovery access.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              to="/browse"
              className="bg-black text-bfrs-electric px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-900 transition-colors flex items-center shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Heart className="w-6 h-6 mr-3" />
              Browse Active Campaigns
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <div className="text-black text-lg font-medium">
              Pledge per unit completed • One-time donations • Easy sharing
            </div>
          </div>
        </div>
      </section>

      {/* Create Your Own CTA */}
      <section className="py-12 sm:py-20 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-4xl font-bold text-black mb-4 sm:mb-6">
            🎯 Ready to Start Your Challenge?
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8">
            Join our community of wellness champions raising funds for psychiatric recovery access.
          </p>
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="bg-black text-bfrs-electric px-6 sm:px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-900 transition-colors shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:transform-none flex items-center mx-auto w-full sm:w-auto justify-center"
          >
            <Target className="w-5 h-5 sm:w-6 sm:h-6 mr-3" />
            {isLoading ? 'Starting...' : 'START YOUR CHALLENGE NOW'}
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <img 
                src="https://mocha-cdn.com/019870bf-4695-74f8-b344-315629bf7f9f/BFRS_Logo_Square_Original.jpg" 
                alt="Brain Fog Recovery Source Logo" 
                className="w-8 h-8 rounded-lg"
              />
              <h3 className="text-xl font-bold text-white">Brain Fog Recovery Source</h3>
            </div>
            <p className="text-gray-400 mb-6">
              Empowering recovery through metabolic wellness challenges
            </p>
            <div className="text-sm text-gray-500">
              <p>&copy; 2024 Brain Fog Recovery Source. Making recovery accessible to all.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
