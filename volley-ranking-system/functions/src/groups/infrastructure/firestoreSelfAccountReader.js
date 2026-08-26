"use strict";

function createFirestoreSelfAccountReader({ accountService }) {
  if (!accountService) throw new TypeError("accountService is required");
  return {
    async getByUserId(userId) {
      try {
        return await accountService.getMyAccount({ userId });
      } catch (error) {
        if (error?.code === "not-found") return null;
        throw error;
      }
    },
  };
}

module.exports = { createFirestoreSelfAccountReader };
