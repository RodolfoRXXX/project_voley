"use strict";

function accountCreatedAt(value) {
  try {
    const date = value?.toDate?.();
    return date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
  } catch {
    return null;
  }
}

function toMyAccountDto(userId, user) {
  return Object.freeze({
    userId,
    displayName: user.nombre,
    accessEmail: user.email,
    accountPhotoUrl: user.photoURL || null,
    // null is the stable representation for a missing or invalid persisted users.createdAt.
    accountCreatedAt: accountCreatedAt(user.createdAt),
  });
}

module.exports = { accountCreatedAt, toMyAccountDto };
