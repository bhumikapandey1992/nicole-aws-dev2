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
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Mail className="w-6 h-6 text-bfrs-electric mr-3" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Email Reminders</h3>
            <p className="text-sm text-gray-600">Manage your weekly email reminder preferences</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <X className="w-4 h-4 text-red-600 mr-2" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <Check className="w-4 h-4 text-green-600 mr-2" />
            <p className="text-green-800 text-sm">{success}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Challenge Reminders */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Weekly Challenge Reminders</h4>
            <p className="text-sm text-gray-600">Get reminded via email to update your progress on your active challenges</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.email_challenge_reminders}
              onChange={(e) => handlePreferenceChange('email_challenge_reminders', e.target.checked)}
              disabled={updating}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bfrs-electric/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bfrs-electric"></div>
          </label>
        </div>

        {/* Donor Updates */}
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Weekly Donor Updates</h4>
            <p className="text-sm text-gray-600">Get updates via email on campaigns you've pledged to support</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={preferences.email_donor_updates}
              onChange={(e) => handlePreferenceChange('email_donor_updates', e.target.checked)}
              disabled={updating}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bfrs-electric/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bfrs-electric"></div>
          </label>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500">
              <Mail className="w-4 h-4 mr-2" />
              <span>Weekly emails are sent every Monday at 9 AM. You can unsubscribe anytime.</span>
            </div>
            <button
              onClick={handleTestEmail}
              disabled={testingEmail || !preferences.email_challenge_reminders}
              className="flex items-center px-4 py-2 bg-bfrs-electric text-black text-sm font-medium rounded-lg hover:bg-bfrs-electric-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Test Email
                </>
              )}
            </button>
          </div>
          {!preferences.email_challenge_reminders && (
            <p className="text-xs text-orange-600 mt-2">
              Enable challenge reminders above to test the email functionality
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
