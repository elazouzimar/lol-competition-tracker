// Utility functions for LoL Competition Tracker

/**
 * Storage utilities
 */
const Storage = {
  save: (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  },

  load: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return defaultValue;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  },

  clear: () => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      return false;
    }
  }
};

/**
 * Rank utilities
 */
const RankUtils = {
  // Rank tier values for scoring
  tierValues: {
    'IRON': 1,
    'BRONZE': 2,
    'SILVER': 3,
    'GOLD': 4,
    'PLATINUM': 5,
    'DIAMOND': 6,
    'MASTER': 7,
    'GRANDMASTER': 8,
    'CHALLENGER': 9
  },

  // Rank division values
  divisionValues: {
    'IV': 1,
    'III': 2,
    'II': 3,
    'I': 4
  },

  // Calculate total rank score
  calculateRankScore: (tier, division, lp) => {
    const tierValue = RankUtils.tierValues[tier] || 1;
    const divisionValue = RankUtils.divisionValues[division] || 1;
    const lpValue = Math.max(0, Math.min(100, lp || 0));
    
    // High tier ranks don't have divisions
    if (tier === 'MASTER' || tier === 'GRANDMASTER' || tier === 'CHALLENGER') {
      return (tierValue * 1000) + lpValue;
    }
    
    return (tierValue * 1000) + (divisionValue * 100) + lpValue;
  },

  // Format rank display
  formatRank: (tier, division, lp) => {
    if (tier === 'MASTER' || tier === 'GRANDMASTER' || tier === 'CHALLENGER') {
      return `${tier} ${lp} LP`;
    }
    return `${tier} ${division} ${lp} LP`;
  },

  // Get rank color class
  getRankColorClass: (tier) => {
    return `tier-${tier.toLowerCase()}`;
  },

  // Get next rank
  getNextRank: (tier, division) => {
    const tiers = Object.keys(RankUtils.tierValues);
    const currentTierIndex = tiers.indexOf(tier);
    
    if (tier === 'CHALLENGER') {
      return { tier: 'CHALLENGER', division: 'I' };
    }
    
    if (tier === 'MASTER' || tier === 'GRANDMASTER') {
      return { tier: tiers[currentTierIndex + 1], division: 'I' };
    }
    
    if (division === 'I') {
      return { tier: tiers[currentTierIndex + 1], division: 'IV' };
    }
    
    const divisions = ['IV', 'III', 'II', 'I'];
    const currentDivIndex = divisions.indexOf(division);
    return { tier, division: divisions[currentDivIndex + 1] };
  }
};

/**
 * Player utilities
 */
const PlayerUtils = {
  // Calculate player score
  calculateScore: (player) => {
    const rankScore = RankUtils.calculateRankScore(player.tier, player.division, player.lp);
    const totalGames = player.wins + player.losses;
    const winRate = totalGames > 0 ? player.wins / totalGames : 0;
    
    // Base score from rank
    let score = rankScore;
    
    // Bonus for high win rate
    if (winRate > 0.6) {
      score += (winRate - 0.6) * 500;
    }
    
    // Bonus for games played (activity)
    score += Math.min(totalGames * 2, 200);
    
    return Math.round(score);
  },

  // Get player initials for avatar
  getInitials: (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  },

  // Format win rate
  formatWinRate: (wins, losses) => {
    const total = wins + losses;
    if (total === 0) return '0%';
    return `${Math.round((wins / total) * 100)}%`;
  },

  // Get win rate color class
  getWinRateColorClass: (winRate) => {
    if (winRate >= 70) return 'text-success';
    if (winRate >= 55) return 'text-primary';
    if (winRate >= 45) return 'text-warning';
    return 'text-danger';
  },

  // Validate Riot ID format
  validateRiotId: (riotId) => {
    const pattern = /^[^#]+#[^#]+$/;
    return pattern.test(riotId);
  },

  // Parse Riot ID
  parseRiotId: (riotId) => {
    const [gameName, tagLine] = riotId.split('#');
    return { gameName, tagLine };
  }
};

/**
 * Achievement utilities
 */
const AchievementUtils = {
  // Achievement definitions
  achievements: [
    {
      id: 'first_blood',
      title: 'First Blood',
      description: 'First to reach Bronze rank',
      icon: '🥉',
      condition: (players) => {
        const bronzePlayers = players.filter(p => RankUtils.tierValues[p.tier] >= 2);
        return bronzePlayers.length > 0 ? bronzePlayers[0] : null;
      }
    },
    {
      id: 'silver_surfer',
      title: 'Silver Surfer',
      description: 'First to reach Silver rank',
      icon: '🥈',
      condition: (players) => {
        const silverPlayers = players.filter(p => RankUtils.tierValues[p.tier] >= 3);
        return silverPlayers.length > 0 ? silverPlayers[0] : null;
      }
    },
    {
      id: 'golden_god',
      title: 'Golden God',
      description: 'First to reach Gold rank',
      icon: '🥇',
      condition: (players) => {
        const goldPlayers = players.filter(p => RankUtils.tierValues[p.tier] >= 4);
        return goldPlayers.length > 0 ? goldPlayers[0] : null;
      }
    },
    {
      id: 'platinum_prince',
      title: 'Platinum Prince',
      description: 'First to reach Platinum rank',
      icon: '💎',
      condition: (players) => {
        const platPlayers = players.filter(p => RankUtils.tierValues[p.tier] >= 5);
        return platPlayers.length > 0 ? platPlayers[0] : null;
      }
    },
    {
      id: 'diamond_deity',
      title: 'Diamond Deity',
      description: 'First to reach Diamond rank',
      icon: '💍',
      condition: (players) => {
        const diamondPlayers = players.filter(p => RankUtils.tierValues[p.tier] >= 6);
        return diamondPlayers.length > 0 ? diamondPlayers[0] : null;
      }
    },
    {
      id: 'win_streak',
      title: 'Win Streak',
      description: 'Highest win rate above 70%',
      icon: '🔥',
      condition: (players) => {
        const highWinRatePlayers = players.filter(p => {
          const total = p.wins + p.losses;
          return total >= 10 && (p.wins / total) >= 0.7;
        });
        
        if (highWinRatePlayers.length === 0) return null;
        
        return highWinRatePlayers.reduce((best, current) => {
          const currentWinRate = current.wins / (current.wins + current.losses);
          const bestWinRate = best.wins / (best.wins + best.losses);
          return currentWinRate > bestWinRate ? current : best;
        });
      }
    },
    {
      id: 'grinder',
      title: 'The Grinder',
      description: 'Most games played (50+ games)',
      icon: '⚡',
      condition: (players) => {
        const activePlayers = players.filter(p => (p.wins + p.losses) >= 50);
        if (activePlayers.length === 0) return null;
        
        return activePlayers.reduce((most, current) => {
          const currentGames = current.wins + current.losses;
          const mostGames = most.wins + most.losses;
          return currentGames > mostGames ? current : most;
        });
      }
    },
    {
      id: 'king_of_hill',
      title: 'King of the Hill',
      description: 'Current #1 on leaderboard',
      icon: '👑',
      condition: (players) => {
        if (players.length === 0) return null;
        
        const sorted = [...players].sort((a, b) => 
          PlayerUtils.calculateScore(b) - PlayerUtils.calculateScore(a)
        );
        
        return sorted[0];
      }
    },
    {
      id: 'consistency',
      title: 'Mr. Consistent',
      description: 'Play at least 5 games every week',
      icon: '📈',
      condition: (players) => {
        // This would require tracking game history over time
        // For now, we'll use a simple metric
        const consistentPlayers = players.filter(p => {
          const total = p.wins + p.losses;
          return total >= 30;
        });
        
        return consistentPlayers.length > 0 ? consistentPlayers[0] : null;
      }
    },
    {
      id: 'comeback_kid',
      title: 'Comeback Kid',
      description: 'Biggest rank improvement',
      icon: '🚀',
      condition: (players) => {
        // This would require tracking rank history
        // For now, we'll return null
        return null;
      }
    }
  ],

  // Check which achievements are earned
  checkAchievements: (players) => {
    const earnedAchievements = {};
    
    AchievementUtils.achievements.forEach(achievement => {
      const winner = achievement.condition(players);
      if (winner) {
        earnedAchievements[achievement.id] = {
          ...achievement,
          earnedBy: winner.name,
          earnedAt: new Date().toISOString()
        };
      }
    });
    
    return earnedAchievements;
  }
};

/**
 * Date utilities
 */
const DateUtils = {
  // Format date for display
  formatDate: (dateString) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  },

  // Format time for display
  formatTime: (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  // Check if date is recent (within last hour)
  isRecent: (dateString) => {
    if (!dateString) return false;
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours < 1;
  }
};

/**
 * DOM utilities
 */
const DOMUtils = {
  // Show element
  show: (element) => {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    if (element) {
      element.classList.remove('hidden');
      element.classList.add('block');
    }
  },

  // Hide element
  hide: (element) => {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    if (element) {
      element.classList.remove('block');
      element.classList.add('hidden');
    }
  },

  // Toggle element visibility
  toggle: (element) => {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    if (element) {
      if (element.classList.contains('hidden')) {
        DOMUtils.show(element);
      } else {
        DOMUtils.hide(element);
      }
    }
  },

  // Create element with classes and attributes
  createElement: (tag, classes = [], attributes = {}) => {
    const element = document.createElement(tag);
    
    if (classes.length > 0) {
      element.classList.add(...classes);
    }
    
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    
    return element;
  },

  // Clear element content
  clearContent: (element) => {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    if (element) {
      element.innerHTML = '';
    }
  }
};

/**
 * Validation utilities
 */
const ValidationUtils = {
  // Validate required fields
  validateRequired: (value, fieldName) => {
    if (!value || value.trim() === '') {
      return `${fieldName} is required`;
    }
    return null;
  },

  // Validate number range
  validateNumber: (value, min, max, fieldName) => {
    const num = parseInt(value);
    if (isNaN(num)) {
      return `${fieldName} must be a number`;
    }
    if (num < min || num > max) {
      return `${fieldName} must be between ${min} and ${max}`;
    }
    return null;
  },

  // Validate Riot ID
  validateRiotId: (riotId) => {
    if (!PlayerUtils.validateRiotId(riotId)) {
      return 'Riot ID must be in format: Name#TAG';
    }
    return null;
  },

  // Validate form
  validateForm: (formData, rules) => {
    const errors = {};
    
    Object.entries(rules).forEach(([field, rule]) => {
      const value = formData[field];
      let error = null;
      
      if (rule.required) {
        error = ValidationUtils.validateRequired(value, rule.label);
      }
      
      if (!error && rule.type === 'number') {
        error = ValidationUtils.validateNumber(value, rule.min, rule.max, rule.label);
      }
      
      if (!error && rule.type === 'riotId') {
        error = ValidationUtils.validateRiotId(value);
      }
      
      if (!error && rule.custom) {
        error = rule.custom(value);
      }
      
      if (error) {
        errors[field] = error;
      }
    });
    
    return errors;
  }
};

/**
 * Export utilities
 */
const ExportUtils = {
  // Export data to JSON
  exportToJson: (data, filename = 'lol-competition-data.json') => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Import data from JSON file
  importFromJson: (callback) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          callback(null, data);
        } catch (error) {
          callback(error, null);
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  }
};

/**
 * Notification utilities
 */
const NotificationUtils = {
  // Show success notification
  showSuccess: (message, duration = 3000) => {
    NotificationUtils.showNotification(message, 'success', duration);
  },

  // Show error notification
  showError: (message, duration = 5000) => {
    NotificationUtils.showNotification(message, 'error', duration);
  },

  // Show info notification
  showInfo: (message, duration = 3000) => {
    NotificationUtils.showNotification(message, 'info', duration);
  },

  // Show warning notification
  showWarning: (message, duration = 4000) => {
    NotificationUtils.showNotification(message, 'warning', duration);
  },

  // Show notification
  showNotification: (message, type = 'info', duration = 3000) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <span class="notification-icon">${NotificationUtils.getIcon(type)}</span>
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
      </div>
    `;

    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.textContent = `
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          min-width: 300px;
          max-width: 500px;
          background: var(--bg-card);
          border: 1px solid var(--border-primary);
          border-radius: var(--radius-lg);
          padding: var(--spacing-md);
          box-shadow: var(--shadow-lg);
          z-index: 9999;
          animation: slideInRight 0.3s ease;
        }
        
        .notification-success { border-left: 4px solid var(--accent-success); }
        .notification-error { border-left: 4px solid var(--accent-danger); }
        .notification-warning { border-left: 4px solid var(--accent-warning); }
        .notification-info { border-left: 4px solid var(--accent-secondary); }
        
        .notification-content {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        
        .notification-icon {
          font-size: var(--font-size-lg);
          flex-shrink: 0;
        }
        
        .notification-message {
          flex: 1;
          color: var(--text-primary);
          font-size: var(--font-size-sm);
        }
        
        .notification-close {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: var(--font-size-lg);
          cursor: pointer;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          transition: all 0.2s ease;
        }
        
        .notification-close:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }
        
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(styles);
    }

    // Add to document
    document.body.appendChild(notification);

    // Add close functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      NotificationUtils.removeNotification(notification);
    });

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        NotificationUtils.removeNotification(notification);
      }, duration);
    }
  },

  // Remove notification
  removeNotification: (notification) => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  },

  // Get icon for notification type
  getIcon: (type) => {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  }
};

/**
 * Debounce utility
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle utility
 */
const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Random utilities
 */
const RandomUtils = {
  // Generate random integer between min and max (inclusive)
  randomInt: (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },

  // Generate random float between min and max
  randomFloat: (min, max) => {
    return Math.random() * (max - min) + min;
  },

  // Pick random element from array
  randomChoice: (array) => {
    return array[Math.floor(Math.random() * array.length)];
  },

  // Generate random UUID
  generateUUID: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
};

/**
 * Animation utilities
 */
const AnimationUtils = {
  // Smooth scroll to element
  scrollTo: (element, offset = 0) => {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    
    if (element) {
      const elementPosition = element.offsetTop - offset;
      window.scrollTo({
        top: elementPosition,
        behavior: 'smooth'
      });
    }
  },

  // Fade in element
  fadeIn: (element, duration = 300) => {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    
    if (element) {
      element.style.opacity = '0';
      element.style.display = 'block';
      
      let start = null;
      const animate = (timestamp) => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const opacity = Math.min(progress / duration, 1);
        
        element.style.opacity = opacity;
        
        if (progress < duration) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  },

  // Fade out element
  fadeOut: (element, duration = 300) => {
    if (typeof element === 'string') {
      element = document.getElementById(element);
    }
    
    if (element) {
      let start = null;
      const animate = (timestamp) => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const opacity = Math.max(1 - (progress / duration), 0);
        
        element.style.opacity = opacity;
        
        if (progress < duration) {
          requestAnimationFrame(animate);
        } else {
          element.style.display = 'none';
        }
      };
      
      requestAnimationFrame(animate);
    }
  }
};

// Export all utilities for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    Storage,
    RankUtils,
    PlayerUtils,
    AchievementUtils,
    DateUtils,
    DOMUtils,
    ValidationUtils,
    ExportUtils,
    NotificationUtils,
    debounce,
    throttle,
    RandomUtils,
    AnimationUtils
  };
}