import { Request } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { profileRepository } from '../repositories/profile.repository';
import { auditService } from './audit.service';
import { AuditAction } from '../types/audit';
import { UserRole } from '../constants/roles';
import {
  AuthResponseDto,
  TokenDto,
  MessageResponseDto,
} from '../dto/auth.dto';
import {
  RegisterInput,
  LoginInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  RefreshInput,
} from '../validators/auth.validators';
import {
  AuthenticationError,
  ConflictError,
  DatabaseError,
} from '../errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// ---------------------------------------------------------------------------
// AuthService — all authentication operations via Supabase Auth Admin API.
// Passwords are never stored or processed here — Supabase owns auth state.
// ---------------------------------------------------------------------------

export class AuthService {
  /**
   * Register a new user.
   * 1. Creates user via Supabase Auth Admin API
   * 2. Upserts profile (trigger also fires but we ensure data consistency)
   * 3. Logs audit event
   */
  async register(input: RegisterInput, req?: Request): Promise<AuthResponseDto> {
    // Check if email is already registered
    const existing = await profileRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email address already exists');
    }

    // Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email:             input.email,
      password:          input.password,
      email_confirm:     false, // sends confirmation email
      user_metadata: {
        first_name: input.first_name,
        last_name:  input.last_name,
      },
      app_metadata: {
        role: UserRole.Employee,
      },
    });

    if (authError || !authData.user) {
      logger.error({ err: authError?.message }, 'AuthService.register: createUser failed');
      throw new DatabaseError(authError?.message ?? 'Failed to create user');
    }

    const supabaseUser = authData.user;

    // Ensure profile row exists (trigger may have already created it)
    await profileRepository.create({
      id:         supabaseUser.id,
      email:      input.email,
      first_name: input.first_name,
      last_name:  input.last_name,
      role:       UserRole.Employee,
    }).catch((err) => {
      // If it already exists (duplicate from trigger), that's fine
      if (!(err instanceof DatabaseError) || !err.message.includes('duplicate')) {
        logger.warn({ err, userId: supabaseUser.id }, 'AuthService.register: profile upsert warning');
      }
    });

    // Sign in to get a session token for immediate use
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
      email:    input.email,
      password: input.password,
    });

    void auditService.log(AuditAction.USER_REGISTERED, {
      actorId:  supabaseUser.id,
      targetId: supabaseUser.id,
      metadata: { email: input.email },
      req,
    });

    if (sessionError || !sessionData.session) {
      // Registration succeeded but can't issue session yet (e.g. email not confirmed)
      // Return partial response without session
      logger.warn({ err: sessionError?.message }, 'AuthService.register: session not issued (email pending confirmation)');

      return {
        user: {
          id:             supabaseUser.id,
          email:          supabaseUser.email ?? input.email,
          role:           UserRole.Employee,
          email_verified: false,
          first_name:     input.first_name,
          last_name:      input.last_name,
        },
        session: {
          access_token:  '',
          refresh_token: '',
          expires_in:    0,
          token_type:    'bearer',
        },
      };
    }

    return this.buildAuthResponse(supabaseUser, sessionData.session, input.first_name, input.last_name);
  }

  /**
   * Authenticate a user with email/password.
   */
  async login(input: LoginInput, req?: Request): Promise<AuthResponseDto> {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email:    input.email,
      password: input.password,
    });

    if (error || !data.session || !data.user) {
      void auditService.log(AuditAction.LOGIN_FAILED, {
        metadata: { email: input.email, reason: error?.message },
        req,
      });
      throw new AuthenticationError('Invalid email or password');
    }

    // Load profile for names
    const profile = await profileRepository.findById(data.user.id).catch(() => null);

    // Check account status
    if (profile?.status === 'inactive') {
      void auditService.log(AuditAction.LOGIN_FAILED, {
        actorId:  data.user.id,
        metadata: { email: input.email, reason: 'account_inactive' },
        req,
      });
      throw new AuthenticationError('Your account has been deactivated. Please contact support.');
    }

    if (profile?.status === 'suspended') {
      void auditService.log(AuditAction.LOGIN_FAILED, {
        actorId:  data.user.id,
        metadata: { email: input.email, reason: 'account_suspended' },
        req,
      });
      throw new AuthenticationError('Your account has been suspended. Please contact your administrator.');
    }

    void auditService.log(AuditAction.USER_LOGGED_IN, {
      actorId:  data.user.id,
      targetId: data.user.id,
      metadata: { email: input.email },
      req,
    });

    return this.buildAuthResponse(
      data.user,
      data.session,
      profile?.first_name ?? '',
      profile?.last_name ?? '',
    );
  }

  /**
   * Invalidate a user's session.
   */
  async logout(userId: string, req?: Request): Promise<MessageResponseDto> {
    const { error } = await supabaseAdmin.auth.admin.signOut(userId, 'global');

    if (error) {
      logger.warn({ err: error.message, userId }, 'AuthService.logout: signOut error (non-fatal)');
    }

    void auditService.log(AuditAction.USER_LOGGED_OUT, {
      actorId:  userId,
      targetId: userId,
      req,
    });

    return { message: 'Logged out successfully' };
  }

  /**
   * Send a password reset email via Supabase.
   */
  async forgotPassword(input: ForgotPasswordInput, req?: Request): Promise<MessageResponseDto> {
    // Always return success to prevent email enumeration
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type:             'recovery',
      email:            input.email,
      options: {
        redirectTo: `${env.ALLOWED_ORIGINS.split(',')[0]}/reset-password`,
      },
    });

    if (error) {
      logger.warn({ err: error.message, email: input.email }, 'AuthService.forgotPassword: generateLink failed');
    }

    void auditService.log(AuditAction.PASSWORD_RESET_REQUESTED, {
      metadata: { email: input.email },
      req,
    });

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  /**
   * Reset password using a Supabase recovery token.
   */
  async resetPassword(input: ResetPasswordInput, req?: Request): Promise<MessageResponseDto> {
    // Exchange recovery token for session then update password
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.exchangeCodeForSession(input.token);

    if (sessionError || !sessionData.user) {
      throw new AuthenticationError('Invalid or expired reset token');
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      sessionData.user.id,
      { password: input.password },
    );

    if (updateError) {
      throw new DatabaseError(updateError.message);
    }

    void auditService.log(AuditAction.PASSWORD_RESET_COMPLETED, {
      actorId:  sessionData.user.id,
      targetId: sessionData.user.id,
      req,
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }

  /**
   * Refresh an access token using a refresh token.
   */
  async refreshSession(input: RefreshInput, req?: Request): Promise<TokenDto> {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: input.refresh_token,
    });

    if (error || !data.session) {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    void auditService.log(AuditAction.TOKEN_REFRESHED, {
      actorId: data.user?.id,
      req,
    });

    return {
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in:    data.session.expires_in ?? 3600,
      token_type:    'bearer',
    };
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private buildAuthResponse(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    session: any,
    firstName: string,
    lastName: string,
  ): AuthResponseDto {
    const role = (user.app_metadata?.role as UserRole) ?? UserRole.Employee;

    return {
      user: {
        id:             user.id,
        email:          user.email ?? '',
        role,
        email_verified: !!user.email_confirmed_at,
        first_name:     firstName,
        last_name:      lastName,
      },
      session: {
        access_token:  session.access_token,
        refresh_token: session.refresh_token,
        expires_in:    session.expires_in ?? 3600,
        token_type:    'bearer',
      },
    };
  }
}

export const authService = new AuthService();
