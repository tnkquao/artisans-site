import nodemailer from 'nodemailer';
import { TeamInvitation } from '@shared/schema';

interface EmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

let transporter: nodemailer.Transporter;

// Initialize the email transporter
async function initTransporter() {
  try {
    console.log('Setting up Gmail transporter');
    
    // Check if we have email credentials
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.EMAIL_SERVICE) {
      throw new Error('Email credentials not found in environment variables');
    }
    
    // Create the transporter with Gmail service
    transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    // Verify connection
    await transporter.verify();
    console.log('Email server connection verified successfully');
    
  } catch (error) {
    console.error('Email server connection error:', error);
    
    // Fall back to a development mock transporter
    console.log('Falling back to mock transporter to allow development to continue');
    transporter = {
      sendMail: async (mailOptions: nodemailer.SendMailOptions) => {
        // Log the email that would have been sent
        console.log('MOCK EMAIL SENT:');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Text:', mailOptions.text || 'N/A');
        console.log('HTML:', mailOptions.html ? 'HTML content available' : 'No HTML content');
        
        // Return a successful response for development
        return {
          accepted: [mailOptions.to],
          rejected: [],
          response: 'Mock email sent successfully',
          messageId: `mock-id-${Date.now()}`,
        };
      },
    } as nodemailer.Transporter;
  }
}

// Initialize the transporter
initTransporter();

/**
 * Send an email
 * @param params Email parameters including to, subject, text, and html content
 * @returns Promise resolving to the email send result
 */
export async function sendEmail(params: EmailParams): Promise<any> {
  // Make sure the transporter is initialized
  if (!transporter) {
    await initTransporter();
  }
  
  const { to, subject, text, html } = params;
  
  // Send the email
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'artisans-platform@example.com',
      to,
      subject,
      text: text || '',
      html: html || '',
    };
    
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Send a team invitation email
 * @param invitation The team invitation data
 * @param projectName The name of the project the user is invited to
 * @returns Promise resolving to the email send result
 */
export async function sendTeamInvitationEmail(invitation: TeamInvitation, projectName: string): Promise<any> {
  const inviteLink = `${process.env.APP_URL || 'http://localhost:5000'}/join/${invitation.inviteToken}`;
  
  return sendEmail({
    to: invitation.inviteEmail,
    subject: `You've been invited to join the ${projectName} project on Artisans Platform`,
    text: `
      Hello,
      
      You have been invited to join the "${projectName}" project as a ${invitation.role.replace('_', ' ')} on the Artisans Platform.
      
      To accept this invitation, please click on the following link or copy and paste it into your browser:
      ${inviteLink}
      
      This invitation will expire in 7 days.
      
      Best regards,
      The Artisans Platform Team
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Project Invitation</h2>
        <p>Hello,</p>
        <p>You have been invited to join the <strong>"${projectName}"</strong> project as a <strong>${invitation.role.replace('_', ' ')}</strong> on the Artisans Platform.</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${inviteLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="background-color: #f4f4f4; padding: 10px; word-break: break-all;">
          ${inviteLink}
        </p>
        
        <p style="color: #666; margin-top: 30px; font-size: 0.9em;">
          This invitation will expire in 7 days.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #888; font-size: 0.8em;">
          Best regards,<br>
          The Artisans Platform Team
        </p>
      </div>
    `,
  });
}

/**
 * Send a password reset email
 * @param email The user's email address
 * @param token The password reset token
 * @returns Promise resolving to the email send result
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<any> {
  const resetLink = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password/${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Reset Your Artisans Platform Password',
    text: `
      Hello,
      
      We received a request to reset your password for the Artisans Platform.
      
      To reset your password, please click on the following link or copy and paste it into your browser:
      ${resetLink}
      
      This link will expire in 24 hours.
      
      If you did not request a password reset, please ignore this email.
      
      Best regards,
      The Artisans Platform Team
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Password Reset</h2>
        <p>Hello,</p>
        <p>We received a request to reset your password for the Artisans Platform.</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${resetLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="background-color: #f4f4f4; padding: 10px; word-break: break-all;">
          ${resetLink}
        </p>
        
        <p style="color: #666; margin-top: 30px; font-size: 0.9em;">
          This link will expire in 24 hours. If you did not request a password reset, please ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #888; font-size: 0.8em;">
          Best regards,<br>
          The Artisans Platform Team
        </p>
      </div>
    `,
  });
}