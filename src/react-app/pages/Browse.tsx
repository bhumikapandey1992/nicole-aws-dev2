import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Target, Users, DollarSign, TrendingUp, Heart, Search, Filter } from 'lucide-react';
import { getJson as fetchJSON, EMPTY_MESSAGES } from '@/react-app/utils/http';
import { toast } from 'sonner';

interface Campaign {
  id: number;
  campaign_title: string;
  challenge_name: string;
  unit: string;
  goal_amount: number;
  current_progress: number;
  donor_count: number;
  total_raised: number;
  bio: string | null;
  participant_name: string | null;
  created_at: string;
}

export default function Browse() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [emptyReason, setEmptyReason] = useState<string | null>(null);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const { data, emptyReason } = await fetchJSON<Campaign[]>('/wapi/browse-campaigns');
      setCampaigns(Array.isArray(data) ? data : []);
      setEmptyReason(emptyReason);
      if (emptyReason) {
        toast.info(EMPTY_MESSAGES[emptyReason] ?? EMPTY_MESSAGES['empty']);
      }
    } catch {
      setError('Error loading campaigns');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch =
      campaign.challenge_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.campaign_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (campaign.bio && campaign.bio.toLowerCase().includes(searchTerm.toLowerCase()));

    if (filterType === 'all') return matchesSearch;
    if (filterType === 'new') {
      const createdAt = new Date(campaign.created_at);
      const daysAgo = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return matchesSearch && daysAgo <= 7;
    }
    if (filterType === 'active') return matchesSearch && campaign.current_progress < campaign.goal_amount;
    if (filterType === 'popular') return matchesSearch && campaign.donor_count >= 3;

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-gray-200 border-t-bfrs-electric rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <Link to="/" className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
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
            </Link>
            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <a
                href="https://www.every.org/brain-fog-recovery-source?donateTo=brain-fog-recovery-source#/donate/card"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-black transition-colors font-medium text-sm hidden sm:inline"
              >
                Donate
              </a>
              <Link
                to="/"
                className="bg-bfrs-electric text-black px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg font-semibold hover:bg-bfrs-electric-dark transition-colors shadow-sm text-sm sm:text-base"
              >
                Start Challenge
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Friendly inline banner if backend says something is missing */}
        {emptyReason && (
  <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[60] bg-yellow-50 text-yellow-900 border border-yellow-300 rounded-lg shadow px-4 py-2">
    {EMPTY_MESSAGES[emptyReason] || "We’re working on it."}
    <button
      className="ml-3 underline font-medium"
      onClick={() => fetchCampaigns()}
    >
      Try again
    </button>
  </div>
)}

        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-black mb-4">
            Support Amazing <span className="text-bfrs-electric">Metabolic Challenges</span>
          </h1>
          <p className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto mb-6 sm:mb-8 px-4">
            Browse active fundraising challenges and pledge support for people using metabolic interventions to fund psychiatric recovery access.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
            <div className="flex items-center text-gray-600">
              <Heart className="w-5 h-5 text-bfrs-electric mr-2" />
              <span className="font-medium">Every pledge makes a difference</span>
            </div>
            <div className="flex items-center text-gray-600">
              <TrendingUp className="w-5 h-5 text-bfrs-electric mr-2" />
              <span className="font-medium">Pledge per unit or donate once</span>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search campaigns by challenge type, title, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bfrs-electric focus:border-bfrs-electric"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bfrs-electric focus:border-bfrs-electric bg-white"
              >
                <option value="all">All Campaigns</option>
                <option value="new">New This Week</option>
                <option value="active">In Progress</option>
                <option value="popular">Popular (3+ Supporters)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="mb-6">
          <p className="text-gray-600">
            {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''} found
            {searchTerm && ` for "${searchTerm}"`}
            {filterType !== 'all' && ` in ${filterType} campaigns`}
          </p>
        </div>

        {/* Campaigns Grid */}
        {error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchCampaigns}
              className="bg-bfrs-electric text-black px-6 py-3 rounded-lg hover:bg-bfrs-electric-dark transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">
              {searchTerm || filterType !== 'all' ? 'No campaigns match your search' : 'No active campaigns yet'}
            </h3>
            {emptyReason ? (
      <div className="space-x-3">
        <button
          onClick={fetchCampaigns}
          className="inline-flex items-center bg-bfrs-electric text-black px-6 py-3 rounded-lg hover:bg-bfrs-electric-dark transition-colors font-semibold"
        >
          Try again
        </button>
      </div>
    ) : (
      <>
            <p className="text-gray-600 mb-6">
              {searchTerm || filterType !== 'all'
                ? 'Try adjusting your search terms or filters'
                : 'Be the first to create a metabolic challenge campaign!'
              }
            </p>
            <Link
              to="/"
              className="inline-flex items-center bg-bfrs-electric text-black px-6 py-3 rounded-lg hover:bg-bfrs-electric-dark transition-colors font-semibold"
            >
              <Target className="w-5 h-5 mr-2" />
              Create Campaign
            </Link>
          </>
    )}
  </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCampaigns.map((campaign) => {
              const progressPercentage =
                campaign.goal_amount > 0
                  ? Math.min((campaign.current_progress / campaign.goal_amount) * 100, 100)
                  : 0;

              return (
                <div key={campaign.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="p-6">
                    {/* Challenge Info */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                          {campaign.challenge_name}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(campaign.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-black mb-2 group-hover:text-bfrs-electric transition-colors">
                        {campaign.campaign_title}
                      </h3>
                      <p className="text-lg font-bold text-bfrs-electric mb-2">
                        {campaign.participant_name || "Unknown"}'s Challenge
                      </p>
                      {campaign.bio && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {campaign.bio.length > 100 ? campaign.bio.substring(0, 100) + '...' : campaign.bio}
                        </p>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium text-black">{Math.round(progressPercentage)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-bfrs-electric h-2 rounded-full transition-all duration-500"
                          style={{ width: `${progressPercentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-gray-600">
                          {campaign.current_progress} / {campaign.goal_amount} {campaign.unit}
                        </span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <Users className="w-4 h-4 text-bfrs-electric mr-1" />
                          <span className="text-lg font-bold text-black">{campaign.donor_count}</span>
                        </div>
                        <span className="text-xs text-gray-600">Supporters</span>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center mb-1">
                          <DollarSign className="w-4 h-4 text-bfrs-electric mr-1" />
                          <span className="text-lg font-bold text-black">${campaign.total_raised.toFixed(0)}</span>
                        </div>
                        <span className="text-xs text-gray-600">Raised</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Link
                      to={`/participant/${campaign.id}`}
                      className="w-full bg-bfrs-electric text-black px-4 py-3 rounded-lg hover:bg-bfrs-electric-dark transition-colors font-semibold text-center block group-hover:shadow-lg transform group-hover:scale-105"
                    >
                      <Heart className="w-5 h-5 inline mr-2" />
                      Support This Challenge
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom CTAs */}
        <div className="grid md:grid-cols-2 gap-8 mt-16">
          {/* Direct Donation CTA */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-black text-center shadow-sm">
            <h2 className="text-2xl font-bold mb-4 text-black">Make a Direct Impact</h2>
            <p className="text-gray-700 mb-6">
              Make an immediate tax-deductible donation to Brain Fog Recovery Source and support psychiatric recovery access directly.
            </p>
            <a
              href="https://www.every.org/brain-fog-recovery-source?donateTo=brain-fog-recovery-source#/donate/card"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-bfrs-electric text-black px-8 py-4 rounded-lg font-bold hover:bg-bfrs-electric-dark transition-colors inline-flex items-center"
            >
              <DollarSign className="w-6 h-6 mr-3" />
              Donate Now
            </a>
          </div>

          {/* Create Campaign CTA */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-black text-center shadow-sm">
            <h2 className="text-2xl font-bold mb-4 text-black">Start Your Own Challenge</h2>
            <p className="text-gray-700 mb-6">
              Create your own metabolic challenge campaign and raise funds for psychiatric recovery access.
            </p>
            <Link
              to="/"
              className="bg-black text-bfrs-electric px-8 py-4 rounded-lg font-bold hover:bg-gray-900 transition-colors inline-flex items-center"
            >
              <Target className="w-6 h-6 mr-3" />
              Create Your Campaign
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
