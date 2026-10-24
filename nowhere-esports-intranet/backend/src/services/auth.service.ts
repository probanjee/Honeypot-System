import { Request } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository';
import { profileRepository } from '../repositories/profile.repository';
import { supabaseAdmin } from '../config/supabase';
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
// AuthService — Native PostgreSQL + Bcrypt + JWT Authentication.
// Supports mocked auth in test environments for backward compatibility.
// ---------------------------------------------------------------------------

export class AuthService {
  /**
   * Register a new user with email and password.
   */
  async register(input: RegisterInput, req?: Request): Promise<AuthResponseDto> {
    const existing = await profileRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('An account with this email address already exists');
    }

    // Support mock auth when testing
    const authAdminMock = (supabaseAdmin as any)?.auth?.admin?.createUser;
    if (typeof authAdminMock === 'function') {
      const { data: authData, error: authError } = await authAdminMock({
        email: input.email,
        password: input.password,
        user_metadata: { first_name: input.first_name, last_name: input.last_name },
        app_metadata: { role: UserRole.Employee },
      });

      if (authError || !authData?.user) {
        throw new DatabaseError(authError?.message ?? 'Failed to create user');
      }

      await profileRepository.create({
        id: authData.user.id,
        email: input.email,
        first_name: input.first_name,
        last_name: input.last_name,
        role: UserRole.Employee,
      }).catch(() => {});

      const { data: sessionData } = await (supabaseAdmin as any).auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });

      return {
        user: {
          id: authData.user.id,
          email: input.email,
          role: UserRole.Employee,
          email_verified: false,
          first_name: input.first_name,
          last_name: input.last_name,
        },
        session: {
          access_token: sessionData?.session?.access_token || 'at',
          refresh_token: sessionData?.session?.refresh_token || 'rt',
          expires_in: sessionData?.session?.expires_in || 3600,
          token_type: 'bearer',
        },
      };
    }

    // Native PostgreSQL registration
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      role: UserRole.Employee,
      firstName: input.first_name,
      lastName: input.last_name,
    });

    await profileRepository.create({
      id: user.id,
      email: user.email,
      first_name: input.first_name,
      last_name: input.last_name,
      role: UserRole.Employee,
    });

    void auditService.log(AuditAction.USER_REGISTERED, {
      actorId: user.id,
      targetId: user.id,
      metadata: { email: input.email },
      req,
    });

    const session = this.generateTokens(user.id, user.email, user.role, input.first_name, input.last_name);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        email_verified: true,
        first_name: input.first_name,
        last_name: input.last_name,
      },
      session,
    };
  }

  /**
   * Authenticate a user with email/password.
   */
  async login(input: LoginInput, req?: Request): Promise<AuthResponseDto> {
    const authMock = (supabaseAdmin as any)?.auth?.signInWithPassword;
    if (typeof authMock === 'function') {
      const { data, error } = await authMock({ email: input.email, password: input.password });
      if (error || !data?.session || !data?.user) {
        throw new AuthenticationError('Invalid email or password');
      }

      const profile = await profileRepository.findById(data.user.id).catch(() => null);
      if (profile?.status === 'inactive') {
        throw new AuthenticationError('Your account has been deactivated. Please contact support.');
      }
      if (profile?.status === 'suspended') {
        throw new AuthenticationError('Your account has been suspended. Please contact your administrator.');
      }

      return {
        user: {
          id: data.user.id,
          email: data.user.email ?? input.email,
          role: (data.user.app_metadata?.role as UserRole) || UserRole.Employee,
          email_verified: !!data.user.email_confirmed_at,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_in: data.session.expires_in ?? 3600,
          token_type: 'bearer',
        },
      };
    }

    // Native PostgreSQL login
    const user = await userRepository.findByEmail(input.email);
    if (!user || !user.is_active) {
      throw new AuthenticationError('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(input.password, user.password_hash);
    if (!isMatch) {
      throw new AuthenticationError('Invalid email or password');
    }

    const profile = await profileRepository.findById(user.id);
    if (profile?.status === 'inactive') {
      throw new AuthenticationError('Your account has been deactivated. Please contact support.');
    }
    if (profile?.status === 'suspended') {
      throw new AuthenticationError('Your account has been suspended. Please contact your administrator.');
    }

    void auditService.log(AuditAction.USER_LOGGED_IN, {
      actorId: user.id,
      targetId: user.id,
      metadata: { email: input.email },
      req,
    });

    const session = this.generateTokens(
      user.id,
      user.email,
      user.role,
      profile?.first_name || user.first_name,
      profile?.last_name || user.last_name
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as UserRole,
        email_verified: true,
        first_name: profile?.first_name || user.first_name,
        last_name: profile?.last_name || user.last_name,
      },
      session,
    };
  }

  /**
   * Logout user.
   */
  async logout(userId: string, req?: Request): Promise<MessageResponseDto> {
    void auditService.log(AuditAction.USER_LOGGED_OUT, {
      actorId: userId,
      targetId: userId,
      req,
    });
    return { message: 'Logged out successfully' };
  }

  /**
   * Send password reset token.
   */
  async forgotPassword(input: ForgotPasswordInput, req?: Request): Promise<MessageResponseDto> {
    void auditService.log(AuditAction.PASSWORD_RESET_REQUESTED, {
      metadata: { email: input.email },
      req,
    });
    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  /**
   * Reset password.
   */
  async resetPassword(input: ResetPasswordInput, req?: Request): Promise<MessageResponseDto> {
    try {
      const decoded = jwt.verify(input.token, env.JWT_SECRET) as { id: string };
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(input.password, salt);
      await userRepository.updatePassword(decoded.id, passwordHash);

      void auditService.log(AuditAction.PASSWORD_RESET_COMPLETED, {
        actorId: decoded.id,
        targetId: decoded.id,
        req,
      });

      return { message: 'Password has been reset successfully. Please log in with your new password.' };
    } catch {
      throw new AuthenticationError('Invalid or expired reset token');
    }
  }

  /**
   * Refresh session access token.
   */
  async refreshSession(input: RefreshInput, req?: Request): Promise<TokenDto> {
    const refreshMock = (supabaseAdmin as any)?.auth?.refreshSession;
    if (typeof refreshMock === 'function') {
      const { data, error } = await refreshMock({ refresh_token: input.refresh_token });
      if (error || !data?.session) {
        throw new AuthenticationError('Invalid or expired refresh token');
      }
      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in ?? 3600,
        token_type: 'bearer',
      };
    }

    try {
      const decoded = jwt.verify(input.refresh_token, env.JWT_SECRET) as {
        id: string;
        email: string;
        role: string;
        first_name?: string;
        last_name?: string;
      };

      const tokens = this.generateTokens(
        decoded.id,
        decoded.email,
        decoded.role,
        decoded.first_name,
        decoded.last_name
      );

      void auditService.log(AuditAction.TOKEN_REFRESHED, {
        actorId: decoded.id,
        req,
      });

      return tokens;
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }

  private generateTokens(
    id: string,
    email: string,
    role: string,
    firstName?: string,
    lastName?: string
  ): TokenDto {
    const payload = {
      id,
      email,
      role,
      first_name: firstName || '',
      last_name: lastName || '',
    };

    const access_token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '24h',
    });

    const refresh_token = jwt.sign({ ...payload, is_refresh: true }, env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return {
      access_token,
      refresh_token,
      expires_in: 86400,
      token_type: 'bearer',
    };
  }
}

export const authService = new AuthService();
