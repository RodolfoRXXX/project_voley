"use strict";

function toMyAccountDto(userId, user) {
  return Object.freeze({
    userId,
    displayName: user.nombre,
    accessEmail: user.email,
    accountPhotoUrl: user.photoURL || null,
  });
}

module.exports = { toMyAccountDto };
