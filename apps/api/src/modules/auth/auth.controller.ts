import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  SerializeOptions,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AuthSessionResponse,
  envelope,
  LoginRequest,
  RegisterRequest,
  SessionUserResponse,
  type LoginRequestT,
  type RegisterRequestT,
} from '@dnc/contracts';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  CurrentUser,
  type CurrentUserContext,
} from '../../common/decorators/current-user.decorator.js';
import { AuthService, type RefreshResult, type SessionContext } from './auth.service.js';

const SessionEnvelope = envelope(AuthSessionResponse);
const UserEnvelope = envelope(SessionUserResponse);

/** Name of the refresh cookie. Scoped to the auth routes so it is not sent with every request. */
const REFRESH_COOKIE = 'dnc_refresh';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @SerializeOptions({ schema: SessionEnvelope })
  async register(
    @Body({ schema: RegisterRequest }) body: RegisterRequestT,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.register(body, contextOf(request));
    this.setRefreshCookie(response, result);
    return { success: true, data: result.session };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @SerializeOptions({ schema: SessionEnvelope })
  async login(
    @Body({ schema: LoginRequest }) body: LoginRequestT,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(body, contextOf(request));
    this.setRefreshCookie(response, result);
    return { success: true, data: result.session };
  }

  /**
   * Exchanges the refresh cookie for a new access token.
   *
   * Public because the access token is exactly what the caller does not have;
   * the cookie is the credential, and it is verified inside the service.
   */
  @Public()
  @Post('refresh')
  @HttpCode(200)
  @SerializeOptions({ schema: SessionEnvelope })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = readRefreshCookie(request);

    // No cookie at all is not a failed authentication: this endpoint's whole
    // job is "give me a session if I have one", and a visitor who never signed
    // in simply has none. 204 says that without painting an error in every
    // anonymous visitor's console. A cookie that is present but expired,
    // revoked or replayed still answers 401, because that one did fail.
    if (refreshToken === undefined) {
      response.status(204);
      return undefined;
    }

    const result = await this.auth.refresh(refreshToken, contextOf(request));
    this.setRefreshCookie(response, result);
    return { success: true, data: result.session };
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(readRefreshCookie(request));
    response.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }

  @Get('me')
  @SerializeOptions({ schema: UserEnvelope })
  async me(@CurrentUser() viewer: CurrentUserContext) {
    return { success: true, data: await this.auth.currentUser(viewer.id) };
  }

  /**
   * Writes the refresh token where script cannot read it.
   *
   * httpOnly keeps it out of reach of any XSS on the page; the path scope means
   * it is attached only to the auth routes, which is the only place it is ever
   * exchanged; SameSite=Lax stops a third-party page from spending it.
   */
  private setRefreshCookie(response: Response, result: RefreshResult): void {
    response.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      // Secure is required over HTTPS and impossible over plain-HTTP localhost.
      secure: process.env['NODE_ENV'] === 'production',
      path: REFRESH_COOKIE_PATH,
      expires: result.refreshExpiresAt,
    });
  }
}

function readRefreshCookie(request: Request): string | undefined {
  // Read from the raw header rather than adding a cookie-parser: this is the
  // only cookie the API reads, and parsing one name is not worth middleware.
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === REFRESH_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

function contextOf(request: Request): SessionContext {
  const platform = request.headers['x-platform'];
  const value = Array.isArray(platform) ? platform[0] : platform;
  return {
    platform: value === 'ios' || value === 'android' ? value : 'web',
    userAgent: request.headers['user-agent']?.slice(0, 255) ?? null,
    ip: request.ip ?? null,
  };
}
