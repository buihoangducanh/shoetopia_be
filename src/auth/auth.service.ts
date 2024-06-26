import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { UserLoginDto } from './dtos/auth-login.dto';
import { JwtService } from '@nestjs/jwt';
import { ResponseLoginDto } from './dtos/response-login.dto';
import { User } from 'src/users/users.entity';
import { Role } from 'src/constant/enum/role.enum';
@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(loginDTO: UserLoginDto): Promise<ResponseLoginDto> {
    const user = await this.userService.findOneByEmail(loginDTO);

    const passwordMatched = await bcrypt.compare(
      loginDTO.password,
      user.password,
    );

    if (passwordMatched) {
      const tokens = this.generateTokens(user);
      return tokens;
    } else {
      throw new UnauthorizedException('Password incorrect');
    }
  }
  async validateAdmin(loginDTO: UserLoginDto): Promise<ResponseLoginDto> {
    const user = await this.userService.findOneByEmail(loginDTO);

    if (!user.roles.includes(Role.ADMIN))
      throw new ForbiddenException('Only admin can access this resource');

    const passwordMatched = await bcrypt.compare(
      loginDTO.password,
      user.password,
    );

    if (passwordMatched) {
      const tokens = this.generateTokens(user);
      return tokens;
    } else {
      throw new UnauthorizedException('Password incorrect');
    }
  }

  private generateTokens(user: User): ResponseLoginDto {
    const payload = { _id: user._id, email: user.email };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
    });

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
    };
  }
  async refreshToken(user: User) {
    const tokens = this.generateTokens(user);
    return tokens;
  }
  async refreshTokenAdmin(user: User) {
    if (!user.roles.includes(Role.ADMIN))
      throw new ForbiddenException('Only admin can access this resource');
    const tokens = this.generateTokens(user);
    return tokens;
  }
}
