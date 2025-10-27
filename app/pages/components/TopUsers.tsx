import React from 'react';
import { Users } from 'lucide-react';
import { UserStoryData } from '../types';

interface TopUsersProps {
  data: UserStoryData[];
}

const TopUsers: React.FC<TopUsersProps> = ({ data }) => {
  // Calculate user activity
  const userData: Record<string, { count: number, projects: Set<string> }> = {};
  
  data.forEach(d => {
    if (d.user_email) {
      if (!userData[d.user_email]) {
        userData[d.user_email] = { count: 0, projects: new Set() };
      }
      userData[d.user_email].count += 1;
      if (d.project_name) {
        userData[d.user_email].projects.add(d.project_name);
      }
    }
  });
  
  const topUsers = Object.entries(userData)
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Top Users</h3>
          <p className="text-sm text-slate-400">Most active users by story count</p>
        </div>
        <Users className="w-5 h-5 text-slate-400" />
      </div>
      
      {topUsers.length > 0 ? (
        <div className="space-y-3">
          {topUsers.map(([user, stats], idx) => (
            <div key={user} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-purple-400">{user.substring(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-medium text-white truncate max-w-[180px]" title={user}>{user}</p>
                  <div className="flex items-center text-sm text-slate-400">
                    <span>{stats.count} stories</span>
                    <span className="mx-2">•</span>
                    <span>{stats.projects.size} projects</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-purple-400">
                  {data.length > 0 ? ((stats.count / data.length) * 100).toFixed(1) : '0'}%
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-6 text-slate-400">
          <p>No user data available</p>
        </div>
      )}
    </div>
  );
};

export default TopUsers;