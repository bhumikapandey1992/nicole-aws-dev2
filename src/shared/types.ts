import z from "zod";

// Challenge Categories and Types
export const ChallengeCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  icon: z.string(),
  description: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ChallengeTypeSchema = z.object({
  id: z.number(),
  category_id: z.number(),
  name: z.string(),
  unit: z.string(),
  suggested_min: z.number().nullable(),
  suggested_max: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Campaign
export const CampaignSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  every_org_url: z.string().nullable(),
  admin_user_id: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Participant
export const ParticipantSchema = z.object({
  id: z.number(),
  campaign_id: z.number(),
  user_id: z.string(),
  challenge_type_id: z.number(),
  goal_amount: z.number(),
  current_progress: z.number(),
  bio: z.string().nullable(),
  profile_image_url: z.string().nullable(),
  is_active: z.boolean(),
  custom_unit: z.string().nullable(),
  custom_challenge_name: z.string().nullable(),
  participant_name: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Donor and Pledge
export const DonorSchema = z.object({
  id: z.number(),
  participant_id: z.number(),
  name: z.string(),
  email: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const PledgeSchema = z.object({
  id: z.number(),
  donor_id: z.number(),
  amount_per_unit: z.number(),
  currency: z.string(),
  is_fulfilled: z.boolean(),
  pledge_type: z.string(),
  max_total_amount: z.number().nullable(),
  flat_amount: z.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Progress and Posts
export const ProgressLogSchema = z.object({
  id: z.number(),
  participant_id: z.number(),
  units_completed: z.number(),
  log_date: z.string(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const ParticipantPostSchema = z.object({
  id: z.number(),
  participant_id: z.number(),
  content: z.string(),
  image_url: z.string().nullable(),
  post_type: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

// Request schemas for API endpoints
export const CreateParticipantSchema = z.object({
  campaign_id: z.number(),
  challenge_type_id: z.number(),
  goal_amount: z.number().positive(),
  custom_unit: z.string().nullable().optional(),
  custom_challenge_name: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  participant_name: z.string().min(1, "Participant name is required"),
});

export const CreatePledgeSchema = z.object({
  participant_id: z.number(),
  donor_name: z.string(),
  donor_email: z.string(),
  pledge_type: z.enum(['per_unit_uncapped', 'per_unit_capped', 'flat_rate']),
  amount_per_unit: z.number().optional(),
  max_total_amount: z.number().optional(),
  flat_amount: z.number().optional(),
});

export const LogProgressSchema = z.object({
  participant_id: z.number(),
  units_completed: z.number(),
  log_date: z.string(),
  notes: z.string().optional(),
  image_url: z.string().optional(),
});

export const CreatePostSchema = z.object({
  participant_id: z.number(),
  content: z.string(),
  image_url: z.string().optional(),
  post_type: z.string().optional(),
});

export const CreateCustomChallengeTypeSchema = z.object({
  category_id: z.number(),
  name: z.string(),
  unit: z.string(),
  suggested_min: z.number().optional(),
  suggested_max: z.number().optional(),
});

// Inferred types
export type ChallengeCategory = z.infer<typeof ChallengeCategorySchema>;
export type ChallengeType = z.infer<typeof ChallengeTypeSchema>;
export type Campaign = z.infer<typeof CampaignSchema>;
export type Participant = z.infer<typeof ParticipantSchema>;
export type Donor = z.infer<typeof DonorSchema>;
export type Pledge = z.infer<typeof PledgeSchema>;
export type ProgressLog = z.infer<typeof ProgressLogSchema>;
export type ParticipantPost = z.infer<typeof ParticipantPostSchema>;

export type CreateParticipant = z.infer<typeof CreateParticipantSchema>;
export type CreatePledge = z.infer<typeof CreatePledgeSchema>;
export type LogProgress = z.infer<typeof LogProgressSchema>;
export type CreatePost = z.infer<typeof CreatePostSchema>;
export type CreateCustomChallengeType = z.infer<typeof CreateCustomChallengeTypeSchema>;

// Extended types with relations
export interface ParticipantWithDetails extends Participant {
  challenge_type: ChallengeType;
  campaign: Campaign;
  total_pledged: number;
  donor_count: number;
}

export interface PledgeWithDonor extends Pledge {
  donor: Donor;
}

export interface CampaignWithStats extends Campaign {
  participant_count: number;
  total_pledged: number;
  total_raised: number;
}
