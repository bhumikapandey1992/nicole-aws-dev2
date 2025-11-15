import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@getmocha/users-service/react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Plus, Snowflake, Activity, Clock, Salad, Brain, Sun, Zap, Moon } from 'lucide-react';
import { Link } from 'react-router';
import { safeStringify } from '@/react-app/utils/errorHandling';

const CANON_ORDER = [
  "Exercise & Movement",
  "Meal Timing",
  "Light & Circadian",
  "Low Carb & Ketogenic",
  "Meditation & Mindfulness",
  "Sleep Optimization",
  "Heat or Cold Exposure"
];

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  "Exercise & Movement": ["exercise & movement","physical activity","exercise","movement"],
  "Meal Timing": ["meal timing","intermittent fasting","eating window","restricted eating window","time restricted"],
  "Light & Circadian": ["light & circadian","light exposure","circadian","light and circadian"],
  "Low Carb & Ketogenic": ["low carb & ketogenic","ketogenic nutrition","low carb and ketogenic","low carb","ketogenic"],
  "Meditation & Mindfulness": ["meditation & mindfulness","mindfulness & recovery","mindfulness","meditation"],
  "Sleep Optimization": ["sleep optimization","sleep","sleep health","sleep recovery"],
  "Heat or Cold Exposure": ["cold exposure","heat exposure","sauna","cold","heat"]
};

const ALLOWED_TYPES: Record<string, Record<string, string[]>> = {
  "Exercise & Movement": {
    "Walking": ["miles","km","days"],
    "Running": ["miles","km","days"],
    "Kettlebells": ["swings","days"],
    "Bodyweight": ["reps","days"],
    "Dancing": ["minutes","days"],
    "Yoga": ["minutes","days"],
    "Custom": ["days"]
  },
  "Meal Timing": {
    "Intermittent Fasting": ["days"],
    "Restricted Eating Window": ["days"],
    "Custom": ["days"]
  },
  "Light & Circadian": {
    "Natural Light Exposure": ["minutes","days"],
    "Blue Light Blocking Glasses": ["days"],
    "Red Light Therapy": ["minutes","days"],
    "Custom": ["days"]
  },
  "Low Carb & Ketogenic": {
    "Ketogenic Nutrition": ["meals","days"],
    "Low Carb Eating": ["meals","days"],
    "Nutritional Ketosis": ["days"],
    "Custom": ["days"]
  },
  "Meditation & Mindfulness": {
    "Guided Meditation": ["sessions","days"],
    "Gratitude Journaling": ["days"],
    "Body Scan Meditation": ["sessions","days"],
    "Custom": ["days"]
  },
  "Sleep Optimization": {
    "Red Light Glasses 2 hours before bed": ["days"],
    "Stop Eating 3 hours before sleep": ["days"],
    "20 minute walk after dinner": ["days"],
    "Custom": ["days"]
  },
  "Heat or Cold Exposure": {
    "Ice Baths": ["days"],
    "Cold Showers": ["days"],
    "Outdoor Cold Exposure": ["days"],
    "Sauna": ["days"],
    "Custom": ["days"]
  }
};

const norm = (s: string) => s.toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g," ").trim();
const isDistanceUnit = (u: string | null) => u === 'miles' || u === 'km';

interface ChallengeCategory {
  id: number;
  name: string;
  icon: string;
  description: string;
}

interface ChallengeType {
  id: number | null;
  category_id?: number;
  name: string;
  unit: string;
  suggested_min: number | null;
  suggested_max: number | null;
  is_custom?: boolean;
}

interface Campaign {
  id: number;
  title: string;
  description: string;
  status: string;
}

function getUnitsFor(canonical: string | undefined, name: string | undefined): string[] {
  if (!canonical || !name) return [];
  const list = ALLOWED_TYPES[canonical] || {};
  return list[name] || list["Custom"] || [];
}

function unitPrefKey(userId: string | number | undefined, canonical: string, name: string) {
  const uid = userId != null ? String(userId) : "anon";
  return `unitPref:${uid}:${canonical}:${name}`;
}

function isValidGoal(unit: string | null, value: string): boolean {
  if (!unit) return false;
  const s = value.trim();
  if (!s) return false;
  return isDistanceUnit(unit)
      ? /^\d+(\.\d{1,2})?$/.test(s)   // allow decimals for miles/km
      : /^\d+$/.test(s);              // whole numbers for other units
}

function validateParticipantName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Enter your name.";
  if (trimmed.length < 2 || trimmed.length > 80) return "Enter your name.";
  return null;
}

export default function CreateParticipant() {
  const { user, isPending } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<ChallengeCategory[]>([]);
  const [challengeTypes, setChallengeTypes] = useState<ChallengeType[]>([]);
  const [, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedChallengeType, setSelectedChallengeType] = useState<number | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [goalAmount, setGoalAmount] = useState('');
  const [bio, setBio] = useState('');
  const [customChallengeName, setCustomChallengeName] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [healthConfirmed, setHealthConfirmed] = useState<boolean>(false);
  const [emailRemindersOptIn, setEmailRemindersOptIn] = useState<boolean>(false);
  const [emailDonorUpdates, setEmailDonorUpdates] = useState<boolean>(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [pendingTypeName, setPendingTypeName] = useState<string | null>(null);

  // Ref guard to prevent double fetching in StrictMode
  const didLoad = useRef(false);
  const aggregateIdsRef = useRef<Record<number, number[]>>({});
  const idToCanonicalRef = useRef<Record<number, string>>({});
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [unitOptions, setUnitOptions] = useState<string[]>([]);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    console.log('Auth state changed:', { user: !!user, isPending, userEmail: user?.email });
    if (user && !didLoad.current) {
      didLoad.current = true;
      fetchData();

      // Prefill participant name with user's display name if available and name is empty
      if (!participantName && user.google_user_data?.given_name) {
        setParticipantName(user.google_user_data.given_name);
      }
    } else if (!isPending && !user) {
      // Auth resolved but no user - redirect to Google with state param
      console.log('No user and auth not pending - redirecting to Google OAuth with state');
      window.location.href = '/wapi/oauth/google/redirect_url?state=' + encodeURIComponent(JSON.stringify({ redirect: '/create-participant' }));
    }
  }, [user, isPending, participantName]);

  const fetchData = async () => {
    try {
      setError(null);
      console.log('Starting to fetch data... (single fetch per mount)');

      // Fetch all data in parallel
      const [categoriesRes, campaignsRes] = await Promise.all([
        fetch('/wapi/challenge-categories').catch(err => {
          console.error('Failed to fetch categories:', err);
          throw new Error('Unable to load challenge categories');
        }),
        fetch('/wapi/campaigns').catch(err => {
          console.error('Failed to fetch campaigns:', err);
          throw new Error('Unable to load campaigns');
        })
      ]);

      console.log('API responses received:', {
        categoriesOk: categoriesRes.ok,
        categoriesStatus: categoriesRes.status,
        campaignsOk: campaignsRes.ok,
        campaignsStatus: campaignsRes.status
      });

      if (!categoriesRes.ok) {
        throw new Error(`Categories API error: ${categoriesRes.status}`);
      }
      if (!campaignsRes.ok) {
        throw new Error(`Campaigns API error: ${campaignsRes.status}`);
      }

      const [categoriesData, campaignsData] = await Promise.all([
        categoriesRes.json().catch(() => {
          throw new Error('Invalid categories data format');
        }),
        campaignsRes.json().catch(() => {
          throw new Error('Invalid campaigns data format');
        })
      ]);

      // Build canonical category list
      const raw = Array.isArray(categoriesData) ? categoriesData : [];
      const byNormName = new Map<string, any>();
      raw.forEach(r => byNormName.set(norm(r.name), r));

      const finalCats: any[] = [];
      aggregateIdsRef.current = {};
      idToCanonicalRef.current = {};

      for (const label of CANON_ORDER) {
        const syns = CATEGORY_SYNONYMS[label] || [];
        const match = syns.map(norm).map(k => byNormName.get(k)).find(Boolean);
        if (!match) continue;

        if (label === "Heat or Cold Exposure") {
          const cold = byNormName.get(norm("cold exposure"));
          const heat = byNormName.get(norm("heat exposure"));
          const visible = cold || heat || match;
          const realIds: number[] = [];
          if (cold) realIds.push(cold.id);
          if (heat) realIds.push(heat.id);
          if (realIds.length === 0) realIds.push(visible.id);
          aggregateIdsRef.current[visible.id] = realIds;
          idToCanonicalRef.current[visible.id] = label;
          finalCats.push({ ...visible, name: label });
        } else {
          idToCanonicalRef.current[match.id] = label;
          finalCats.push({ ...match, name: label });
        }
      }

      setCategories(finalCats);

      setCampaigns(Array.isArray(campaignsData) ? campaignsData : []);

      // Auto-select the first campaign if available
      if (campaignsData.length > 0) {
        setSelectedCampaign(campaignsData[0].id);
      }
    } catch (err) {
      const errorMessage = safeStringify(err) || 'Failed to load data';
      console.error('Error fetching data - message:', errorMessage);
      console.error('Error fetching data - details:', {
        error: err,
        errorType: typeof err,
        errorName: err instanceof Error ? err.name : 'unknown'
      });
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchChallengeTypes = async (categoryId: number) => {
    try {
      setError(null);

      const canonical = idToCanonicalRef.current[categoryId];
      if (!canonical) { setChallengeTypes([]); return; }

      const ids = aggregateIdsRef.current[categoryId] || [categoryId];
      const results: any[] = [];

      for (const id of ids) {
        const resp = await fetch(`/wapi/challenge-types/${id}`);
        if (!resp.ok) throw new Error(`Challenge types API error: ${resp.status}`);
        const data = await resp.json();
        if (Array.isArray(data)) results.push(...data);
      }

      const seen = new Map<string, any>();
      for (const t of results) {
        const k = norm(t.name);
        if (!seen.has(k)) seen.set(k, t);
      }

      const allow = ALLOWED_TYPES[canonical];
      const final: any[] = [];

      Object.keys(allow).forEach(name => {
        const k = norm(name);
        const found = seen.get(k);
        if (found) {
          final.push(found);
        } else {
          final.push({ id: null, name, unit: allow[name][0], is_custom: true });
        }
      });

      const firstName = final[0]?.name;
      setUnitOptions(firstName ? allow[firstName] : []);
      setSelectedUnit(firstName ? allow[firstName][0] : null);

      setChallengeTypes(final);

    } catch (err) {
      const errorMessage = safeStringify(err) || 'Failed to load challenge types';
      setError(errorMessage);
      setChallengeTypes([]);
    }
  };

  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategory(categoryId);
    setSelectedChallengeType(null);
    setShowCustom(false);
    setCustomChallengeName("");
    setUnitOptions([]);
    setSelectedUnit(null);
    setError(null);
    fetchChallengeTypes(categoryId);
  };

  const handleChallengeTypeSelect = (id: number | null, name: string) => {
    const canonical = idToCanonicalRef.current[selectedCategory!];
    const units = getUnitsFor(canonical, name);

    if (id !== null) {
      // Built-in type
      setShowCustom(false);
      setSelectedChallengeType(id);
      setPendingTypeName(null);
      setCustomChallengeName("");
    } else if (name === "Custom") {
      // True custom type
      setShowCustom(true);
      setSelectedChallengeType(null);
      setPendingTypeName(null);
      setCustomChallengeName("Custom");
    } else {
      // Curated placeholder without DB id
      setShowCustom(false);
      setSelectedChallengeType(null);
      setPendingTypeName(name);
      // Don't touch customChallengeName
    }

    // restore last unit if saved and still allowed
    const saved = (typeof window !== "undefined")
        ? window.localStorage.getItem(unitPrefKey(user?.id, canonical!, name))
        : null;
    const chosen = saved && units.includes(saved) ? saved : (units[0] || null);

    setUnitOptions(units);
    setSelectedUnit(chosen);
    setError(null);

    console.log("Type selected", { id, name, path: id === null ? (name === "Custom" ? "custom" : "placeholder") : "built-in" });
  };

  const handleNameChange = (value: string) => {
    setParticipantName(value);
    if (nameError) {
      const error = validateParticipantName(value);
      if (!error) {
        setNameError(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Basic validation checks
    if (!user) {
      setError('User not authenticated');
      return;
    }

    if (!selectedCampaign) {
      setError('No campaign selected');
      return;
    }

    if (!selectedChallengeType && !showCustom && !pendingTypeName) {
      setError('No challenge type selected');
      return;
    }

    if (!Boolean(healthConfirmed)) {
      setError('Health confirmation required');
      return;
    }

    // Check for required participant name
    const nameValidationError = validateParticipantName(participantName);
    if (nameValidationError) {
      setNameError(nameValidationError);
      setError(nameValidationError);
      if (nameInputRef.current) {
        nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameInputRef.current.focus();
      }
      return;
    }

    // Final validation
    if (!isValidGoal(selectedUnit, goalAmount)) {
      setError('Please enter a valid goal amount');
      setSubmitting(false);
      return;
    }
    const goalNum = isDistanceUnit(selectedUnit)
        ? parseFloat(goalAmount)
        : parseInt(goalAmount, 10);

    if (showCustom && !customChallengeName.trim()) {
      setError('Please provide a challenge name for custom challenge');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let challengeTypeId = selectedChallengeType;

      if (showCustom) {
        // Create true custom challenge type
        console.log("Creating custom type", {
          category_id: selectedCategory,
          name: customChallengeName,
          unit: selectedUnit
        });

        const customPayload: any = {
          category_id: selectedCategory!,
          name: (customChallengeName || "Custom").trim(),
          unit: selectedUnit || customUnit.trim(),
        };
        const customTypeResponse = await fetch('/wapi/challenge-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customPayload)
        });

        if (!customTypeResponse.ok) {
          const errorText = await customTypeResponse.text();
          console.error('Custom challenge type creation failed:', {
            status: customTypeResponse.status,
            statusText: customTypeResponse.statusText,
            errorText: errorText
          });
          setError(`Failed to create custom challenge type: ${customTypeResponse.status} - ${errorText}`);
          return;
        }

        const customTypeData = await customTypeResponse.json();
        const newTypeId = Number(customTypeData?.id);

        if (!newTypeId) {
          setError('Custom type create returned no id');
          setSubmitting(false);
          return;
        }

        console.log("Custom type id", newTypeId);

        challengeTypeId = newTypeId;
        setSelectedChallengeType(newTypeId);
        setShowCustom(false);
      } else if (challengeTypeId === null && pendingTypeName) {
        // Create missing built-in type for curated placeholder
        console.log("Creating built-in placeholder type", {
          category_id: selectedCategory,
          name: pendingTypeName,
          unit: selectedUnit
        });

        const placeholderPayload: any = {
          category_id: selectedCategory!,
          name: pendingTypeName.trim(),
          unit: selectedUnit!, // this should be set by your Unit select
        };
        const placeholderTypeResponse = await fetch('/wapi/challenge-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(placeholderPayload)
        });

        if (!placeholderTypeResponse.ok) {
          const errorText = await placeholderTypeResponse.text();
          console.error('Built-in placeholder type creation failed:', {
            status: placeholderTypeResponse.status,
            statusText: placeholderTypeResponse.statusText,
            errorText: errorText
          });
          setError(`Failed to create challenge type: ${placeholderTypeResponse.status} - ${errorText}`);
          return;
        }

        const placeholderTypeData = await placeholderTypeResponse.json();
        const newTypeId = Number(placeholderTypeData?.id);

        if (!newTypeId) {
          setError('Built-in placeholder type create returned no id');
          setSubmitting(false);
          return;
        }

        console.log("Built-in placeholder created", newTypeId);

        challengeTypeId = newTypeId;
        setSelectedChallengeType(newTypeId);
        setPendingTypeName(null);
      }

      // Build request body exactly as specified
      const requestBody = {
        campaign_id: selectedCampaign,
        challenge_type_id: challengeTypeId,
        goal_amount: goalNum,
        custom_unit: selectedUnit || null,
        custom_challenge_name: null,
        bio: bio || null,
        participant_name: participantName.trim()
      };

      console.log("Participant payload", requestBody);

      const participantResponse = await fetch('/wapi/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log("Submit status", participantResponse.status);

      if (!participantResponse.ok) {
        const errorText = await participantResponse.text();
        console.error('Participant creation failed:', {
          status: participantResponse.status,
          statusText: participantResponse.statusText,
          errorText: errorText
        });

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        throw new Error(errorData.error || `Participant creation failed: ${participantResponse.status} - ${errorText}`);
      }

      const result = await participantResponse.json();

      if (result.success && (result.id || result.participant_id)) {
        // Set email preferences if opted in
        if (emailRemindersOptIn || emailDonorUpdates) {
          try {
            await fetch('/wapi/user-notification-preferences', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email_challenge_reminders: emailRemindersOptIn,
                email_donor_updates: emailDonorUpdates
              })
            });
          } catch (prefsError) {
            console.warn('Failed to update email preferences:', prefsError);
            // Non-blocking toast - continue navigation regardless
          }
        }

        // Navigate to the participant page with a success flag to show sharing options
        const participantId = result.id || result.participant_id;
        navigate(`/participant/${participantId}?created=true`);
      } else if (result.success) {
        // Success but no ID - navigate to dashboard with toast
        navigate('/dashboard');
        // Note: Toast functionality would need to be implemented
        console.log('Challenge created successfully');
      } else {
        throw new Error('Participant creation succeeded but no ID returned');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err || 'Failed to create participant');
      console.error('Error creating participant:', errorMessage);
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const goalDisplay =
      isDistanceUnit(selectedUnit)
          ? (goalAmount ? parseFloat(goalAmount) : undefined)
          : (goalAmount ? parseInt(goalAmount, 10) : undefined);


  if (isPending) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
          <div className="text-center">
            <div className="animate-spin mx-auto mb-4">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-bfrs-electric rounded-full"></div>
            </div>
            <p className="text-gray-600">Checking authentication...</p>
            <p className="text-xs text-gray-500 mt-2">If this takes too long, you'll be redirected to sign in again</p>
            <button
                onClick={() => navigate('/')}
                className="mt-4 text-bfrs-electric hover:text-bfrs-electric-dark text-sm underline"
            >
              Go to Home Page
            </button>
          </div>
        </div>
    );
  }

  if (loading && user) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
          <div className="text-center">
            <div className="animate-spin mx-auto mb-4">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-bfrs-electric rounded-full"></div>
            </div>
            <p className="text-gray-600">Loading challenge data...</p>
          </div>
        </div>
    );
  }

  if (!user) {
    return (
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-black mb-2">Authentication Required</h2>
            <p className="text-gray-600 mb-4">Your session has expired. Please sign in again to create your campaign.</p>
            <div className="space-y-3">
              <button
                  onClick={() => window.location.href = '/'}
                  className="w-full bg-bfrs-electric text-black px-4 py-2 rounded-lg hover:bg-bfrs-electric-dark transition-colors font-semibold"
              >
                Sign In Again
              </button>
              <button
                  onClick={() => window.location.reload()}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
    );
  }

  const selectedChallengeTypeData = challengeTypes.find(ct => ct.id === selectedChallengeType);

  return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40 [padding-top:env(safe-area-inset-top)]">
          <div className="mx-auto w-full max-w-screen-lg px-3 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex items-center min-w-0 gap-3">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Back to dashboard"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <img
                    src="https://mocha-cdn.com/019870bf-4695-74f8-b344-315629bf7f9f/BFRS_Logo_Square_Original.jpg"
                    alt="Brain Fog Recovery Source Logo"
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg"
                />
                <div className="min-w-0">
                  <h1 className="text-base sm:text-2xl font-bold text-black truncate">Create Your Challenge</h1>
                  <p className="text-xs sm:text-sm text-gray-600 hidden xs:block">Set up your metabolic challenge fundraiser</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <Link
                    to="/browse"
                    className="text-gray-600 hover:text-black transition-colors font-medium text-sm sm:text-base"
                >
                  Browse Campaigns
                </Link>
                <a
                    href="https://www.every.org/brain-fog-recovery-source?donateTo=brain-fog-recovery-source#/donate/card"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-bfrs-electric text-black px-3 sm:px-4 py-2 rounded-lg font-semibold hover:bg-bfrs-electric-dark transition-colors shadow-sm text-sm sm:text-base"
                >
                  Donate Now
                </a>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-screen-lg px-3 sm:px-6 lg:px-8 py-6 sm:py-8">
          {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
          )}

          <form
              onSubmit={(e) => {
                console.log('📝 FORM onSubmit event triggered!', {
                  eventType: e.type,
                  formElements: e.currentTarget.elements.length,
                  timestamp: new Date().toISOString()
                });
                handleSubmit(e);
              }}
              className="space-y-8"
          >
            {/* Step 1: Choose Category */}
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
              <div className="flex items-center mb-5 sm:mb-6">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-bfrs-electric text-black rounded-full flex items-center justify-center text-sm sm:text-base font-bold mr-3 flex-shrink-0">
                  1
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-xl font-semibold text-black leading-tight">Choose Challenge Category</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Select the type of challenge you want to take on</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {categories.map((category) => {
                  // Map canonical categories to appropriate icons
                  const getIconForCategory = (category: any) => {
                    const canonical = idToCanonicalRef.current[category.id];
                    switch (canonical) {
                      case "Heat or Cold Exposure": return <Snowflake className="w-6 h-6 text-blue-500" />;
                      case "Exercise & Movement": return <Activity className="w-6 h-6 text-orange-500" />;
                      case "Meal Timing": return <Clock className="w-6 h-6 text-purple-500" />;
                      case "Light & Circadian": return <Sun className="w-6 h-6 text-yellow-500" />;
                      case "Low Carb & Ketogenic": return <Salad className="w-6 h-6 text-green-500" />;
                      case "Meditation & Mindfulness": return <Brain className="w-6 h-6 text-indigo-500" />;
                      case "Sleep Optimization": return <Moon className="w-6 h-6 text-gray-700" />;
                      default: return <Zap className="w-6 h-6 text-red-500" />;
                    }
                  };

                  return (
                      <button
                          key={category.id ?? category.name}
                          type="button"
                          onClick={() => handleCategorySelect(category.id)}
                          className={`p-4 sm:p-5 rounded-xl border-2 text-left transition-all hover:shadow-md active:scale-[0.98] ${
                              selectedCategory === category.id
                                  ? 'border-bfrs-electric bg-bfrs-electric bg-opacity-10 shadow-lg ring-2 ring-bfrs-electric/20'
                                  : 'border-gray-200 hover:border-bfrs-electric hover:bg-gray-50 bg-white'
                          }`}
                      >
                        <div className="flex items-start gap-3 sm:gap-4">
                          <div className="flex-shrink-0 mt-0.5">{getIconForCategory(category)}</div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-semibold text-black leading-tight mb-1">{category.name}</h3>
                            {category.description && (
                                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-2">{category.description}</p>
                            )}
                          </div>
                        </div>
                      </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Choose Challenge Type */}
            {selectedCategory && (
                <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center mb-5 sm:mb-6">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-bfrs-electric text-black rounded-full flex items-center justify-center text-sm sm:text-base font-bold mr-3 flex-shrink-0">
                      2
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-xl font-semibold text-black leading-tight">Choose Specific Challenge</h2>
                      <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Pick your preferred challenge type</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {challengeTypes.filter(challengeType => challengeType.name !== "Custom").map((challengeType) => {
                      const isSelected = selectedChallengeType === challengeType.id ||
                          (pendingTypeName === challengeType.name && challengeType.id === null);

                      return (
                          <button
                              key={challengeType.id ?? challengeType.name}
                              type="button"
                              onClick={() => handleChallengeTypeSelect(challengeType.id, challengeType.name)}
                              className={`p-4 sm:p-5 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                                  isSelected
                                      ? 'border-bfrs-electric bg-bfrs-electric bg-opacity-10 ring-2 ring-bfrs-electric/20 shadow-sm'
                                      : 'border-gray-200 hover:border-bfrs-electric hover:bg-gray-50 bg-white'
                              }`}
                          >
                            <h3 className="text-sm sm:text-base font-semibold text-black leading-tight mb-1">{challengeType.name}</h3>
                            {challengeType.suggested_min && challengeType.suggested_max && (
                                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                                  Suggested: {challengeType.suggested_min}-{challengeType.suggested_max} {challengeType.unit}
                                </p>
                            )}
                          </button>
                      );
                    })}

                    {/* Custom Option */}
                    <button
                        type="button"
                        onClick={() => handleChallengeTypeSelect(null, "Custom")}
                        className={`p-4 sm:p-5 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                            showCustom
                                ? 'border-bfrs-electric bg-bfrs-electric bg-opacity-10 ring-2 ring-bfrs-electric/20 shadow-sm'
                                : 'border-gray-200 hover:border-bfrs-electric hover:bg-gray-50 bg-white'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-bfrs-electric flex-shrink-0" />
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-black leading-tight mb-1">Create Custom Challenge</h3>
                          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">Design your own challenge</p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {(showCustom || selectedChallengeType !== null || pendingTypeName) && unitOptions.length > 0 && (
                      <div className="mt-5 sm:mt-6">
                        <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">Unit</label>
                        <select
                            className="block w-full sm:w-64 border-2 border-gray-300 rounded-lg px-4 py-3 text-sm sm:text-base bg-white focus:ring-2 focus:ring-bfrs-electric focus:border-bfrs-electric transition-colors"
                            value={selectedUnit || ""}
                            onChange={(e) => {
                              const canonical = idToCanonicalRef.current[selectedCategory!];
                              const name = showCustom ? (customChallengeName || "Custom")
                                  : (pendingTypeName || challengeTypes.find(t => t.id === selectedChallengeType)?.name || "");
                              const val = e.target.value;
                              setSelectedUnit(val);
                              if (canonical && name && typeof window !== "undefined") {
                                window.localStorage.setItem(unitPrefKey(user?.id, canonical, name), val);
                              }
                            }}
                        >
                          {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                  )}

                  {/* Custom Challenge Form */}
                  {showCustom && (
                      <div className="mt-5 sm:mt-6 p-4 sm:p-5 bg-gray-50 rounded-lg border-2 border-gray-200">
                        <h4 className="text-sm sm:text-base font-semibold text-black mb-4 sm:mb-5">Custom Challenge Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                          <div>
                            <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                              Challenge Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={customChallengeName}
                                onChange={(e) => setCustomChallengeName(e.target.value)}
                                className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-bfrs-electric focus:border-bfrs-electric bg-white transition-colors"
                                placeholder="e.g., Meditation Sessions"
                                required={showCustom}
                            />
                          </div>
                          <div>
                            <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                              Unit of Measurement <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={customUnit}
                                onChange={(e) => setCustomUnit(e.target.value)}
                                className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-bfrs-electric focus:border-bfrs-electric bg-white transition-colors"
                                placeholder="e.g., sessions, minutes, days"
                                required={showCustom}
                            />
                          </div>
                        </div>
                      </div>
                  )}
                </div>
            )}

            {/* Step 3: Set Goal */}
            {(() => {
              const canProceed = Boolean(selectedCategory) && (showCustom || selectedChallengeType !== null || pendingTypeName);
              return canProceed && (
                  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center mb-5 sm:mb-6">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-bfrs-electric text-black rounded-full flex items-center justify-center text-sm sm:text-base font-bold mr-3 flex-shrink-0">
                        3
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base sm:text-xl font-semibold text-black leading-tight">Set Your Goal</h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Define your challenge target</p>
                      </div>
                    </div>

                    <div className="space-y-5 sm:space-y-6">
                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                          Your name <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={nameInputRef}
                            type="text"
                            value={participantName}
                            onChange={(e) => handleNameChange(e.target.value)}
                            className={`w-full px-4 py-3 text-sm sm:text-base border-2 rounded-lg focus:ring-2 focus:ring-bfrs-electric focus:border-bfrs-electric transition-colors ${
                                nameError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                            }`}
                            placeholder="Enter your name"
                            maxLength={80}
                            required
                        />
                        {nameError && (
                            <p className="text-xs sm:text-sm text-red-600 mt-2 flex items-center gap-1">
                              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                              {nameError}
                            </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                          Goal Amount <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                              type="number"
                              inputMode="decimal"
                              step={isDistanceUnit(selectedUnit) ? '0.01' : '1'}
                              min={isDistanceUnit(selectedUnit) ? '0.01' : '1'}
                              value={goalAmount}
                              onChange={(e) => {
                                const value = e.target.value;
                                setGoalAmount(value);
                                if (value && !isValidGoal(selectedUnit, value)) {
                                  setError(
                                      isDistanceUnit(selectedUnit)
                                          ? 'For miles/km you can enter decimals (e.g., 1.25).'
                                          : 'Only whole numbers are allowed for this unit.'
                                  );
                                } else {
                                  setError(null);
                                }
                              }}
                              className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-bfrs-electric focus:border-bfrs-electric bg-white transition-colors pr-20 sm:pr-24"
                              placeholder="Enter your goal"
                              required
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                            <span className="text-sm sm:text-base font-medium text-gray-600">
                              {selectedUnit || "units"}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-500 mt-2 flex items-start gap-1.5">
                          <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            {isDistanceUnit(selectedUnit)
                                ? 'Decimals allowed for miles/km (up to 2 decimals).'
                                : 'Enter a whole number for this unit'}
                          </span>
                        </p>
                        {selectedChallengeTypeData?.suggested_min && selectedChallengeTypeData?.suggested_max && (
                            <p className="text-xs sm:text-sm text-gray-600 mt-2 flex items-center gap-1.5">
                              <svg className="w-4 h-4 text-bfrs-electric flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>Suggested range: {selectedChallengeTypeData.suggested_min}-{selectedChallengeTypeData.suggested_max} {selectedChallengeTypeData.unit}</span>
                            </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
                          About Your Challenge <span className="text-gray-500 font-normal text-xs">(Optional)</span>
                        </label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={5}
                            className="w-full px-4 py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-bfrs-electric focus:border-bfrs-electric bg-white transition-colors resize-none"
                            placeholder="Share why you're taking on this challenge and how it relates to your journey with metabolic health..."
                            maxLength={500}
                        />
                        <p className="text-xs sm:text-sm text-gray-500 mt-2 text-right">{bio.length}/500 characters</p>
                      </div>
                    </div>
                  </div>
              );
            })()}

            {/* Step 4: Email Reminders */}
            {(() => {
              const canProceed = Boolean(selectedCategory) && (showCustom || selectedChallengeType !== null || pendingTypeName);
              return canProceed && goalAmount && (
                  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center mb-5 sm:mb-6">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-bfrs-electric text-black rounded-full flex items-center justify-center text-sm sm:text-base font-bold mr-3 flex-shrink-0">
                        4
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base sm:text-xl font-semibold text-black leading-tight">Email Reminders</h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Stay on track with weekly updates</p>
                      </div>
                    </div>

                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-bfrs-electric/50 transition-colors">
                        <div className="flex items-center h-6 pt-0.5 flex-shrink-0">
                          <input
                              id="weekly-challenge-reminders"
                              type="checkbox"
                              checked={emailRemindersOptIn}
                              onChange={(e) => setEmailRemindersOptIn(e.target.checked)}
                              className="w-5 h-5 sm:w-6 sm:h-6 text-bfrs-electric bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-bfrs-electric focus:ring-offset-2 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label htmlFor="weekly-challenge-reminders" className="block text-sm sm:text-base font-semibold text-black cursor-pointer mb-1">
                            Weekly Challenge Reminders
                          </label>
                          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">Get weekly email reminders to update your challenge progress.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-bfrs-electric/50 transition-colors">
                        <div className="flex items-center h-6 pt-0.5 flex-shrink-0">
                          <input
                              id="weekly-donor-updates"
                              type="checkbox"
                              checked={emailDonorUpdates}
                              onChange={(e) => setEmailDonorUpdates(e.target.checked)}
                              className="w-5 h-5 sm:w-6 sm:h-6 text-bfrs-electric bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-bfrs-electric focus:ring-offset-2 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label htmlFor="weekly-donor-updates" className="block text-sm sm:text-base font-semibold text-black cursor-pointer mb-1">
                            Weekly Donor Updates
                          </label>
                          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">Donors who support you will receive weekly progress updates via email.</p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-200">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                            Weekly emails are sent every Monday at 9 AM and can be unsubscribed at any time.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
              );
            })()}

            {/* Step 5: Health Disclaimer */}
            {(() => {
              const canProceed = Boolean(selectedCategory) && (showCustom || selectedChallengeType !== null || pendingTypeName);
              return canProceed && goalAmount && (
                  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200">
                    <div className="flex items-center mb-5 sm:mb-6">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-bfrs-electric text-black rounded-full flex items-center justify-center text-sm sm:text-base font-bold mr-3 flex-shrink-0">
                        5
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base sm:text-xl font-semibold text-black leading-tight">Health & Safety Confirmation</h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Important safety information</p>
                      </div>
                    </div>

                    <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 sm:p-5 mb-5 sm:mb-6">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-semibold text-orange-900 mb-1">Important Health Notice</h3>
                          <p className="text-xs sm:text-sm text-orange-800 leading-relaxed">
                            Please ensure you are physically capable of completing your chosen challenge safely.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 sm:gap-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                      <div className="flex items-center h-6 pt-0.5 flex-shrink-0">
                        <input
                            id="health-confirmation"
                            type="checkbox"
                            checked={Boolean(healthConfirmed)}
                            onChange={(e) => {
                              console.log('Health checkbox changed:', e.target.checked);
                              setHealthConfirmed(Boolean(e.target.checked));
                            }}
                            className="w-5 h-5 sm:w-6 sm:h-6 text-bfrs-electric bg-white border-2 border-gray-300 rounded focus:ring-2 focus:ring-bfrs-electric focus:ring-offset-2 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <label htmlFor="health-confirmation" className="text-xs sm:text-sm font-medium text-black cursor-pointer leading-relaxed block">
                          I confirm I am physically fit and in good health to participate in my selected challenge. If I have concerns about my health or abilities, I will consult a healthcare provider before participating. By checking this box, I release Brain Fog Recovery Source from responsibility related to my participation.
                        </label>
                      </div>
                    </div>
                  </div>
              );
            })()}

            {/* Submit Button */}
            {(() => {
              const canProceed = Boolean(selectedCategory) && (showCustom || selectedChallengeType !== null || pendingTypeName);
              const selectedTypeName = pendingTypeName || (challengeTypes.find(t => t.id === selectedChallengeType)?.name) || (showCustom ? customChallengeName : "");
              return canProceed && goalAmount && (
                  <div className="bg-bfrs-electric rounded-2xl p-6 sm:p-8 text-center">
                    <h3 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">Ready to Start?</h3>
                    <p className="text-black mb-5 sm:mb-6 text-sm sm:text-base">
                      You are about to create a campaign to complete <strong>{goalDisplay} {selectedUnit}</strong> of <strong>{selectedTypeName}</strong>.
                      <br />
                      Your supporters will pledge a dollar amount for each <strong>{selectedUnit}</strong> you complete.
                      <br /><br />
                      <strong>How it works:</strong> The more you accomplish, the more funds you raise for psychiatric recovery support!
                    </p>

                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || !Boolean(healthConfirmed) || !selectedCampaign || !canProceed || !goalAmount}
                        className="w-full sm:w-auto bg-black text-bfrs-electric px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center"
                    >
                      {submitting ? (
                          <>
                            <div className="animate-spin w-5 h-5 border-2 border-bfrs-electric border-t-transparent rounded-full mr-2"></div>
                            Creating Campaign...
                          </>
                      ) : (
                          'Create My Campaign'
                      )}
                    </button>

                    {!Boolean(healthConfirmed) && (
                        <p className="mt-4 text-sm text-black bg-white bg-opacity-20 rounded p-2">
                          ⚠️ Please complete the health confirmation above to enable the button
                        </p>
                    )}
                  </div>
              );
            })()}
          </form>
        </div>
      </div>
  );
}
