import { button, escapeHtml, layout } from './layout';

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

export const welcomeTemplate = (name: string, verifyUrl: string): EmailContent => ({
  subject: 'Welcome to Real Estate – verify your email',
  html: layout(
    `Welcome, ${escapeHtml(name)}!`,
    `<p>Thanks for creating an account. Please confirm your email address to get started.</p>
     ${button(verifyUrl, 'Verify email')}
     <p>This link expires in 24 hours.</p>`,
  ),
  text: `Welcome, ${name}! Verify your email address: ${verifyUrl} (expires in 24 hours)`,
});

export const verifyEmailTemplate = (name: string, verifyUrl: string): EmailContent => ({
  subject: 'Verify your email address',
  html: layout(
    'Verify your email',
    `<p>Hi ${escapeHtml(name)},</p>
     <p>Please confirm your email address by clicking the button below.</p>
     ${button(verifyUrl, 'Verify email')}
     <p>This link expires in 24 hours.</p>`,
  ),
  text: `Hi ${name}, verify your email address: ${verifyUrl} (expires in 24 hours)`,
});

export const passwordResetTemplate = (name: string, resetUrl: string): EmailContent => ({
  subject: 'Reset your password',
  html: layout(
    'Reset your password',
    `<p>Hi ${escapeHtml(name)},</p>
     <p>We received a request to reset your password. Click the button below to choose a new one.</p>
     ${button(resetUrl, 'Reset password')}
     <p>This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>`,
  ),
  text: `Hi ${name}, reset your password: ${resetUrl} (expires in 1 hour). If you didn't request this, ignore this email.`,
});

export const passwordChangedTemplate = (name: string): EmailContent => ({
  subject: 'Your password was changed',
  html: layout(
    'Password changed',
    `<p>Hi ${escapeHtml(name)},</p>
     <p>Your password was changed successfully. If you did not make this change, please reset your password immediately and contact support.</p>`,
  ),
  text: `Hi ${name}, your password was changed. If this wasn't you, reset your password immediately.`,
});

interface PropertySummary {
  id: string;
  title: string;
  price: number;
  currency: string;
  city: string;
}

const formatPrice = (price: number, currency: string) => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString('en-US')}`;
  }
};

export const propertyListedTemplate = (
  name: string,
  property: PropertySummary,
  propertyUrl: string,
): EmailContent => ({
  subject: `Your listing "${property.title}" is live`,
  html: layout(
    'Your property is now listed',
    `<p>Hi ${escapeHtml(name)},</p>
     <p>Your property has been published successfully:</p>
     <table cellpadding="6" style="border-collapse:collapse;width:100%;background:#f9fafb;border-radius:6px;">
       <tr><td style="color:#6b7280;">Title</td><td><strong>${escapeHtml(property.title)}</strong></td></tr>
       <tr><td style="color:#6b7280;">Price</td><td>${formatPrice(property.price, property.currency)}</td></tr>
       <tr><td style="color:#6b7280;">City</td><td>${escapeHtml(property.city)}</td></tr>
     </table>
     ${button(propertyUrl, 'View listing')}`,
  ),
  text: `Hi ${name}, your property "${property.title}" (${formatPrice(property.price, property.currency)}, ${property.city}) is now listed: ${propertyUrl}`,
});

export const propertyDeletedTemplate = (name: string, title: string): EmailContent => ({
  subject: `Your listing "${title}" was removed`,
  html: layout(
    'Listing removed',
    `<p>Hi ${escapeHtml(name)},</p>
     <p>Your listing <strong>${escapeHtml(title)}</strong> has been removed from Real Estate.</p>`,
  ),
  text: `Hi ${name}, your listing "${title}" has been removed.`,
});
