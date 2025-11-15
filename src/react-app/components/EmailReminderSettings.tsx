import { useState, useEffect } from 'react';
import { Mail, Check, X, Loader2 } from 'lucide-react';

export interface EmailReminderPreferences {
  email_challenge_reminders: boolean;
  email_donor_updates: boolean;
}

export default function EmailReminderSettings() {
  const [preferences, setPreferences] = useState<EmailReminderPreferences>({
    email_challenge_reminders: false,
    email_donor_updates: false
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testingEmail, setTestingEmail] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/wapi/user-notification-preferences');
      if (response.ok) {
        const data = await response.json();
        setPreferences({
          email_challenge_reminders: data.email_challenge_reminders || false,
          email_donor_updates: data.email_donor_updates || false
        });
      }
    } catch (err) {
      console.error('Failed to load email preferences:', err);
      setError('Failed to load email preferences');
    } finally {
      setLoading(false);
    }
  };

  const handlePreferenceChange = async (key: keyof EmailReminderPreferences, value: boolean) => {
    setUpdating(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/wapi/user-notification-preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });

      if (response.ok) {
        setPreferences(prev => ({ ...prev, [key]: value }));
        setSuccess('Email preferences updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to update email preferences');
      }
    } catch (err) {
      setError('Error updating email preferences');
    } finally {
      setUpdating(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch('/wapi/test-my-email-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`Test email sent successfully! Check your inbox (${result.recipient}) for the test reminder.`);
        setTimeout(() => setSuccess(null), 8000);
      } else {
        setError(result.error || 'Failed to send test email');
      }
    } catch (err) {
      setError('Error sending test email');
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-bfrs-electric" />
          <span className="ml-2 text-gray-600">Loading email settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
      <div className="flex items-center mb-5 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-bfrs-electric/10 rounded-lg flex items-center justify-center flex-shrink-0 mr-3 sm:mr-4">
          <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-bfrs-electric" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">Email Reminders</h3>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Manage your weekly email reminder preferences</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-red-50 border-2 border-red-200 rounded-lg">
          <div className="flex items-start gap-2 sm:gap-3">
            <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-xs sm:text-sm leading-relaxed flex-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 sm:mb-5 p-3 sm:p-4 bg-green-50 border-2 border-green-200 rounded-lg">
          <div className="flex items-start gap-2 sm:gap-3">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800 text-xs sm:text-sm leading-relaxed flex-1">{success}</p>
          </div>
        </div>
      )}

      <div className="space-y-4 sm:space-y-6">
        {/* Challenge Reminders */}
        <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gray-50 border-2 border-gray-200 rounded-lg hover:border-bfrs-electric/50 transition-colors">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1.5 sm:mb-2">Weekly Challenge Reminders</h4>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">Get reminded via email to update your progress on your active challenges</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={preferences.email_challenge_reminders}
              onChange={(e) => handlePreferenceChange('email_challenge_reminders', e.target.checked)}
              disabled={updating}
              className="sr-only peer"
            />
            <div className="w-12 h-7 sm:w-14 sm:h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bfrs-electric/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border-2 after:rounded-full after:h-6 after:w-6 sm:after:h-7 sm:after:w-7 after:transition-all peer-checked:bg-bfrs-electric shadow-inner"></div>
          </label>
        </div>

        {/* Donor Updates */}
        <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gray-50 border-2 border-gray-200 rounded-lg hover:border-bfrs-electric/50 transition-colors">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1.5 sm:mb-2">Weekly Donor Updates</h4>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">Get updates via email on campaigns you've pledged to support</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={preferences.email_donor_updates}
              onChange={(e) => handlePreferenceChange('email_donor_updates', e.target.checked)}
              disabled={updating}
              className="sr-only peer"
            />
            <div className="w-12 h-7 sm:w-14 sm:h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bfrs-electric/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border-2 after:rounded-full after:h-6 after:w-6 sm:after:h-7 sm:after:w-7 after:transition-all peer-checked:bg-bfrs-electric shadow-inner"></div>
          </label>
        </div>

        <div className="pt-4 sm:pt-5 border-t-2 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-500">
              <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">Weekly emails are sent every Monday at 9 AM. You can unsubscribe anytime.</span>
            </div>
            <button
              onClick={handleTestEmail}
              disabled={testingEmail || !preferences.email_challenge_reminders}
              className="flex items-center justify-center px-4 sm:px-5 py-2.5 sm:py-3 bg-bfrs-electric text-black text-sm sm:text-base font-semibold rounded-lg hover:bg-bfrs-electric-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm whitespace-nowrap"
            >
              {testingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span>Send Test Email</span>
                </>
              )}
            </button>
          </div>
          {!preferences.email_challenge_reminders && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs sm:text-sm text-orange-700 flex items-start gap-1.5">
                <svg className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Enable challenge reminders above to test the email functionality</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
