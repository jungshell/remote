import { Subscription, PaymentHistory, UserSettings, NotificationHistory, ISubscription, IPaymentHistory, IUserSettings, INotificationHistory } from '@/lib/models';
import connectToDatabase from '@/lib/mongodb';

// Helper to ensure DB connection
async function db() {
    await connectToDatabase();
}

// Interface definitions (kept for type compatibility)
export type { ISubscription as Subscription, IPaymentHistory as PaymentHistory, IUserSettings as UserSettings, INotificationHistory as NotificationHistory };

export const storage = {
    subscriptions: {
        async getAll(): Promise<ISubscription[]> {
            await db();
            const docs = await Subscription.find({}).lean();
            return docs.map(doc => ({ ...doc, id: doc.id || doc._id.toString() })) as ISubscription[];
        },

        // Deprecated: save all is not efficient in DB, but kept for signature compatibility if needed. 
        // In this refactor, we prefer individual operations.
        async save(subscriptions: ISubscription[]) {
            // Not implemented for MongoDB as we don't overwrite all
            console.warn('storage.subscriptions.save() is deprecated for MongoDB');
        },

        async add(subscription: Omit<ISubscription, 'id' | 'created_at' | 'updated_at'>) {
            await db();
            const id = crypto.randomUUID();
            const now = new Date().toISOString();

            const newDoc = await Subscription.create({
                ...subscription,
                id,
                created_at: now,
                updated_at: now
            });

            // Return plain object
            return newDoc.toObject() as ISubscription;
        },

        async update(id: string, updates: Partial<ISubscription>) {
            await db();
            const updated = await Subscription.findOneAndUpdate(
                { id },
                { ...updates, updated_at: new Date().toISOString() },
                { new: true, lean: true }
            );

            if (!updated) throw new Error('Subscription not found');
            return updated as ISubscription;
        },

        async delete(id: string) {
            await db();
            await Subscription.findOneAndDelete({ id });
        },

        async findByUserId(userId: string): Promise<ISubscription[]> {
            await db();
            const docs = await Subscription.find({ user_id: userId }).lean();
            return docs.map(doc => ({ ...doc, id: doc.id || doc._id.toString() })) as ISubscription[];
        }
    },

    paymentHistory: {
        async getAll(): Promise<IPaymentHistory[]> {
            await db();
            const docs = await PaymentHistory.find({}).lean();
            return docs as unknown as IPaymentHistory[];
        },

        async save(history: IPaymentHistory[]) {
            console.warn('storage.paymentHistory.save() is deprecated');
        },

        async add(record: Omit<IPaymentHistory, 'id' | 'created_at'>) {
            await db();
            const id = crypto.randomUUID();
            const newDoc = await PaymentHistory.create({
                ...record,
                id,
                created_at: new Date().toISOString()
            });
            return newDoc.toObject() as IPaymentHistory;
        },

        async findByUserId(userId: string): Promise<IPaymentHistory[]> {
            await db();
            const docs = await PaymentHistory.find({ user_id: userId }).lean();
            return docs as unknown as IPaymentHistory[];
        }
    },

    userSettings: {
        async getAll(): Promise<IUserSettings[]> {
            await db();
            return UserSettings.find({}).lean() as unknown as IUserSettings[];
        },
        async save(settings: IUserSettings[]) {
            console.warn('storage.userSettings.save() deprecated');
        },
        async get(userId: string): Promise<IUserSettings | null> {
            await db();
            const doc = await UserSettings.findOne({ user_id: userId }).lean();
            return (doc as unknown as IUserSettings) || null;
        },
        async upsert(userId: string, updates: Partial<IUserSettings>) {
            await db();
            const now = new Date().toISOString();

            // Try to find one first to decide if insert or update (for created_at logic if needed, though upset handles it)
            // Using findOneAndUpdate with upsert: true
            const result = await UserSettings.findOneAndUpdate(
                { user_id: userId },
                {
                    $set: { ...updates, updated_at: now },
                    $setOnInsert: {
                        id: crypto.randomUUID(),
                        created_at: now,
                        notification_enabled: true,
                        notification_days_before: 3
                    }
                },
                { upsert: true, new: true, lean: true }
            );

            return result as unknown as IUserSettings;
        }
    },

    notificationHistory: {
        async getAll(): Promise<INotificationHistory[]> {
            await db();
            return NotificationHistory.find({}).lean() as unknown as INotificationHistory[];
        },
        async save(history: INotificationHistory[]) {
            console.warn('storage.notificationHistory.save() deprecated');
        },
        async add(record: Omit<INotificationHistory, 'id' | 'created_at'>) {
            await db();
            const id = crypto.randomUUID();
            const newDoc = await NotificationHistory.create({
                ...record,
                id,
                created_at: new Date().toISOString()
            });
            return newDoc.toObject() as INotificationHistory;
        },
        async exists(subscriptionId: string, date: string, daysBefore: number, status: 'sent'): Promise<boolean> {
            await db();
            const count = await NotificationHistory.countDocuments({
                subscription_id: subscriptionId,
                notification_date: date,
                days_before_billing: daysBefore,
                status: status
            });
            return count > 0;
        }
    }
};
