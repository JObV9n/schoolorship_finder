export type UrgencyCategory = 'urgent' | 'soon' | 'later' | 'none';

export class DeadlineCalculator {
  private readonly URGENT_THRESHOLD = 30;
  private readonly SOON_THRESHOLD = 60;
  private readonly LATER_THRESHOLD = 90;

  daysUntil(deadline: string | Date | null | undefined): number | null {
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
      
      // Set both dates to midnight to get accurate day count
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const deadlineMidnight = new Date(
        deadlineDate.getFullYear(),
        deadlineDate.getMonth(),
        deadlineDate.getDate()
      );

      const diffMs = deadlineMidnight.getTime() - nowMidnight.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      return diffDays;
    } catch (error) {
      console.warn('Error calculating days until deadline:', error);
      return null;
    }
  }

  isWithinDays(deadline: string | Date | null | undefined, days: number): boolean {
    const daysUntilDeadline = this.daysUntil(deadline);
    
    if (daysUntilDeadline === null) {
      return false;
    }

    // Check if deadline is within the specified days and not in the past
    return daysUntilDeadline >= 0 && daysUntilDeadline <= days;
  }


  categorizeUrgency(deadline: string | Date | null | undefined): UrgencyCategory {
    const daysUntilDeadline = this.daysUntil(deadline);
    
    if (daysUntilDeadline === null) {
      return 'none';
    }

    // Past deadlines are not urgent
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
