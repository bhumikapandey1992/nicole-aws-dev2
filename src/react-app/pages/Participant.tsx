import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@getmocha/users-service/react';
import {
  ArrowLeft,
  Target,
  Users,
  DollarSign,
  Heart,
  MessageCircle,
  Share2,
  Plus,
  X
} from 'lucide-react';
import { createChallengeEndReminder, downloadICS } from '@/react-app/utils/calendarUtils';
import ImageUpload from '@/react-app/components/ImageUpload';
import ShareCampaign from '@/react-app/components/ShareCampaign';
import RecentActivityFeed from '@/react-app/components/RecentActivityFeed';
import FollowButton from '@/react-app/components/FollowButton';

interface ProgressEntry {
  id: number;
  units_completed: number;
  log_date: string;
  notes: string | null;
  created_at: string;
}

function ProgressDetails({
                           participantId,
                           refreshTrigger
                         }: {
  participantId: number;
  refreshTrigger?: number;
}) {
  const [progressEntries, setProgressEntries] = useState<ProgressEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgressEntries = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/wapi/progress/${participantId}`, {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (response.ok) {
        const data: ProgressEntry[] = await response.json();
        setProgressEntries(Array.isArray(data) ? data : []);
        setError(null);
      } else if (response.status === 404) {
        // Graceful fallback if the read endpoint isn't implemented yet
        setProgressEntries([]);
        setError(null);
      } else {
        setError('Failed to load progress details');
      }
    } catch (err) {
      console.error(err);
      setError('Error loading progress details');
    } finally {
      setLoading(false);
    }
  }, [participantId]);

  useEffect(() => {
    fetchProgressEntries();
  }, [participantId, refreshTrigger, fetchProgressEntries]);

  if (loading) {
    return <div className="text-center py-4 text-gray-500">Loading progress details...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-600">{error}</div>;
  }

  if (progressEntries.length === 0) {
    return <div className="text-center py-4 text-gray-500">No progress logged yet</div>;
  }

  return (
      <div className="space-y-3">
        {progressEntries.map((entry) => (
            <div key={entry.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex justify-between items-start mb-2">
                <div className="font-medium text-gray-900">{entry.units_completed} units completed</div>
                <div className="text-sm text-gray-500">{new Date(entry.log_date).toLocaleDateString()}</div>
              </div>
              {entry.notes && <div className="text-gray-700 text-sm mt-2">"{entry.notes}"</div>}
              <div className="text-xs text-gray-500 mt-1">
                Logged on {new Date(entry.created_at).toLocaleDateString()}
              </div>
            </div>
        ))}
      </div>
  );
}

interface ParticipantPost {
  id: number;
  participant_id: number;
  content: string;
  image_url: string | null;
  post_type: string;
  created_at: string;
  updated_at: string;
}

interface ParticipantData {
  id: number;
  campaign_id: number;
  user_id: string;
  challenge_type_id: number;
  goal_amount: number;
  current_progress: number;
  bio: string | null;
  profile_image_url: string | null;
  is_active: boolean;
  challenge_name: string;
  unit: string;
  original_challenge_name: string;
  original_unit: string;
  suggested_min: number | null;
  suggested_max: number | null;
  campaign_title: string;
  every_org_url: string | null;
  donor_count: number;
  total_raised: number;
  total_potential: number;
  posts: ParticipantPost[];
  participant_name: string | null;
  created_at: string;
  updated_at: string;
}

export default function Participant() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [participant, setParticipant] = useState<ParticipantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pledge form state
  const [showPledgeForm, setShowPledgeForm] = useState(false);
  const [showCalendarOption, setShowCalendarOption] = useState(false);
  const [pledgeForm, setPledgeForm] = useState({
    donor_name: '',
    donor_email: '',
    pledge_type: 'per_unit_uncapped' as 'per_unit_uncapped' | 'per_unit_capped' | 'flat_rate',
    amount_per_unit: '',
    max_total_amount: '',
    flat_amount: '',
    email_updates_opt_in: false
  });
  const [pledgeLoading, setPledgeLoading] = useState(false);

  // Progress form state (for participant owner)
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressForm, setProgressForm] = useState(() => {
    try {
      const today = new Date().toISOString().split('T')[0];
      return { units_completed: '', log_date: today, notes: '', selected_dates: [] as string[], image: null as File | null };
    } catch {
      return { units_completed: '', log_date: '2025-01-01', notes: '', selected_dates: [] as string[], image: null as File | null };
    }
  });
  const [progressLoading, setProgressLoading] = useState(false);

  // End campaign state
  const [showEndCampaignModal, setShowEndCampaignModal] = useState(false);
  const [endCampaignLoading, setEndCampaignLoading] = useState(false);

  // Progress refresh trigger
  const [progressRefreshTrigger, setProgressRefreshTrigger] = useState(0);

  // Share campaign modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSuccessShareModal, setShowSuccessShareModal] = useState(false);

  const fetchParticipant = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`/wapi/participants/${id}?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (!data.challenge_name || !data.unit || typeof data.goal_amount !== 'number') {
          console.error('Invalid participant data received:', data);
          setError('Invalid participant data received from server');
          return;
        }
        setParticipant(data);
        setError(null);
      } else if (response.status === 404) {
        setError('Participant not found');
      } else if (response.status >= 500) {
        setError('Server error loading participant. Please try refreshing the page.');
      } else {
        setError('Failed to load participant data');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || 'Unknown error');
      console.error('Error fetching participant:', { error: msg, participantId: id, timestamp: Date.now() });

      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Please check your internet connection and try again.');
      } else if (err instanceof TypeError && msg.includes('fetch')) {
        setError('Network connection error. Please check your internet and try again.');
      } else {
        setError('Failed to load participant. Please refresh the page.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch participant on id change
  useEffect(() => {
    fetchParticipant();
  }, [fetchParticipant]);

  // One-time handlers for URL params that depend on participant/user being loaded
  useEffect(() => {
    if (!participant) return;

    // Show "created" success modal
    if (searchParams.get('created') === 'true') {
      setShowSuccessShareModal(true);
      setSearchParams((prev) => {
        const np = new URLSearchParams(prev);
        np.delete('created');
        return np;
      });
    }

    // Handle action=progress if the current user owns the participant
    if (searchParams.get('action') === 'progress' && user?.id === participant.user_id) {
      try {
        const today = new Date().toISOString().split('T')[0];
        setProgressForm({ units_completed: '', log_date: today, notes: '', selected_dates: [], image: null });
        setShowProgressForm(true);
      } catch (e) {
        console.error('Error opening progress form from notification:', e);
      } finally {
        setSearchParams((prev) => {
          const np = new URLSearchParams(prev);
          np.delete('action');
          return np;
        });
      }
    }
  }, [participant, user?.id, searchParams, setSearchParams]);

  const handlePledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participant) return;

    const donorName = pledgeForm.donor_name.trim();
    const donorEmail = pledgeForm.donor_email.trim().toLowerCase();

    if (!donorName || donorName.length < 2) {
      alert('Please enter a valid name');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(donorEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    if (pledgeForm.pledge_type !== 'flat_rate') {
      const amountPerUnit = parseFloat(pledgeForm.amount_per_unit);
      if (isNaN(amountPerUnit) || amountPerUnit <= 0 || amountPerUnit > 10000) {
        alert('Please enter a valid per-unit amount between $0.01 and $10,000');
        return;
      }

      if (pledgeForm.pledge_type === 'per_unit_capped') {
        const maxTotal = parseFloat(pledgeForm.max_total_amount);
        if (isNaN(maxTotal) || maxTotal <= 0 || maxTotal > 100000) {
          alert('Please enter a valid maximum total between $0.01 and $100,000');
          return;
        }
        if (maxTotal < amountPerUnit) {
          alert('Maximum total must be at least equal to the per-unit amount');
          return;
        }
      }
    } else {
      const flatAmount = parseFloat(pledgeForm.flat_amount);
      if (isNaN(flatAmount) || flatAmount <= 0 || flatAmount > 100000) {
        alert('Please enter a valid donation amount between $0.01 and $100,000');
        return;
      }
    }

    setPledgeLoading(true);
    try {
      const response = await fetch('/wapi/pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          participant_id: participant.id,
          donor_name: donorName,
          donor_email: donorEmail,
          pledge_type: pledgeForm.pledge_type,
          amount_per_unit: pledgeForm.pledge_type !== 'flat_rate' ? parseFloat(pledgeForm.amount_per_unit) : undefined,
          max_total_amount: pledgeForm.pledge_type === 'per_unit_capped' ? parseFloat(pledgeForm.max_total_amount) : undefined,
          flat_amount: pledgeForm.pledge_type === 'flat_rate' ? parseFloat(pledgeForm.flat_amount) : undefined
        })
      });

      if (response.ok) {
        const result = await response.json();

        try {
          const perUnitLabel = (participant?.unit || 'unit').slice(0, -1) || (participant?.unit || 'unit');
          const pledgeTypeText =
              pledgeForm.pledge_type === 'flat_rate'
                  ? `$${pledgeForm.flat_amount} donation`
                  : pledgeForm.pledge_type === 'per_unit_capped'
                      ? `$${pledgeForm.amount_per_unit} per ${perUnitLabel} (up to $${pledgeForm.max_total_amount})`
                      : `$${pledgeForm.amount_per_unit} per ${perUnitLabel}`;

          const socialPostContent = `🎉 New Supporter! ${pledgeForm.donor_name} just pledged ${pledgeTypeText} to this ${participant?.challenge_name} challenge! Thank you for supporting psychiatric recovery access! 💪`;

          await fetch('/wapi/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              participant_id: participant.id,
              content: socialPostContent,
              post_type: 'pledge_announcement'
            })
          });
        } catch (socialError) {
          console.error('Failed to create social declaration post:', socialError);
        }

        setShowPledgeForm(false);
        setPledgeForm({
          donor_name: '',
          donor_email: '',
          pledge_type: 'per_unit_uncapped',
          amount_per_unit: '',
          max_total_amount: '',
          flat_amount: '',
          email_updates_opt_in: false
        });

        if (result.donor_id) {
          setShowCalendarOption(true);
        }

        fetchParticipant();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to create pledge:', errorData);
        alert(`Failed to create pledge: ${errorData.error || 'Please try again.'}`);
      }
    } catch (error) {
      console.error('Error creating pledge:', error);
      alert('Failed to create pledge. Please try again.');
    } finally {
      setPledgeLoading(false);
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participant) return;

    const unitsCompleted = parseInt(progressForm.units_completed);

    if (!unitsCompleted || unitsCompleted <= 0) {
      alert('Please enter a valid number of units completed');
      return;
    }

    if (!progressForm.log_date) {
      alert('Please select a date');
      return;
    }

    setProgressLoading(true);
    try {
      let imageUrl: string | null = null;

      if (progressForm.image) {
        const formData = new FormData();
        formData.append('image', progressForm.image);
        formData.append('participant_id', String(participant.id));

        try {
          const uploadResponse = await fetch('/wapi/upload-image', { method: 'POST', body: formData });
          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            imageUrl = uploadResult.url;
          } else {
            const errorText = await uploadResponse.text();
            alert(`Image upload failed: ${errorText}. Your progress will still be saved.`);
          }
        } catch (uploadError: unknown) {
          const errorMessage = uploadError instanceof Error ? uploadError.message : String(uploadError || 'Unknown error');
          alert(`Image upload error: ${errorMessage}. Your progress will still be saved.`);
        }
      }

      const response = await fetch('/wapi/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          participant_id: participant.id,
          units_completed: unitsCompleted,
          log_date: progressForm.log_date,
          notes: progressForm.notes.trim() || undefined,
          image_url: imageUrl || undefined
        })
      });

      if (response.ok) {
        const result = await response.json();

        setShowProgressForm(false);

        if (
            window.confirm(
                `Progress logged successfully! You completed ${unitsCompleted} ${participant.unit}.\n\nWould you like to share your progress update with supporters?`
            )
        ) {
          setShowShareModal(true);
        }
        setProgressForm({
          units_completed: '',
          log_date: new Date().toISOString().split('T')[0],
          notes: '',
          selected_dates: [],
          image: null
        });

        if (result.new_total_progress !== undefined) {
          setParticipant((prev) =>
              prev
                  ? {
                    ...prev,
                    current_progress: result.new_total_progress,
                    updated_at: new Date().toISOString()
                  }
                  : null
          );
        }

        setProgressRefreshTrigger((prev) => prev + 1);

        setTimeout(async () => {
          await fetchParticipant();
        }, 100);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to log progress: ${errorData.error || 'Please try again.'}`);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
      alert(`Error logging progress: ${errorMessage}. Please check your connection and try again.`);
    } finally {
      setProgressLoading(false);
    }
  };

  const handleEndCampaign = async () => {
    if (!participant) return;

    setEndCampaignLoading(true);
    try {
      const response = await fetch(`/wapi/participants/${participant.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        setShowEndCampaignModal(false);
        navigate(`/thank-you?campaign=${participant.id}`);
      } else {
        console.error('Failed to end campaign');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'Unknown error');
      console.error('Error ending campaign:', errorMessage);
    } finally {
      setEndCampaignLoading(false);
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-white">
          {/* Header */}
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center">
                <div className="flex items-center">
                  <img
                      src="https://mocha-cdn.com/019870bf-4695-74f8-b344-315629bf7f9f/BFRS_Logo_Square_Original.jpg"
                      alt="Brain Fog Recovery Source Logo"
                      className="w-10 h-10 rounded-lg mr-3"
                  />
                  <div>
                    <h1 className="text-2xl font-bold text-black">Brain Fog Recovery Source</h1>
                    <p className="text-gray-600">Loading Challenge...</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex items-center justify-center min-h-[60vh] px-4">
            <div className="text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 border-4 border-bfrs-200 border-t-bfrs-electric rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 w-16 h-16 rounded-full bg-bfrs-50 opacity-20 animate-pulse mx-auto"></div>
              </div>
              <h2 className="text-xl font-semibold text-black mb-2">Loading Challenge Data</h2>
              <p className="text-gray-600 mb-4">Please wait while we fetch the latest progress...</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md mx-auto">
                <p className="text-blue-800 text-sm">
                  <strong>Taking longer than expected?</strong> Try refreshing the page or check your internet connection.
                </p>
              </div>
            </div>
          </div>
        </div>
    );
  }

  if (error || !participant) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Not Found</h2>
            <p className="text-gray-600 mb-4">{error || 'This participant campaign does not exist.'}</p>
            <Link
                to="/dashboard"
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>
    );
  }

  const isOwner = user?.id === participant.user_id;
  const progressPercentage =
      participant?.current_progress && participant?.goal_amount
          ? Math.min((participant.current_progress / participant.goal_amount) * 100, 100)
          : 0;

  const handleCalendarReminder = () => {
    const reminderEvent = createChallengeEndReminder('This participant', participant.challenge_name, window.location.href);
    const filename = `${participant.challenge_name.toLowerCase().replace(/\s+/g, '-')}-reminder.ics`;
    downloadICS(reminderEvent, filename);
    setShowCalendarOption(false);
  };

  const handleCalendarOptOut = () => setShowCalendarOption(false);

  const shareToLinkedIn = (url: string, text: string) => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=400');
  };

  const shareToFacebook = (url: string) => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  // Helper: singularize unit for per-unit labels (fallback if slice would blank it)
  const unitSingular =
      (participant?.unit || 'unit').slice(0, -1) || (participant?.unit || 'unit');

  return (
      <div className="min-h-screen bg-white">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center">
              <button onClick={() => navigate(-1)} className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center">
                <img
                    src="https://mocha-cdn.com/019870bf-4695-74f8-b344-315629bf7f9f/BFRS_Logo_Square_Original.jpg"
                    alt="Brain Fog Recovery Source Logo"
                    className="w-10 h-10 rounded-lg mr-3"
                />
                <div className="flex items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-black">Brain Fog Recovery Source - Metabolic Challenges</h1>
                    <p className="text-gray-600">{participant.challenge_name} Challenge</p>
                  </div>
                  <div className="ml-4">
                    <FollowButton participantId={participant.id} className="ml-3" />
                  </div>

                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* PROMINENT PLEDGE SECTION */}
          {!isOwner && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-8 mb-8 text-gray-900 shadow-sm">
                <div className="text-center">
                  <div className="flex flex-col sm:flex-row items-center justify-center mb-6">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-bfrs-electric rounded-full flex items-center justify-center mb-4 sm:mb-0 sm:mr-4">
                      <Heart className="w-8 h-8 sm:w-12 sm:h-12 text-black" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-4xl font-bold mb-2 text-black">PLEDGE TO THIS CAMPAIGN!</h2>
                      <p className="text-gray-600 text-lg sm:text-xl">Support this amazing {participant.challenge_name} challenge!</p>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
                    <div className="grid md:grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-3xl font-bold">{participant.current_progress}</div>
                        <div className="text-gray-600">{participant.unit} completed</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold">{participant.goal_amount}</div>
                        <div className="text-gray-600">{participant.unit} goal</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold">
                          ${(Number(participant?.total_raised) || 0).toFixed(0)}
                        </div>
                        <div className="text-gray-600">raised so far</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-1 md:grid-cols-2 sm:gap-6 max-w-4xl mx-auto">
                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                      <div className="text-center mb-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
                          <Target className="w-6 h-6 sm:w-8 sm:h-8 text-bfrs-electric" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold mb-2 text-black">
                          Pledge Per {unitSingular}
                        </h3>
                        <p className="text-gray-600 text-sm">
                          Support them for every {unitSingular} they complete!
                        </p>
                      </div>
                      <button
                          onClick={() => setShowPledgeForm(true)}
                          className="w-full bg-bfrs-electric text-black px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-bfrs-electric-dark transition-colors shadow-sm"
                      >
                        Make a Pledge
                      </button>
                      <p className="text-gray-500 text-xs mt-3 text-center">
                        Choose your amount per {unitSingular} • Set a maximum if you want
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-4 sm:p-6 border border-gray-200">
                      <div className="text-center mb-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-3">
                          <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-bfrs-electric" />
                        </div>
                        <h3 className="text-xl sm:text-2xl font-bold mb-2 text-black">One-Time Donation</h3>
                        <p className="text-gray-600 text-sm">Make a direct donation to Brain Fog Recovery Source</p>
                      </div>
                      <button
                          onClick={() => {
                            const donationUrl =
                                'https://www.every.org/brain-fog-recovery-source?donateTo=brain-fog-recovery-source#/donate/card';
                            window.open(donationUrl, '_blank');
                          }}
                          className="w-full bg-bfrs-electric text-black px-4 sm:px-6 py-3 sm:py-4 rounded-xl font-bold text-base sm:text-lg hover:bg-bfrs-electric-dark transition-colors shadow-sm"
                      >
                        Donate Now
                      </button>
                      <p className="text-gray-500 text-xs mt-3 text-center">Direct donation via Every.org • Tax-deductible</p>
                    </div>
                  </div>

                  <div className="mt-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-gray-800 text-sm">
                      <strong>How Pledging Works:</strong> Choose an amount per {unitSingular} completed. You'll be notified
                      when the challenge ends to fulfill your pledge. All funds support psychiatric recovery access through
                      Brain Fog Recovery Source.
                    </p>
                  </div>
                </div>
              </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-8 text-gray-900 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold mb-2">{participant.challenge_name}</h2>
                    <p className="text-gray-600">
                      Goal: {participant.goal_amount} {participant.unit}
                    </p>
                    <p className="text-lg font-bold text-bfrs-electric mb-2">
                      {participant.participant_name || 'Unknown'}'s Challenge
                    </p>
                    {(participant.challenge_name !== participant.original_challenge_name ||
                        participant.unit !== participant.original_unit) && (
                        <p className="text-gray-500 text-sm mt-1">
                          Based on: {participant.original_challenge_name}
                          {participant.suggested_min != null && participant.suggested_max != null && (
                              <span>
                          {' '}
                                (suggested: {participant.suggested_min}-{participant.suggested_max} {participant.original_unit})
                        </span>
                          )}
                        </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold">{participant.current_progress}</div>
                    <div className="text-gray-600">completed</div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{Math.round(progressPercentage)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                        className="bg-bfrs-electric h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex space-x-6">
                    <div>
                      <div className="text-2xl font-bold">{participant?.donor_count || 0}</div>
                      <div className="text-gray-700 text-sm">Supporters</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        ${(Number(participant?.total_raised) || 0).toFixed(2)}
                      </div>
                      <div className="text-gray-700 text-sm">Raised So Far</div>
                      <div className="text-gray-600 text-xs">
                        ${(Number(participant?.total_potential) || 0).toFixed(2)} potential
                      </div>
                    </div>
                  </div>
                  {!isOwner && (
                      <div className="text-center">
                        <button
                            onClick={() => setShowPledgeForm(true)}
                            className="bg-bfrs-electric text-black px-8 py-4 rounded-lg font-bold text-lg hover:bg-bfrs-electric-dark transition-colors flex items-center mx-auto shadow-sm"
                        >
                          <Heart className="w-6 h-6 mr-2" />
                          Support This Challenge
                        </button>
                        <p className="text-gray-600 text-sm mt-2">
                          Pledge per unit completed or make a one-time donation
                        </p>
                      </div>
                  )}
                  {isOwner && (
                      <div className="flex space-x-3">
                        <button
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              setProgressForm({ units_completed: '', log_date: today, notes: '', selected_dates: [], image: null });
                              setShowProgressForm(true);
                            }}
                            className="bg-bfrs-electric text-black px-6 py-3 rounded-lg font-semibold hover:bg-bfrs-electric-dark transition-colors flex items-center"
                        >
                          <Plus className="w-5 h-5 mr-2" />
                          Log Progress
                        </button>
                        <button
                            onClick={() => setShowEndCampaignModal(true)}
                            className="bg-black text-white px-4 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors text-sm"
                        >
                          End Campaign
                        </button>
                      </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Updates</h3>
                </div>
                <div className="p-6">
                  {participant.posts.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">No updates yet</p>
                      </div>
                  ) : (
                      <div className="space-y-6">
                        {participant.posts.map((post) => (
                            <div key={post.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            {new Date(post.created_at).toLocaleDateString()}
                          </span>
                              </div>

                              <div className={`${post.image_url ? 'md:flex md:space-x-4' : ''}`}>
                                <div className={`${post.image_url ? 'md:flex-1' : ''}`}>
                                  <p className="text-gray-700 leading-relaxed">{post.content}</p>
                                </div>

                                {post.image_url && (
                                    <div className="mt-3 md:mt-0 md:flex-shrink-0">
                                      <img
                                          src={post.image_url}
                                          alt="Progress update"
                                          className="w-full md:w-48 h-auto rounded-lg border border-gray-200 shadow-sm object-cover"
                                          style={{ maxHeight: '300px' }}
                                      />
                                    </div>
                                )}
                              </div>
                            </div>
                        ))}
                      </div>
                  )}
                </div>
              </div>

              {participant.bio && (
                  <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">About This Fundraising Challenge</h3>
                    <p className="text-gray-600 leading-relaxed">{participant.bio}</p>
                  </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Progress Details</h3>
                </div>
                <div className="p-6">
                  <ProgressDetails participantId={participant.id} refreshTrigger={progressRefreshTrigger} />
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <Target className="w-8 h-8 text-black mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Progress</p>
                      <p className="text-xl font-bold text-black">
                        {participant?.current_progress || 0}/{participant?.goal_amount || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <Users className="w-8 h-8 text-black mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Supporters</p>
                      <p className="text-xl font-bold text-black">{participant.donor_count}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <DollarSign className="w-8 h-8 text-black mr-3" />
                    <div>
                      <p className="text-sm text-gray-500">Total Raised</p>
                      <p className="text-xl font-bold text-black">
                        ${(Number(participant.total_raised) || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Follow-scoped recent activity feed lives here (not inside ProgressDetails) */}
              <aside className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-3">Recent Activity</h4>
                <RecentActivityFeed participantId={String(participant.id)} />
              </aside>

              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-bfrs-electric rounded-full flex items-center justify-center mr-3">
                      <span className="text-lg">📅</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-black text-sm">Get notified when this challenge ends</h4>
                      <p className="text-gray-600 text-xs mt-0.5">Add a reminder to your calendar</p>
                    </div>
                  </div>
                  <button
                      onClick={handleCalendarReminder}
                      className="bg-bfrs-electric text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-bfrs-electric-dark transition-colors shadow-sm"
                  >
                    📅 Add to Calendar
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-black mb-4">
                  {isOwner ? 'Share Your Campaign' : 'Share This Campaign'}
                </h3>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => {
                          const progressUpdate = participant?.current_progress
                              ? ` I've completed ${participant.current_progress}/${participant.goal_amount} ${participant.unit} so far!`
                              : '';
                          const shareText = `I'm doing ${participant.goal_amount} ${participant.unit} of ${participant.challenge_name} to raise funds for psychiatric recovery access!${progressUpdate} Check out my progress and consider supporting.`;
                          shareToLinkedIn(window.location.href, shareText);
                        }}
                        className="bg-[#0077B5] text-white px-3 py-2.5 rounded-lg hover:bg-[#005885] transition-colors flex items-center justify-center text-sm font-medium"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                      </svg>
                      LinkedIn
                    </button>

                    <button
                        onClick={() => shareToFacebook(window.location.href)}
                        className="bg-[#1877F2] text-white px-3 py-2.5 rounded-lg hover:bg-[#166FE5] transition-colors flex items-center justify-center text-sm font-medium"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Facebook
                    </button>
                  </div>

                  <button
                      onClick={() => setShowShareModal(true)}
                      className="w-full bg-black text-bfrs-electric px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors font-semibold flex items-center justify-center"
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Get QR Code & More Options
                  </button>
                </div>

                <div className="mt-3 text-center">
                  <p className="text-sm text-gray-500">
                    {isOwner
                        ? 'Share directly to LinkedIn or Facebook, or get a QR code to print'
                        : 'Help spread the word about this challenge to your network'}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-semibold text-black mb-4">Campaign Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-500">Challenge</span>
                    <span className="text-black font-medium text-right">{participant?.challenge_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Unit</span>
                    <span className="text-black">{participant?.unit || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Started</span>
                    <span className="text-black">
                    {participant?.created_at ? new Date(participant.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status</span>
                    <span className="text-bfrs-electric font-medium">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modals */}
        {showPledgeForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-xl p-6 w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Make a Pledge</h3>
                  <button
                      type="button"
                      onClick={() => setShowPledgeForm(false)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-blue-700">
                    <strong>Choose your pledge type:</strong> Support this challenge with flexible donation options that
                    work for your budget.
                  </p>
                </div>
                <form onSubmit={handlePledgeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                    <input
                        type="text"
                        value={pledgeForm.donor_name}
                        onChange={(e) => setPledgeForm({ ...pledgeForm, donor_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        value={pledgeForm.donor_email}
                        onChange={(e) => setPledgeForm({ ...pledgeForm, donor_email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex items-center h-5">
                        <input
                            id="email-updates-opt-in"
                            type="checkbox"
                            checked={pledgeForm.email_updates_opt_in}
                            onChange={(e) => setPledgeForm({ ...pledgeForm, email_updates_opt_in: e.target.checked })}
                            className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 focus:ring-2"
                        />
                      </div>
                      <div className="text-sm">
                        <label htmlFor="email-updates-opt-in" className="font-medium text-blue-900 cursor-pointer">
                          Send me weekly updates about this campaign
                        </label>
                        <p className="text-blue-700 mt-1">Get weekly progress updates via email. You can unsubscribe anytime.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Pledge Type</label>
                    <div className="space-y-3">
                      <label className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="radio"
                            value="per_unit_uncapped"
                            checked={pledgeForm.pledge_type === 'per_unit_uncapped'}
                            onChange={(e) =>
                                setPledgeForm({ ...pledgeForm, pledge_type: e.target.value as 'per_unit_uncapped' | 'per_unit_capped' | 'flat_rate' })
                            }
                            className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">Per {unitSingular} (unlimited)</div>
                          <div className="text-sm text-gray-600">Pay for each {unitSingular} completed</div>
                        </div>
                      </label>

                      <label className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="radio"
                            value="per_unit_capped"
                            checked={pledgeForm.pledge_type === 'per_unit_capped'}
                            onChange={(e) =>
                                setPledgeForm({ ...pledgeForm, pledge_type: e.target.value as 'per_unit_uncapped' | 'per_unit_capped' | 'flat_rate' })
                            }
                            className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">Per {unitSingular} (capped)</div>
                          <div className="text-sm text-gray-600">Pay per {unitSingular} up to a maximum total</div>
                        </div>
                      </label>

                      <label className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                            type="radio"
                            value="flat_rate"
                            checked={pledgeForm.pledge_type === 'flat_rate'}
                            onChange={(e) =>
                                setPledgeForm({ ...pledgeForm, pledge_type: e.target.value as 'per_unit_uncapped' | 'per_unit_capped' | 'flat_rate' })
                            }
                            className="mt-1 mr-3"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">One-time donation</div>
                          <div className="text-sm text-gray-600">Fixed amount regardless of completion</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {(pledgeForm.pledge_type === 'per_unit_uncapped' || pledgeForm.pledge_type === 'per_unit_capped') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount per {unitSingular} completed</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500">$</span>
                          <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={pledgeForm.amount_per_unit}
                              onChange={(e) => setPledgeForm({ ...pledgeForm, amount_per_unit: e.target.value })}
                              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              required
                          />
                        </div>
                        {pledgeForm.pledge_type === 'per_unit_uncapped' && pledgeForm.amount_per_unit && participant && (
                            <p className="text-xs text-gray-600 mt-1">
                              Maximum possible: $
                              {((parseFloat(pledgeForm.amount_per_unit) || 0) * (participant?.goal_amount || 0)).toFixed(2)} if
                              they reach their full goal
                            </p>
                        )}
                      </div>
                  )}

                  {pledgeForm.pledge_type === 'per_unit_capped' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Maximum total you'll pay</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500">$</span>
                          <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={pledgeForm.max_total_amount}
                              onChange={(e) => setPledgeForm({ ...pledgeForm, max_total_amount: e.target.value })}
                              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              required
                          />
                        </div>
                        {pledgeForm.amount_per_unit && pledgeForm.max_total_amount && participant && (
                            <p className="text-xs text-gray-600 mt-1">
                              You'll pay ${pledgeForm.amount_per_unit} per {unitSingular} up to{' '}
                              {Math.floor(parseFloat(pledgeForm.max_total_amount) / parseFloat(pledgeForm.amount_per_unit))}{' '}
                              {participant?.unit || 'units'}
                            </p>
                        )}
                      </div>
                  )}

                  {pledgeForm.pledge_type === 'flat_rate' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Donation amount</label>
                        <p className="text-xs text-gray-600 mb-2">You'll pay this amount regardless of how much they complete</p>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-gray-500">$</span>
                          <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={pledgeForm.flat_amount}
                              onChange={(e) => setPledgeForm({ ...pledgeForm, flat_amount: e.target.value })}
                              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              required
                          />
                        </div>
                      </div>
                  )}
                  <div className="flex space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={() => setShowPledgeForm(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={pledgeLoading}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {pledgeLoading ? 'Creating...' : 'Make Pledge'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {showProgressForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-xl p-6 w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Update Your Progress</h3>
                  <button
                      type="button"
                      onClick={() => {
                        setShowProgressForm(false);
                        const today = new Date().toISOString().split('T')[0];
                        setProgressForm({ units_completed: '', log_date: today, notes: '', selected_dates: [], image: null });
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                  <p className="text-sm text-blue-700 font-medium">Challenge: {participant?.challenge_name || 'N/A'}</p>
                  <p className="text-sm text-gray-600">
                    Goal: {participant?.goal_amount || 0} {participant?.unit || 'units'}
                  </p>
                </div>
                <form onSubmit={handleProgressSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">When did you do this?</label>
                    <p className="text-sm text-gray-600 mb-2">Select any date you want - we don't restrict when you can log progress</p>
                    <input
                        type="date"
                        value={progressForm.log_date}
                        onChange={(e) => setProgressForm({ ...progressForm, log_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      How many {(participant?.unit || 'units').toLowerCase()} did you complete?
                    </label>
                    <input
                        type="number"
                        min="1"
                        value={progressForm.units_completed}
                        onChange={(e) => setProgressForm({ ...progressForm, units_completed: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder={`Enter number of ${(participant?.unit || 'units').toLowerCase()}`}
                        required
                    />
                    <p className="mt-1 text-sm text-gray-500">For: {participant?.challenge_name || 'Challenge'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">How did it go? (Optional)</label>
                    <textarea
                        value={progressForm.notes}
                        onChange={(e) => setProgressForm({ ...progressForm, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="Share how you felt, any challenges, or celebrate your progress..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Add Photo (Optional)</label>
                    <ImageUpload
                        onImageSelect={(file) => setProgressForm({ ...progressForm, image: file })}
                        onImageRemove={() => setProgressForm({ ...progressForm, image: null })}
                        selectedImage={progressForm.image}
                        className="w-full"
                    />
                  </div>
                  <div className="flex space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={() => {
                          setShowProgressForm(false);
                          const today = new Date().toISOString().split('T')[0];
                          setProgressForm({ units_completed: '', log_date: today, notes: '', selected_dates: [], image: null });
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={progressLoading || !progressForm.units_completed || !progressForm.log_date}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {progressLoading ? 'Saving...' : 'Update Progress'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {showCalendarOption && participant && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-xl p-6 w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
                <div className="text-center mb-6">
                  <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">📅</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Thank you for your pledge!</h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    Your support means a lot. Would you like a calendar reminder for when this challenge ends so you'll know
                    when to complete your donation?
                  </p>
                  <div className="bg-green-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-green-700">
                      <strong>We'll create a reminder</strong> for 30 days from now with a link back to this campaign and
                      your donation details.
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                      type="button"
                      onClick={handleCalendarOptOut}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    No Thanks
                  </button>
                  <button
                      onClick={handleCalendarReminder}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-sm"
                  >
                    📅 Yes, Add Reminder
                  </button>
                </div>

                <p className="text-xs text-gray-500 mt-3 text-center">
                  This downloads a calendar file that works with any calendar app (Google, Apple, Outlook, etc.)
                </p>
              </div>
            </div>
        )}

        {showShareModal && participant && (
            <ShareCampaign
                campaignUrl={window.location.href}
                campaignTitle={participant.campaign_title}
                challengeName={participant.challenge_name}
                onClose={() => setShowShareModal(false)}
                isModal={true}
            />
        )}

        {showSuccessShareModal && participant && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-xl p-6 w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Campaign Created! 🎉</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Your {participant.challenge_name} challenge is now live! Time to share it and get supporters.
                  </p>
                </div>

                <ShareCampaign
                    campaignUrl={window.location.href}
                    campaignTitle={participant.campaign_title}
                    challengeName={participant.challenge_name}
                    participantName="You are"
                    isModal={false}
                />

                <div className="mt-6 text-center">
                  <button
                      onClick={() => setShowSuccessShareModal(false)}
                      className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
        )}

        {showEndCampaignModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
              <div className="bg-white rounded-xl p-6 w-full max-w-md my-8 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-gray-900 mb-4">End Campaign</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to end this fundraising campaign? This will mark it as completed and allow you to
                  start a new campaign in the future. This action cannot be undone.
                </p>
                <div className="flex space-x-3">
                  <button
                      type="button"
                      onClick={() => setShowEndCampaignModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                      onClick={handleEndCampaign}
                      disabled={endCampaignLoading}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {endCampaignLoading ? 'Ending...' : 'End Campaign'}
                  </button>
                </div>
              </div>
            </div>
        )}
      </div>
  );
}
