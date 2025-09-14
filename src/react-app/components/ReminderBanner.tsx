import { useState, useEffect } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { X, Target, Heart } from 'lucide-react';
import { Link } from 'react-router';

interface BannerData {
  type: 'participant' | 'donor';
  message: string;
  actionText: string;
  actionUrl: string;
  participantId?: number;
}

export default function ReminderBanner() {
  const { user } = useAuth();
  const [bannerData, setBannerData] = useState<BannerData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (user) {
      checkForReminders();
    }
  }, [user]);

  const checkForReminders = async () => {
    try {
      const response = await fetch('/wapi/reminder-check');
      if (response.ok) {
        const data = await response.json();
        if (data.showReminder) {
          setBannerData(data);
          setVisible(true);
        }
      }
    } catch (error) {
      console.error('Failed to check for reminders:', error);
    }
  };

  const dismissBanner = async () => {
    try {
      await fetch('/wapi/dismiss-banner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      setVisible(false);
    } catch (error) {
      console.error('Failed to dismiss banner:', error);
      // Still hide the banner locally even if the API call fails
      setVisible(false);
    }
  };

  const handleActionClick = () => {
    // Hide banner when action is taken - it won't reappear for 7 days due to dismissal
    setVisible(false);
    dismissBanner();
  };

  if (!visible || !bannerData) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-bfrs-electric to-bfrs-electric-light border-b border-bfrs-electric-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            {bannerData.type === 'participant' ? (
              <Target className="w-5 h-5 text-black" />
            ) : (
              <Heart className="w-5 h-5 text-black" />
            )}
            <p className="text-black font-medium">{bannerData.message}</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Link
              to={bannerData.actionUrl}
              className="bg-black text-bfrs-electric px-4 py-2 rounded-lg font-semibold hover:bg-gray-800 transition-colors text-sm"
              onClick={handleActionClick}
            >
              {bannerData.actionText}
            </Link>
            <button
              onClick={dismissBanner}
              className="p-1 text-black hover:text-gray-700 transition-colors"
              title="Dismiss reminder"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
