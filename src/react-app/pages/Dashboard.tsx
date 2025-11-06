import { useAuth } from '@getmocha/users-service/react';
import { Navigate, Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Target, Users, DollarSign, LogOut,
  TrendingUp, Heart, Search, ArrowRight
} from 'lucide-react';
import EmailReminderSettings from '@/react-app/components/EmailReminderSettings';
import RecentActivityFeed from '@/react-app/components/RecentActivityFeed';

interface Campaign {
  id: number;
  title: string;
  description: string;
  status: string;
  participant_count: number;
  total_raised: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

interface Spotlight {
  id: number | string;
  participant_name?: string;
  challenge_name?: string;
  unit?: string;
  goal_amount?: number;
  current_progress?: number;
  donor_count?: number;
  total_raised?: number;
  campaign_title?: string;
  spotlight_image_url?: string | null;
  image_url?: string | null;
  profile_image_url?: string | null;
  every_org_url?: string | null;
}

type PulseStats = {
  window: string;
  pledges: number;
  donations: number;
  progress_units: number;
  raised: number;
  spark: number[];
};

function Sparkline({ data }: { data: number[] }) {
  const points = useMemo(() => {
    if (!data?.length) return '0,30 100,30';
    const max = Math.max(1, ...data);
    const n = data.length;
    return data
        .map((v, i) => {
          const x = (i / (n - 1)) * 100;
          const y = 30 - (v / max) * 28;
          return `${x},${y}`;
        })
        .join(' ');
  }, [data]);

  return (
      <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-8">
        <polyline fill="none" stroke="currentColor" strokeWidth="2" points={points} className="text-bfrs-electric" />
      </svg>
  );
}

function isSpotlightLike(x: unknown): x is Spotlight {
  if (!x || typeof x !== 'object') return false;
  const id = (x as { id?: unknown }).id;
  return typeof id === 'number' || typeof id === 'string';
}

export default function Dashboard() {
  const { user, logout, isPending } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const [loading, setLoading] = useState(true);

  const [pulse, setPulse] = useState<PulseStats | null>(null);
  const [pulseLoading, setPulseLoading] = useState(true);

  useEffect(() => {
    if (user) void fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const campaignsResponse = await fetch('/wapi/campaigns', { headers: { 'cache-control': 'no-cache' } });
      const campaignsData = await campaignsResponse.json();
      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);

      try {
        const sRes = await fetch('/wapi/spotlight', { headers: { 'cache-control': 'no-cache' } });
        if (sRes.ok) {
          const raw: unknown = await sRes.json();
          const maybeContainer = raw as { spotlight?: unknown };
          const candidate: unknown = (maybeContainer && 'spotlight' in maybeContainer)
              ? maybeContainer.spotlight
              : raw;

          if (isSpotlightLike(candidate)) {
            setSpotlight(candidate);
          } else {
            setSpotlight(null);
          }
        } else {
          setSpotlight(null);
        }
      } catch {
        setSpotlight(null);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error || 'Failed to fetch data');
      console.error('Failed to fetch data:', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadPulse() {
      try {
        setPulseLoading(true);
        const res = await fetch('/wapi/activity-stats?window=24h', { headers: { 'cache-control': 'no-cache' } });
        if (res.ok) {
          const json = (await res.json()) as PulseStats;
          setPulse(json);
        }
      } catch (e) {
        console.warn('pulse load failed', e);
      } finally {
        setPulseLoading(false);
      }
    }

    void loadPulse();
    const t = window.setInterval(() => { void loadPulse(); }, 30_000);
    return () => { clearInterval(t); };
  }, []);

  if (isPending || loading) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-bfrs-electric rounded-full" />
          </div>
        </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  const totalActiveParticipants = campaigns.reduce((sum, c) => sum + (c.participant_count || 0), 0);
  const totalRaised = campaigns.reduce((sum, c) => sum + (c.total_raised || 0), 0);

  return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 [padding-top:env(safe-area-inset-top)]">
          <div className="mx-auto w-full max-w-screen-xl px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                    src="https://mocha-cdn.com/019870bf-4695-74f8-b344-315629bf7f9f/BFRS_Logo_Square_Original.jpg"
                    alt="Brain Fog Recovery Source Logo"
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0"
                />
                <h1 className="text-base sm:text-2xl font-bold text-black truncate">
                  Brain Fog Recovery Source — Metabolic Challenges
                </h1>
              </div>

              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                {user.google_user_data.picture && (
                    <img
                        src={user.google_user_data.picture}
                        alt="Profile"
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0"
                    />
                )}
                <span className="hidden xs:block text-sm font-medium text-gray-700 truncate max-w-[140px] sm:max-w-[200px]">
                {user.google_user_data.name || user.email}
              </span>
                <button
                    onClick={logout}
                    className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="mx-auto w-full max-w-screen-xl px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Spotlight + Right rail */}
          <div className="grid grid-cols-12 items-stretch gap-y-6 gap-x-4">
            {/* Spotlight */}
            <section className="col-span-12 lg:col-span-8">
              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm h-full">
                {/* Banner */}
                <div className="w-full h-40 sm:h-48 md:h-64 overflow-hidden bg-gray-50">
                  <img
                      src={
                          spotlight?.spotlight_image_url ||
                          spotlight?.image_url ||
                          spotlight?.profile_image_url ||
                          '/default-spotlight.png'
                      }
                      alt={`${spotlight?.participant_name ?? 'Featured participant'} banner`}
                      className="w-full h-full object-cover block"
                      loading="eager"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/default-spotlight.png';
                      }}
                  />
                </div>

                {/* Content */}
                <div className="p-5 sm:p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[10px] sm:text-xs uppercase tracking-wider text-gray-500 mb-1">
                        Participant Spotlight
                      </div>
                      <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-black truncate">
                        {spotlight?.participant_name || 'Featured Challenger'}
                      </h2>
                      <p className="text-gray-700 mt-2 text-sm sm:text-base">
                        {spotlight?.challenge_name ? (
                            <>
                              Challenging themselves with <strong>{spotlight.challenge_name}</strong>
                              {spotlight?.unit ? (
                                  <> • Goal: <strong>{spotlight?.goal_amount ?? 0} {spotlight.unit}</strong></>
                              ) : null}
                            </>
                        ) : (
                            <>A featured campaign raising funds for psychiatric recovery access.</>
                        )}
                      </p>
                    </div>

                    <div className="flex w-full md:w-auto flex-col sm:flex-row gap-2 sm:gap-3">
                      <Link
                          to={spotlight ? `/participant/${spotlight.id}` : '/browse'}
                          className="inline-flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-bfrs-electric text-black font-semibold rounded-lg hover:bg-bfrs-electric-dark transition-colors"
                      >
                        View Campaign
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Link>
                      {spotlight?.every_org_url?.startsWith('http') && (
                          <a
                              href={spotlight.every_org_url as string}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-black text-bfrs-electric font-semibold rounded-lg hover:bg-gray-900 transition-colors"
                          >
                            Donate
                            <ArrowRight className="w-5 h-5 ml-2" />
                          </a>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-5">
                    <div className="rounded-xl border border-gray-200 p-3 sm:p-4">
                      <div className="text-xs text-gray-500">Raised</div>
                      <div className="text-lg sm:text-xl font-bold text-black">
                        ${Number(spotlight?.total_raised ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-3 sm:p-4">
                      <div className="text-xs text-gray-500">Donors</div>
                      <div className="text-lg sm:text-xl font-bold text-black">
                        {spotlight?.donor_count ?? 0}
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-3 sm:p-4">
                      <div className="text-xs text-gray-500">Progress</div>
                      <div className="text-lg sm:text-xl font-bold text-black">
                        {spotlight?.current_progress ?? 0}{spotlight?.unit ? ` ${spotlight.unit}` : ''}
                      </div>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-3 sm:p-4">
                      <div className="text-xs text-gray-500">Goal</div>
                      <div className="text-lg sm:text-xl font-bold text-black">
                        {spotlight?.goal_amount ?? 0}{spotlight?.unit ? ` ${spotlight.unit}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Right rail */}
            <aside className="col-span-12 lg:col-span-4">
              {/* Sticky only on lg+ so mobile scrolls naturally */}
              <div className="lg:sticky lg:top-[84px] space-y-6">
                {/* Support Pulse */}
                <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <header className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Metabolic Momentum</h3>
                      <p className="text-xs text-gray-500">Last 24 hours</p>
                    </div>
                    <div className="text-xs text-gray-500">{(pulse?.spark?.reduce((a,b)=>a+b,0) ?? 0)} events</div>
                  </header>

                  {/* Sparkline */}
                  <div className="px-3 pt-2">
                    {pulseLoading ? (
                        <div className="h-8 rounded bg-gray-100 animate-pulse" />
                    ) : pulse?.spark?.length ? (
                        <div className="text-bfrs-electric px-1">
                          <Sparkline data={pulse.spark} />
                        </div>
                    ) : (
                        <div className="text-xs text-gray-500 italic py-2">No activity yet</div>
                    )}
                  </div>

                  {/* Totals + CTAs */}
                  <div className="px-4 pb-4">
                    <div className="mt-2 text-sm text-gray-900 whitespace-nowrap overflow-hidden text-ellipsis">
                      <span className="font-semibold">{pulse?.pledges ?? 0}</span> pledges
                      <span className="mx-1.5 text-gray-300">•</span>
                      <span className="font-semibold">${(pulse?.raised ?? 0).toFixed(0)}</span> raised
                      <span className="mx-1.5 text-gray-300">•</span>
                      <span className="font-semibold">{pulse?.progress_units ?? 0}</span> units
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Link
                          to="/browse"
                          className="inline-flex items-center justify-center px-3 py-2 bg-bfrs-electric text-black text-sm font-semibold rounded-lg hover:bg-bfrs-electric-dark transition-colors"
                      >
                        Support
                      </Link>
                      <Link
                          to="/create-participant"
                          className="inline-flex items-center justify-center px-3 py-2 bg-black text-bfrs-electric text-sm font-semibold rounded-lg hover:bg-gray-900 transition-colors"
                      >
                        Start a challenge
                      </Link>
                    </div>
                  </div>
                </section>
              </div>
            </aside>
          </div>

          {/* Recent Activity */}
          <section className="mt-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <header className="px-4 sm:px-6 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Activity</h3>
                  <p className="text-xs text-gray-500">Live updates from across campaigns</p>
                </div>
              </header>
              <div className="p-2 sm:p-4">
                <RecentActivityFeed />
              </div>
            </div>
          </section>

          {/* Dual Actions */}
          <section className="grid md:grid-cols-2 gap-6 mt-8">
            <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 text-black shadow-sm">
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <Heart className="w-7 h-7 sm:w-8 sm:h-8 text-bfrs-electric" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-3 text-black">Support Amazing Challenges</h2>
                <p className="text-gray-700 mb-6">
                  Browse active campaigns and pledge support for people doing metabolic challenges to fund psychiatric recovery access.
                </p>
                <Link
                    to="/browse"
                    className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-bfrs-electric text-black font-bold text-base sm:text-lg rounded-lg hover:bg-bfrs-electric-dark transform hover:scale-[1.02] transition-all duration-200 shadow-sm sm:shadow-lg"
                >
                  <Search className="w-5 h-5 sm:w-6 sm:h-6 mr-3" />
                  Browse & Support
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
                <div className="mt-4 text-xs sm:text-sm text-gray-600">
                  Pledge per unit • One-time donations • Easy sharing
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 text-black shadow-sm">
              <div className="text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-7 h-7 sm:w-8 sm:h-8 text-bfrs-electric" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-3 text-black">Create Your Challenge</h2>
                <p className="text-gray-700 mb-6">
                  Turn your metabolic challenges into funds for psychiatric recovery support. Set your goal and get supporters!
                </p>
                <Link
                    to="/create-participant"
                    className="inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-black text-bfrs-electric font-bold text-base sm:text-lg rounded-lg hover:bg-gray-900 transform hover:scale-[1.02] transition-all duration-200 shadow-sm sm:shadow-lg"
                >
                  <Target className="w-5 h-5 sm:w-6 sm:h-6 mr-3" />
                  Start Your Campaign
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
                <div className="mt-4 text-xs sm:text-sm text-gray-600">
                  Choose challenge • Set goal • Get supporters
                </div>
              </div>
            </div>
          </section>

          {/* Welcome / How it works */}
          <section className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-gray-200 mt-8">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold mb-2 text-black">
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
          </section>

          {/* Stats */}
          <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-gray-200">
              <div className="flex items-center min-w-0">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-bfrs-electric" />
                </div>
                <div className="ml-4 min-w-0">
                  <h3 className="text-sm font-medium text-gray-500">Active Participants</h3>
                  <p className="text-2xl font-bold text-black">{totalActiveParticipants}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-gray-200">
              <div className="flex items-center min-w-0">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-bfrs-electric" />
                </div>
                <div className="ml-4 min-w-0">
                  <h3 className="text-sm font-medium text-gray-500">Total Raised</h3>
                  <p className="text-2xl font-bold text-black">${totalRaised.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 sm:p-6 shadow-sm border border-gray-200">
              <div className="flex items-center min-w-0">
                <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-6 h-6 text-bfrs-electric" />
                </div>
                <div className="ml-4 min-w-0">
                  <h3 className="text-sm font-medium text-gray-500">Challenge Categories</h3>
                  <p className="text-2xl font-bold text-black">6</p>
                </div>
              </div>
            </div>
          </section>

          {/* Email Reminders */}
          <section className="mt-8">
            <EmailReminderSettings />
          </section>

          {/* Active Fundraisers */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-200 mt-8">
            <div className="p-5 sm:p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-black">Active Fundraisers</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    People currently raising funds through metabolic challenges
                  </p>
                </div>
                <Link
                    to="/browse"
                    className="self-start sm:self-auto text-bfrs-electric hover:text-bfrs-electric-dark font-medium text-sm transition-colors"
                >
                  View All →
                </Link>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              {campaigns.length === 0 || totalActiveParticipants === 0 ? (
                  <div className="text-center py-10 sm:py-12">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-black mb-2">No active fundraisers yet</h3>
                    <p className="text-gray-500 mb-6">
                      Be the first to start a metabolic challenge and raise funds for psychiatric recovery support!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Link
                          to="/create-participant"
                          className="inline-flex items-center px-5 sm:px-6 py-3 bg-bfrs-electric text-black font-medium rounded-lg hover:bg-bfrs-electric-dark transition-colors"
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Create Your Campaign
                      </Link>
                      <Link
                          to="/browse"
                          className="inline-flex items-center px-5 sm:px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Search className="w-5 h-5 mr-2" />
                        Browse Campaigns
                      </Link>
                    </div>
                  </div>
              ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">
                      {totalActiveParticipants} people are actively fundraising
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
          </section>
        </main>
      </div>
  );
}
