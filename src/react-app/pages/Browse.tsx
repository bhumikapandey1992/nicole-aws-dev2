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
      if (emptyReason) toast.info(EMPTY_MESSAGES[emptyReason] ?? EMPTY_MESSAGES['empty']);
    } catch {
      setError('Error loading campaigns');
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matches =
        c.challenge_name.toLowerCase().includes(q) ||
        c.campaign_title.toLowerCase().includes(q) ||
        (!!c.bio && c.bio.toLowerCase().includes(q));

    if (filterType === 'all') return matches;
    if (filterType === 'new') {
      const daysAgo = (Date.now() - new Date(c.created_at).getTime()) / 86_400_000;
      return matches && daysAgo <= 7;
    }
    if (filterType === 'active') return matches && c.current_progress < c.goal_amount;
    if (filterType === 'popular') return matches && c.donor_count >= 3;
    return matches;
  });

  if (loading) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-gray-200 border-t-bfrs-electric rounded-full" />
        </div>
    );
  }

  return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="mx-auto w-full max-w-[1200px] px-4">
            <div className="flex items-center justify-between py-3 sm:py-4">
              <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
                <img
                    src="https://mocha-cdn.com/019870bf-4695-74f8-b344-315629bf7f9f/BFRS_Logo_Square_Original.jpg"
                    alt="Brain Fog Recovery Source Logo"
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shadow-sm flex-shrink-0"
                />
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-xl font-bold text-black truncate">
                    Brain Fog Recovery Source
                  </h1>
                  <p className="hidden sm:block text-xs sm:text-sm text-gray-600">
                    Metabolic Challenges for Recovery
                  </p>
                </div>
              </Link>

              <div className="flex items-center gap-2 sm:gap-4">
                <a
                    href="https://www.every.org/brain-fog-recovery-source?donateTo=brain-fog-recovery-source#/donate/card"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden sm:inline text-gray-600 hover:text-black transition-colors font-medium text-sm"
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

        {/* Main */}
        <main className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:py-8">
          {/* Inline banner for emptyReason */}
          {emptyReason && (
              <div className="mb-4 sm:mb-6 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-900 px-4 py-2">
                {EMPTY_MESSAGES[emptyReason] || 'We’re working on it.'}
                <button className="ml-3 underline font-medium" onClick={fetchCampaigns}>
                  Try again
                </button>
              </div>
          )}

          {/* Hero */}
          <section className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-black mb-3 sm:mb-4 leading-tight">
              Support Amazing <span className="text-bfrs-electric">Metabolic Challenges</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-6 sm:mb-8">
              Browse active fundraising challenges and pledge support for people using metabolic interventions to fund
              psychiatric recovery access.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
              <div className="flex items-center text-gray-600">
                <Heart className="w-5 h-5 text-bfrs-electric mr-2" />
                <span className="font-medium">Every pledge makes a difference</span>
              </div>
              <div className="flex items-center text-gray-600">
                <TrendingUp className="w-5 h-5 text-bfrs-electric mr-2" />
                <span className="font-medium">Pledge per unit or donate once</span>
              </div>
            </div>
          </section>

          {/* Search & Filter */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
              {/* Search */}
              <div className="md:col-span-8 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search by challenge, title, or description…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-bfrs-electric focus:border-bfrs-electric"
                />
              </div>
              {/* Filter */}
              <div className="md:col-span-4 relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full pl-10 pr-8 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-bfrs-electric focus:border-bfrs-electric bg-white"
                >
                  <option value="all">All Campaigns</option>
                  <option value="new">New This Week</option>
                  <option value="active">In Progress</option>
                  <option value="popular">Popular (3+ Supporters)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Summary */}
          <p className="mb-4 sm:mb-6 text-gray-600">
            {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''} found
            {searchTerm && ` for "${searchTerm}"`}
            {filterType !== 'all' && ` in ${filterType} campaigns`}
          </p>

          {/* Grid */}
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
                <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                  {searchTerm || filterType !== 'all' ? 'No campaigns match your search' : 'No active campaigns yet'}
                </h3>

                {emptyReason ? (
                    <button
                        onClick={fetchCampaigns}
                        className="inline-flex items-center bg-bfrs-electric text-black px-6 py-3 rounded-lg hover:bg-bfrs-electric-dark transition-colors font-semibold"
                    >
                      Try again
                    </button>
                ) : (
                    <>
                      <p className="text-gray-600 mb-6">
                        {searchTerm || filterType !== 'all'
                            ? 'Try adjusting your search terms or filters'
                            : 'Be the first to create a metabolic challenge campaign!'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {filteredCampaigns.map((c) => {
                  const pct = c.goal_amount > 0 ? Math.min((c.current_progress / c.goal_amount) * 100, 100) : 0;
                  return (
                      <div
                          key={c.id}
                          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow group"
                      >
                        <div className="p-5 sm:p-6">
                          {/* Top */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2 gap-3">
                        <span className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs sm:text-sm font-medium">
                          {c.challenge_name}
                        </span>
                              <span className="text-xs sm:text-sm text-gray-500 whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-semibold text-black mb-1 group-hover:text-bfrs-electric transition-colors">
                              {c.campaign_title}
                            </h3>
                            <p className="text-base sm:text-lg font-bold text-bfrs-electric mb-2">
                              {c.participant_name || 'Unknown'}&apos;s Challenge
                            </p>
                            {c.bio && (
                                <p className="text-sm text-gray-600 line-clamp-2">{c.bio.length > 120 ? c.bio.slice(0, 120) + '…' : c.bio}</p>
                            )}
                          </div>

                          {/* Progress */}
                          <div className="mb-4">
                            <div className="flex justify-between text-xs sm:text-sm mb-2">
                              <span className="text-gray-600">Progress</span>
                              <span className="font-medium text-black">{Math.round(pct)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-bfrs-electric h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <div className="flex justify-between text-xs sm:text-sm mt-2">
                        <span className="text-gray-600">
                          {c.current_progress} / {c.goal_amount} {c.unit}
                        </span>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1">
                                <Users className="w-4 h-4 text-bfrs-electric mr-1" />
                                <span className="text-base sm:text-lg font-bold text-black">{c.donor_count}</span>
                              </div>
                              <span className="text-xs text-gray-600">Supporters</span>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-1">
                                <DollarSign className="w-4 h-4 text-bfrs-electric mr-1" />
                                <span className="text-base sm:text-lg font-bold text-black">${c.total_raised.toFixed(0)}</span>
                              </div>
                              <span className="text-xs text-gray-600">Raised</span>
                            </div>
                          </div>

                          {/* CTA */}
                          <Link
                              to={`/participant/${c.id}`}
                              className="block w-full text-center bg-bfrs-electric text-black px-4 py-3 rounded-lg font-semibold hover:bg-bfrs-electric-dark transition-colors group-hover:shadow-md active:scale-[.99]"
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
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mt-12 sm:mt-16">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 text-center shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-black">Make a Direct Impact</h2>
              <p className="text-gray-700 mb-5 sm:mb-6">
                Make an immediate tax-deductible donation to Brain Fog Recovery Source and support psychiatric recovery access directly.
              </p>
              <a
                  href="https://www.every.org/brain-fog-recovery-source?donateTo=brain-fog-recovery-source#/donate/card"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-bfrs-electric text-black px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold hover:bg-bfrs-electric-dark transition-colors"
              >
                <DollarSign className="w-5 sm:w-6 h-5 sm:h-6 mr-3" />
                Donate Now
              </a>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 text-center shadow-sm">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-black">Start Your Own Challenge</h2>
              <p className="text-gray-700 mb-5 sm:mb-6">
                Create your own metabolic challenge campaign and raise funds for psychiatric recovery access.
              </p>
              <Link
                  to="/"
                  className="inline-flex items-center bg-black text-bfrs-electric px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold hover:bg-gray-900 transition-colors"
              >
                <Target className="w-5 sm:w-6 h-5 sm:h-6 mr-3" />
                Create Your Campaign
              </Link>
            </div>
          </section>
        </main>
      </div>
  );
}
