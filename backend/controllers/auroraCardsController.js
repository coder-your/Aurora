import {
  awardEngagementPoints,
  getReaderEngagementSummary,
  getContributorProfile,
} from "../services/auroraEngagement.service.js";
import { ACTIVITY_TYPES } from "../constants/aurora.constants.js";

export const getMyEngagement = async (req, res) => {
  try {
    const summary = await getReaderEngagementSummary(req.user.user_id);
    return res.json(summary);
  } catch (err) {
    console.error("getMyEngagement:", err);
    return res.status(500).json({ message: "Failed to load engagement summary." });
  }
};

export const getMyContributorProfile = async (req, res) => {
  try {
    const profile = await getContributorProfile(req.user.user_id);
    return res.json(profile);
  } catch (err) {
    console.error("getMyContributorProfile:", err);
    return res.status(500).json({ message: "Failed to load contributor profile." });
  }
};

export const getContributorByUserId = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const profile = await getContributorProfile(userId);
    return res.json(profile);
  } catch (err) {
    console.error("getContributorByUserId:", err);
    return res.status(500).json({ message: "Failed to load contributor profile." });
  }
};

/** Internal helper exported for hooks from other controllers */
export { awardEngagementPoints, ACTIVITY_TYPES };
