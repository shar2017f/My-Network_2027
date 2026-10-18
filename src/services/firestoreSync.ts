import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import {
  PrintBatch,
  SheetLeaf,
  CustodyTransfer,
  Outlet,
  DeliveryVoucher,
  PaymentVoucher,
  DirectSale,
  CashHandover,
  SettlementRequest,
  DamagedCardRecord,
  AuditLogItem,
  DistributorPermissions,
} from '../types';

export interface CloudNetworkState {
  batches: PrintBatch[];
  sheets: SheetLeaf[];
  transfers: CustodyTransfer[];
  outlets: Outlet[];
  deliveries: DeliveryVoucher[];
  payments: PaymentVoucher[];
  directSales: DirectSale[];
  cashHandovers: CashHandover[];
  settlements: SettlementRequest[];
  damagedCards: DamagedCardRecord[];
  auditLogs: AuditLogItem[];
  permissions: DistributorPermissions;
  adminPin: string;
  distributorPin?: string;
  criticalThresholds?: Record<string, number>;
  lastUpdatedBy?: string;
  updatedAt?: any;
}

export interface CloudLiveEvent {
  id: string;
  eventType:
    | 'BATCH_CREATED'
    | 'TRANSFER_CREATED'
    | 'DELIVERY_CREATED'
    | 'PAYMENT_RECEIVED'
    | 'CASH_HANDOVER'
    | 'SETTLEMENT_RESOLVED'
    | 'DAMAGE_REPORTED'
    | 'LOW_STOCK_ALERT';
  title: string;
  message: string;
  actorRole: 'admin' | 'distributor';
  targetRole: 'admin' | 'distributor' | 'all';
  amount?: number;
  category?: string;
  sheetsCount?: number;
  outletName?: string;
  timestamp: number;
}

export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as unknown as T;
  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      if (value === undefined) {
        return null;
      }
      return value;
    })
  );
}

const STATE_DOC_REF = doc(db, 'system_data', 'network_state');
const EVENT_DOC_REF = doc(db, 'system_data', 'latest_event');

export class FirestoreSyncService {
  private isListeningState = false;
  private isListeningEvents = false;
  private unsubscribeState: (() => void) | null = null;
  private unsubscribeEvents: (() => void) | null = null;
  private lastProcessedEventId: string | null = null;
  public isConnected = false;

  // 1. Subscribe to real-time full state changes
  subscribeToCloudState(
    onRemoteUpdate: (state: CloudNetworkState) => void,
    onError?: (err: any) => void
  ) {
    if (this.isListeningState && this.unsubscribeState) {
      this.unsubscribeState();
    }

    try {
      this.unsubscribeState = onSnapshot(
        STATE_DOC_REF,
        (snapshot) => {
          this.isConnected = true;
          if (snapshot.exists()) {
            const data = snapshot.data() as CloudNetworkState;
            onRemoteUpdate(data);
          }
        },
        (error) => {
          this.isConnected = false;
          console.warn('Firestore snapshot error (offline or permission):', error);
          if (onError) onError(error);
        }
      );
      this.isListeningState = true;
    } catch (e) {
      console.warn('Could not initialize snapshot listener:', e);
    }

    return () => {
      if (this.unsubscribeState) {
        this.unsubscribeState();
        this.isListeningState = false;
      }
    };
  }

  // 2. Background Snapshot Listener for instant audio/visual notifications
  subscribeToLiveEvents(
    onEventReceived: (event: CloudLiveEvent) => void,
    onError?: (err: any) => void
  ) {
    if (this.isListeningEvents && this.unsubscribeEvents) {
      this.unsubscribeEvents();
    }

    try {
      this.unsubscribeEvents = onSnapshot(
        EVENT_DOC_REF,
        (snapshot) => {
          if (snapshot.exists()) {
            const event = snapshot.data() as CloudLiveEvent;
            // Check if this is a newly emitted event that we haven't processed yet
            if (event && event.id && event.id !== this.lastProcessedEventId) {
              const now = Date.now();
              // Only trigger if emitted within the last 60 seconds (fresh)
              if (now - (event.timestamp || 0) < 60000) {
                this.lastProcessedEventId = event.id;
                onEventReceived(event);
              } else {
                this.lastProcessedEventId = event.id;
              }
            }
          }
        },
        (error) => {
          console.warn('Live events snapshot error:', error);
          if (onError) onError(error);
        }
      );
      this.isListeningEvents = true;
    } catch (e) {
      console.warn('Could not initialize live events listener:', e);
    }

    return () => {
      if (this.unsubscribeEvents) {
        this.unsubscribeEvents();
        this.isListeningEvents = false;
      }
    };
  }

  // 3. Emit a live event to Firestore to trigger instant sound/visual alert on other devices
  async emitLiveEvent(event: Omit<CloudLiveEvent, 'id' | 'timestamp'>) {
    const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    this.lastProcessedEventId = eventId; // Mark local as already processed
    const fullEvent: CloudLiveEvent = {
      ...event,
      id: eventId,
      timestamp: Date.now(),
    };

    try {
      const sanitized = sanitizeForFirestore(fullEvent);
      await setDoc(EVENT_DOC_REF, sanitized);
    } catch (err) {
      console.warn('Could not emit live event to Firestore:', err);
    }
  }

  // 4. Push local updates to the cloud for state mirroring
  async syncToCloud(state: Omit<CloudNetworkState, 'updatedAt'>, updatedByRole: string) {
    try {
      const sanitized = sanitizeForFirestore(state);
      await setDoc(
        STATE_DOC_REF,
        {
          ...sanitized,
          lastUpdatedBy: updatedByRole,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      this.isConnected = true;
      return true;
    } catch (err) {
      console.error('Error syncing state to Firestore:', err);
      return false;
    }
  }

  // 5. Initial pull from cloud
  async fetchCloudState(): Promise<CloudNetworkState | null> {
    try {
      const snap = await getDoc(STATE_DOC_REF);
      if (snap.exists()) {
        this.isConnected = true;
        return snap.data() as CloudNetworkState;
      }
      return null;
    } catch (err) {
      console.warn('Error fetching cloud state:', err);
      return null;
    }
  }
}

export const cloudSync = new FirestoreSyncService();
