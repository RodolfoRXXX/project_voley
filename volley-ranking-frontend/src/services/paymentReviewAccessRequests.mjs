export const OWNER_REVIEW_ROSTER_PAGE_SIZE = 20;
export const OWNER_REVIEW_HISTORY_PAGE_SIZE = 50;

export function ownerPaymentReviewAccessRequests(groupId) {
  return Object.freeze({
    roster: Object.freeze({ groupId, pageSize: OWNER_REVIEW_ROSTER_PAGE_SIZE }),
    history: Object.freeze({ groupId, pageSize: OWNER_REVIEW_HISTORY_PAGE_SIZE }),
  });
}
