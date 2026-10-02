import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

/** Console errors with their flat `{ code, messageKey }` bodies. */
export const fail = {
  caseNotFound: () =>
    new NotFoundException({ code: 'CASE_NOT_FOUND', messageKey: 'errors.admin.caseNotFound' }),
  userNotFound: () =>
    new NotFoundException({ code: 'USER_NOT_FOUND', messageKey: 'errors.admin.userNotFound' }),
  roleNotAllowed: () =>
    new ForbiddenException({ code: 'ROLE_NOT_ALLOWED', messageKey: 'errors.auth.roleNotAllowed' }),
  conflictOfInterest: () =>
    new ForbiddenException({
      code: 'CONFLICT_OF_INTEREST',
      messageKey: 'errors.admin.conflictOfInterest',
    }),
  protectedRole: () =>
    new ForbiddenException({
      code: 'TARGET_ROLE_PROTECTED',
      messageKey: 'errors.admin.targetRoleProtected',
    }),
  transition: () =>
    new ConflictException({
      code: 'INVALID_TRANSITION',
      messageKey: 'errors.admin.invalidTransition',
    }),
  lastSuperAdmin: () =>
    new ConflictException({ code: 'LAST_SUPER_ADMIN', messageKey: 'errors.admin.lastSuperAdmin' }),
  durationTooLong: () =>
    new BadRequestException({
      code: 'DURATION_TOO_LONG',
      messageKey: 'errors.admin.durationTooLong',
    }),
  bodyInvalid: () =>
    new BadRequestException({
      code: 'ADMIN_BODY_INVALID',
      messageKey: 'errors.admin.queryInvalid',
    }),
};
