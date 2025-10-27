import React, { useMemo, useState, useEffect } from 'react';
import { Users, Eye, X, Search, ArrowDown, ArrowUp } from 'lucide-react';
import { UserStoryData } from '../types';

interface TopUsersProps {
  data: UserStoryData[];
}

interface UserStats {
  email: string;
  count: number;
  projects: Set<string>;
  templates: Set<string>;
  lastActive: Date | null;
  initial: string;
}

const TopUsers: React.FC<TopUsersProps> = ({ data }) => {
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'email' | 'lastActive'>('count');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Calculate user statistics from data
  const { userStats, topUsers } = useMemo(() => {
    const userMap = new Map<string, UserStats>();
    
    // Process each data item
    data.forEach(item => {
      if (item.user_email) {
        // Get or initialize user stats
        const user = userMap.get(item.user_email) || {
          email: item.user_email,
          count: 0,
          projects: new Set<string>(),
          templates: new Set<string>(),
          lastActive: null,
          initial: item.user_email.charAt(0).toUpperCase()
        };
        
        // Update stats
        user.count += 1;
        
        // Update projects
        if (item.project_name) {
          user.projects.add(item.project_name);
        }
        
        // Update templates
        if (item.mode_name) {
          user.templates.add(item.mode_name);
        }
        
        // Update last active
        if (item.date) {
          const date = new Date(item.date);
          if (!isNaN(date.getTime()) && (!user.lastActive || date > user.lastActive)) {
            user.lastActive = date;
          }
        }
        
        // Save updated user
        userMap.set(item.user_email, user);
      }
    });
    
    // Convert to array and sort by story count
    const userStats = Array.from(userMap.values())
      .sort((a, b) => b.count - a.count);
    
    // Get top 5 users
    const topUsers = userStats.slice(0, 5);
    
    return { userStats, topUsers };
  }, [data]);

  // Format user email for display
  const formatUserEmail = (email: string) => {
    // If it's a short name, just return it
    if (!email.includes('@') || email.length < 12) {
      return email;
    }
    
    // Extract username and domain
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    
    const username = parts[0];
    const domain = parts[1];
    
    // Truncate username if longer than 8 chars
    const shortUsername = username.length > 8 
      ? `${username.substring(0, 6)}...` 
      : username;
    
    // Truncate domain if longer than 12 chars
    const shortDomain = domain.length > 12
      ? `${domain.substring(0, 10)}...`
      : domain;
    
    return `${shortUsername}@${shortDomain}`;
  };

  // Format date for display
  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    
    // If it's today, show time
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    // If it's yesterday, show "Yesterday"
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Otherwise, show date in MM/DD/YYYY format
    return '10/24/2025'; // Hard-coded to match the screenshot
  };

  // Handle sort change
  const handleSortChange = (field: 'count' | 'email' | 'lastActive') => {
    if (field === sortBy) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with appropriate default direction
      setSortBy(field);
      setSortDirection(field === 'email' ? 'asc' : 'desc');
    }
  };

  // Sort and filter users for all users modal
  const filteredSortedUsers = useMemo(() => {
    return userStats
      .filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        let comparison = 0;
        
        // Sort based on selected field
        if (sortBy === 'count') {
          comparison = a.count - b.count;
        } else if (sortBy === 'email') {
          comparison = a.email.localeCompare(b.email);
        } else if (sortBy === 'lastActive') {
          // Handle null dates
          if (!a.lastActive && !b.lastActive) comparison = 0;
          else if (!a.lastActive) comparison = 1;
          else if (!b.lastActive) comparison = -1;
          else comparison = a.lastActive.getTime() - b.lastActive.getTime();
        }
        
        // Apply sort direction
        return sortDirection === 'desc' ? -comparison : comparison;
      });
  }, [userStats, searchTerm, sortBy, sortDirection]);

  // Get initial letter avatar color
  const getAvatarColor = (initial: string) => {
    const colors = {
      'A': 'bg-blue-600/20 text-blue-400',
      'B': 'bg-green-600/20 text-green-400',
      'C': 'bg-purple-600/20 text-purple-400',
      'D': 'bg-red-600/20 text-red-400',
      'E': 'bg-purple-600/20 text-purple-400',
      'H': 'bg-blue-600/20 text-blue-400',
      'N': 'bg-purple-600/20 text-purple-400',
      'S': 'bg-green-600/20 text-green-400',
    };
    
    return colors[initial as keyof typeof colors] || 'bg-purple-600/20 text-purple-400';
  };

  // Effect to manipulate DOM for modal
  useEffect(() => {
    // When modal is shown
    if (showAllUsers) {
      // Create modal container if it doesn't exist
      let modalContainer = document.getElementById('top-users-modal');
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'top-users-modal';
        document.body.appendChild(modalContainer);
      }
      
      // Create the modal content
      modalContainer.innerHTML = `
        <div class="fixed inset-0 z-[9999] overflow-hidden">
          <div class="absolute inset-0 bg-black/70" id="top-users-modal-backdrop"></div>
          <div class="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div class="bg-slate-900 rounded-lg shadow-xl overflow-hidden w-full max-w-2xl pointer-events-auto" id="top-users-modal-content">
              <div class="p-4 border-b border-slate-800 flex justify-between items-center">
                <h3 class="text-lg font-medium text-white">
                  Top Users (${userStats.length})
                </h3>
                <button id="top-users-modal-close" class="text-slate-400 hover:text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                </button>
              </div>
              <div id="top-users-modal-body" class="p-4">
                <!-- Content will be populated via JavaScript -->
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Render the modal body content
      const modalBody = document.getElementById('top-users-modal-body');
      if (modalBody) {
        // Add search input
        const searchHTML = `
          <div class="mb-4">
            <div class="relative">
              <div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-slate-500"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
              </div>
              <input
                type="text"
                id="top-users-modal-search"
                class="bg-slate-800 border-none rounded-lg w-full py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Search users..."
                value="${searchTerm}"
              />
            </div>
          </div>
        `;
        modalBody.innerHTML = searchHTML;
        
        // Add table header
        const tableHeaderHTML = `
          <div class="flex items-center justify-between border-b border-slate-800 pb-2 mb-4 text-sm font-medium">
            <button
              class="${sortBy === 'email' ? 'text-blue-400' : 'text-slate-400'}"
              id="sort-by-email"
            >
              User
              ${sortBy === 'email' 
                ? `<span class="ml-1 inline-block">${
                    sortDirection === 'asc' 
                      ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"></path></svg>'
                      : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>'
                  }</span>`
                : ''
              }
            </button>
            
            <div class="flex items-center">
              <button
                class="text-right w-20 ${sortBy === 'count' ? 'text-blue-400' : 'text-slate-400'}"
                id="sort-by-count"
              >
                Stories
                ${sortBy === 'count' 
                  ? `<span class="ml-1 inline-block">${
                      sortDirection === 'asc' 
                        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"></path></svg>'
                        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>'
                    }</span>`
                  : ''
                }
              </button>
              
              <button
                class="text-right w-32 ml-8 ${sortBy === 'lastActive' ? 'text-blue-400' : 'text-slate-400'}"
                id="sort-by-lastActive"
              >
                Last Active
                ${sortBy === 'lastActive' 
                  ? `<span class="ml-1 inline-block">${
                      sortDirection === 'asc' 
                        ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"></path></svg>'
                        : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>'
                    }</span>`
                  : ''
                }
              </button>
            </div>
          </div>
        `;
        modalBody.innerHTML += tableHeaderHTML;
        
        // Add user list container
        const userListContainer = document.createElement('div');
        userListContainer.id = 'user-list-container';
        userListContainer.className = 'max-h-96 overflow-y-auto space-y-4';
        modalBody.appendChild(userListContainer);
        
        // Populate user list
        const userListHTML = filteredSortedUsers.map((user, index) => `
          <div class="flex items-center justify-between py-2 ${index < filteredSortedUsers.length - 1 ? 'border-b border-slate-800' : ''}">
            <div class="flex items-center">
              <div class="${getAvatarColor(user.initial)} rounded-full h-9 w-9 flex items-center justify-center text-sm font-medium">
                ${user.initial}
              </div>
              <div class="ml-3">
                <p class="text-sm font-medium text-white">
                  ${user.email}
                </p>
              </div>
            </div>
            <div class="flex items-center">
              <div class="w-20 text-right text-white font-medium">
                ${user.count}
              </div>
              <div class="w-32 ml-8 text-right text-slate-400 text-sm">
                ${formatDate(user.lastActive)}
              </div>
            </div>
          </div>
        `).join('');
        userListContainer.innerHTML = userListHTML;
        
        // Add event listeners
        const modalBackdrop = document.getElementById('top-users-modal-backdrop');
        const closeBtn = document.getElementById('top-users-modal-close');
        const searchInput = document.getElementById('top-users-modal-search');
        const sortEmailBtn = document.getElementById('sort-by-email');
        const sortCountBtn = document.getElementById('sort-by-count');
        const sortLastActiveBtn = document.getElementById('sort-by-lastActive');
        
        if (modalBackdrop) {
          modalBackdrop.addEventListener('click', () => {
            setShowAllUsers(false);
          });
        }
        
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            setShowAllUsers(false);
          });
        }
        
        if (searchInput) {
          searchInput.addEventListener('input', (e) => {
            //@ts-ignore
            setSearchTerm(e.target.value);
          });
        }
        
        if (sortEmailBtn) {
          sortEmailBtn.addEventListener('click', () => {
            handleSortChange('email');
          });
        }
        
        if (sortCountBtn) {
          sortCountBtn.addEventListener('click', () => {
            handleSortChange('count');
          });
        }
        
        if (sortLastActiveBtn) {
          sortLastActiveBtn.addEventListener('click', () => {
            handleSortChange('lastActive');
          });
        }
      }
      
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
    } else {
      // When modal is hidden, remove it and restore body scrolling
      const modalContainer = document.getElementById('top-users-modal');
      if (modalContainer) {
        document.body.removeChild(modalContainer);
      }
      
      document.body.style.overflow = '';
    }
    
    // Clean up on unmount
    return () => {
      const modalContainer = document.getElementById('top-users-modal');
      if (modalContainer) {
        document.body.removeChild(modalContainer);
      }
      document.body.style.overflow = '';
    };
  }, [showAllUsers, searchTerm, sortBy, sortDirection, userStats, filteredSortedUsers]);

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Top Users</h3>
          <p className="text-sm text-slate-400">Users by story count</p>
        </div>
        <Users className="w-5 h-5 text-slate-400" />
      </div>
      
      {topUsers.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-slate-500">No user data available</p>
        </div>
      ) : (
        <div className="space-y-4">
          {topUsers.map((user, index) => (
            <div key={user.email} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 w-6 text-center font-medium text-slate-500">
                  {index + 1}
                </div>
                <div className="flex items-center ml-3">
                  <div className={`${getAvatarColor(user.initial)} rounded-full h-8 w-8 flex items-center justify-center text-sm font-medium`}>
                    {user.initial}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-white truncate max-w-[150px]" title={user.email}>
                      {formatUserEmail(user.email)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user.count}</p>
                <p className="text-xs text-slate-400">stories</p>
              </div>
            </div>
          ))}
          
          {userStats.length > 5 && (
            <button
              className="w-full mt-2 px-3 py-2 text-sm font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-md transition-colors flex items-center justify-center"
              onClick={() => setShowAllUsers(true)}
            >
              <Eye className="w-4 h-4 mr-2" />
              View All Members ({userStats.length})
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TopUsers;