import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRoleType } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from './password.service';
import { RefreshTokenContext, TokenService } from './token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResult, AuthTokens } from './interfaces/auth-result.interface';

const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto, context: RefreshTokenContext = {}): Promise<AuthResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.passwordService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        roles: {
          create: { role: UserRoleType.CUSTOMER },
        },
      },
      include: { roles: true },
    });

    await this.issueEmailVerificationToken(user.id, user.email as string);

    const tokens = await this.tokenService.issueTokenPair(user, user.roles, context);
    return { ...tokens, user: this.toUserSummary(user) };
  }

  async login(dto: LoginDto, context: RefreshTokenContext = {}): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { roles: true },
    });

    // Constant-shape error regardless of whether the email exists, to avoid
    // leaking account existence via response differences.
    if (!user || !user.passwordHash || user.deletedAt) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await this.passwordService.verify(user.passwordHash, dto.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.tokenService.issueTokenPair(user, user.roles, context);
    return { ...tokens, user: this.toUserSummary(user) };
  }

  async guestSession(context: RefreshTokenContext = {}): Promise<AuthResult> {
    const user = await this.prisma.user.create({
      data: {
        isGuest: true,
        roles: { create: { role: UserRoleType.CUSTOMER } },
      },
      include: { roles: true },
    });

    const tokens = await this.tokenService.issueTokenPair(user, user.roles, context);
    return { ...tokens, user: this.toUserSummary(user) };
  }

  async refresh(refreshToken: string, context: RefreshTokenContext = {}): Promise<AuthTokens> {
    return this.tokenService.rotateRefreshToken(refreshToken, context);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revokeRefreshToken(refreshToken);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

    // Always respond successfully whether or not the email exists, so this
    // endpoint can't be used to enumerate registered accounts.
    if (!user || user.isGuest) {
      return;
    }

    const plainToken = randomBytes(32).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(plainToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
      },
    });

    // TODO(Phase 5+ or when an email provider is chosen): send plainToken via
    // a transactional email template instead of logging it. Never log this
    // in a production environment - kept here only so local development has
    // a working password-reset flow without an email provider configured.
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`Password reset token for ${user.email}: ${plainToken}`);
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashToken(dto.token);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('This password reset link is invalid or has expired');
    }

    const passwordHash = await this.passwordService.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Resetting a password invalidates every existing session.
    await this.tokenService.revokeAllRefreshTokensForUser(resetToken.userId);
  }

  private async issueEmailVerificationToken(userId: string, email: string): Promise<void> {
    const plainToken = randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(plainToken),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS),
      },
    });

    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(`Email verification token for ${email}: ${plainToken}`);
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private toUserSummary(user: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    isGuest: boolean;
  }) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isGuest: user.isGuest,
    };
  }
}
