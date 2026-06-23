import { awardEngagementPoints } from "../services/auroraEngagement.service.js";
import { ACTIVITY_TYPES } from "../constants/aurora.constants.js";

/** Fire-and-forget engagement awards; never blocks main request */
export const tryAward = (userId, activityType, opts = {}) => {
  if (!userId) return;
  awardEngagementPoints(userId, activityType, opts).catch((err) => {
    if (!err?.message?.includes("does not exist")) {
      console.warn("aurora award skipped:", activityType, err.message);
    }
  });
};

export { ACTIVITY_TYPES };
