import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router';
// useAuth removed - not needed for thank you page
import { CheckCircle, Heart, Users, DollarSign, Share2, Target } from 'lucide-react';

interface CampaignSummary {
  id: number;
  challenge_name: string;
  unit: string;
  goal_amount: number;
  current_progress: number;
  donor_count: number;
  total_raised: number;
  campaign_title: string;
  created_at: string;
}

export default function ThankYou() {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaign');
  
  const [summary, setSummary] = useState<CampaignSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaignSummary = useCallback(async () => {
    if (!campaignId) return;
    
    try {
      setError(null);
      const response = await fetch(`/wapi/participants/${campaignId}/summary`).catch(err => {
        console.error('Failed to fetch campaign summary:', err);
        throw new Error('Unable to load campaign summary');
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Campaign not found');
        }
        throw new Error(`Campaign summary API error: ${response.status}`);
      }
      
      const data = await response.json().catch(() => {
        throw new Error('Invalid campaign summary data format');
      });
      
      setSummary(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load campaign summary';
      console.error('Error fetching campaign summary:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (campaignId) {
      fetchCampaignSummary();
    } else {
      setLoading(false);
    }
  }, [campaignId, fetchCampaignSummary]);

  const handleShare = async () => {
    if (!summary) return;
    
    const shareData = {
      title: `I completed ${summary?.current_progress || 0} ${summary?.unit || 'units'} for ${summary?.campaign_title || 'Brain Fog Recovery Source'}!`,
      text: `I just finished my ${summary?.challenge_name || 'metabolic'} challenge and raised $${(summary?.total_raised || 0).toFixed(2)} for psychiatric recovery support through Brain Fog Recovery Source!`,
      url: window.location.origin
    };

    // Try Web Share API first (mobile/modern browsers)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or error occurred, fall back to clipboard
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed, falling back to clipboard:', err);
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      const textToShare = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
      await navigator.clipboard.writeText(textToShare);
      
      // Show feedback
      const shareButton = document.querySelector('.share-button-text');
      if (shareButton) {
        const originalText = shareButton.textContent;
        shareButton.textContent = 'Copied to Clipboard!';
        setTimeout(() => {
          shareButton.textContent = originalText;
        }, 2000);
      }
    } catch (err) {
      // Final fallback: show in prompt
      console.error('Clipboard failed, using prompt:', err);
      const textToShare = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
      prompt('Copy this text to share your achievement:', textToShare);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-bfrs-electric rounded-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="mx-auto w-20 h-20 bg-bfrs-electric rounded-full flex items-center justify-center mb-6 shadow-lg">
            <CheckCircle className="w-12 h-12 text-black" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-black mb-4">
            Congratulations! 🎉
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            You've successfully completed your metabolic challenge and made a real difference in supporting psychiatric recovery access.
          </p>
        </div>

        {/* Campaign Summary */}
        {summary && !error ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-200">
            <h2 className="text-2xl font-bold text-black mb-6 text-center">Your Challenge Summary</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Target className="w-8 h-8 text-bfrs-electric" />
                </div>
                <div className="text-3xl font-bold text-black">{summary.current_progress}</div>
                <div className="text-sm text-gray-600">{summary?.unit || 'units'} completed</div>
                <div className="text-xs text-gray-500 mt-1">
                  Goal: {summary?.goal_amount || 0} {summary?.unit || 'units'}
                </div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8 text-bfrs-electric" />
                </div>
                <div className="text-3xl font-bold text-black">{summary.donor_count}</div>
                <div className="text-sm text-gray-600">Supporters</div>
                <div className="text-xs text-gray-500 mt-1">Amazing people</div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-8 h-8 text-bfrs-electric" />
                </div>
                <div className="text-3xl font-bold text-black">${summary.total_raised.toFixed(2)}</div>
                <div className="text-sm text-gray-600">Raised</div>
                <div className="text-xs text-gray-500 mt-1">For recovery support</div>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Heart className="w-8 h-8 text-bfrs-electric" />
                </div>
                <div className="text-3xl font-bold text-black">
                  {Math.round(((summary?.current_progress || 0) / (summary?.goal_amount || 1)) * 100)}%
                </div>
                <div className="text-sm text-gray-600">Goal Achieved</div>
                <div className="text-xs text-gray-500 mt-1">{summary?.challenge_name || 'Challenge'}</div>
              </div>
            </div>

            <div className="bg-bfrs-electric rounded-xl p-6 text-center">
              <h3 className="text-xl font-bold text-black mb-2">Challenge: {summary?.challenge_name || 'Metabolic Challenge'}</h3>
              <p className="text-black">
                Your dedication to completing {summary?.current_progress || 0} {summary?.unit || 'units'} has directly contributed to funding access to metabolic education and support for psychiatric recovery through Brain Fog Recovery Source.
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 text-center border border-gray-200">
            <h2 className="text-2xl font-bold text-black mb-4">Challenge Completed!</h2>
            <p className="text-gray-600 mb-4">
              We couldn't load the specific details of your challenge, but your completion has been recorded and your fundraising campaign has ended successfully.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 text-center border border-gray-200">
            <h2 className="text-2xl font-bold text-black mb-4">Challenge Completed Successfully!</h2>
            <p className="text-gray-600">
              Your metabolic challenge fundraising campaign has ended. Thank you for your dedication to supporting psychiatric recovery access through Brain Fog Recovery Source.
            </p>
          </div>
        )}

        {/* Impact Statement */}
        <div className="bg-bfrs-electric rounded-2xl p-8 text-black mb-8">
          <h2 className="text-2xl font-bold mb-4 text-center">Your Impact</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Brain Health Support</h3>
              <p className="text-black">
                Your fundraising directly supports access to metabolic therapy education and resources for people seeking psychiatric recovery through ketogenic and other metabolic interventions.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Challenge Achievement</h3>
              <p className="text-black">
                By completing your metabolic challenge, you've demonstrated the power of metabolic health interventions while showing solidarity with those using these approaches for mental health recovery.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Share Achievement */}
          {summary && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-black mb-3">Share Your Achievement</h3>
              <p className="text-gray-600 mb-4 text-sm">
                Let others know about your successful challenge and inspire them to support psychiatric recovery access.
              </p>
              <button
                onClick={handleShare}
                className="w-full bg-bfrs-electric text-black px-4 py-3 rounded-lg hover:bg-bfrs-electric-dark transition-colors flex items-center justify-center font-medium"
              >
                <Share2 className="w-5 h-5 mr-2" />
                <span className="share-button-text">Share My Success</span>
              </button>
            </div>
          )}

          {/* Support Other Campaigns */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-black mb-3">Support Other Challenges</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Keep the momentum going by supporting other amazing metabolic challenges!
            </p>
            <Link
              to="/browse"
              className="w-full bg-bfrs-electric text-black px-4 py-3 rounded-lg hover:bg-bfrs-electric-dark transition-colors flex items-center justify-center font-medium"
            >
              <Heart className="w-5 h-5 mr-2" />
              Browse & Support
            </Link>
          </div>

          {/* Direct Donation */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-black mb-3">Make a Direct Donation</h3>
            <p className="text-gray-600 mb-4 text-sm">
              Make an immediate tax-deductible donation to Brain Fog Recovery Source.
            </p>
            <a
              href="https://www.every.org/brain-fog-recovery-source?donateTo=brain-fog-recovery-source#/donate/card"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-black text-bfrs-electric px-4 py-3 rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center font-medium"
            >
              <DollarSign className="w-5 h-5 mr-2" />
              Donate Now
            </a>
          </div>
        </div>

        {/* Create New Campaign */}
        <div className="bg-bfrs-electric rounded-2xl p-8 text-center mb-8">
          <h2 className="text-2xl font-bold text-black mb-4">Ready for Another Challenge?</h2>
          <p className="text-black mb-6">
            Create a new metabolic challenge campaign and inspire more supporters!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/dashboard"
              className="bg-black text-bfrs-electric px-6 py-3 rounded-lg font-bold hover:bg-gray-900 transition-colors flex items-center justify-center"
            >
              <Target className="w-5 h-5 mr-2" />
              Create New Campaign
            </Link>
            <Link
              to="/dashboard"
              className="bg-white text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center border border-gray-300"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Donation Fulfillment Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Pledge Fulfillment</h3>
          <p className="text-blue-800 text-sm">
            Your supporters have been notified that your challenge is complete. They'll receive information about fulfilling their pledges to Brain Fog Recovery Source to complete the fundraising process.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="https://mocha-cdn.com/019870bf-4695-74f8-b344-315629bf7f9f/BFRS_Logo_Square_Original.jpg" 
              alt="Brain Fog Recovery Source Logo" 
              className="w-12 h-12 rounded-lg mr-3"
            />
            <div>
              <h3 className="text-xl font-bold text-black">Brain Fog Recovery Source</h3>
              <p className="text-gray-600 text-sm">Removing barriers, reclaiming lives</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm">
            Thank you for being part of the metabolic psychiatry movement and supporting access to life-changing education and support.
          </p>
        </div>
      </div>
    </div>
  );
}
