import React, { useMemo } from 'react';
import { BarChart3, Calendar, Clock } from 'lucide-react';
import { UserStoryData } from '../types';

interface UsageByTimeProps {
  data: UserStoryData[];
}

interface DayData {
  date: string;
  count: number;
}

interface HourData {
  hour: string;
  count: number;
}

const UsageByTime: React.FC<UsageByTimeProps> = ({ data }) => {
  // Calculate usage by day and hour from actual data
  const { byDay, byHour } = useMemo(() => {
    const dayMap = new Map<string, number>();
    const hourMap = new Map<string, number>();
    
    // Process each data item
    data.forEach(item => {
      // Handle day counting
      if (item.date) {
        const dayCount = dayMap.get(item.date) || 0;
        dayMap.set(item.date, dayCount + 1);
      }
      
      // Handle hour counting
      if (item.time) {
        const hour = item.time.slice(0, 2); // Extract hour part (HH)
        const hourCount = hourMap.get(hour) || 0;
        hourMap.set(hour, hourCount + 1);
      }
    });
    
    // Convert maps to sorted arrays
    const byDay: DayData[] = Array.from(dayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Last 7 days
    
    // For hours, ensure we have all 24 hours (00-23)
    const byHour: HourData[] = [];
    for (let i = 0; i < 24; i++) {
      const hour = i.toString().padStart(2, '0');
      byHour.push({ hour, count: hourMap.get(hour) || 0 });
    }
    
    return { byDay, byHour };
  }, [data]);
  
  // Find max counts for scaling
  const maxDayCount = Math.max(...byDay.map(d => d.count), 1);
  const maxHourCount = Math.max(...byHour.map(h => h.count), 1);
  
  // Format day labels for display
  const formatDay = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Usage Patterns</h3>
          <p className="text-sm text-slate-400">Activity distribution by time</p>
        </div>
        <Calendar className="w-5 h-5 text-slate-400" />
      </div>
      
      {/* No data message */}
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center">
          <p className="text-slate-500">No data available</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Usage by day */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <Calendar className="w-4 h-4" />
              <span>Activity by day</span>
            </div>
            <div className="h-36 flex items-end gap-1 mt-2">
              {byDay.map((item) => (
                <div key={item.date} className="flex-1 flex flex-col items-center group">
                  <div 
                    className="bg-blue-500 rounded-t-sm w-full transition-all duration-300 relative"
                    style={{ height: `${(item.count / maxDayCount) * 100}%` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded pointer-events-none transition-opacity">
                      {item.count} stories
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 mt-2 truncate w-full text-center" title={item.date}>
                    {formatDay(item.date)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Usage by hour */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <Clock className="w-4 h-4" />
              <span>Activity by hour (24h)</span>
            </div>
            <div className="h-36 flex items-end gap-px mt-2">
              {byHour.map((item) => (
                <div key={item.hour} className="flex-1 flex flex-col items-center group">
                  <div 
                    className={`${parseInt(item.hour) >= 7 && parseInt(item.hour) <= 19 ? 'bg-green-500' : 'bg-purple-500'} rounded-t-sm w-full transition-all duration-300 relative`}
                    style={{ height: `${(item.count / maxHourCount) * 100}%` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-2 py-1 rounded pointer-events-none transition-opacity">
                      {item.count} stories
                    </div>
                  </div>
                  {/* Only display hours divisible by 3 to avoid crowding */}
                  {parseInt(item.hour) % 3 === 0 && (
                    <span className="text-xs text-slate-400 mt-2">{item.hour}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageByTime;