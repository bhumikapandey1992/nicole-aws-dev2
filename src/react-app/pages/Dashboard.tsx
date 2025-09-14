import { useAuth } from '@getmocha/users-service/react';
import { Navigate, Link } from 'react-router';
import { useState, useEffect } from 'react';
import { Plus, Target, Users, DollarSign, LogOut, TrendingUp, Heart, Search, ArrowRight } from 'lucide-react';
import EmailReminderSettings from '@/react-app/components/EmailReminderSettings';

interface Campaign {
  id: number;
  title: string;
  description: string;
  status: string;
  participant_count: number;
  total_raised: number
  start_date: string;
  end_date: string;
  created_at: string;
}

export default function Dashboard() {
  const { user, logout, isPending } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch campaigns
      const campaignsResponse = await fetch('/wapi/campaigns');
      const campaignsData = await campaignsResponse.json();
      setCampaigns(campaignsData);

      // Fetch user's participants
      const participantsResponse = await fetch('/wapi/my-participants');
      const participantsData = await participantsResponse.json();
      
      // If user has active participants, redirect to most recent one
      if (participantsData.length > 0) {
        const mostRecent = participantsData[0]; // API should return most recent first
        window.location.href = `/participant/${mostRecent.id}`;
        return;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'Failed to fetch data');
      console.error('Failed to fetch data:', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-bfrs-electric rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img 
                src="https://mocha-cdn.com/019870bf-4695-74f8-b344-315629bf7f9f/BFRS_Logo_Square_Original.jpg" 
                alt="Brain Fog Recovery Source Logo" 
                className="w-10 h-10 rounded-lg mr-3"
              />
              <h1 className="text-2xl font-bold text-black">
                Brain Fog Recovery Source - Metabolic Challenges
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                {user.google_user_data.picture && (
                  <img 
                    src={user.google_user_data.picture} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <span className="text-sm font-medium text-gray-700">
                  {user.google_user_data.name || user.email}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dual Action Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Browse & Support Campaigns */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-black shadow-sm">
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-bfrs-electric" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-black">Support Amazing Challenges</h2>
              <p className="text-gray-700 mb-6">
                Browse active campaigns and pledge support for people doing metabolic challenges to fund psychiatric recovery access.
              </p>
              <Link
                to="/browse"
                className="inline-flex items-center px-8 py-4 bg-bfrs-electric text-black font-bold text-lg rounded-lg hover:bg-bfrs-electric-dark transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Search className="w-6 h-6 mr-3" />
                Browse & Support Campaigns
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <div className="mt-4 text-sm text-gray-600">
                Pledge per unit completed • One-time donations • Easy sharing
              </div>
            </div>
          </div>

          {/* Create Your Own Campaign */}
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-black shadow-sm">
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-bfrs-electric" />
              </div>
              <h2 className="text-2xl font-bold mb-3 text-black">Create Your Challenge</h2>
              <p className="text-gray-700 mb-6">
                Turn your metabolic challenges into funds for psychiatric recovery support. Set your goal and get supporters!
              </p>
              <Link
                to="/create-participant"
                className="inline-flex items-center px-8 py-4 bg-black text-bfrs-electric font-bold text-lg rounded-lg hover:bg-gray-900 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Target className="w-6 h-6 mr-3" />
                Start Your Campaign
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <div className="mt-4 text-sm text-gray-600">
                Choose challenge • Set goal • Get supporters
              </div>
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 text-black">
              Welcome back, {user.google_user_data.given_name || 'Champion'}!
            </h2>
            <p className="text-gray-600 mb-4">
              Whether you want to <strong>support others</strong> or <strong>create your own challenge</strong>, we've got you covered!
            </p>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-700">
                <strong>How it works:</strong> Supporters pledge dollars <strong>per unit completed</strong> (per minute, mile, rep, session, or day). 
                Every unit completed multiplies fundraising for Brain Fog Recovery Source's mission to provide access to metabolic education and support.
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-bfrs-electric" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Active Participants</h3>
                <p className="text-2xl font-bold text-black">
                  {campaigns.reduce((sum, campaign) => sum + campaign.participant_count, 0)}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-bfrs-electric" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Raised</h3>
                <p className="text-2xl font-bold text-black">
                  ${campaigns.reduce((sum, campaign) => sum + campaign.total_raised, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-bfrs-electric" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Challenge Categories</h3>
                <p className="text-2xl font-bold text-black">6</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-black">Quick Actions</h3>
            <p className="text-sm text-gray-500 mt-1">Popular actions to get started</p>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Link
                to="/browse"
                className="group bg-white border border-gray-200 p-6 rounded-xl text-black hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <div className="flex items-center mb-3">
                  <Heart className="w-6 h-6 mr-3 text-bfrs-electric" />
                  <h4 className="font-bold">Browse Campaigns</h4>
                </div>
                <p className="text-sm text-gray-700">Find amazing challenges to support</p>
              </Link>
              
              <a
                href="https://www.every.org/brain-fog-recovery-source?donateTo=brain-fog-recovery-source#/donate/card"
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-white border border-gray-200 p-6 rounded-xl text-black hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <div className="flex items-center mb-3">
                  <DollarSign className="w-6 h-6 mr-3 text-bfrs-electric" />
                  <h4 className="font-bold">Donate Directly</h4>
                </div>
                <p className="text-sm text-gray-700">Make a direct donation via Every.org</p>
              </a>
              
              <Link
                to="/create-participant"
                className="group bg-black border border-gray-800 p-6 rounded-xl text-white hover:shadow-lg transition-all duration-200 transform hover:scale-105"
              >
                <div className="flex items-center mb-3">
                  <Target className="w-6 h-6 mr-3 text-bfrs-electric" />
                  <h4 className="font-bold text-bfrs-electric">Start Challenge</h4>
                </div>
                <p className="text-sm text-gray-300">Create your own fundraising campaign</p>
              </Link>
            </div>
          </div>
        </div>

        {/* Email Reminder Settings Section */}
        <EmailReminderSettings />

        {/* Active Fundraisers Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-black">Active Fundraisers</h3>
                <p className="text-sm text-gray-500 mt-1">People currently raising funds through metabolic challenges</p>
              </div>
              <Link
                to="/browse"
                className="text-bfrs-electric hover:text-bfrs-electric-dark font-medium text-sm transition-colors"
              >
                View All →
              </Link>
            </div>
          </div>

          <div className="p-6">
            {campaigns.length === 0 || campaigns.reduce((sum, campaign) => sum + campaign.participant_count, 0) === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-black mb-2">No active fundraisers yet</h3>
                <p className="text-gray-500 mb-6">
                  Be the first to start a metabolic challenge and raise funds for psychiatric recovery support!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    to="/create-participant"
                    className="inline-flex items-center px-6 py-3 bg-bfrs-electric text-black font-medium rounded-lg hover:bg-bfrs-electric-dark transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Your Campaign
                  </Link>
                  <Link
                    to="/browse"
                    className="inline-flex items-center px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Search className="w-5 h-5 mr-2" />
                    Browse Campaigns
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  {campaigns.reduce((sum, campaign) => sum + campaign.participant_count, 0)} people are actively fundraising
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    to="/browse"
                    className="inline-flex items-center px-6 py-3 bg-bfrs-electric text-black font-semibold rounded-lg hover:bg-bfrs-electric-dark transition-colors shadow-sm"
                  >
                    <Heart className="w-4 h-4 mr-2" />
                    Support Campaigns
                  </Link>
                  <Link
                    to="/create-participant"
                    className="inline-flex items-center px-6 py-3 bg-white border-2 border-gray-800 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Create My Campaign
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
