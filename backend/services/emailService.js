/**
 * @fileoverview Email service layer
 * @description Handles all email sending functionality
 * @author SuperPrompt Team
 * @version 2.0.0
 */

const nodemailer = require('nodemailer');
const { logger } = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      // Skip email setup in test environment
      if (process.env.NODE_ENV === 'test' || process.env.MOCK_EMAIL === 'true') {
        this.transporter = nodemailer.createTransporter({
          jsonTransport: true
        });
        return;
      }

      const config = {
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      };

      // Alternative SMTP configuration
      if (process.env.SMTP_HOST) {
        config.host = process.env.SMTP_HOST;
        config.port = parseInt(process.env.SMTP_PORT) || 587;
        config.secure = process.env.SMTP_SECURE === 'true';
        delete config.service;
      }

      this.transporter = nodemailer.createTransporter(config);

      // Verify connection
      this.transporter.verify((error, success) => {
        if (error) {
          logger.error('Email transporter verification failed', { error: error.message });
        } else {
          logger.info('Email transporter ready');
        }
      });

    } catch (error) {
      logger.error('Email transporter initialization failed', { error: error.message });
    }
  }

  /**
   * Send email
   * @param {object} options - Email options
   * @returns {Promise<object>} Send result
   */
  async sendEmail(options) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        messageId: result.messageId
      });

      return result;

    } catch (error) {
      logger.error('Email sending failed', {
        error: error.message,
        to: options.to,
        subject: options.subject
      });
      throw error;
    }
  }

  /**
   * Send verification email
   * @param {object} user - User object
   * @returns {Promise<object>} Send result
   */
  static async sendVerificationEmail(user) {
    const emailService = new EmailService();
    
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${user.verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify Your Email - SuperPrompt</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to SuperPrompt!</h1>
          </div>
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hi ${user.name},</p>
            <p>Thank you for signing up for SuperPrompt! To complete your registration and start using our AI-powered prompt enhancement, please verify your email address.</p>
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px;">${verificationUrl}</p>
            <p>This verification link will expire in 24 hours.</p>
            <p>If you didn't create this account, you can safely ignore this email.</p>
            <p>Best regards,<br>The SuperPrompt Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 SuperPrompt. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to SuperPrompt!
      
      Hi ${user.name},
      
      Thank you for signing up! Please verify your email address by visiting:
      ${verificationUrl}
      
      This link will expire in 24 hours.
      
      If you didn't create this account, you can safely ignore this email.
      
      Best regards,
      The SuperPrompt Team
    `;

    return emailService.sendEmail({
      to: user.email,
      subject: 'Verify Your Email - SuperPrompt',
      html,
      text
    });
  }

  /**
   * Send password reset email
   * @param {object} user - User object
   * @param {string} resetToken - Reset token
   * @returns {Promise<object>} Send result
   */
  static async sendPasswordResetEmail(user, resetToken) {
    const emailService = new EmailService();
    
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset - SuperPrompt</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #DC2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          .warning { background: #FEF3C7; border: 1px solid #F59E0B; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Reset Your Password</h2>
            <p>Hi ${user.name},</p>
            <p>We received a request to reset your password for your SuperPrompt account.</p>
            <div class="warning">
              <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your account is still secure.
            </div>
            <p>To reset your password, click the button below:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #eee; padding: 10px;">${resetUrl}</p>
            <p><strong>This reset link will expire in 1 hour for security reasons.</strong></p>
            <p>After clicking the link, you'll be able to create a new password for your account.</p>
            <p>Best regards,<br>The SuperPrompt Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 SuperPrompt. All rights reserved.</p>
            <p>If you need help, contact us at support@superprompt.com</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Password Reset Request - SuperPrompt
      
      Hi ${user.name},
      
      We received a request to reset your password for your SuperPrompt account.
      
      SECURITY NOTICE: If you didn't request this password reset, please ignore this email.
      
      To reset your password, visit: ${resetUrl}
      
      This link will expire in 1 hour for security reasons.
      
      Best regards,
      The SuperPrompt Team
      
      Need help? Contact support@superprompt.com
    `;

    return emailService.sendEmail({
      to: user.email,
      subject: 'Password Reset - SuperPrompt',
      html,
      text
    });
  }

  /**
   * Send welcome email
   * @param {object} user - User object
   * @returns {Promise<object>} Send result
   */
  static async sendWelcomeEmail(user) {
    const emailService = new EmailService();
    
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to SuperPrompt!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #10B981; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Welcome to SuperPrompt!</h1>
          </div>
          <div class="content">
            <h2>You're all set up!</h2>
            <p>Hi ${user.name},</p>
            <p>Congratulations! Your SuperPrompt account is now active and ready to supercharge your prompt engineering.</p>
            
            <h3>🎯 What you can do now:</h3>
            
            <div class="feature">
              <h4>✨ Instant Prompt Enhancement</h4>
              <p>Highlight any text on any website and get AI-powered improvements instantly.</p>
            </div>
            
            <div class="feature">
              <h4>📚 Smart Prompt Library</h4>
              <p>Save, organize, and sync your best prompts across all your devices.</p>
            </div>
            
            <div class="feature">
              <h4>🏷️ Tags & Folders</h4>
              <p>Keep your prompts organized with custom tags and folders.</p>
            </div>
            
            <div class="feature">
              <h4>📊 Usage Analytics</h4>
              <p>Track your most effective prompts and see your improvement over time.</p>
            </div>
            
            <p style="text-align: center;">
              <a href="${dashboardUrl}" class="button">Open Dashboard</a>
            </p>
            
            <h3>🔧 Quick Start Guide:</h3>
            <ol>
              <li>Install the Chrome extension (if you haven't already)</li>
              <li>Visit any website and highlight some text</li>
              <li>Click the SuperPrompt icon that appears</li>
              <li>Watch your text transform into a better prompt!</li>
              <li>Save your favorites to your library</li>
            </ol>
            
            <p>If you have any questions or need help getting started, we're here for you!</p>
            
            <p>Happy prompting!<br>The SuperPrompt Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 SuperPrompt. All rights reserved.</p>
            <p>Questions? Reply to this email or visit our <a href="${process.env.FRONTEND_URL}/help">Help Center</a></p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Welcome to SuperPrompt!
      
      Hi ${user.name},
      
      Congratulations! Your SuperPrompt account is now active.
      
      What you can do now:
      - Highlight text on any website for instant AI improvements
      - Save and organize prompts in your smart library
      - Use tags and folders to stay organized
      - Track your usage with analytics
      
      Quick Start:
      1. Install the Chrome extension
      2. Highlight text on any website
      3. Click the SuperPrompt icon
      4. Save your favorites!
      
      Dashboard: ${dashboardUrl}
      
      Happy prompting!
      The SuperPrompt Team
    `;

    return emailService.sendEmail({
      to: user.email,
      subject: '🚀 Welcome to SuperPrompt - You\'re all set!',
      html,
      text
    });
  }
}

module.exports = { EmailService };