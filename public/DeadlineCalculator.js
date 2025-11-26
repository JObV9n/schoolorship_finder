
class DeadlineCalculator {
  constructor() {
    // Urgency thresholds in days
    this.URGENT_THRESHOLD = 30;
    this.SOON_THRESHOLD = 60;
    this.LATER_THRESHOLD = 90;
  }

  /**
   * Calculate days until deadline from current date
   * @param {string | Date} deadline 
   * @returns {number | null} - Days until deadline, null if no deadline
   */
  daysUntil(deadline) {
    if (!deadline) {
      return null;
    }

    try {
      const deadlineDate = deadline instanceof Date ? deadline : new Date(deadline);
      
      // Check if date is valid
      if (isNaN(deadlineDate.getTime())) {
        return null;
      }

      const now = new Date();
      
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const deadlineMidnight = new Date(
        deadlineDate.getFullYear(),
        deadlineDate.getMonth(),
        deadlineDate.getDate()
      );

      const diffMs = deadlineMidnight - nowMidnight;
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return diffDays;
    } catch (error) {
      console.warn('Error calculating days until deadline:', error);
      return null;
    }
  }

  /**
   * Check if deadline falls within specified days
   * @param {string | Date} deadline
   * @param {number} days - Number of days threshold
   * @returns {boolean}
   */
  isWithinDays(deadline, days) {
    const daysUntilDeadline = this.daysUntil(deadline);
    
    if (daysUntilDeadline === null) {
      return false;
    }

    return daysUntilDeadline >= 0 && daysUntilDeadline <= days;
  }

  /**
   * Categorize deadline urgency
   * @param {string | Date} deadline
   * @returns {'urgent' | 'soon' | 'later' | 'none'}
   */
  categorizeUrgency(deadline) {
    const daysUntilDeadline = this.daysUntil(deadline);
    
    if (daysUntilDeadline === null) {
      return 'none';
    }

    if (daysUntilDeadline < 0) {
      return 'none';
    }

    if (daysUntilDeadline <= this.URGENT_THRESHOLD) {
      return 'urgent';
    } else if (daysUntilDeadline <= this.SOON_THRESHOLD) {
      return 'soon';
    } else if (daysUntilDeadline <= this.LATER_THRESHOLD) {
      return 'later';
    } else {
      return 'none';
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DeadlineCalculator;
}
