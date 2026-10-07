import { IsUUID, IsInt, IsArray, IsOptional } from 'class-validator';

export class CreateBetDto {
  @IsArray()
  @IsInt({ each: true })
  numbers: number[];

  @IsInt()
  stakeAmount: number;

  @IsUUID()
  paymentReference: string;
}

export class GetAllBetsDto {
  @IsUUID()
  @IsOptional()
  drawId?: string;
}

export class GetUserBetsDto {
  @IsUUID()
  userId: string;
}

export class GetBetDto {
  @IsUUID()
  betId: string;
}

export class GetWinningBetsDto {
  @IsInt()
  winningNumber: number;
}

export class GetLostBetsDto {
  @IsUUID()
  userId: string;
}
