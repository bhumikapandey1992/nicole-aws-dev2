import { useState, useEffect } from 'react';
import { Copy, Download, Share2, Check, QrCode, X } from 'lucide-react';
import { generateQRCode, downloadQRCode, copyToClipboard } from '@/react-app/utils/qrUtils';

interface ShareCampaignProps {
  campaignUrl: string;
  campaignTitle: string;
  challengeName: string;
  participantName?: string;
  onClose?: () => void;
  isModal?: boolean;
}

export default function ShareCampaign({
  campaignUrl,
  campaignTitle,
  challengeName,
  participantName,
  onClose,
  isModal = false
}: ShareCampaignProps) {
  const [qrCodeDataURL, setQRCodeDataURL] = useState<string>('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrDownloaded, setQRDownloaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const shareText = `${participantName ? `${participantName} is doing` : 'Check out'} a ${challengeName} challenge for ${campaignTitle}! Support this fundraiser for psychiatric recovery access through Brain Fog Recovery Source.`;

  useEffect(() => {
    generateQRCodeForCampaign();
  }, [campaignUrl]);

  const generateQRCodeForCampaign = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const qrCode = await generateQRCode(campaignUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      
      setQRCodeDataURL(qrCode);
    } catch (err) {
      console.error('Error generating QR code:', err);
      setError('Failed to generate QR code. You can still copy the link below.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(campaignUrl);
    if (success) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (qrCodeDataURL) {
      const filename = `${challengeName.toLowerCase().replace(/\s+/g, '-')}-campaign-qr.png`;
      downloadQRCode(qrCodeDataURL, filename);
      setQRDownloaded(true);
      setTimeout(() => setQRDownloaded(false), 2000);
    }
  };

  const shareToLinkedIn = (url: string, text: string) => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
    window.open(linkedInUrl, '_blank', 'width=600,height=400');
  };

  const shareToFacebook = (url: string) => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: campaignTitle,
      text: shareText,
      url: campaignUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed, fallback to copy
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      // Fallback to copy link
      handleCopyLink();
    }
  };

  const content = (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-bfrs-100 to-bfrs-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <Share2 className="w-8 h-8 text-bfrs-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Share Your Campaign and Progress</h3>
        <p className="text-gray-600 text-sm">
          Spread the word about your progress and fundraising challenge to get more supporters!
        </p>
      </div>

      {/* QR Code Section */}
      <div className="bg-gray-50 rounded-xl p-6 text-center">
        <h4 className="font-semibold text-gray-900 mb-3 flex items-center justify-center">
          <QrCode className="w-5 h-5 mr-2" />
          QR Code
        </h4>
        
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-bfrs-200 border-t-bfrs-600 rounded-full"></div>
          </div>
        )}
        
        {error && (
          <div className="py-8 text-red-600 text-sm">
            {error}
          </div>
        )}
        
        {qrCodeDataURL && !loading && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg inline-block shadow-sm border">
              <img 
                src={qrCodeDataURL} 
                alt="Campaign QR Code" 
                className="w-48 h-48 mx-auto"
              />
            </div>
            <button
              onClick={handleDownloadQR}
              className="bg-bfrs-600 text-black px-4 py-2 rounded-lg hover:bg-bfrs-700 transition-colors flex items-center mx-auto text-sm font-medium"
            >
              {qrDownloaded ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Downloaded!
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </>
              )}
            </button>
            <p className="text-xs text-gray-500">
              People can scan this with their phone camera to visit your campaign
            </p>
          </div>
        )}
      </div>

      {/* Link Section */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h4 className="font-semibold text-gray-900 mb-3">Campaign Link</h4>
        <div className="flex items-center space-x-2 mb-3">
          <input
            type="text"
            value={campaignUrl}
            readOnly
            className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono text-gray-700"
          />
          <button
            onClick={handleCopyLink}
            className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center text-sm"
          >
            {linkCopied ? (
              <>
                <Check className="w-4 h-4 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Share this link on social media, email, or text messages
        </p>
      </div>

      {/* Social Media Share Buttons */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => shareToLinkedIn(campaignUrl, shareText)}
            className="bg-[#0077B5] text-white px-4 py-3 rounded-lg hover:bg-[#005885] transition-colors flex items-center justify-center font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            LinkedIn
          </button>
          
          <button
            onClick={() => shareToFacebook(campaignUrl)}
            className="bg-[#1877F2] text-white px-4 py-3 rounded-lg hover:bg-[#166FE5] transition-colors flex items-center justify-center font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </button>
        </div>
        
        <button
          onClick={handleNativeShare}
          className="w-full bg-gradient-to-r from-bfrs-600 to-bfrs-500 text-black px-6 py-3 rounded-lg hover:from-bfrs-700 hover:to-bfrs-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center"
        >
          <Share2 className="w-5 h-5 mr-2" />
          More Sharing Options
        </button>
        <p className="text-xs text-gray-500 text-center">
          LinkedIn and Facebook for maximum reach, or use your device's share menu
        </p>
      </div>

      {/* Sample Share Text Preview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h5 className="font-medium text-blue-900 mb-2">Preview of share message:</h5>
        <p className="text-blue-800 text-sm italic">"{shareText}"</p>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">Share Your Campaign</h3>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {content}
    </div>
  );
}
