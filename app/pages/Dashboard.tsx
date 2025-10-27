"use client";

import React from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import components
import StatsOverview from './components/StatsOverview';
import StatusBreakdown from './components/StatusBreakdown';
import TopProjects from './components/TopProjects';
import TopTemplates from './components/TopTemplates';
import TopUsers from './components/TopUsers';
import ActivityTimeline from './components/ActivityTimeline';
import DataTable from './components/DataTable';

// Types
import { TimeWindow, UserStoryData } from './types';

export default function Dashboard() {
  // State management
  const [activeTab, setActiveTab] = React.useState("overview");
  const [timeWindow, setTimeWindow] = React.useState('Last 24 Hours');
  const [data, setData] = React.useState<UserStoryData[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastFetched, setLastFetched] = React.useState<Date | null>(null);

  // Time windows options
  const timeWindows: TimeWindow[] = [
    { label: 'Last 1 Hour', hours: 1 },
    { label: 'Last 6 Hours', hours: 6 },
    { label: 'Last 12 Hours', hours: 12 },
    { label: 'Last 24 Hours', hours: 24 },
    { label: 'Last 3 Days', days: 3 },
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 14 Days', days: 14 },
    { label: 'Last 30 Days', days: 30 },
  ];

  // Time filter function
  const getTimeFilter = (selectedWindow: string) => {
    const now = new Date();
    const selected = timeWindows.find(w => w.label === selectedWindow);
    
    if (!selected) {
      return { fromTime: null, toTime: now };
    }
    
    let fromTime = new Date(now);
    if (selected.hours !== undefined) {
      fromTime.setHours(now.getHours() - selected.hours);
    } else if (selected.days !== undefined) {
      fromTime.setDate(now.getDate() - selected.days);
    }

    return { fromTime, toTime: now };
  };

  // Fetch data with time filters for overview
  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { fromTime, toTime } = getTimeFilter(timeWindow);
      
      // Build query parameters
      const params = new URLSearchParams();
      if (fromTime) {
        params.append('fromTime', fromTime.toISOString());
      }
      params.append('toTime', toTime.toISOString());
      
      const apiUrl = `/api/artifacts?${params.toString()}`;
      console.log('Fetching data from:', apiUrl);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('API response:', result);
      setData(Array.isArray(result) ? result : []);
      setLastFetched(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and when filters change
  React.useEffect(() => {
    fetchAnalyticsData();
  }, [timeWindow]);

  // Handle tab changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-900">
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Analytics Dashboard</h1>
            <p className="text-slate-400">
              Monitor user story generation and track usage patterns
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Select value={timeWindow} onValueChange={setTimeWindow}>
              <SelectTrigger className="w-full sm:w-[180px] bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select time window" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                {timeWindows.map((window) => (
                  <SelectItem key={window.label} value={window.label} className="focus:bg-slate-700 focus:text-white">
                    {window.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button 
              onClick={fetchAnalyticsData}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </div>
        
        {lastFetched && (
          <div className="flex items-center text-sm text-slate-400">
            <Clock className="mr-1 h-4 w-4" />
            Last updated: {lastFetched.toLocaleString()}
          </div>
        )}
        
        {error && (
          <div className="p-4 mb-4 text-sm rounded-md border border-red-600 bg-red-900/20 text-red-400">
            <p>Error: {error}</p>
          </div>
        )}
        
        <Tabs 
          defaultValue="overview" 
          value={activeTab} 
          onValueChange={handleTabChange}
          className="space-y-6"
        >
          <TabsList className="grid w-full md:w-[400px] grid-cols-2 bg-slate-800 p-1">
            <TabsTrigger 
              value="overview"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="data"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              Data Table
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            {loading ? (
              <div className="text-center py-12 text-slate-400">
                <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4" />
                <p>Loading analytics data...</p>
              </div>
            ) : (
              <>
                {/* Stats Overview */}
                <StatsOverview data={data} />
                
                {/* Status Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <StatusBreakdown data={data} />
                  <TopProjects data={data} />
                </div>
                
                {/* Templates and Users */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <TopTemplates data={data} />
                  <TopUsers data={data} />
                </div>
                
                {/* Activity Timeline */}
                <ActivityTimeline data={data} />
                
                {/* Show empty state if no data */}
                {data.length === 0 && !loading && (
                  <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-12 text-center border border-slate-700">
                    <p className="text-slate-400 text-lg">No data available for the selected time period.</p>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="data">
            <DataTable 
              initialData={data} 
              timeWindow={timeWindow}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}