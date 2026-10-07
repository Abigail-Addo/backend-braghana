import { Injectable } from '@nestjs/common';
// import { genSalt, hash, compare } from 'bcrypt';
import * as bcrypt from 'bcrypt';
import { HashingService } from './hashing.service';

// set salt rounds
const saltRounds: number = 10;

@Injectable()
export class BcryptService implements HashingService {
  async hashPassword(password: string | Buffer): Promise<string> {
    const salt = await bcrypt.genSalt(saltRounds);
    return bcrypt.hash(password, salt);
  }

  comparePassword(
    password: string | Buffer,
    encrypted: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, encrypted);
  }
}
