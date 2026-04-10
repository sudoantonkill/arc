// Email templates for Interview Ace
// Used by the send-email Edge Function

export interface EmailData {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export type EmailTemplateType =
    | 'booking_confirmed'
    | 'booking_cancelled'
    | 'booking_reminder_24h'
    | 'booking_reminder_1h'
    | 'feedback_available'
    | 'payout_processed'
    | 'welcome';

interface BookingEmailData {
    recipientName: string;
    recipientEmail: string;
    otherPartyName: string;
    interviewType: string;
    scheduledAt: string;
    duration: number;
    meetingLink?: string;
}

interface FeedbackEmailData {
    studentName: string;
    studentEmail: string;
    interviewType: string;
    scheduledAt: string;
}

interface PayoutEmailData {
    interviewerName: string;
    interviewerEmail: string;
    amount: string;
    reference?: string;
}

interface WelcomeEmailData {
    name: string;
    email: string;
    role: 'student' | 'interviewer';
}

const BRAND_COLOR = '#6366f1'; // Indigo-500
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:5173';

function baseTemplate(content: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interview Ace</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, ${BRAND_COLOR} 0%, #8b5cf6 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Interview Ace</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Ace your next interview</p>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
    ${content}
  </div>
  <div style="text-align: center; padding: 20px; color: #6b7280; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Interview Ace. All rights reserved.</p>
    <p>
      <a href="${FRONTEND_URL}" style="color: ${BRAND_COLOR};">Visit Interview Ace</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

export function getBookingConfirmedEmail(data: BookingEmailData): EmailData {
    const formattedDate = new Date(data.scheduledAt).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    return {
        to: data.recipientEmail,
        subject: `Interview Confirmed - ${data.interviewType} with ${data.otherPartyName}`,
        html: baseTemplate(`
      <h2 style="color: #10b981; margin-top: 0;">✅ Interview Confirmed!</h2>
      <p>Hi ${data.recipientName},</p>
      <p>Your interview has been confirmed. Here are the details:</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Type:</strong> ${data.interviewType}</p>
        <p style="margin: 5px 0;"><strong>With:</strong> ${data.otherPartyName}</p>
        <p style="margin: 5px 0;"><strong>When:</strong> ${formattedDate}</p>
        <p style="margin: 5px 0;"><strong>Duration:</strong> ${data.duration} minutes</p>
      </div>
      
      ${data.meetingLink ? `
      <div style="text-align: center; margin: 25px 0;">
        <a href="${data.meetingLink}" style="background: ${BRAND_COLOR}; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
          Join Interview
        </a>
      </div>
      ` : ''}
      
      <p style="color: #6b7280; font-size: 14px;">
        Make sure to test your camera and microphone before the interview starts.
      </p>
    `),
    };
}

export function getBookingReminderEmail(data: BookingEmailData, hoursUntil: number): EmailData {
    const formattedDate = new Date(data.scheduledAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    const timeLabel = hoursUntil === 1 ? '1 hour' : '24 hours';

    return {
        to: data.recipientEmail,
        subject: `Reminder: Your interview is in ${timeLabel}`,
        html: baseTemplate(`
      <h2 style="color: ${BRAND_COLOR}; margin-top: 0;">⏰ Interview Reminder</h2>
      <p>Hi ${data.recipientName},</p>
      <p>This is a friendly reminder that your interview is coming up in <strong>${timeLabel}</strong>.</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Type:</strong> ${data.interviewType}</p>
        <p style="margin: 5px 0;"><strong>With:</strong> ${data.otherPartyName}</p>
        <p style="margin: 5px 0;"><strong>When:</strong> ${formattedDate}</p>
      </div>
      
      ${data.meetingLink ? `
      <div style="text-align: center; margin: 25px 0;">
        <a href="${data.meetingLink}" style="background: ${BRAND_COLOR}; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
          Join Interview
        </a>
      </div>
      ` : ''}
      
      <p style="color: #6b7280; font-size: 14px;">
        Prepare your environment, test your equipment, and good luck!
      </p>
    `),
    };
}

export function getFeedbackAvailableEmail(data: FeedbackEmailData): EmailData {
    const formattedDate = new Date(data.scheduledAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
    });

    return {
        to: data.studentEmail,
        subject: 'Your Interview Feedback is Ready!',
        html: baseTemplate(`
      <h2 style="color: ${BRAND_COLOR}; margin-top: 0;">📋 Feedback Available</h2>
      <p>Hi ${data.studentName},</p>
      <p>Great news! Your interviewer has submitted feedback for your <strong>${data.interviewType}</strong> interview from ${formattedDate}.</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${FRONTEND_URL}/app/student" style="background: ${BRAND_COLOR}; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
          View Your Feedback
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        Use this feedback to improve your interview skills and ace your next opportunity!
      </p>
    `),
    };
}

export function getPayoutProcessedEmail(data: PayoutEmailData): EmailData {
    return {
        to: data.interviewerEmail,
        subject: `Payout Processed - ${data.amount}`,
        html: baseTemplate(`
      <h2 style="color: #10b981; margin-top: 0;">💰 Payout Processed</h2>
      <p>Hi ${data.interviewerName},</p>
      <p>Good news! Your payout of <strong>${data.amount}</strong> has been processed.</p>
      
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Amount:</strong> ${data.amount}</p>
        ${data.reference ? `<p style="margin: 5px 0;"><strong>Reference:</strong> ${data.reference}</p>` : ''}
        <p style="margin: 5px 0;"><strong>Status:</strong> Completed</p>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        Funds should arrive in your account within 2-3 business days.
      </p>
    `),
    };
}

export function getWelcomeEmail(data: WelcomeEmailData): EmailData {
    const roleMessage = data.role === 'interviewer'
        ? 'As an interviewer, you can set your availability, conduct mock interviews, and earn money while helping others succeed.'
        : 'As a student, you can book mock interviews with experienced professionals and get valuable feedback to improve.';

    return {
        to: data.email,
        subject: 'Welcome to Interview Ace! 🎉',
        html: baseTemplate(`
      <h2 style="color: ${BRAND_COLOR}; margin-top: 0;">Welcome to Interview Ace!</h2>
      <p>Hi ${data.name},</p>
      <p>Thanks for joining Interview Ace! We're excited to have you here.</p>
      
      <p>${roleMessage}</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${FRONTEND_URL}/app/${data.role}" style="background: ${BRAND_COLOR}; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
          Go to Dashboard
        </a>
      </div>
      
      <p style="color: #6b7280; font-size: 14px;">
        If you have any questions, feel free to reach out to our support team.
      </p>
    `),
    };
}

export function getBookingCancelledEmail(data: BookingEmailData & { reason?: string }): EmailData {
    const formattedDate = new Date(data.scheduledAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    return {
        to: data.recipientEmail,
        subject: `Interview Cancelled - ${data.interviewType}`,
        html: baseTemplate(`
      <h2 style="color: #ef4444; margin-top: 0;">❌ Interview Cancelled</h2>
      <p>Hi ${data.recipientName},</p>
      <p>Unfortunately, your interview has been cancelled.</p>
      
      <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
        <p style="margin: 5px 0;"><strong>Type:</strong> ${data.interviewType}</p>
        <p style="margin: 5px 0;"><strong>Was scheduled for:</strong> ${formattedDate}</p>
        ${data.reason ? `<p style="margin: 5px 0;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
      </div>
      
      <p>If payment was made, a refund will be processed within 5-7 business days.</p>
      
      <div style="text-align: center; margin: 25px 0;">
        <a href="${FRONTEND_URL}/app/student" style="background: ${BRAND_COLOR}; color: white; padding: 12px 30px; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600;">
          Book Another Interview
        </a>
      </div>
    `),
    };
}
