// Database types matching the Supabase schema
// Auto-generated based on phase1 and phase2 schemas

export type AppRole = 'admin' | 'student' | 'interviewer';

export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type TransactionType = 'credit' | 'debit' | 'payout' | 'refund' | 'adjustment';

export interface UserRole {
    id: string;
    user_id: string;
    role: AppRole;
    created_at: string;
}

export interface StudentProfile {
    user_id: string;
    education: string | null;
    target_companies: string[];
    interview_types: string[];
    timezone: string | null;
    created_at: string;
    updated_at: string;
}

export interface InterviewerProfile {
    user_id: string;
    company_background: string | null;
    years_experience: number | null;
    specialties: string[];
    bio: string | null;
    hourly_rate_cents: number | null;
    verification_status: VerificationStatus;
    timezone: string | null;
    created_at: string;
    updated_at: string;
    // Computed fields (virtual)
    average_rating?: number;
    review_count?: number;
    display_name?: string;
    avatar_url?: string;
}

export interface AvailabilitySlot {
    id: string;
    interviewer_id: string;
    day_of_week: number; // 0 = Sunday
    start_time: string; // HH:MM:SS format
    end_time: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Booking {
    id: string;
    student_id: string;
    interviewer_id: string;
    scheduled_at: string;
    duration_minutes: number;
    interview_type: string;
    target_company: string | null;
    status: BookingStatus;
    meeting_link: string | null;
    meeting_room_id: string | null;
    payment_status: PaymentStatus;
    total_amount_cents: number;
    platform_fee_cents: number;
    interviewer_amount_cents: number;
    stripe_payment_intent_id: string | null;
    stripe_refund_id: string | null;
    student_notes: string | null;
    cancelled_by: 'student' | 'interviewer' | 'admin' | null;
    cancellation_reason: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    student?: StudentProfile;
    interviewer?: InterviewerProfile;
    feedback?: InterviewFeedback;
}

export interface InterviewFeedback {
    id: string;
    booking_id: string;
    technical_rating: number | null;
    problem_solving_rating: number | null;
    communication_rating: number | null;
    soft_skills_rating: number | null;
    confidence_rating: number | null;
    body_language_rating: number | null;
    strengths: string[];
    weaknesses: string[];
    improvement_roadmap: string | null;
    interviewer_notes: string | null;
    recommended_resources: ResourceRecommendation[];
    ai_summary: string | null;
    ai_confidence_analysis: string | null;
    ai_improvement_suggestions: ImprovementSuggestion[] | null;
    overall_rating: number | null;
    would_hire: boolean | null;
    hire_level: 'junior' | 'mid' | 'senior' | 'not_ready' | null;
    is_published: boolean;
    created_at: string;
    updated_at: string;
}

export interface ResourceRecommendation {
    title: string;
    url?: string;
    type: 'video' | 'article' | 'course' | 'book' | 'practice';
    description?: string;
}

export interface ImprovementSuggestion {
    area: string;
    priority: 'high' | 'medium' | 'low';
    suggestion: string;
    resources?: ResourceRecommendation[];
}

export interface Wallet {
    id: string;
    user_id: string;
    balance_cents: number;
    pending_cents: number;
    total_earned_cents: number;
    total_withdrawn_cents: number;
    payout_method: string;
    payout_details: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

export interface WalletTransaction {
    id: string;
    wallet_id: string;
    type: TransactionType;
    amount_cents: number;
    balance_after_cents: number;
    description: string | null;
    booking_id: string | null;
    payout_reference: string | null;
    payout_status: 'pending' | 'processing' | 'completed' | 'failed' | null;
    created_at: string;
}

export interface PlatformSetting {
    key: string;
    value: unknown;
    description: string | null;
    updated_by: string | null;
    updated_at: string;
}

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    data: Record<string, unknown>;
    is_read: boolean;
    action_url: string | null;
    created_at: string;
}

export interface InterviewerReview {
    id: string;
    booking_id: string;
    interviewer_id: string;
    student_id: string;
    rating: number;
    review_text: string | null;
    is_anonymous: boolean;
    is_visible: boolean;
    created_at: string;
}

export interface ChatMessage {
    id: string;
    booking_id: string;
    sender_id: string;
    content: string;
    type: 'text' | 'code';
    created_at: string;
}

export interface CodeSession {
    id: string;
    booking_id: string;
    code: string;
    language: string;
    updated_by: string | null;
    updated_at: string;
}

// ============ FORM TYPES ============

export interface CreateBookingInput {
    interviewer_id: string;
    scheduled_at: string;
    duration_minutes: number;
    interview_type: string;
    target_company?: string;
    student_notes?: string;
}

export interface SubmitFeedbackInput {
    booking_id: string;
    technical_rating: number;
    problem_solving_rating: number;
    communication_rating: number;
    soft_skills_rating: number;
    confidence_rating: number;
    body_language_rating?: number;
    strengths: string[];
    weaknesses: string[];
    improvement_roadmap: string;
    interviewer_notes?: string;
    recommended_resources?: ResourceRecommendation[];
    overall_rating: number;
    would_hire?: boolean;
    hire_level?: string;
}

export interface UpdateInterviewerProfileInput {
    company_background?: string;
    years_experience?: number;
    specialties?: string[];
    bio?: string;
    hourly_rate_cents?: number;
    timezone?: string;
}

export interface UpdateStudentProfileInput {
    education?: string;
    target_companies?: string[];
    interview_types?: string[];
    timezone?: string;
}

export interface AvailabilitySlotInput {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active?: boolean;
}

// ============ API RESPONSE TYPES ============

export interface InterviewerWithDetails extends InterviewerProfile {
    average_rating: number;
    review_count: number;
    completed_interviews: number;
    availability_slots?: AvailabilitySlot[];
}

export interface BookingWithDetails extends Booking {
    student_profile?: StudentProfile;
    interviewer_profile?: InterviewerProfile;
    feedback?: InterviewFeedback;
}

export interface DashboardStats {
    total_bookings: number;
    completed_interviews: number;
    pending_bookings: number;
    total_earnings_cents?: number;
    average_rating?: number;
}

// ============ CONSTANTS ============

export const INTERVIEW_TYPES = [
    'DSA',
    'System Design',
    'Behavioral',
    'Full-stack',
    'Machine Learning',
    'Frontend',
    'Backend',
    'DevOps',
    'Product Management',
] as const;

export const TARGET_COMPANIES = [
    'Google',
    'Microsoft',
    'Amazon',
    'Meta',
    'Apple',
    'OpenAI',
    'Netflix',
    'Uber',
    'Airbnb',
    'Stripe',
    'Coinbase',
    'Spotify',
] as const;

export const DAYS_OF_WEEK = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
] as const;

export const RATING_CATEGORIES = [
    { key: 'technical_rating', label: 'Technical Knowledge', icon: 'Code' },
    { key: 'problem_solving_rating', label: 'Problem Solving', icon: 'Lightbulb' },
    { key: 'communication_rating', label: 'Communication', icon: 'MessageSquare' },
    { key: 'soft_skills_rating', label: 'Soft Skills', icon: 'Users' },
    { key: 'confidence_rating', label: 'Confidence', icon: 'TrendingUp' },
    { key: 'body_language_rating', label: 'Body Language', icon: 'Eye' },
] as const;
