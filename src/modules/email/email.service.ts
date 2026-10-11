import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../config/env';
import {
  EmailContent,
  passwordChangedTemplate,
  passwordResetTemplate,
  propertyDeletedTemplate,
  propertyListedTemplate,
  verifyEmailTemplate,
  welcomeTemplate,
} from './templates';

interface Recipient {
  email: string;
  firstName: string;
}

class EmailService {
  private transporter: Transporter | null = null;

  private getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      });
    }
    return this.transporter;
  }

  /**
   * Sends an email. Failures are logged but never thrown, so a mail outage
   * can't break the API request that triggered the notification.
   */
  async send(to: string, content: EmailContent): Promise<void> {
    if (!env.EMAIL_ENABLED) {
      console.log(`[email:disabled] to=${to} subject="${content.subject}"\n${content.text}\n`);
      return;
    }

    try {
      await this.getTransporter().sendMail({
        from: env.EMAIL_FROM,
        to,
        subject: content.subject,
        html: content.html,
        text: content.text,
      });
    } catch (error) {
      console.error(`[email] Failed to send "${content.subject}" to ${to}:`, error);
    }
  }

  sendWelcomeEmail(user: Recipient, verificationToken: string) {
    const url = `${env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    return this.send(user.email, welcomeTemplate(user.firstName, url));
  }

  sendVerificationEmail(user: Recipient, verificationToken: string) {
    const url = `${env.CLIENT_URL}/verify-email?token=${verificationToken}`;
    return this.send(user.email, verifyEmailTemplate(user.firstName, url));
  }

  sendPasswordResetEmail(user: Recipient, resetToken: string) {
    const url = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
    return this.send(user.email, passwordResetTemplate(user.firstName, url));
  }

  sendPasswordChangedEmail(user: Recipient) {
    return this.send(user.email, passwordChangedTemplate(user.firstName));
  }

  sendPropertyListedEmail(
    user: Recipient,
    property: { id: string; title: string; price: number; currency: string; city: string },
  ) {
    const url = `${env.CLIENT_URL}/properties/${property.id}`;
    return this.send(user.email, propertyListedTemplate(user.firstName, property, url));
  }

  sendPropertyDeletedEmail(user: Recipient, title: string) {
    return this.send(user.email, propertyDeletedTemplate(user.firstName, title));
  }
}

export const emailService = new EmailService();
