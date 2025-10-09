import { db } from './firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit, Timestamp, increment } from 'firebase/firestore';

export interface PageView {
  id: string;
  page: string;
  timestamp: Date;
  userAgent: string;
  referrer: string;
  sessionId: string;
  ipAddress?: string;
  country?: string;
  city?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  screenResolution: string;
  timeOnPage: number;
  isNewVisitor: boolean;
  isReturningVisitor: boolean;
}

export interface VisitorSession {
  id: string;
  startTime: Date;
  endTime?: Date;
  pageViews: string[];
  totalTime: number;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  country?: string;
  city?: string;
}

export interface AnalyticsData {
  totalVisitors: number;
  uniqueVisitors: number;
  pageViews: number;
  averageSessionDuration: number;
  bounceRate: number;
  topPages: Array<{ page: string; views: number }>;
  topReferrers: Array<{ referrer: string; visits: number }>;
  deviceBreakdown: Array<{ device: string; percentage: number }>;
  browserBreakdown: Array<{ browser: string; percentage: number }>;
  hourlyTraffic: Array<{ hour: number; visitors: number }>;
  dailyTraffic: Array<{ date: string; visitors: number }>;
}

class Analytics {
  private sessionId: string;
  private sessionStartTime: Date;
  private currentPageStartTime: Date;

  // Helper function to sanitize page paths for Firestore document IDs
  private sanitizePagePath(page: string): string {
    return page.replace(/\//g, '_').replace(/^_+|_+$/g, '') || 'home';
  }

  // Helper function to convert Firestore timestamp to Date
  private convertToDate(timestamp: any): Date {
    try {
      if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
        // Firestore Timestamp
        const date = timestamp.toDate();
        return isNaN(date.getTime()) ? new Date() : date;
      } else if (timestamp && typeof timestamp === 'string') {
        // String timestamp
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? new Date() : date;
      } else if (timestamp && typeof timestamp === 'number') {
        // Unix timestamp
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? new Date() : date;
      } else if (timestamp instanceof Date) {
        // Already a Date object
        return isNaN(timestamp.getTime()) ? new Date() : timestamp;
      } else {
        // Invalid timestamp, use current date
        return new Date();
      }
    } catch (error) {
      console.warn('Error converting timestamp to Date:', timestamp, error);
      return new Date();
    }
  }

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = new Date();
    this.currentPageStartTime = new Date();
    this.initializeSession();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    }
    if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile/i.test(userAgent)) {
      return 'mobile';
    }
    return 'desktop';
  }

  private getBrowser(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    return 'Other';
  }

  private getOS(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Other';
  }

  private async initializeSession() {
    const sessionData: VisitorSession = {
      id: this.sessionId,
      startTime: this.sessionStartTime,
      pageViews: [],
      totalTime: 0,
      deviceType: this.getDeviceType(),
      browser: this.getBrowser(),
      os: this.getOS(),
    };

    try {
      await setDoc(doc(db, 'visitor_sessions', this.sessionId), sessionData);
    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }

  async trackPageView(page: string): Promise<void> {
    if (!page || typeof page !== 'string') {
      console.warn('Invalid page path provided to trackPageView:', page);
      return;
    }

    const now = new Date();
    const timeOnPage = this.currentPageStartTime 
      ? now.getTime() - this.currentPageStartTime.getTime() 
      : 0;
    
    const pageView: PageView = {
      id: `${this.sessionId}-${Date.now()}`,
      page,
      timestamp: now,
      userAgent: navigator.userAgent || 'Unknown',
      referrer: document.referrer || 'Direct',
      sessionId: this.sessionId,
      deviceType: this.getDeviceType(),
      browser: this.getBrowser(),
      os: this.getOS(),
      screenResolution: `${screen.width}x${screen.height}`,
      timeOnPage,
      isNewVisitor: !localStorage.getItem('returning_visitor'),
      isReturningVisitor: !!localStorage.getItem('returning_visitor'),
    };

    // Mark as returning visitor
    if (!localStorage.getItem('returning_visitor')) {
      localStorage.setItem('returning_visitor', 'true');
    }

    try {
      // Save page view
      await setDoc(doc(db, 'page_views', pageView.id), pageView);
      
      // Update session
      const sessionRef = doc(db, 'visitor_sessions', this.sessionId);
      await setDoc(sessionRef, {
        pageViews: increment(1),
        totalTime: increment(timeOnPage),
      }, { merge: true });

      // Update daily stats
      const today = new Date().toISOString().split('T')[0];
      const dailyStatsRef = doc(db, 'daily_stats', today);
      await setDoc(dailyStatsRef, {
        totalVisitors: increment(1),
        pageViews: increment(1),
        date: today,
      }, { merge: true });

      // Update page stats - sanitize page path for Firestore document ID
      const sanitizedPage = this.sanitizePagePath(page);
      const pageStatsRef = doc(db, 'page_stats', sanitizedPage);
      await setDoc(pageStatsRef, {
        views: increment(1),
        page,
      }, { merge: true });

    } catch (error) {
      console.error('Error tracking page view:', error);
    }

    this.currentPageStartTime = now;
  }

  async endSession(): Promise<void> {
    const now = new Date();
    const totalTime = now.getTime() - this.sessionStartTime.getTime();

    try {
      const sessionRef = doc(db, 'visitor_sessions', this.sessionId);
      await setDoc(sessionRef, {
        endTime: now,
        totalTime,
      }, { merge: true });
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  async getAnalyticsData(days: number = 30): Promise<AnalyticsData> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

    try {
      // Get page views in date range
      const pageViewsQuery = query(
        collection(db, 'page_views'),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate)
      );
      const pageViewsSnapshot = await getDocs(pageViewsQuery);
      const pageViews = pageViewsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: this.convertToDate(data.timestamp)
        } as PageView;
      });

      // Get sessions in date range
      const sessionsQuery = query(
        collection(db, 'visitor_sessions'),
        where('startTime', '>=', startDate),
        where('startTime', '<=', endDate)
      );
      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessions = sessionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          startTime: this.convertToDate(data.startTime),
          endTime: data.endTime ? this.convertToDate(data.endTime) : undefined
        } as VisitorSession;
      });

      // Calculate statistics
      const totalVisitors = sessions.length;
      const uniqueVisitors = new Set(sessions.map(s => s.id)).size;
      const totalPageViews = pageViews.length;
      
      const totalSessionTime = sessions.reduce((sum, session) => sum + (session.totalTime || 0), 0);
      const averageSessionDuration = totalVisitors > 0 ? totalSessionTime / totalVisitors : 0;

      // Calculate bounce rate (sessions with only 1 page view)
      const bounceSessions = sessions.filter(s => (s.pageViews as any) <= 1).length;
      const bounceRate = totalVisitors > 0 ? (bounceSessions / totalVisitors) * 100 : 0;

      // Top pages
      const pageCounts: { [key: string]: number } = {};
      pageViews.forEach(view => {
        pageCounts[view.page] = (pageCounts[view.page] || 0) + 1;
      });
      const topPages = Object.entries(pageCounts)
        .map(([page, views]) => ({ page, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // Top referrers
      const referrerCounts: { [key: string]: number } = {};
      pageViews.forEach(view => {
        const referrer = view.referrer || 'Direct';
        referrerCounts[referrer] = (referrerCounts[referrer] || 0) + 1;
      });
      const topReferrers = Object.entries(referrerCounts)
        .map(([referrer, visits]) => ({ referrer, visits }))
        .sort((a, b) => b.visits - a.visits)
        .slice(0, 10);

      // Device breakdown
      const deviceCounts: { [key: string]: number } = {};
      sessions.forEach(session => {
        deviceCounts[session.deviceType] = (deviceCounts[session.deviceType] || 0) + 1;
      });
      const deviceBreakdown = Object.entries(deviceCounts)
        .map(([device, count]) => ({ 
          device, 
          percentage: totalVisitors > 0 ? (count / totalVisitors) * 100 : 0 
        }))
        .sort((a, b) => b.percentage - a.percentage);

      // Browser breakdown
      const browserCounts: { [key: string]: number } = {};
      sessions.forEach(session => {
        browserCounts[session.browser] = (browserCounts[session.browser] || 0) + 1;
      });
      const browserBreakdown = Object.entries(browserCounts)
        .map(([browser, count]) => ({ 
          browser, 
          percentage: totalVisitors > 0 ? (count / totalVisitors) * 100 : 0 
        }))
        .sort((a, b) => b.percentage - a.percentage);

      // Hourly traffic
      const hourlyCounts: { [key: number]: number } = {};
      pageViews.forEach(view => {
        try {
          const hour = view.timestamp.getHours();
          hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
        } catch (error) {
          console.warn('Invalid timestamp for hourly traffic calculation:', view.timestamp, error);
          // Use current hour as fallback
          const fallbackHour = new Date().getHours();
          hourlyCounts[fallbackHour] = (hourlyCounts[fallbackHour] || 0) + 1;
        }
      });
      const hourlyTraffic = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        visitors: hourlyCounts[hour] || 0
      }));

      // Daily traffic
      const dailyCounts: { [key: string]: number } = {};
      pageViews.forEach(view => {
        try {
          const date = view.timestamp.toISOString().split('T')[0];
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        } catch (error) {
          console.warn('Invalid timestamp for daily traffic calculation:', view.timestamp, error);
          // Use current date as fallback
          const fallbackDate = new Date().toISOString().split('T')[0];
          dailyCounts[fallbackDate] = (dailyCounts[fallbackDate] || 0) + 1;
        }
      });
      const dailyTraffic = Object.entries(dailyCounts)
        .map(([date, visitors]) => ({ date, visitors }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalVisitors,
        uniqueVisitors,
        pageViews: totalPageViews,
        averageSessionDuration,
        bounceRate,
        topPages,
        topReferrers,
        deviceBreakdown,
        browserBreakdown,
        hourlyTraffic,
        dailyTraffic,
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      throw error;
    }
  }

  async getRealTimeVisitors(): Promise<number> {
    try {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      const activeSessionsQuery = query(
        collection(db, 'visitor_sessions'),
        where('startTime', '>=', fiveMinutesAgo)
      );
      const snapshot = await getDocs(activeSessionsQuery);
      
      // Filter out sessions with invalid timestamps
      const validSessions = snapshot.docs.filter(doc => {
        const data = doc.data();
        const startTime = this.convertToDate(data.startTime);
        return startTime >= fiveMinutesAgo;
      });
      
      return validSessions.length;
    } catch (error) {
      console.error('Error getting real-time visitors:', error);
      return 0;
    }
  }
}

// Create singleton instance
export const analytics = new Analytics();

// Auto-track page views
if (typeof window !== 'undefined') {
  // Track initial page view
  analytics.trackPageView(window.location.pathname);

  // Track navigation changes
  let currentPath = window.location.pathname;
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== currentPath) {
      analytics.trackPageView(window.location.pathname);
      currentPath = window.location.pathname;
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Track session end
  window.addEventListener('beforeunload', () => {
    analytics.endSession();
  });
} 