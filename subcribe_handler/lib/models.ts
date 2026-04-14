import mongoose, { Schema, Document, Model } from 'mongoose';

// Subscription Schema
export interface ISubscription extends Document {
    id: string; // Maintain compatibility with string IDs
    user_id: string;
    service_name: string;
    amount: number;
    currency: string;
    next_billing_date: string;
    cycle: 'monthly' | 'yearly' | 'weekly' | 'quarterly';
    status: 'active' | 'cancelled';
    category?: string;
    tags?: string[];
    billing_email?: string;
    service_url?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

const SubscriptionSchema = new Schema<ISubscription>({
    id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true, index: true },
    service_name: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'KRW' },
    next_billing_date: { type: String, required: true },
    cycle: { type: String, enum: ['monthly', 'yearly', 'weekly', 'quarterly'], required: true },
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
    category: { type: String },
    tags: { type: [String] },
    billing_email: { type: String },
    service_url: { type: String },
    notes: { type: String },
    created_at: { type: String, default: () => new Date().toISOString() },
    updated_at: { type: String, default: () => new Date().toISOString() }
}, { timestamps: false }); // We manage timestamps manually to match existing logic

// PaymentHistory Schema
export interface IPaymentHistory extends Document {
    id: string;
    user_id: string;
    subscription_id: string;
    payment_date: string;
    amount: number;
    currency: string;
    status: 'paid' | 'failed' | 'refunded';
    notes?: string;
    created_at: string;
}

const PaymentHistorySchema = new Schema<IPaymentHistory>({
    id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true, index: true },
    subscription_id: { type: String, required: true, index: true },
    payment_date: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'KRW' },
    status: { type: String, enum: ['paid', 'failed', 'refunded'], default: 'paid' },
    notes: { type: String },
    created_at: { type: String, default: () => new Date().toISOString() }
});

// UserSettings Schema
export interface IUserSettings extends Document {
    id: string;
    user_id: string;
    slack_webhook_url?: string;
    notification_enabled: boolean;
    notification_days_before: number;
    notification_days_before_array?: number[];
    email_notifications?: boolean;
    email_address?: string;
    created_at: string;
    updated_at: string;
}

const UserSettingsSchema = new Schema<IUserSettings>({
    id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true, unique: true },
    slack_webhook_url: { type: String },
    notification_enabled: { type: Boolean, default: true },
    notification_days_before: { type: Number, default: 3 },
    notification_days_before_array: { type: [Number] },
    email_notifications: { type: Boolean },
    email_address: { type: String },
    created_at: { type: String, default: () => new Date().toISOString() },
    updated_at: { type: String, default: () => new Date().toISOString() }
});

// NotificationHistory Schema
export interface INotificationHistory extends Document {
    id: string;
    user_id: string;
    subscription_id: string;
    notification_date: string;
    days_before_billing: number;
    status: 'sent' | 'failed' | 'retrying';
    slack_webhook_url?: string;
    error_message?: string;
    retry_count: number;
    created_at: string;
}

const NotificationHistorySchema = new Schema<INotificationHistory>({
    id: { type: String, required: true, unique: true },
    user_id: { type: String, required: true, index: true },
    subscription_id: { type: String, required: true },
    notification_date: { type: String, required: true },
    days_before_billing: { type: Number, required: true },
    status: { type: String, enum: ['sent', 'failed', 'retrying'], required: true },
    slack_webhook_url: { type: String },
    error_message: { type: String },
    retry_count: { type: Number, default: 0 },
    created_at: { type: String, default: () => new Date().toISOString() }
});

// Export models, preventing overwrite in dev hot reload
export const Subscription = mongoose.models.Subscription || mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
export const PaymentHistory = mongoose.models.PaymentHistory || mongoose.model<IPaymentHistory>('PaymentHistory', PaymentHistorySchema);
export const UserSettings = mongoose.models.UserSettings || mongoose.model<IUserSettings>('UserSettings', UserSettingsSchema);
export const NotificationHistory = mongoose.models.NotificationHistory || mongoose.model<INotificationHistory>('NotificationHistory', NotificationHistorySchema);
